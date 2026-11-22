import type {
  EquivalentOptionPair,
  NumericOption,
  RationalValue,
} from '../types'
import { formatFraction } from './rational'
import { areQuantitiesEquivalent, parseQuantity, type ParsedQuantity, type QuantityDimension } from './quantity'

export type ParsedNumericOption = NumericOption & {
  value: RationalValue
  dimension: QuantityDimension
  canonicalUnit: string | null
  originalUnit: string | null
}

/** Parses standalone numbers and quantities with explicitly supported units. */
export function parseNumericOptions(options: NumericOption[]): ParsedNumericOption[] {
  const parsed: ParsedNumericOption[] = []
  for (const option of options) {
    const quantity = parseQuantity(option.rawValue)
    if (!quantity) continue
    parsed.push({
      ...option,
      value: quantity.value,
      dimension: quantity.dimension,
      canonicalUnit: quantity.canonicalUnit,
      originalUnit: quantity.originalUnit,
    })
  }
  return parsed
}

/** Returns every pair of options that represents the same exact quantity. */
export function findEquivalentOptionPairs(options: NumericOption[]): EquivalentOptionPair[] {
  const parsed = parseNumericOptions(options)
  const pairs: EquivalentOptionPair[] = []

  for (let firstIndex = 0; firstIndex < parsed.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < parsed.length; secondIndex += 1) {
      const first = parsed[firstIndex]
      const second = parsed[secondIndex]
      const firstQuantity: ParsedQuantity = {
        value: first.value,
        dimension: first.dimension,
        canonicalUnit: first.canonicalUnit,
        originalUnit: first.originalUnit,
      }
      const secondQuantity: ParsedQuantity = {
        value: second.value,
        dimension: second.dimension,
        canonicalUnit: second.canonicalUnit,
        originalUnit: second.originalUnit,
      }

      if (areQuantitiesEquivalent(firstQuantity, secondQuantity)) {
        pairs.push({
          firstId: first.id,
          secondId: second.id,
          canonicalValue: first.value,
          canonicalUnit: first.canonicalUnit,
        })
      }
    }
  }
  return pairs
}

export function hasEquivalentNumericOptions(options: NumericOption[]): boolean {
  return findEquivalentOptionPairs(options).length > 0
}

export function describeEquivalentOptionPair(pair: EquivalentOptionPair): string {
  const value = formatFraction(pair.canonicalValue)
  return pair.canonicalUnit ? value + ' ' + pair.canonicalUnit : value
}
