import { compare, simplify } from '../math/rational'
import type {
  CategoryOfTotalIntent,
  ChartTableIntent,
  EqualSharingIntent,
  FractionPartitionIntent,
  GeometryIntent,
  NumberComparisonIntent,
  NumberLineIntent,
  RationalValue,
  VisualIntent,
} from '../types'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isSafeNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isCanonicalRational(value: unknown): value is RationalValue {
  if (!isRecord(value)) return false
  if (typeof value.numerator !== 'string' || typeof value.denominator !== 'string') {
    return false
  }
  if (!/^-?\d+$/.test(value.numerator) || !/^[1-9]\d*$/.test(value.denominator)) {
    return false
  }
  return true
}

function validateCategoryOfTotal(value: UnknownRecord): CategoryOfTotalIntent | null {
  if (!Array.isArray(value.categories) || !isNonEmptyString(value.targetCategoryId)) {
    return null
  }
  const categories = value.categories.map((item) => {
    if (!isRecord(item)) return null
    if (!isNonEmptyString(item.id) || !isNonEmptyString(item.label)) return null
    if (!isSafeNonNegativeInteger(item.count)) return null
    return { id: item.id, label: item.label, count: item.count }
  })
  if (categories.length === 0 || categories.some((item) => item === null)) return null
  const ids = categories.map((item) => item!.id)
  if (new Set(ids).size !== ids.length) return null
  if (!ids.includes(value.targetCategoryId)) return null
  return {
    type: 'category_of_total',
    categories: categories as CategoryOfTotalIntent['categories'],
    targetCategoryId: value.targetCategoryId,
  }
}

function validateEqualSharing(value: UnknownRecord): EqualSharingIntent | null {
  if (!isNonEmptyString(value.objectLabel)) return null
  if (!isSafeNonNegativeInteger(value.totalObjects)) return null
  if (!Number.isSafeInteger(value.groupCount) || (value.groupCount as number) <= 0) {
    return null
  }
  if (
    value.selectedGroupCount !== undefined &&
    (!Number.isSafeInteger(value.selectedGroupCount) ||
      (value.selectedGroupCount as number) <= 0 ||
      (value.selectedGroupCount as number) > (value.groupCount as number))
  ) {
    return null
  }
  return {
    type: 'equal_sharing',
    objectLabel: value.objectLabel,
    totalObjects: value.totalObjects,
    groupCount: value.groupCount as number,
    selectedGroupCount: value.selectedGroupCount as number | undefined,
  }
}

function validateFractionPartition(value: UnknownRecord): FractionPartitionIntent | null {
  if (!isNonEmptyString(value.wholeLabel)) return null
  if (!Number.isSafeInteger(value.totalParts) || (value.totalParts as number) <= 0) {
    return null
  }
  if (
    !isSafeNonNegativeInteger(value.selectedParts) ||
    (value.selectedParts as number) > (value.totalParts as number)
  ) {
    return null
  }
  if (
    value.selectedMeaning !== 'selected' &&
    value.selectedMeaning !== 'removed' &&
    value.selectedMeaning !== 'remaining'
  ) {
    return null
  }
  return {
    type: 'fraction_partition',
    wholeLabel: value.wholeLabel,
    totalParts: value.totalParts as number,
    selectedParts: value.selectedParts,
    selectedMeaning: value.selectedMeaning,
  }
}

function validateNumberComparison(value: UnknownRecord): NumberComparisonIntent | null {
  if (!isCanonicalRational(value.first) || !isCanonicalRational(value.second)) return null
  if (
    value.requestedRelation !== undefined &&
    value.requestedRelation !== 'greater' &&
    value.requestedRelation !== 'less' &&
    value.requestedRelation !== 'equal' &&
    value.requestedRelation !== 'compare'
  ) {
    return null
  }
  return {
    type: 'number_comparison',
    first: simplify(value.first),
    second: simplify(value.second),
    requestedRelation: value.requestedRelation as NumberComparisonIntent['requestedRelation'],
  }
}

function validateNumberLine(value: UnknownRecord): NumberLineIntent | null {
  if (!isCanonicalRational(value.minimum) || !isCanonicalRational(value.maximum)) {
    return null
  }
  const minimum = simplify(value.minimum)
  const maximum = simplify(value.maximum)
  if (compare(minimum, maximum) >= 0) return null
  if (!Array.isArray(value.points) || value.points.length === 0) return null
  const points = value.points.map((point) => {
    if (!isRecord(point) || !isNonEmptyString(point.label) || !isCanonicalRational(point.value)) {
      return null
    }
    return { label: point.label, value: point.value }
  })
  if (points.some((point) => point === null)) return null
  const normalizedPoints = (points as NumberLineIntent['points']).map((point) => ({
    label: point.label,
    value: simplify(point.value),
  }))
  if (normalizedPoints.some((point) =>
    compare(point.value, minimum) < 0 || compare(point.value, maximum) > 0
  )) return null
  return {
    type: 'number_line',
    minimum,
    maximum,
    points: normalizedPoints,
  }
}

function validateGeometry(value: UnknownRecord): GeometryIntent | null {
  const shapes = ['triangle', 'square', 'rectangle', 'circle', 'cube', 'cuboid', 'other']
  if (!shapes.includes(String(value.shape)) || !Array.isArray(value.measurements)) return null
  const measurements = value.measurements.map((measurement) => {
    if (!isRecord(measurement) || !isNonEmptyString(measurement.label)) return null
    if (!isCanonicalRational(measurement.value)) return null
    if (measurement.unit !== undefined && typeof measurement.unit !== 'string') return null
    return {
      label: measurement.label,
      value: simplify(measurement.value),
      unit: measurement.unit as string | undefined,
    }
  })
  if (measurements.some((measurement) => measurement === null)) return null
  return {
    type: 'geometry',
    shape: value.shape as GeometryIntent['shape'],
    measurements: measurements as GeometryIntent['measurements'],
  }
}

function validateChartTable(value: UnknownRecord): ChartTableIntent | null {
  if (
    value.chartType !== 'bar' &&
    value.chartType !== 'pictograph' &&
    value.chartType !== 'table'
  ) {
    return null
  }
  if (!Array.isArray(value.categories) || value.categories.length === 0) return null
  const categories = value.categories.map((category) => {
    if (!isRecord(category) || !isNonEmptyString(category.label)) return null
    if (!isSafeNonNegativeInteger(category.value)) return null
    return { label: category.label, value: category.value }
  })
  if (categories.some((category) => category === null)) return null
  return {
    type: 'chart_table',
    chartType: value.chartType,
    categories: categories as ChartTableIntent['categories'],
  }
}

/**
 * Validates untrusted structured data returned by an AI provider.
 * Returns null instead of throwing when the object is incomplete or malformed.
 */
export function validateVisualIntent(input: unknown): VisualIntent | null {
  if (!isRecord(input) || typeof input.type !== 'string') return null

  switch (input.type) {
    case 'category_of_total':
      return validateCategoryOfTotal(input)
    case 'equal_sharing':
      return validateEqualSharing(input)
    case 'fraction_partition':
      return validateFractionPartition(input)
    case 'number_comparison':
      return validateNumberComparison(input)
    case 'number_line':
      return validateNumberLine(input)
    case 'geometry':
      return validateGeometry(input)
    case 'chart_table':
      return validateChartTable(input)
    default:
      return null
  }
}
