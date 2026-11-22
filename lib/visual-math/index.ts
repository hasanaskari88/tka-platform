export * from './types'
export { validateVisualIntent } from './analysis/validate-intent'
export {
  add,
  areEquivalent,
  compare,
  divide,
  formatFraction,
  formatMixedNumber,
  isInteger,
  multiply,
  parseRational,
  rational,
  simplify,
  subtract,
  toMixedNumber,
  findEquivalentOptionPairs,
  hasEquivalentNumericOptions,
  parseNumericOptions,
  parseQuantity,
  areQuantitiesEquivalent,
  calculateVisualIntent,
} from './math'
export type {
  IntentCalculation,
  MixedNumberParts,
  ParsedNumericOption,
  ParsedQuantity,
  QuantityDimension,
} from './math'
export { getVisualReasonMessage, VISUAL_REASON_MESSAGES } from './diagnostics/reason-codes'

export {
  calculateKnownAnswer,
  extractEqualSharingFacts,
  extractFractionPartitionFacts,
  extractFruitCategories,
  extractKnownVisualIntent,
  extractTargetFruit,
} from './analysis/known-patterns'

export {
  validateNumericOptionSet,
  validateKnownNumericAnswer,
} from './validation'
export type {
  OptionSetValidation,
  KnownAnswerValidation,
} from './validation'
