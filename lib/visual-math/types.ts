/**
 * Canonical contracts for the AI Visual Math Engine.
 *
 * AI may propose an intent and extract facts, but calculated values must
 * always be produced and verified by deterministic code.
 */
export type RationalValue = {
  numerator: string
  denominator: string
}
export type VisualStatus = 'ready' | 'unsupported' | 'ambiguous' | 'invalid' | 'needs_teacher_review'
export type CategoryCount = { id: string; label: string; count: number }
export type CategoryOfTotalIntent = {
  type: 'category_of_total'
  categories: CategoryCount[]
  targetCategoryId: string
}
export type EqualSharingIntent = {
  type: 'equal_sharing'
  objectLabel: string
  totalObjects: number
  groupCount: number
  selectedGroupCount?: number
}
export type FractionPartitionIntent = {
  type: 'fraction_partition'
  wholeLabel: string
  totalParts: number
  selectedParts: number
  selectedMeaning: 'selected' | 'removed' | 'remaining'
}
export type NumberComparisonIntent = {
  type: 'number_comparison'
  first: RationalValue
  second: RationalValue
  requestedRelation?: 'greater' | 'less' | 'equal' | 'compare'
}
export type NumberLineIntent = {
  type: 'number_line'
  minimum: RationalValue
  maximum: RationalValue
  points: Array<{ label: string; value: RationalValue }>
}
export type GeometryIntent = {
  type: 'geometry'
  shape: 'triangle' | 'square' | 'rectangle' | 'circle' | 'cube' | 'cuboid' | 'other'
  measurements: Array<{ label: string; value: RationalValue; unit?: string }>
}
export type ChartTableIntent = {
  type: 'chart_table'
  chartType: 'bar' | 'pictograph' | 'table'
  categories: Array<{ label: string; value: number }>
}
export type VisualIntent =
  | CategoryOfTotalIntent
  | EqualSharingIntent
  | FractionPartitionIntent
  | NumberComparisonIntent
  | NumberLineIntent
  | GeometryIntent
  | ChartTableIntent
export type VisualReasonCode =
  | 'INTENT_NOT_RECOGNIZED'
  | 'FACTS_INCOMPLETE'
  | 'FACTS_CONFLICT'
  | 'INVALID_NUMBER'
  | 'DIVISION_BY_ZERO'
  | 'MATH_VALIDATION_FAILED'
  | 'EQUIVALENT_OPTIONS'
  | 'ANSWER_KEY_MISMATCH'
  | 'UNIT_MISMATCH'
  | 'RENDERER_NOT_SUPPORTED'
  | 'RENDER_FAILED'
  | 'IMAGE_BLOB_EMPTY'
  | 'UPLOAD_FAILED'
  | 'AI_RESPONSE_INVALID'
  | 'NEEDS_TEACHER_REVIEW'
export type VisualMathResult = {
  version: 1
  status: VisualStatus
  intent: VisualIntent | null
  calculatedValue: RationalValue | null
  confidence: number | null
  reasonCode: VisualReasonCode | null
  explanation: string
  trace?: {
    traceId: string
    stages: Array<{
      stage: string
      status: 'ok' | 'skipped' | 'failed'
      reasonCode?: VisualReasonCode
    }>
  }
}
export type NumericOption = { id: string; label: string; rawValue: string }
export type EquivalentOptionPair = {
  firstId: string
  secondId: string
  canonicalValue: RationalValue
  canonicalUnit?: string | null
}
