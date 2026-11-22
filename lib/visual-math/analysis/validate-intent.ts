import { compare, simplify } from '../math/rational'
import type {
  CategoryOfTotalIntent, ChartTableIntent, EqualSharingIntent, FractionPartitionIntent,
  GeometryIntent, NumberComparisonIntent, NumberLineIntent, RationalValue, VisualIntent,
} from '../types'

type UnknownRecord = Record<string, unknown>
const MAX_LABEL = 40
const MAX_RATIONAL_DIGITS = 30

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown, max = MAX_LABEL): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max
}

function isSafeNonNegativeInteger(value: unknown, max = 100): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
}

function isCanonicalRational(value: unknown): value is RationalValue {
  if (!isRecord(value)) return false
  if (typeof value.numerator !== 'string' || typeof value.denominator !== 'string') return false
  if (value.numerator.length > MAX_RATIONAL_DIGITS || value.denominator.length > MAX_RATIONAL_DIGITS) return false
  return /^-?\d+$/.test(value.numerator) && /^[1-9]\d*$/.test(value.denominator)
}

function validateCategoryOfTotal(value: UnknownRecord): CategoryOfTotalIntent | null {
  if (!Array.isArray(value.categories) || value.categories.length < 2 || value.categories.length > 4 ||
    !isText(value.targetCategoryId, 40)) return null
  const categories = value.categories.map((item) => {
    if (!isRecord(item) || !isText(item.id, 40) || !isText(item.label) ||
      !isSafeNonNegativeInteger(item.count, 40)) return null
    return { id: item.id.trim(), label: item.label.trim(), count: item.count }
  })
  if (categories.some((item) => item === null)) return null
  const validCategories = categories as CategoryOfTotalIntent['categories']
  const ids = validCategories.map((item) => item.id)
  if (new Set(ids).size !== ids.length || new Set(validCategories.map((item) => item.label.toLocaleLowerCase('id-ID'))).size !== ids.length) return null
  if (!ids.includes(value.targetCategoryId)) return null
  const total = validCategories.reduce((sum, item) => sum + item.count, 0)
  if (!Number.isSafeInteger(total) || total <= 0 || total > 40) return null
  return { type: 'category_of_total', categories: validCategories, targetCategoryId: value.targetCategoryId }
}

function validateEqualSharing(value: UnknownRecord): EqualSharingIntent | null {
  if (!isText(value.objectLabel) || !isSafeNonNegativeInteger(value.totalObjects, 40) ||
    value.totalObjects === 0 || !Number.isSafeInteger(value.groupCount) ||
    (value.groupCount as number) < 2 || (value.groupCount as number) > 12) return null
  if (value.selectedGroupCount !== undefined &&
    (!Number.isSafeInteger(value.selectedGroupCount) || (value.selectedGroupCount as number) < 1 ||
      (value.selectedGroupCount as number) > (value.groupCount as number))) return null
  return {
    type: 'equal_sharing', objectLabel: value.objectLabel.trim(), totalObjects: value.totalObjects,
    groupCount: value.groupCount as number,
    selectedGroupCount: value.selectedGroupCount as number | undefined,
  }
}

function validateFractionPartition(value: UnknownRecord): FractionPartitionIntent | null {
  if (!isText(value.wholeLabel) || !Number.isSafeInteger(value.totalParts) ||
    (value.totalParts as number) < 2 || (value.totalParts as number) > 20 ||
    !isSafeNonNegativeInteger(value.selectedParts, 20) ||
    (value.selectedParts as number) > (value.totalParts as number)) return null
  if (!['selected', 'removed', 'remaining'].includes(String(value.selectedMeaning))) return null
  return {
    type: 'fraction_partition', wholeLabel: value.wholeLabel.trim(), totalParts: value.totalParts as number,
    selectedParts: value.selectedParts as number, selectedMeaning: value.selectedMeaning as FractionPartitionIntent['selectedMeaning'],
  }
}

function validateNumberComparison(value: UnknownRecord): NumberComparisonIntent | null {
  if (!isCanonicalRational(value.first) || !isCanonicalRational(value.second)) return null
  if (value.requestedRelation !== undefined &&
    !['greater', 'less', 'equal', 'compare'].includes(String(value.requestedRelation))) return null
  return {
    type: 'number_comparison', first: simplify(value.first), second: simplify(value.second),
    requestedRelation: value.requestedRelation as NumberComparisonIntent['requestedRelation'],
  }
}

function validateNumberLine(value: UnknownRecord): NumberLineIntent | null {
  if (!isCanonicalRational(value.minimum) || !isCanonicalRational(value.maximum)) return null
  const minimum = simplify(value.minimum)
  const maximum = simplify(value.maximum)
  if (compare(minimum, maximum) >= 0 || !Array.isArray(value.points) || value.points.length < 1 || value.points.length > 10) return null
  const points = value.points.map((point) => {
    if (!isRecord(point) || !isText(point.label) || !isCanonicalRational(point.value)) return null
    return { label: point.label.trim(), value: simplify(point.value) }
  })
  if (points.some((point) => point === null)) return null
  const validPoints = points as NumberLineIntent['points']
  if (validPoints.some((point) => compare(point.value, minimum) < 0 || compare(point.value, maximum) > 0)) return null
  return { type: 'number_line', minimum, maximum, points: validPoints }
}

function validateGeometry(value: UnknownRecord): GeometryIntent | null {
  const shapes = ['triangle', 'square', 'rectangle', 'circle', 'cube', 'cuboid']
  if (!shapes.includes(String(value.shape)) || !Array.isArray(value.measurements) ||
    value.measurements.length < 1 || value.measurements.length > 4) return null
  const measurements = value.measurements.map((measurement) => {
    if (!isRecord(measurement) || !isText(measurement.label) || !isCanonicalRational(measurement.value) ||
      (measurement.unit !== undefined && !isText(measurement.unit, 20))) return null
    return { label: measurement.label.trim(), value: simplify(measurement.value), unit: measurement.unit as string | undefined }
  })
  if (measurements.some((measurement) => measurement === null)) return null
  return { type: 'geometry', shape: value.shape as GeometryIntent['shape'], measurements: measurements as GeometryIntent['measurements'] }
}

function validateChartTable(value: UnknownRecord): ChartTableIntent | null {
  if (!['bar', 'pictograph', 'table'].includes(String(value.chartType)) ||
    !Array.isArray(value.categories) || value.categories.length < 1 || value.categories.length > 10) return null
  const categories = value.categories.map((category) => {
    if (!isRecord(category) || !isText(category.label) || !isSafeNonNegativeInteger(category.value, 100)) return null
    return { label: category.label.trim(), value: category.value }
  })
  if (categories.some((category) => category === null)) return null
  return { type: 'chart_table', chartType: value.chartType as ChartTableIntent['chartType'], categories: categories as ChartTableIntent['categories'] }
}

/** Validates untrusted AI facts before they can reach calculation or a renderer. */
export function validateVisualIntent(input: unknown): VisualIntent | null {
  if (!isRecord(input) || typeof input.type !== 'string') return null
  switch (input.type) {
    case 'category_of_total': return validateCategoryOfTotal(input)
    case 'equal_sharing': return validateEqualSharing(input)
    case 'fraction_partition': return validateFractionPartition(input)
    case 'number_comparison': return validateNumberComparison(input)
    case 'number_line': return validateNumberLine(input)
    case 'geometry': return validateGeometry(input)
    case 'chart_table': return validateChartTable(input)
    default: return null
  }
}
