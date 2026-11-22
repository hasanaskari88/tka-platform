import { formatFraction, formatMixedNumber } from '../math/rational'
import { validateVisualIntent } from './validate-intent'
import type { VisualIntent, VisualReasonCode } from '../types'
import { buildFactGraphFromIntent } from '../semantic/build-fact-graph'
import { validateFactGraph } from '../semantic/validate-fact-graph'
import type { FactGraph, FactGraphSources } from '../contracts/facts'

export type BuildIntentResult = {
  intent: VisualIntent | null
  reasonCode: VisualReasonCode | null
  reason: string
  factGraph: FactGraph | null
  factGraphSources: FactGraphSources
}

type UnknownRecord = Record<string, unknown>

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''
}

const UNICODE_FRACTION_TEXT: Record<string, string> = {
  '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
  '⅕': '1/5', '⅖': '2/5', '⅗': '3/5', '⅘': '4/5',
  '⅙': '1/6', '⅚': '5/6', '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
}

function normalizeEvidence(value: string, maxLength = 3000): string {
  return cleanText(value, maxLength)
    .toLocaleLowerCase('id-ID')
    .replace(/([0-9]) *([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/g, (_match, whole, fraction) =>
      whole + ' ' + UNICODE_FRACTION_TEXT[fraction],
    )
    .replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (fraction) => UNICODE_FRACTION_TEXT[fraction])
}

const NUMBER_WORDS: Record<number, string[]> = {
  0: ['nol', 'kosong'], 1: ['satu', 'sebuah', 'seorang'], 2: ['dua'], 3: ['tiga'],
  4: ['empat'], 5: ['lima'], 6: ['enam'], 7: ['tujuh'], 8: ['delapan'],
  9: ['sembilan'], 10: ['sepuluh'], 11: ['sebelas'], 12: ['dua belas'],
  13: ['tiga belas'], 14: ['empat belas'], 15: ['lima belas'],
  16: ['enam belas'], 17: ['tujuh belas'], 18: ['delapan belas'],
  19: ['sembilan belas'], 20: ['dua puluh'],
  21: ['dua puluh satu'], 22: ['dua puluh dua'], 23: ['dua puluh tiga'],
  24: ['dua puluh empat'], 25: ['dua puluh lima'], 26: ['dua puluh enam'],
  27: ['dua puluh tujuh'], 28: ['dua puluh delapan'], 29: ['dua puluh sembilan'],
  30: ['tiga puluh'], 31: ['tiga puluh satu'], 32: ['tiga puluh dua'],
  33: ['tiga puluh tiga'], 34: ['tiga puluh empat'], 35: ['tiga puluh lima'],
  36: ['tiga puluh enam'], 37: ['tiga puluh tujuh'], 38: ['tiga puluh delapan'],
  39: ['tiga puluh sembilan'], 40: ['empat puluh'],
}

function containsNumber(evidence: string, value: number): boolean {
  const digits = new RegExp('(^|[^0-9])' + String(value) + '([^0-9]|$)')
  return digits.test(evidence) || (NUMBER_WORDS[value] || []).some((word) =>
    new RegExp('(^|[^a-z])' + word.replace(/ /g, '\\s+') + '([^a-z]|$)', 'i').test(evidence),
  )
}

function containsRational(evidence: string, value: { numerator: string; denominator: string }): boolean {
  const fraction = formatFraction(value)
  const mixed = formatMixedNumber(value)
  if (evidence.includes(fraction) || evidence.includes(mixed)) return true
  const numerator = Number(value.numerator)
  const denominator = Number(value.denominator)
  const decimal = numerator / denominator
  if (Number.isFinite(decimal)) {
    const decimalText = String(Number(decimal.toPrecision(10)))
    if (evidence.includes(decimalText) || evidence.includes(decimalText.replace('.', ','))) return true
  }
  return denominator === 1 && containsNumber(evidence, numerator)
}

function verifyIntentEvidence(intent: VisualIntent, evidence: string): boolean {
  const text = normalizeEvidence(evidence, 700)
  if (!text) return false
  const hasText = (value: string) => text.includes(value.toLocaleLowerCase('id-ID'))
  switch (intent.type) {
    case 'category_of_total':
      return /bagian|pecahan|total|keseluruhan|jumlah/.test(text) &&
        intent.categories.every((item) => hasText(item.label) && containsNumber(text, item.count)) &&
        intent.categories.some((item) => item.id === intent.targetCategoryId && hasText(item.label))
    case 'equal_sharing':
      return /dibagi|dibagikan|membagi|sama rata/.test(text) &&
        hasText(intent.objectLabel) && containsNumber(text, intent.totalObjects) &&
        containsNumber(text, intent.groupCount) &&
        ((intent.selectedGroupCount ?? 1) === 1 || containsNumber(text, intent.selectedGroupCount ?? 1))
    case 'fraction_partition':
      return /dibagi|terbagi|dipotong|diwarnai|dimakan|tersisa|sisa/.test(text) &&
        hasText(intent.wholeLabel) && containsNumber(text, intent.totalParts) &&
        containsNumber(text, intent.selectedParts)
    case 'number_comparison':
      return /bandingkan|perbandingan|lebih besar|lebih kecil|urutkan/.test(text) &&
        containsRational(text, intent.first) && containsRational(text, intent.second)
    case 'number_line':
      return /garis bilangan|letakkan|titik|antara/.test(text) &&
        containsRational(text, intent.minimum) && containsRational(text, intent.maximum) &&
        intent.points.every((point) => hasText(point.label) && containsRational(text, point.value))
    case 'geometry': {
      const shapeWords: Record<string, string[]> = {
        triangle: ['segitiga'], square: ['persegi'], rectangle: ['persegi panjang', 'persegi'],
        circle: ['lingkaran', 'lingkar'], cube: ['kubus'], cuboid: ['balok'],
      }
      return (shapeWords[intent.shape] || []).some(hasText) &&
        intent.measurements.every((item) => hasText(item.label) &&
          containsRational(text, item.value) && (!item.unit || hasText(item.unit)))
    }
    case 'chart_table':
      return /diagram|grafik|tabel|data/.test(text) &&
        intent.categories.every((item) => hasText(item.label) && containsNumber(text, item.value))
  }
}

/** Builds an intent only when its bounded facts are supported by a literal question excerpt. */
export function buildAiVisualIntent(raw: UnknownRecord, question: string): BuildIntentResult {
  if (raw.intentType === 'none') {
    return {
      intent: null,
      reasonCode: 'INTENT_NOT_RECOGNIZED',
      reason: cleanText(raw.reason, 240) || 'Soal tidak memerlukan visual matematika yang didukung.',
      factGraph: null,
      factGraphSources: {},
    }
  }

  if (!['category_of_total', 'equal_sharing', 'fraction_partition', 'number_comparison', 'number_line', 'geometry', 'chart_table'].includes(String(raw.intentType))) {
    return { intent: null, reasonCode: 'AI_RESPONSE_INVALID', reason: 'Jenis intent dari AI tidak dikenal.', factGraph: null, factGraphSources: {} }
  }

  let facts: unknown
  try {
    facts = typeof raw.facts === 'string' ? JSON.parse(raw.facts) : raw.facts
  } catch {
    return { intent: null, reasonCode: 'AI_RESPONSE_INVALID', reason: 'Data fakta dari AI bukan JSON yang valid.', factGraph: null, factGraphSources: {} }
  }
  if (!facts || typeof facts !== 'object' || Array.isArray(facts)) {
    return { intent: null, reasonCode: 'FACTS_INCOMPLETE', reason: 'AI belum memberikan fakta terstruktur.', factGraph: null, factGraphSources: {} }
  }

  const candidate = { ...(facts as Record<string, unknown>), type: raw.intentType }
  const intent = validateVisualIntent(candidate)
  if (!intent) {
    return { intent: null, reasonCode: 'AI_RESPONSE_INVALID', reason: 'Fakta AI tidak lolos validasi struktur atau batas keamanan.', factGraph: null, factGraphSources: {} }
  }

  const evidence = typeof raw.evidence === 'string' ? raw.evidence : ''
  const normalizedQuestion = normalizeEvidence(question)
  const normalizedQuote = normalizeEvidence(evidence, 700)
  if (!normalizedQuote || !normalizedQuestion.includes(normalizedQuote) || !verifyIntentEvidence(intent, evidence)) {
    return {
      intent: null,
      reasonCode: 'FACTS_INCOMPLETE',
      reason: 'Fakta yang dipilih AI tidak dapat dicocokkan dengan kutipan bukti pada teks soal. Gambar dihentikan agar tidak menebak.',
      factGraph: null,
      factGraphSources: {},
    }
  }

  const graphResult = buildFactGraphFromIntent(intent, evidence, question)
  if (!graphResult.graph) {
    return {
      intent: null,
      reasonCode: 'FACTS_INCOMPLETE',
      reason: graphResult.reason || 'Graf fakta tidak dapat dibentuk dari bukti soal.',
      factGraph: null,
      factGraphSources: graphResult.sources,
    }
  }
  const semantic = validateFactGraph(graphResult.graph, graphResult.sources)
  if (semantic.status !== 'accepted') {
    return {
      intent: null,
      reasonCode: semantic.reasonCode || 'FACTS_INCOMPLETE',
      reason: semantic.message,
      factGraph: null,
      factGraphSources: graphResult.sources,
    }
  }

  return {
    intent,
    reasonCode: null,
    reason: cleanText(raw.reason, 240),
    factGraph: graphResult.graph,
    factGraphSources: graphResult.sources,
  }
}
