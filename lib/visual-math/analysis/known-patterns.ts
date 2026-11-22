import type {
  CategoryOfTotalIntent,
  EqualSharingIntent,
  FractionPartitionIntent,
  RationalValue,
  VisualIntent,
} from '../types'
import { calculateVisualIntent } from '../math/calculator'
import { parseRational } from '../math/rational'
import { validateVisualIntent } from './validate-intent'

export type KnownFruitName = 'jeruk' | 'pisang' | 'apel'

export type KnownFruitCategory = {
  id: KnownFruitName
  label: KnownFruitName
  count: number
}

export type KnownSharingFacts = {
  totalObjects: number
  objectLabel: string
  groupCount: number
  selectedGroupCount: number
}

const NUMBER_WORDS: Record<string, number> = {
  satu: 1,
  sebuah: 1,
  seorang: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10,
  sebelas: 11,
  'dua belas': 12,
  'tiga belas': 13,
  'empat belas': 14,
  'lima belas': 15,
  'enam belas': 16,
  'tujuh belas': 17,
  'delapan belas': 18,
  'sembilan belas': 19,
  'dua puluh': 20,
}

const NUMBER_PATTERN =
  '(\\d{1,2}|dua puluh|sembilan belas|delapan belas|tujuh belas|enam belas|lima belas|empat belas|tiga belas|dua belas|sebelas|sepuluh|sembilan|delapan|tujuh|enam|lima|empat|tiga|dua|satu|sebuah|seorang)'

function normalizeQuestion(question: string): string {
  return question
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('id-ID')
}

export function parseIndonesianCount(value: string): number | null {
  const normalized = value.toLocaleLowerCase('id-ID').trim()
  if (/^\d+$/.test(normalized)) {
    const number = Number(normalized)
    return Number.isSafeInteger(number) ? number : null
  }
  return NUMBER_WORDS[normalized] ?? null
}

/** Recognizes a limited, explicit set of fruit-category word problems. */
export function extractFruitCategories(question: string): KnownFruitCategory[] | null {
  const source = normalizeQuestion(question)
  const pattern = new RegExp(
    NUMBER_PATTERN + '\\s*(?:buah\\s*)?(jeruk|pisang|apel)\\b',
    'g',
  )
  const found: KnownFruitCategory[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(source)) !== null) {
    const count = parseIndonesianCount(match[1])
    const fruit = match[2] as KnownFruitName
    if (count === null || count < 0 || count > 40) return null
    if (found.some((item) => item.id === fruit)) return null
    found.push({ id: fruit, label: fruit, count })
  }

  const totalCount = found.reduce((sum, item) => sum + item.count, 0)
  return found.length >= 2 && totalCount <= 40 ? found : null
}

export function extractTargetFruit(question: string): KnownFruitName | null {
  const source = normalizeQuestion(question)
  // Jika soal menanyakan gabungan dua kategori, jangan memilih salah satunya.
  if (/\b(?:jeruk|pisang|apel)\s+(?:dan|atau)\s+(?:jeruk|pisang|apel)\b/.test(source)) {
    return null
  }
  const patterns = [
    /(?:merupakan|adalah|berupa|termasuk)\s+(?:buah\s+)?(jeruk|pisang|apel)\b/,
    /(?:berapa|bagian|pecahan|jumlah)[^.!?]{0,100}\b(jeruk|pisang|apel)\b/,
  ]

  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (match) return match[1] as KnownFruitName
  }
  return null
}

/** Recognizes explicit equal-sharing statements with supported object nouns. */
export function extractEqualSharingFacts(question: string): KnownSharingFacts | null {
  const source = normalizeQuestion(question)
  const objectPattern = new RegExp(
    NUMBER_PATTERN + '\\s*(?:buah\\s*)?(jeruk|pisang|apel|bola|kelereng|permen|koin)\\b',
  )
  const objectMatch = source.match(objectPattern)
  if (!objectMatch) return null

  const totalObjects = parseIndonesianCount(objectMatch[1])
  if (totalObjects === null || totalObjects < 1 || totalObjects > 40) return null

  const groupPattern = new RegExp(
    '(?:dibagi|dibagikan)(?:\\s+(?:rata|sama rata))?(?:\\s+(?:menjadi|kepada|ke dalam|ke|dalam))?\\s*' +
      NUMBER_PATTERN +
      '\\s*(bagian|kelompok|orang|anak|siswa|murid|wadah|keranjang|piring)',
  )
  const groupMatch = source.match(groupPattern)
  if (!groupMatch) return null

  const groupCount = parseIndonesianCount(groupMatch[1])
  if (groupCount === null || groupCount < 2 || groupCount > 12) return null

  const selectedPattern = new RegExp(
    '\\b(?:di|dalam|pada|untuk)\\s+' + NUMBER_PATTERN + '\\s*(bagian|kelompok|orang|anak)\\b',
    'g',
  )
  const selectedMatches = Array.from(source.matchAll(selectedPattern))
  const selectedGroupCount = selectedMatches.length
    ? parseIndonesianCount(selectedMatches[selectedMatches.length - 1][1]) ?? 1
    : 1

  return {
    totalObjects,
    objectLabel: objectMatch[2],
    groupCount,
    selectedGroupCount,
  }
}


export function extractFractionPartitionFacts(question: string): FractionPartitionIntent | null {
  const source = normalizeQuestion(question)
  const totalPattern = new RegExp(
    '(?:dibagi|terbagi|dipotong)(?:\\s+menjadi)?\\s*' +
      NUMBER_PATTERN +
      '\\s*(bagian|potong|irisan|sektor)',
  )
  const totalMatch =
    source.match(totalPattern) ||
    source.match(new RegExp('terdiri dari\\s*' + NUMBER_PATTERN + '\\s*(bagian|sektor)'))
  if (!totalMatch) return null

  const totalParts = parseIndonesianCount(totalMatch[1])
  if (totalParts === null || totalParts < 2 || totalParts > 20) return null

  const eatenMatch =
    source.match(new RegExp(NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)\\s*(?:sudah\\s*)?dimakan')) ||
    source.match(new RegExp('dimakan\\s*' + NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)'))

  const markedMatch =
    source.match(new RegExp(
      NUMBER_PATTERN +
      '\\s*(bagian|potong|irisan|sektor)\\s*(?:(?:yang\\s*)?(?:di antaranya\\s*)?)?(?:sudah\\s*)?(?:diwarnai|diberi warna|berwarna|terisi|diisi|ditandai|tersisa)',
    )) ||
    source.match(new RegExp(
      '(?:sisa|tersisa)\\s*' + NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)',
    ))

  const explicitRemainingMatch =
    source.match(new RegExp(
      '(?:sisa|tersisa|masih ada)\\s*' + NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)',
    )) ||
    source.match(new RegExp(
      NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)\\s*(?:yang\\s*)?(?:masih\\s*)?tersisa',
    )) ||
    source.match(new RegExp(
      NUMBER_PATTERN + '\\s*(bagian|potong|irisan|sektor)\\s*(?:yang\\s*)?(?:belum|tidak)\\s*(?:diwarnai|berwarna|terisi|diisi)',
    ))

  const asksRemaining = /sisa|tersisa|masih ada|belum dimakan|belum diwarnai|tidak diwarnai|belum berwarna|tidak berwarna|belum terisi|tidak terisi/.test(source)
  let selectedParts: number
  let selectedMeaning: FractionPartitionIntent['selectedMeaning']

  if (asksRemaining && explicitRemainingMatch) {
    const remaining = parseIndonesianCount(explicitRemainingMatch[1])
    if (remaining === null || remaining < 0 || remaining > totalParts) return null
    selectedParts = remaining
    selectedMeaning = 'remaining'
  } else if (asksRemaining && (eatenMatch || markedMatch)) {
    const removedMatch = eatenMatch ?? markedMatch
    if (!removedMatch) return null
    const removed = parseIndonesianCount(removedMatch[1])
    if (removed === null || removed < 0 || removed > totalParts) return null
    selectedParts = totalParts - removed
    selectedMeaning = 'remaining'
  } else if (eatenMatch) {
    const eaten = parseIndonesianCount(eatenMatch[1])
    if (eaten === null || eaten < 0 || eaten > totalParts) return null
    selectedParts = eaten
    selectedMeaning = 'removed'
  } else if (markedMatch) {
    const marked = parseIndonesianCount(markedMatch[1])
    if (marked === null || marked < 0 || marked > totalParts) return null
    selectedParts = marked
    selectedMeaning = asksRemaining ? 'remaining' : 'selected'
  } else {
    return null
  }

  const wholeLabel = /pizza|piza/.test(source)
    ? 'pizza'
    : /pai/.test(source)
      ? 'pai'
      : /apel|apple/.test(source)
        ? 'apel'
        : /roti bundar/.test(source)
          ? 'roti bundar'
          : 'keseluruhan'

  return {
    type: 'fraction_partition',
    wholeLabel,
    totalParts,
    selectedParts,
    selectedMeaning,
  }
}

/** Recognizes explicit numeric comparison instructions without guessing context. */
export function extractNumberComparisonIntent(question: string): VisualIntent | null {
  const source = normalizeQuestion(question)
  const hasIntent = /\b(bandingkan|perbandingan|lebih besar|lebih kecil|paling besar|paling kecil|urutkan|manakah yang lebih|mana yang lebih)\b/.test(source)
  if (!hasIntent) return null

  const number = '(-?\\d+\\s+\\d+\\s*\\/\\s*\\d+|-?\\d+\\s*\\/\\s*\\d+|-?\\d+(?:[.,]\\d+)?|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])'
  const patterns = [
    new RegExp(number + '\\s*(?:atau|dan|dibandingkan dengan|dengan|versus)\\s*' + number),
    new RegExp('antara\\s*' + number + '\\s*(?:dan|atau)\\s*' + number),
  ]
  for (const pattern of patterns) {
    const match = source.match(pattern)
    if (!match) continue
    const first = parseRational(match[1])
    const second = parseRational(match[2])
    if (!first || !second) continue
    return validateVisualIntent({
      type: 'number_comparison',
      first,
      second,
      requestedRelation: 'compare',
    })
  }
  return null
}

/**
 * Extracts only known, text-checkable intents. Unsupported language patterns
 * return null and must be reviewed or handled by a future semantic adapter.
 */
export function extractKnownVisualIntent(question: string): VisualIntent | null {
  const categories = extractFruitCategories(question)
  const targetCategoryId = extractTargetFruit(question)

  if (categories && targetCategoryId) {
    const intent: CategoryOfTotalIntent = {
      type: 'category_of_total',
      categories,
      targetCategoryId,
    }
    return validateVisualIntent(intent)
  }

  const comparison = extractNumberComparisonIntent(question)
  if (comparison) return comparison

  const sharing = extractEqualSharingFacts(question)
  if (sharing) {
    const intent: EqualSharingIntent = {
      type: 'equal_sharing',
      totalObjects: sharing.totalObjects,
      objectLabel: sharing.objectLabel,
      groupCount: sharing.groupCount,
      selectedGroupCount: sharing.selectedGroupCount,
    }
    return validateVisualIntent(intent)
  }

  const fractionIntent = extractFractionPartitionFacts(question)
  return fractionIntent ? validateVisualIntent(fractionIntent) : null
}

/** Returns an exact answer only for patterns understood deterministically. */
export function calculateKnownAnswer(question: string): RationalValue | null {
  const intent = extractKnownVisualIntent(question)
  if (!intent) return null
  const result = calculateVisualIntent(intent)
  return result.status === 'ready' ? result.value : null
}
