import type { NumericOption } from '../types'
import { findEquivalentOptionPairs } from '../math/equivalence'

export type OptionSetValidation = {
  valid: boolean
  equivalentPairs: ReturnType<typeof findEquivalentOptionPairs>
}

/** Checks exact numeric equivalence while respecting supported unit dimensions. */
export function validateNumericOptionSet(options: NumericOption[]): OptionSetValidation {
  const equivalentPairs = findEquivalentOptionPairs(options)
  return {
    valid: equivalentPairs.length === 0,
    equivalentPairs,
  }
}
