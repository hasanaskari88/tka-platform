import type { RationalValue } from '../types'

export type MixedNumberParts = {
  sign: -1 | 1
  whole: string
  numerator: string
  denominator: string
  isInteger: boolean
}

const ZERO = BigInt(0)
const ONE = BigInt(1)
const TEN = BigInt(10)

function abs(value: bigint): bigint {
  return value < ZERO ? -value : value
}

function gcd(a: bigint, b: bigint): bigint {
  let left = abs(a)
  let right = abs(b)
  while (right !== ZERO) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left === ZERO ? ONE : left
}

function makeRational(numerator: bigint, denominator: bigint): RationalValue {
  if (denominator === ZERO) throw new Error('Denominator must not be zero')
  const sign = denominator < ZERO ? BigInt(-1) : ONE
  const divisor = gcd(numerator, denominator)
  return {
    numerator: ((numerator / divisor) * sign).toString(),
    denominator: (abs(denominator) / divisor).toString(),
  }
}

function toBigInt(value: RationalValue): [bigint, bigint] {
  const numerator = BigInt(value.numerator)
  const denominator = BigInt(value.denominator)
  if (denominator === ZERO) throw new Error('Denominator must not be zero')
  return [numerator, denominator]
}

export function rational(
  numerator: bigint | number | string,
  denominator: bigint | number | string = ONE,
): RationalValue {
  return makeRational(BigInt(numerator), BigInt(denominator))
}

export function simplify(value: RationalValue): RationalValue {
  const [numerator, denominator] = toBigInt(value)
  return makeRational(numerator, denominator)
}

export function add(first: RationalValue, second: RationalValue): RationalValue {
  const [a, b] = toBigInt(first)
  const [c, d] = toBigInt(second)
  return makeRational(a * d + c * b, b * d)
}

export function subtract(first: RationalValue, second: RationalValue): RationalValue {
  const [a, b] = toBigInt(first)
  const [c, d] = toBigInt(second)
  return makeRational(a * d - c * b, b * d)
}

export function multiply(first: RationalValue, second: RationalValue): RationalValue {
  const [a, b] = toBigInt(first)
  const [c, d] = toBigInt(second)
  return makeRational(a * c, b * d)
}

export function divide(first: RationalValue, second: RationalValue): RationalValue {
  const [a, b] = toBigInt(first)
  const [c, d] = toBigInt(second)
  if (c === ZERO) throw new Error('Cannot divide by zero')
  return makeRational(a * d, b * c)
}

export function compare(first: RationalValue, second: RationalValue): -1 | 0 | 1 {
  const [a, b] = toBigInt(first)
  const [c, d] = toBigInt(second)
  const difference = a * d - c * b
  if (difference < ZERO) return -1
  if (difference > ZERO) return 1
  return 0
}

export function areEquivalent(first: RationalValue, second: RationalValue): boolean {
  return compare(first, second) === 0
}

export function isInteger(value: RationalValue): boolean {
  const [, denominator] = toBigInt(value)
  return denominator === ONE
}

export function formatFraction(value: RationalValue): string {
  const normalized = simplify(value)
  return normalized.denominator === '1'
    ? normalized.numerator
    : normalized.numerator + '/' + normalized.denominator
}

export function toMixedNumber(value: RationalValue): MixedNumberParts {
  const [numerator, denominator] = toBigInt(simplify(value))
  const sign: -1 | 1 = numerator < ZERO ? -1 : 1
  const absoluteNumerator = abs(numerator)
  const whole = absoluteNumerator / denominator
  const remainder = absoluteNumerator % denominator
  return {
    sign,
    whole: whole.toString(),
    numerator: remainder.toString(),
    denominator: denominator.toString(),
    isInteger: remainder === ZERO,
  }
}

export function formatMixedNumber(value: RationalValue): string {
  const parts = toMixedNumber(value)
  const prefix = parts.sign < 0 ? '-' : ''
  if (parts.isInteger) return prefix + parts.whole
  if (parts.whole === '0') return prefix + parts.numerator + '/' + parts.denominator
  return prefix + parts.whole + ' ' + parts.numerator + '/' + parts.denominator
}

function parseDecimal(input: string): RationalValue | null {
  const match = input.match(/^([+-]?)(?:(\d+)(?:[.,](\d*))?|[.,](\d+))$/)
  if (!match) return null
  const sign = match[1] === '-' ? BigInt(-1) : ONE
  const whole = match[2] || '0'
  const fractionDigits = match[3] ?? match[4] ?? ''
  if (fractionDigits.length > 12) return null
  // In Indonesian notation, 1.000 may mean one thousand; in other locales it
  // may mean one. Reject ambiguous three-digit grouping instead of guessing.
  if (fractionDigits.length === 3 && whole !== '0' && whole !== '') return null
  const denominator = TEN ** BigInt(fractionDigits.length)
  const fraction = fractionDigits ? BigInt(fractionDigits) : ZERO
  return makeRational(sign * (BigInt(whole) * denominator + fraction), denominator)
}

function normalizeInput(input: string): string {
  return input
    .trim()
    .replace(/[−–—]/g, '-')
    .replace(/\\left|\\right/g, '')
    .replace(/\\dfrac|\\tfrac/g, '\\frac')
    .replace(/^\$+|\$+$/g, '')
    .replace(/^\\\(|\\\)$/g, '')
    .replace(/^\\\[|\\\]$/g, '')
    .trim()
}

const UNICODE_FRACTIONS: Record<string, [string, string]> = {
  '½': ['1', '2'], '⅓': ['1', '3'], '⅔': ['2', '3'],
  '¼': ['1', '4'], '¾': ['3', '4'],
  '⅕': ['1', '5'], '⅖': ['2', '5'], '⅗': ['3', '5'], '⅘': ['4', '5'],
  '⅙': ['1', '6'], '⅚': ['5', '6'],
  '⅛': ['1', '8'], '⅜': ['3', '8'], '⅝': ['5', '8'], '⅞': ['7', '8'],
}

/**
 * Parses standalone numeric values into exact rationals.
 * Supports integers, fractions, mixed numbers, LaTeX fractions, decimals,
 * percentages, and common Unicode fraction glyphs.
 * Unit-bearing values and algebraic expressions are intentionally rejected.
 */
function parseRationalUnsafe(rawInput: string): RationalValue | null {
  if (!rawInput || typeof rawInput !== 'string') return null
  let input = normalizeInput(rawInput)
  if (!input) return null

  const percent = input.endsWith('%')
  if (percent) input = input.slice(0, -1).trim()

  let result: RationalValue | null = null

  const mixedLatex = input.match(/^([+-]?\d+)\s*\\frac\{(\d+)\}\{(\d+)\}$/)
  if (mixedLatex) {
    const whole = BigInt(mixedLatex[1])
    const numerator = BigInt(mixedLatex[2])
    const denominator = BigInt(mixedLatex[3])
    const sign = mixedLatex[1].startsWith('-') ? BigInt(-1) : ONE
    result = makeRational(sign * (abs(whole) * denominator + numerator), denominator)
  }

  if (!result) {
    const latexFraction = input.match(/^([+-]?)\\frac\{([+-]?\d+)\}\{([+-]?\d+)\}$/)
    if (latexFraction) {
      const sign = latexFraction[1] === '-' ? BigInt(-1) : ONE
      result = makeRational(sign * BigInt(latexFraction[2]), BigInt(latexFraction[3]))
    }
  }

  if (!result) {
    const mixed = input.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/)
    if (mixed) {
      const whole = BigInt(mixed[1])
      const numerator = BigInt(mixed[2])
      const denominator = BigInt(mixed[3])
      const sign = mixed[1].startsWith('-') ? BigInt(-1) : ONE
      result = makeRational(sign * (abs(whole) * denominator + numerator), denominator)
    }
  }

  if (!result) {
    const fraction = input.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/)
    if (fraction) result = makeRational(BigInt(fraction[1]), BigInt(fraction[2]))
  }

  if (!result && UNICODE_FRACTIONS[input]) {
    const [numerator, denominator] = UNICODE_FRACTIONS[input]
    result = makeRational(BigInt(numerator), BigInt(denominator))
  }

  if (!result) {
    const unicodeMixed = input.match(/^([+-]?\d+)\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])$/)
    if (unicodeMixed) {
      const [numerator, denominator] = UNICODE_FRACTIONS[unicodeMixed[2]]
      const whole = BigInt(unicodeMixed[1])
      const sign = unicodeMixed[1].startsWith('-') ? BigInt(-1) : ONE
      result = makeRational(
        sign * (abs(whole) * BigInt(denominator) + BigInt(numerator)),
        BigInt(denominator),
      )
    }
  }

  if (!result) result = parseDecimal(input)
  if (!result) return null
  return percent ? divide(result, rational(100)) : simplify(result)
}


/** Invalid or zero-denominator input is rejected as null, never thrown. */
export function parseRational(rawInput: string): RationalValue | null {
  try {
    return parseRationalUnsafe(rawInput)
  } catch {
    return null
  }
}
