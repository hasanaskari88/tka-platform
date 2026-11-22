import type {
  FractionVisualSpec,
  GeneratedAssessmentQuestion,
  QuestionBlueprint,
  QuestionValidationIssue,
  QuestionValidationResult,
} from './contracts'

const OPTION_KEYS = ['A', 'B', 'C', 'D'] as const
const FRACTION_ROLES = ['selected', 'unselected', 'removed', 'remaining'] as const
const ROLE_COMPLEMENT: Record<(typeof FRACTION_ROLES)[number], (typeof FRACTION_ROLES)[number]> = {
  selected: 'unselected',
  unselected: 'selected',
  removed: 'remaining',
  remaining: 'removed',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sameBlueprint(actual: QuestionBlueprint, expected: QuestionBlueprint): boolean {
  return actual.blueprintVersion === expected.blueprintVersion &&
    actual.blueprintId === expected.blueprintId &&
    actual.grade === expected.grade &&
    actual.subject === expected.subject &&
    actual.topic === expected.topic &&
    actual.subtopic === expected.subtopic &&
    actual.competency === expected.competency &&
    actual.indicator === expected.indicator &&
    actual.cognitiveLevel === expected.cognitiveLevel &&
    actual.questionType === expected.questionType &&
    actual.visualRequirement === expected.visualRequirement
}

function parseFractionValue(value: string): { numerator: number; denominator: number } | null {
  const normalized = value.trim().replace(/,/g, '.')
  const fraction = /(?:^|\D)(\d{1,3})\s*\/\s*(\d{1,3})(?:\D|$)/.exec(normalized)
  if (fraction) {
    const numerator = Number(fraction[1])
    const denominator = Number(fraction[2])
    return denominator > 0 ? { numerator, denominator } : null
  }
  const words = /(?:^|\D)(\d{1,3})\s+ dari\s+(\d{1,3})(?:\D|$)/i.exec(normalized)
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

function validateVisualSpec(
  spec: FractionVisualSpec,
  question: string,
  expectedBlueprint: QuestionBlueprint,
  issues: QuestionValidationIssue[],
): void {
  const add = (code: QuestionValidationIssue['code'], message: string, path?: string) =>
    issues.push({ code, message, path })

  if (spec.contractVersion !== 2 || spec.type !== 'fraction_partition' ||
    !FRACTION_ROLES.includes(spec.askedFor) ||
    !['colored', 'eaten', 'taken', 'used', 'given_away', 'unknown'].includes(spec.actionKey) ||
    !['required', 'optional', 'none'].includes(spec.visualRequirement)) {
    add('VISUAL_SPEC_INVALID', 'Kontrak visual pecahan tidak valid.', 'visualSpec')
    return
  }
  if (spec.visualRequirement !== expectedBlueprint.visualRequirement) {
    add('BLUEPRINT_MISMATCH', 'Kebutuhan visual pada soal berbeda dari blueprint.', 'visualSpec.visualRequirement')
  }
  if (!spec.wholeLabel.trim() || spec.wholeLabel.length > 40 ||
    !question.toLocaleLowerCase('id-ID').includes(spec.wholeLabel.toLocaleLowerCase('id-ID'))) {
    add('VISUAL_EVIDENCE_MISSING', 'Nama benda utuh tidak ditemukan pada teks soal.', 'visualSpec.wholeLabel')
  }
  if (!Number.isSafeInteger(spec.totalParts) || spec.totalParts < 2 || spec.totalParts > 20) {
    add('VISUAL_SPEC_INVALID', 'Jumlah bagian harus bilangan bulat antara 2 dan 20.', 'visualSpec.totalParts')
    return
  }
  if (!spec.totalEvidenceQuote.trim() || !question.includes(spec.totalEvidenceQuote) ||
    !/bagian|potong|irisan|sektor/i.test(spec.totalEvidenceQuote)) {
    add('VISUAL_EVIDENCE_MISSING', 'Kutipan jumlah keseluruhan harus muncul persis pada teks soal.', 'visualSpec.totalEvidenceQuote')
  }
  if (!Array.isArray(spec.statedSegments) || spec.statedSegments.length < 1 || spec.statedSegments.length > 2) {
    add('VISUAL_SPEC_INVALID', 'Harus ada satu atau dua kelompok bagian yang dinyatakan.', 'visualSpec.statedSegments')
    return
  }

  const seenRoles = new Set<string>()
  let sum = 0
  for (let index = 0; index < spec.statedSegments.length; index++) {
    const segment = spec.statedSegments[index]
    if (!segment || !FRACTION_ROLES.includes(segment.role) ||
      !Number.isSafeInteger(segment.count) || segment.count < 0 || segment.count > spec.totalParts) {
      add('VISUAL_SPEC_INVALID', 'Peran dan jumlah kelompok bagian tidak valid.', 'visualSpec.statedSegments[' + index + ']')
      continue
    }
    if (seenRoles.has(segment.role)) {
      add('VISUAL_SPEC_INVALID', 'Peran kelompok bagian tidak boleh berulang.', 'visualSpec.statedSegments[' + index + '].role')
    }
    seenRoles.add(segment.role)
    sum += segment.count
    if (!segment.evidenceQuote.trim() || !question.includes(segment.evidenceQuote)) {
      add('VISUAL_EVIDENCE_MISSING', 'Kutipan fakta bagian harus ditemukan persis pada teks soal.', 'visualSpec.statedSegments[' + index + '].evidenceQuote')
    }
  }

  if (spec.statedSegments.length === 2) {
    const [first, second] = spec.statedSegments
    if (ROLE_COMPLEMENT[first.role] !== second.role || sum !== spec.totalParts) {
      add('VISUAL_FACTS_CONTRADICT', 'Dua kelompok bagian harus saling melengkapi dan jumlahnya sama dengan keseluruhan.', 'visualSpec.statedSegments')
    }
  }

  const targetSegment = spec.statedSegments.find((segment) => segment.role === spec.askedFor)
  if (!targetSegment && spec.statedSegments.length === 1 &&
    ROLE_COMPLEMENT[spec.statedSegments[0].role] !== spec.askedFor) {
    add('VISUAL_SPEC_INVALID', 'Bagian yang ditanyakan tidak dapat diturunkan dari fakta yang tersedia.', 'visualSpec.askedFor')
  }

  const targetCount = targetSegment?.count ??
    (spec.statedSegments.length === 1
      ? spec.totalParts - spec.statedSegments[0].count
      : null)
  if (targetCount !== null) {
    const expectedFraction = { numerator: targetCount, denominator: spec.totalParts }
    if (expectedBlueprint.questionType === 'multiple_choice') {
      const answerText = specAnswerTextForMultipleChoice(issues, expectedFraction)
      if (answerText === false) add('VISUAL_ANSWER_MISMATCH', 'Pilihan yang menjadi kunci tidak mewakili pecahan hasil perhitungan visual.', 'answer')
    }
  }
}

function specAnswerTextForMultipleChoice(
  issues: QuestionValidationIssue[],
  _expected: { numerator: number; denominator: number },
): boolean | null {
  // The caller performs answer-option comparison after the structural validator.
  return issues.some((issue) => issue.code === 'ANSWER_KEY_INVALID') ? false : null
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
  if (!isRecord(question.blueprint) || !sameBlueprint(question.blueprint, expectedBlueprint)) {
    add('BLUEPRINT_MISMATCH', 'Blueprint pada soal tidak sama dengan blueprint yang diminta.', 'blueprint')
  }
  if (question.questionType !== expectedBlueprint.questionType) {
    add('BLUEPRINT_MISMATCH', 'Tipe soal berbeda dari blueprint.', 'questionType')
  }
  if (typeof question.question !== 'string' || !question.question.trim()) {
    add('QUESTION_EMPTY', 'Teks soal tidak boleh kosong.', 'question')
  }
  if (typeof question.explanation !== 'string' || !question.explanation.trim()) {
    add('EXPLANATION_EMPTY', 'Pembahasan tidak boleh kosong.', 'explanation')
  }

  if (question.questionType === 'multiple_choice' || question.questionType === 'complex_multiple_choice') {
    const options = question.options
    if (!isRecord(options) || OPTION_KEYS.some((key) => typeof options[key] !== 'string' || !(options[key] as string).trim())) {
      add('OPTIONS_INVALID', 'Pilihan A, B, C, dan D harus terisi.', 'options')
    }
    if (question.questionType === 'multiple_choice') {
      if (!OPTION_KEYS.includes(question.answer as (typeof OPTION_KEYS)[number])) {
        add('ANSWER_KEY_INVALID', 'Pilihan ganda harus memiliki tepat satu kunci A–D.', 'answer')
      }
    } else {
      const answers = question.answers
      if (!Array.isArray(answers) || answers.length < 2 ||
        new Set(answers).size !== answers.length ||
        answers.some((key) => !OPTION_KEYS.includes(key))) {
        add('ANSWER_KEY_INVALID', 'Pilihan ganda kompleks harus memiliki minimal dua kunci unik A–D.', 'answers')
      }
    }
  } else if (question.questionType === 'true_false_matrix') {
    const statements = question.statements
    if (!Array.isArray(statements) || statements.length < 3 || statements.length > 4 ||
      statements.some((item) => !item || typeof item.id !== 'string' || !item.id.trim() ||
        typeof item.text !== 'string' || !item.text.trim() ||
        !['Benar', 'Salah'].includes(item.answer)) ||
      new Set(statements.map((item) => item.id)).size !== statements.length) {
      add('STATEMENTS_INVALID', 'Matriks harus memiliki 3–4 pernyataan unik dengan kunci Benar/Salah.', 'statements')
    }
  } else if (question.questionType === 'essay') {
    if (typeof question.modelAnswer !== 'string' || !question.modelAnswer.trim()) {
      add('ESSAY_ANSWER_MISSING', 'Soal uraian harus memiliki contoh jawaban.', 'modelAnswer')
    }
    if (!Array.isArray(question.rubric) || question.rubric.length === 0 ||
      !Number.isFinite(question.maxScore) || (question.maxScore as number) <= 0 ||
      question.rubric.some((item) => !item || !item.criterion.trim() ||
        !item.description.trim() || !Number.isFinite(item.points) || item.points <= 0) ||
      Math.abs(question.rubric.reduce((sum, item) => sum + item.points, 0) - (question.maxScore || 0)) > 0.000001) {
      add('RUBRIC_INVALID', 'Rubrik harus memiliki kriteria berbobot positif dan total bobot sama dengan skor maksimal.', 'rubric')
    }
  } else {
    add('BLUEPRINT_MISMATCH', 'Tipe soal tidak dikenal.', 'questionType')
  }

  const visualSpec = question.visualSpec
  if (expectedBlueprint.visualRequirement === 'required' && !visualSpec) {
    add('VISUAL_SPEC_MISSING', 'Blueprint mewajibkan spesifikasi visual, tetapi data visual tidak tersedia.', 'visualSpec')
  }
  if (visualSpec) {
    if (typeof question.question === 'string') validateVisualSpec(visualSpec, question.question, expectedBlueprint, issues)
    if (visualSpec.type === 'fraction_partition' && Number.isSafeInteger(visualSpec.totalParts) &&
      Array.isArray(visualSpec.statedSegments) && visualSpec.statedSegments.length > 0) {
      const target = visualSpec.statedSegments.find((segment) => segment.role === visualSpec.askedFor)
      const targetCount = target?.count ?? (visualSpec.statedSegments.length === 1
        ? visualSpec.totalParts - visualSpec.statedSegments[0].count
        : null)
      if (targetCount !== null && question.questionType === 'multiple_choice' &&
        question.options && question.answer) {
        const actual = parseFractionValue(question.options[question.answer])
        if (!actual || !fractionsEqual(actual, { numerator: targetCount, denominator: visualSpec.totalParts })) {
          add('VISUAL_ANSWER_MISMATCH', 'Isi pilihan yang menjadi kunci tidak sama dengan hasil pecahan dari fakta visual.', 'options.' + question.answer)
        }
      }
    }
  }

  return { valid: issues.length === 0, issues }
}
