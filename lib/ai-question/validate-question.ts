import type {
  GeneratedAssessmentQuestion,
  QuestionBlueprint,
  QuestionValidationIssue,
  QuestionValidationResult,
} from './contracts'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const
const ROLES = ['selected', 'unselected', 'removed', 'remaining'] as const
const COMPLEMENT: Record<(typeof ROLES)[number], (typeof ROLES)[number]> = {
  selected: 'unselected',
  unselected: 'selected',
  removed: 'remaining',
  remaining: 'removed',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameBlueprint(actual: unknown, expected: QuestionBlueprint): boolean {
  if (!isRecord(actual)) return false
  const keys: Array<keyof QuestionBlueprint> = [
    'blueprintVersion', 'blueprintId', 'grade', 'subject', 'topic', 'subtopic',
    'competency', 'indicator', 'cognitiveLevel', 'questionType', 'visualRequirement',
  ]
  return keys.every((key) => actual[key] === expected[key])
}

function parseFractionValue(value: string): { numerator: number; denominator: number } | null {
  const fraction = /(?:^|\D)(\d{1,3})\s*\/\s*(\d{1,3})(?:\D|$)/.exec(value.trim())
  if (fraction) {
    const numerator = Number(fraction[1])
    const denominator = Number(fraction[2])
    return denominator > 0 ? { numerator, denominator } : null
  }
  const words = /(?:^|\D)(\d{1,3})\s+dari\s+(\d{1,3})(?:\D|$)/i.exec(value.trim())
  if (words) {
    const numerator = Number(words[1])
    const denominator = Number(words[2])
    return denominator > 0 ? { numerator, denominator } : null
  }
  return null
}

function fractionsEqual(
  first: { numerator: number; denominator: number },
  second: { numerator: number; denominator: number },
): boolean {
  return first.numerator * second.denominator === second.numerator * first.denominator
}

function countAppears(text: string, count: number): boolean {
  return new RegExp('(^|[^0-9])' + count + '([^0-9]|$)').test(text)
}

function evidenceMatchesRole(text: string, role: string): boolean {
  const patterns: Record<string, RegExp> = {
    removed: /dimakan|diambil|digunakan|diberikan|terjual|hilang/i,
    selected: /diwarnai|diberi warna|berwarna|ditandai|dipilih/i,
    remaining: /tersisa|sisa|masih ada|belum dimakan|tidak dimakan|belum digunakan/i,
    unselected: /tidak diwarnai|belum diwarnai|tidak berwarna|belum berwarna|tidak ditandai/i,
  }
  return Boolean(patterns[role]?.test(text))
}

function validateVisualSpec(
  rawSpec: unknown,
  question: string,
  expectedBlueprint: QuestionBlueprint,
  issues: QuestionValidationIssue[],
): { numerator: number; denominator: number } | null {
  const add = (code: QuestionValidationIssue['code'], message: string, path?: string) =>
    issues.push({ code, message, path })

  if (!isRecord(rawSpec)) {
    add('VISUAL_SPEC_INVALID', 'Spesifikasi visual harus berupa objek.', 'visualSpec')
    return null
  }
  const spec = rawSpec
  if (spec.contractVersion !== 2 || spec.type !== 'fraction_partition' ||
    !ROLES.includes(spec.askedFor as (typeof ROLES)[number]) ||
    !['colored', 'eaten', 'taken', 'used', 'given_away', 'unknown'].includes(String(spec.actionKey)) ||
    !['required', 'optional', 'none'].includes(String(spec.visualRequirement))) {
    add('VISUAL_SPEC_INVALID', 'Kontrak visual pecahan tidak valid.', 'visualSpec')
    return null
  }
  if (spec.visualRequirement !== expectedBlueprint.visualRequirement) {
    add('BLUEPRINT_MISMATCH', 'Kebutuhan visual berbeda dari blueprint.', 'visualSpec.visualRequirement')
  }
  if (typeof spec.wholeLabel !== 'string' || !spec.wholeLabel.trim() ||
    spec.wholeLabel.length > 40 || !question.toLocaleLowerCase('id-ID').includes(spec.wholeLabel.toLocaleLowerCase('id-ID'))) {
    add('VISUAL_EVIDENCE_MISSING', 'Nama benda utuh tidak ditemukan pada teks soal.', 'visualSpec.wholeLabel')
  }
  if (!Number.isSafeInteger(spec.totalParts) || Number(spec.totalParts) < 2 || Number(spec.totalParts) > 20) {
    add('VISUAL_SPEC_INVALID', 'Jumlah bagian harus bilangan bulat antara 2 dan 20.', 'visualSpec.totalParts')
    return null
  }
  const totalParts = Number(spec.totalParts)
  if (typeof spec.totalEvidenceQuote !== 'string' || !spec.totalEvidenceQuote.trim() ||
    !question.includes(spec.totalEvidenceQuote) ||
    !/bagian|potong|irisan|sektor/i.test(spec.totalEvidenceQuote) ||
    !countAppears(spec.totalEvidenceQuote, totalParts)) {
    add('VISUAL_EVIDENCE_MISSING', 'Kutipan jumlah keseluruhan harus menyebut jumlah dan satuan bagian serta muncul persis pada soal.', 'visualSpec.totalEvidenceQuote')
  }
  if (!Array.isArray(spec.statedSegments) || spec.statedSegments.length < 1 || spec.statedSegments.length > 2) {
    add('VISUAL_SPEC_INVALID', 'Harus ada satu atau dua kelompok bagian yang dinyatakan.', 'visualSpec.statedSegments')
    return null
  }

  const segments: Array<{ role: string; count: number }> = []
  const seenRoles = new Set<string>()
  let evidenceValid = true
  for (let index = 0; index < spec.statedSegments.length; index++) {
    const segment = spec.statedSegments[index]
    const path = 'visualSpec.statedSegments[' + index + ']'
    if (!isRecord(segment) || !ROLES.includes(segment.role as (typeof ROLES)[number]) ||
      !Number.isSafeInteger(segment.count) || Number(segment.count) < 0 || Number(segment.count) > totalParts) {
      add('VISUAL_SPEC_INVALID', 'Peran dan jumlah kelompok bagian tidak valid.', path)
      evidenceValid = false
      continue
    }
    const role = String(segment.role)
    const count = Number(segment.count)
    if (seenRoles.has(role)) add('VISUAL_SPEC_INVALID', 'Peran kelompok bagian tidak boleh berulang.', path + '.role')
    seenRoles.add(role)
    segments.push({ role, count })
    if (typeof segment.evidenceQuote !== 'string' || !segment.evidenceQuote.trim() ||
      !question.includes(segment.evidenceQuote) ||
      !countAppears(segment.evidenceQuote, count) ||
      !evidenceMatchesRole(segment.evidenceQuote, role)) {
      add('VISUAL_EVIDENCE_MISSING', 'Kutipan fakta harus memuat jumlah, makna kelompok, dan muncul persis pada teks soal.', path + '.evidenceQuote')
      evidenceValid = false
    }
  }
  if (!evidenceValid || segments.length !== spec.statedSegments.length) return null

  if (segments.length === 2 &&
    (COMPLEMENT[segments[0].role as (typeof ROLES)[number]] !== segments[1].role ||
      segments[0].count + segments[1].count !== totalParts)) {
    add('VISUAL_FACTS_CONTRADICT', 'Dua kelompok harus saling melengkapi dan jumlahnya sama dengan keseluruhan.', 'visualSpec.statedSegments')
    return null
  }

  const askedFor = String(spec.askedFor)
  const statedTarget = segments.find((segment) => segment.role === askedFor)
  if (!statedTarget && (segments.length !== 1 ||
    COMPLEMENT[segments[0].role as (typeof ROLES)[number]] !== askedFor)) {
    add('VISUAL_SPEC_INVALID', 'Bagian yang ditanyakan tidak dapat diturunkan dari fakta yang tersedia.', 'visualSpec.askedFor')
    return null
  }
  const numerator = statedTarget?.count ?? totalParts - segments[0].count
  return { numerator, denominator: totalParts }
}

export function validateGeneratedAssessmentQuestion(
  input: unknown,
  expectedBlueprint: QuestionBlueprint,
): QuestionValidationResult {
  const issues: QuestionValidationIssue[] = []
  const add = (code: QuestionValidationIssue['code'], message: string, path?: string) =>
    issues.push({ code, message, path })

  if (!isRecord(input)) {
    return { valid: false, issues: [{ code: 'CONTRACT_VERSION_INVALID', message: 'Data soal harus berupa objek.' }] }
  }
  const question = input as unknown as GeneratedAssessmentQuestion
  if (question.contractVersion !== 1) add('CONTRACT_VERSION_INVALID', 'Versi kontrak soal tidak didukung.', 'contractVersion')
  if (!sameBlueprint(question.blueprint, expectedBlueprint)) {
    add('BLUEPRINT_MISMATCH', 'Blueprint pada soal tidak sama dengan blueprint yang diminta.', 'blueprint')
  }
  if (question.questionType !== expectedBlueprint.questionType) {
    add('BLUEPRINT_MISMATCH', 'Tipe soal berbeda dari blueprint.', 'questionType')
  }
  if (typeof question.question !== 'string' || !question.question.trim()) add('QUESTION_EMPTY', 'Teks soal tidak boleh kosong.', 'question')
  if (typeof question.explanation !== 'string' || !question.explanation.trim()) add('EXPLANATION_EMPTY', 'Pembahasan tidak boleh kosong.', 'explanation')

  if (question.questionType === 'multiple_choice' || question.questionType === 'complex_multiple_choice') {
    const options = question.options
    if (!isRecord(options) || OPTION_KEYS.some((key) => typeof options[key] !== 'string' || !(options[key] as string).trim())) {
      add('OPTIONS_INVALID', 'Pilihan A, B, C, dan D harus terisi.', 'options')
    }
    if (question.questionType === 'multiple_choice') {
      if (!OPTION_KEYS.includes(question.answer as (typeof OPTION_KEYS)[number])) add('ANSWER_KEY_INVALID', 'Pilihan ganda harus memiliki satu kunci A–D.', 'answer')
    } else {
      const answers = question.answers
      if (!Array.isArray(answers) || answers.length < 2 || new Set(answers).size !== answers.length ||
        answers.some((key) => !OPTION_KEYS.includes(key))) {
        add('ANSWER_KEY_INVALID', 'Pilihan ganda kompleks harus memiliki minimal dua kunci unik A–D.', 'answers')
      }
    }
  } else if (question.questionType === 'true_false_matrix') {
    const statements = question.statements
    if (!Array.isArray(statements) || statements.length < 3 || statements.length > 4 ||
      statements.some((item) => !isRecord(item) || typeof item.id !== 'string' || !item.id.trim() ||
        typeof item.text !== 'string' || !item.text.trim() || !['Benar', 'Salah'].includes(String(item.answer))) ||
      new Set(statements.filter(isRecord).map((item) => item.id)).size !== statements.length) {
      add('STATEMENTS_INVALID', 'Matriks harus memiliki 3–4 pernyataan unik dengan kunci Benar/Salah.', 'statements')
    }
  } else if (question.questionType === 'essay') {
    if (typeof question.modelAnswer !== 'string' || !question.modelAnswer.trim()) {
      add('ESSAY_ANSWER_MISSING', 'Soal uraian harus memiliki contoh jawaban.', 'modelAnswer')
    }
    const rubric = question.rubric
    const rubricValid = Array.isArray(rubric) && rubric.length > 0 &&
      Number.isFinite(question.maxScore) && Number(question.maxScore) > 0 &&
      rubric.every((item) => isRecord(item) && typeof item.criterion === 'string' && item.criterion.trim() &&
        typeof item.description === 'string' && item.description.trim() &&
        Number.isFinite(item.points) && Number(item.points) > 0) &&
      Math.abs(rubric.reduce((sum, item) => sum + (isRecord(item) && typeof item.points === 'number' ? item.points : 0), 0) - Number(question.maxScore)) < 0.000001
    if (!rubricValid) add('RUBRIC_INVALID', 'Rubrik harus memiliki kriteria berbobot positif dan total bobot sama dengan skor maksimal.', 'rubric')
  } else {
    add('BLUEPRINT_MISMATCH', 'Tipe soal tidak dikenal.', 'questionType')
  }

  const rawVisualSpec = question.visualSpec as unknown
  if (expectedBlueprint.visualRequirement === 'required' && !rawVisualSpec) {
    add('VISUAL_SPEC_MISSING', 'Blueprint mewajibkan spesifikasi visual, tetapi data visual tidak tersedia.', 'visualSpec')
  }

  if (rawVisualSpec && typeof question.question === 'string') {
    const expectedFraction = validateVisualSpec(rawVisualSpec, question.question, expectedBlueprint, issues)
    if (expectedFraction) {
      if (question.questionType === 'multiple_choice' && question.options && question.answer) {
        const option = question.options[question.answer]
        const parsed = typeof option === 'string' ? parseFractionValue(option) : null
        if (!parsed || !fractionsEqual(parsed, expectedFraction)) {
          add('VISUAL_ANSWER_MISMATCH', 'Pilihan yang menjadi kunci tidak sama dengan hasil pecahan dari fakta visual.', 'options.' + question.answer)
        }
      }
      if (question.questionType === 'complex_multiple_choice' && question.options && Array.isArray(question.answers)) {
        const hasMatchingKey = question.answers.some((key) => {
          const option = question.options?.[key]
          const parsed = typeof option === 'string' ? parseFractionValue(option) : null
          return parsed !== null && fractionsEqual(parsed, expectedFraction)
        })
        if (!hasMatchingKey) add('VISUAL_ANSWER_MISMATCH', 'Kunci pilihan ganda kompleks tidak memuat pecahan yang dihasilkan fakta visual.', 'answers')
      }
      if (question.questionType === 'essay' && typeof question.modelAnswer === 'string') {
        const parsed = parseFractionValue(question.modelAnswer)
        if (parsed && !fractionsEqual(parsed, expectedFraction)) {
          add('VISUAL_ANSWER_MISMATCH', 'Contoh jawaban uraian bertentangan dengan hasil pecahan dari fakta visual.', 'modelAnswer')
        }
      }
    }
  }

  return { valid: issues.length === 0, issues }
}
