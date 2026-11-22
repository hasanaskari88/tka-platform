import type { RationalValue } from '../types'

export type FractionRole = 'removed' | 'selected' | 'remaining' | 'unselected' | 'other'
export type FractionActionKey = 'eaten' | 'taken' | 'used' | 'colored' | 'given_away' | 'unknown'
export type FractionEvidenceRef = { source: 'question'; start: number; end: number; quote: string }
export type StatedFractionSegment = {
  role: Exclude<FractionRole, 'other'>
  count: number
  evidence: FractionEvidenceRef
}
export type FractionPartitionIntentV2 = {
  contractVersion: 2
  type: 'fraction_partition'
  wholeLabel: string
  totalParts: number
  totalEvidence: FractionEvidenceRef
  statedSegments: [StatedFractionSegment] | [StatedFractionSegment, StatedFractionSegment]
  askedFor: FractionRole
  actionKey: FractionActionKey
}
export type FractionFormulaToken =
  | { type: 'number'; value: number }
  | { type: 'operator'; value: '+' | '-' | '=' }
export type FractionRenderPlanV2 = {
  contractVersion: 2
  operation: 'preserve_stated' | 'derive_complement'
  wholeLabel: string
  totalParts: number
  segments: Array<{ role: FractionRole; count: number }>
  targetRole: FractionRole
  answer: RationalValue
  formula: FractionFormulaToken[]
  semanticSummary: string
}
export type FractionPlanResult =
  | { status: 'accepted'; plan: FractionRenderPlanV2 }
  | { status: 'needs_teacher_review'; reason: string }
  | { status: 'rejected'; reason: string }

const ROLE_PAIRS: Partial<Record<FractionRole, FractionRole>> = {
  removed: 'remaining',
  remaining: 'removed',
  selected: 'unselected',
  unselected: 'selected',
  other: 'remaining',
}
const ACTION_ROLE: Partial<Record<FractionActionKey, FractionRole>> = {
  eaten: 'removed', taken: 'removed', used: 'removed',
  colored: 'selected', given_away: 'removed',
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function validEvidence(value: unknown, question: string): value is FractionEvidenceRef {
  if (!isRecord(value) || value.source !== 'question' ||
    !Number.isSafeInteger(value.start) || !Number.isSafeInteger(value.end) ||
    (value.start as number) < 0 || (value.end as number) <= (value.start as number) ||
    typeof value.quote !== 'string' || !value.quote.trim()) return false
  return (value.end as number) <= question.length &&
    question.slice(value.start as number, value.end as number) === value.quote
}
const COUNT_WORDS: Record<number, string[]> = {
  0: ['nol', 'kosong'], 1: ['satu', 'sebuah', 'seorang'], 2: ['dua'], 3: ['tiga'],
  4: ['empat'], 5: ['lima'], 6: ['enam'], 7: ['tujuh'], 8: ['delapan'],
  9: ['sembilan'], 10: ['sepuluh'], 11: ['sebelas'], 12: ['dua belas'],
  13: ['tiga belas'], 14: ['empat belas'], 15: ['lima belas'],
  16: ['enam belas'], 17: ['tujuh belas'], 18: ['delapan belas'],
  19: ['sembilan belas'], 20: ['dua puluh'],
}
function evidenceContainsCount(evidence: FractionEvidenceRef, count: number): boolean {
  const text = evidence.quote.toLocaleLowerCase('id-ID')
  if (new RegExp('(^|[^0-9])' + count + '([^0-9]|$)').test(text)) return true
  return (COUNT_WORDS[count] || []).some((word) =>
    new RegExp('(^|[^a-z])' + word.replace(/ /g, '\\s+') + '([^a-z]|$)').test(text),
  )
}
function evidenceSupportsRole(evidence: FractionEvidenceRef, role: StatedFractionSegment['role']): boolean {
  const text = evidence.quote.toLocaleLowerCase('id-ID')
  const patterns: Record<StatedFractionSegment['role'], RegExp> = {
    removed: /dimakan|diambil|digunakan|diberikan|terjual|hilang/,
    selected: /diwarnai|diberi warna|berwarna|ditandai|dipilih/,
    remaining: /tersisa|sisa|masih ada|belum dimakan|tidak dimakan|belum digunakan/,
    unselected: /tidak diwarnai|belum diwarnai|tidak berwarna|belum berwarna|tidak ditandai/,
  }
  return patterns[role].test(text)
}

/** Creates the canonical, serializable fraction render plan from explicitly evidenced facts. */
export function buildFractionRenderPlanV2(input: unknown, question: string): FractionPlanResult {
  if (!isRecord(input) || input.contractVersion !== 2 || input.type !== 'fraction_partition') {
    return { status: 'rejected', reason: 'Kontrak visual pecahan V2 tidak dikenali.' }
  }
  if (typeof input.wholeLabel !== 'string' || !input.wholeLabel.trim() || input.wholeLabel.length > 40 ||
    !Number.isSafeInteger(input.totalParts) || (input.totalParts as number) < 2 ||
    (input.totalParts as number) > 20) {
    return { status: 'rejected', reason: 'Benda utuh atau jumlah bagian tidak valid.' }
  }
  const wholeLabel = input.wholeLabel.trim()
  if (!/^(pizza|piza|pai|roti bundar|lingkaran)$/i.test(wholeLabel) ||
    !question.toLocaleLowerCase('id-ID').includes(wholeLabel.toLocaleLowerCase('id-ID'))) {
    return { status: 'needs_teacher_review', reason: 'Nama benda utuh tidak didukung oleh teks soal atau belum memiliki bentuk visual yang akurat.' }
  }
  if (!validEvidence(input.totalEvidence, question) || !evidenceContainsCount(input.totalEvidence, input.totalParts as number) || !/bagian|potong|irisan|sektor/.test(input.totalEvidence.quote.toLocaleLowerCase('id-ID'))) {
    return { status: 'needs_teacher_review', reason: 'Jumlah keseluruhan harus didukung kutipan asli yang menyebut jumlah bagian.' }
  }
  if (!['removed', 'selected', 'remaining', 'unselected', 'other'].includes(String(input.askedFor)) ||
    !['eaten', 'taken', 'used', 'colored', 'given_away', 'unknown'].includes(String(input.actionKey))) {
    return { status: 'rejected', reason: 'Peran yang ditanyakan atau jenis tindakan tidak valid.' }
  }
  if (!Array.isArray(input.statedSegments) || input.statedSegments.length < 1 || input.statedSegments.length > 2) {
    return { status: 'needs_teacher_review', reason: 'Jumlah fakta bagian yang dinyatakan tidak dapat dipastikan.' }
  }

  const stated: StatedFractionSegment[] = []
  for (const raw of input.statedSegments) {
    if (!isRecord(raw) || !['removed', 'selected', 'remaining', 'unselected'].includes(String(raw.role)) ||
      !Number.isSafeInteger(raw.count) || (raw.count as number) < 0 ||
      (raw.count as number) > (input.totalParts as number) || !validEvidence(raw.evidence, question) ||
      !evidenceContainsCount(raw.evidence, raw.count as number) ||
      !evidenceSupportsRole(raw.evidence, raw.role as StatedFractionSegment['role'])) {
      return { status: 'needs_teacher_review', reason: 'Fakta bagian harus memiliki peran, jumlah, dan kutipan asli yang tepat.' }
    }
    stated.push({ role: raw.role as StatedFractionSegment['role'], count: raw.count as number, evidence: raw.evidence })
  }
  if (new Set(stated.map((item) => item.role)).size !== stated.length) {
    return { status: 'rejected', reason: 'Peran bagian yang sama tidak boleh dinyatakan dua kali.' }
  }

  const actionRole = ACTION_ROLE[input.actionKey as FractionActionKey]
  if (actionRole && !stated.some((item) => item.role === actionRole)) {
    return { status: 'needs_teacher_review', reason: 'Kata tindakan tidak cocok dengan peran bagian yang dinyatakan.' }
  }

  let segments: FractionRenderPlanV2['segments']
  let operation: FractionRenderPlanV2['operation'] = 'preserve_stated'
  if (stated.length === 2) {
    const [first, second] = stated
    if (ROLE_PAIRS[first.role] !== second.role || first.count + second.count !== input.totalParts) {
      return { status: 'needs_teacher_review', reason: 'Dua kelompok bagian saling bertentangan atau jumlahnya tidak sama dengan keseluruhan.' }
    }
    segments = [{ role: first.role, count: first.count }, { role: second.role, count: second.count }]
  } else {
    const first = stated[0]
    const complementRole = first.role === 'remaining' && input.actionKey === 'unknown'
      ? 'other'
      : ROLE_PAIRS[first.role]
    if (!complementRole) return { status: 'needs_teacher_review', reason: 'Peran bagian tidak memiliki pasangan yang dapat dihitung.' }
    segments = [
      { role: first.role, count: first.count },
      { role: complementRole, count: (input.totalParts as number) - first.count },
    ]
    operation = 'derive_complement'
  }

  const target = segments.find((segment) => segment.role === input.askedFor)
  if (!target) return { status: 'needs_teacher_review', reason: 'Bagian yang ditanyakan tidak dapat dibentuk dari fakta yang tersedia.' }
  if (stated.length === 1 && target.role === stated[0].role) operation = 'preserve_stated'

  const formula: FractionFormulaToken[] = operation === 'derive_complement'
    ? [
        { type: 'number', value: input.totalParts as number },
        { type: 'operator', value: '-' },
        { type: 'number', value: stated[0].count },
        { type: 'operator', value: '=' },
        { type: 'number', value: target.count },
      ]
    : stated.length === 1
      ? [
          { type: 'number', value: stated[0].count },
          { type: 'operator', value: '=' },
          { type: 'number', value: target.count },
        ]
      : [
          { type: 'number', value: segments[0].count },
          { type: 'operator', value: '+' },
          { type: 'number', value: segments[1].count },
          { type: 'operator', value: '=' },
          { type: 'number', value: input.totalParts as number },
        ]

  return {
    status: 'accepted',
    plan: {
      contractVersion: 2,
      operation,
      wholeLabel,
      totalParts: input.totalParts as number,
      segments,
      targetRole: input.askedFor as FractionRole,
      answer: { numerator: String(target.count), denominator: String(input.totalParts) },
      formula,
      semanticSummary: segments.map((segment) => segment.role + ': ' + segment.count).join('; '),
    },
  }
}

/** A legacy remaining count has no recoverable original statement or source evidence. */
export function assessLegacyFractionForV2(input: unknown): FractionPlanResult {
  if (!isRecord(input) || input.type !== 'fraction_partition' ||
    !Number.isSafeInteger(input.totalParts) || !Number.isSafeInteger(input.selectedParts) ||
    !['selected', 'removed', 'remaining'].includes(String(input.selectedMeaning))) {
    return { status: 'rejected', reason: 'Intent pecahan lama tidak valid.' }
  }
  return {
    status: 'needs_teacher_review',
    reason: input.selectedMeaning === 'remaining'
      ? 'Intent lama hanya menyimpan jumlah sisa; jumlah awal yang disebutkan dan bukti kalimatnya tidak dapat dipulihkan dengan aman.'
      : 'Intent lama belum menyimpan kutipan bukti dan peran eksplisit untuk membuat render plan V2.',
  }
}


function evidenceFromQuote(question: string, quote: unknown): FractionEvidenceRef | null {
  if (typeof quote !== 'string' || !quote.trim()) return null
  const start = question.indexOf(quote)
  if (start < 0) return null
  return { source: 'question', start, end: start + quote.length, quote }
}

/** Converts the AI's quoted facts into offsets only when each quote occurs verbatim. */
export function buildAiFractionPlanV2(rawFacts: unknown, question: string): FractionPlanResult {
  let facts = rawFacts
  if (typeof facts === 'string') {
    try { facts = JSON.parse(facts) } catch {
      return { status: 'needs_teacher_review', reason: 'Fakta pecahan dari AI bukan JSON yang valid.' }
    }
  }
  if (!isRecord(facts) || !Array.isArray(facts.statedSegments)) {
    return { status: 'needs_teacher_review', reason: 'AI belum memberikan fakta bagian pecahan yang lengkap.' }
  }
  const totalEvidence = evidenceFromQuote(question, facts.totalEvidenceQuote)
  if (!totalEvidence) return { status: 'needs_teacher_review', reason: 'Kutipan jumlah keseluruhan dari AI tidak ditemukan persis pada soal.' }
  const statedSegments = facts.statedSegments.map((item) => {
    if (!isRecord(item)) return item
    return { ...item, evidence: evidenceFromQuote(question, item.evidenceQuote) }
  })
  if (statedSegments.some((item) => !isRecord(item) || !item.evidence)) {
    return { status: 'needs_teacher_review', reason: 'Salah satu kutipan fakta bagian dari AI tidak ditemukan persis pada soal.' }
  }
  return buildFractionRenderPlanV2({
    contractVersion: 2,
    type: 'fraction_partition',
    wholeLabel: facts.wholeLabel,
    totalParts: facts.totalParts,
    totalEvidence,
    statedSegments,
    askedFor: facts.askedFor,
    actionKey: facts.actionKey,
  }, question)
}

const DIGIT = '(\\d{1,2}|dua puluh|sembilan belas|delapan belas|tujuh belas|enam belas|lima belas|empat belas|tiga belas|dua belas|sebelas|sepuluh|sembilan|delapan|tujuh|enam|lima|empat|tiga|dua|satu)'
const NUMBER_WORD_VALUES: Record<string, number> = {
  satu: 1, sebuah: 1, seorang: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10, sebelas: 11,
  'dua belas': 12, 'tiga belas': 13, 'empat belas': 14, 'lima belas': 15,
  'enam belas': 16, 'tujuh belas': 17, 'delapan belas': 18,
  'sembilan belas': 19, 'dua puluh': 20,
}
function parseFractionCount(value: string): number | null {
  const normalized = value.toLocaleLowerCase('id-ID').trim()
  if (/^\d{1,2}$/.test(normalized)) return Number(normalized)
  return NUMBER_WORD_VALUES[normalized] ?? null
}
const PART_NOUN = '(?:bagian|potong|irisan|sektor)'

/** Narrow deterministic extraction: only supported circular wholes and explicit Indonesian wording. */
export function extractKnownFractionPlanV2(question: string): FractionPlanResult | null {
  const totalPattern = new RegExp('(?:dibagi|terbagi|dipotong)(?:\\s+menjadi)?\\s*' + DIGIT + '\\s*' + PART_NOUN, 'i')
  const totalMatch = totalPattern.exec(question)
    || new RegExp('terdiri dari\\s*' + DIGIT + '\\s*' + PART_NOUN, 'i').exec(question)
  if (!totalMatch || totalMatch.index === undefined) return null
  const totalParts = parseFractionCount(totalMatch[1])
  if (totalParts === null || !Number.isSafeInteger(totalParts) || totalParts < 2 || totalParts > 20) {
    return { status: 'needs_teacher_review', reason: 'Jumlah bagian keseluruhan berada di luar rentang visual yang aman.' }
  }

  const wholeMatch = /pizza|piza|pai|roti bundar|lingkaran/i.exec(question)
  if (!wholeMatch) {
    return { status: 'needs_teacher_review', reason: 'Bentuk benda utuh belum didukung bentuk visual yang sesuai; gambar tidak dibuat.' }
  }
  const wholeLabel = wholeMatch[0].toLocaleLowerCase('id-ID')

  const removedPattern = new RegExp(DIGIT + '\\s*' + PART_NOUN + '(?:\\s+yang)?(?:\\s+sudah)?\\s+(?:dimakan|diambil|digunakan|diberikan|terjual|hilang)', 'i')
  const selectedPattern = new RegExp(DIGIT + '\\s*' + PART_NOUN + '(?:\\s+yang)?(?:\\s+sudah)?\\s+(?:diwarnai|diberi warna|ditandai|dipilih)', 'i')
  const remainingPattern = new RegExp(DIGIT + '\\s*' + PART_NOUN + '(?:\\s+yang)?(?:\\s+masih)?\\s+(?:tersisa|(?:belum|tidak)\\s+dimakan)', 'i')
  const unselectedPattern = new RegExp(DIGIT + '\\s*' + PART_NOUN + '(?:\\s+yang)?\\s+(?:belum|tidak)\\s+(?:diwarnai|berwarna|ditandai)', 'i')

  const matches = [
    { role: 'removed' as const, actionKey: 'eaten' as const, match: removedPattern.exec(question) },
    { role: 'selected' as const, actionKey: 'colored' as const, match: selectedPattern.exec(question) },
    { role: 'remaining' as const, actionKey: 'unknown' as const, match: remainingPattern.exec(question) },
    { role: 'unselected' as const, actionKey: 'unknown' as const, match: unselectedPattern.exec(question) },
  ].filter((entry) => entry.match && entry.match.index !== undefined)

  if (!matches.length) return null
  const statedSegments = matches.slice(0, 2).map((entry) => ({
    role: entry.role,
    count: parseFractionCount(entry.match![1]) ?? -1,
    evidence: {
      source: 'question' as const,
      start: entry.match!.index!,
      end: entry.match!.index! + entry.match![0].length,
      quote: entry.match![0],
    },
  }))
  if (matches.length > 2) {
    return { status: 'needs_teacher_review', reason: 'Soal menyebut lebih dari dua kelompok bagian; perlu pemeriksaan guru.' }
  }

  const asksRemaining = /berapa[^.!?]{0,100}(?:sisa|tersisa|masih ada|tidak dimakan)|(?:berapa|tentukan)[^.!?]{0,100}(?:yang )?(?:belum dimakan|tidak dimakan|tersisa)/i.test(question)
  const asksUnselected = /berapa[^.!?]{0,100}(?:tidak|belum)\s+(?:diwarnai|berwarna|ditandai)/i.test(question)
  const asksRemoved = /berapa[^.!?]{0,100}(?:dimakan|diambil|digunakan|diberikan)/i.test(question)
  const asksSelected = /berapa[^.!?]{0,100}(?:diwarnai|diberi warna|ditandai|dipilih)/i.test(question)
  const firstRole = statedSegments[0].role
  const askedFor: FractionRole = asksRemaining
    ? 'remaining'
    : asksUnselected
      ? 'unselected'
      : asksRemoved
      ? 'removed'
      : asksSelected
        ? 'selected'
        : firstRole
  const actionKey = matches.find((entry) => entry.role === 'removed' || entry.role === 'selected')?.actionKey || 'unknown'

  const totalEvidence: FractionEvidenceRef = {
    source: 'question',
    start: totalMatch.index,
    end: totalMatch.index + totalMatch[0].length,
    quote: totalMatch[0],
  }
  return buildFractionRenderPlanV2({
    contractVersion: 2,
    type: 'fraction_partition',
    wholeLabel,
    totalParts,
    totalEvidence,
    statedSegments,
    askedFor,
    actionKey,
  }, question)
}
