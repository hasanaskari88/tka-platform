import type { FractionPartitionIntent, NumberLineIntent, VisualIntent } from '../types'

export type NumberLinePointLayout = {
  x: number
  lane: number
  labelWidth: number
}

const NUMBER_LINE_LEFT = 180
const NUMBER_LINE_RIGHT = 1420
const NUMBER_LINE_LABEL_LANES = 5

function rationalToFiniteNumber(value: { numerator: string; denominator: string }): number | null {
  const numerator = Number(value.numerator)
  const denominator = Number(value.denominator)
  const result = numerator / denominator
  return Number.isFinite(result) ? result : null
}

/** Computes stable label positions and rejects layouts with overlapping labels. */
export function planNumberLinePointLayout(
  intent: NumberLineIntent,
): NumberLinePointLayout[] | null {
  const minimum = rationalToFiniteNumber(intent.minimum)
  const maximum = rationalToFiniteNumber(intent.maximum)
  if (minimum === null || maximum === null || maximum <= minimum) return null

  const points = intent.points.map((point, index) => {
    const value = rationalToFiniteNumber(point.value)
    if (value === null || value < minimum || value > maximum) return null
    const x = NUMBER_LINE_LEFT + ((value - minimum) / (maximum - minimum)) *
      (NUMBER_LINE_RIGHT - NUMBER_LINE_LEFT)
    const labelWidth = Math.min(420, Math.max(90, point.label.length * 13 + 100))
    return { x, lane: index % NUMBER_LINE_LABEL_LANES, labelWidth }
  })

  if (points.some((point) => point === null)) return null
  const validPoints = points as NumberLinePointLayout[]
  for (let index = 0; index < validPoints.length; index += 1) {
    const point = validPoints[index]
    if (point.x - point.labelWidth / 2 < NUMBER_LINE_LEFT ||
        point.x + point.labelWidth / 2 > NUMBER_LINE_RIGHT) return null
    for (let otherIndex = index + 1; otherIndex < validPoints.length; otherIndex += 1) {
      const other = validPoints[otherIndex]
      if (point.lane !== other.lane) continue
      const minimumGap = (point.labelWidth + other.labelWidth) / 2 + 12
      if (Math.abs(point.x - other.x) < minimumGap) return null
    }
  }
  return validPoints
}

/** Ensures each fraction segment remains visibly distinct at the renderer's fixed size. */
export function validateFractionPartitionLayout(intent: FractionPartitionIntent): boolean {
  if (!Number.isSafeInteger(intent.totalParts) || intent.totalParts < 2 || intent.totalParts > 20) return false
  const segmentWidth = 1240 / intent.totalParts - 5
  const segmentHeight = 160
  return segmentWidth >= 40 && segmentHeight >= 40
}

/** Lightweight deterministic checks for layouts that have fixed renderer geometry. */
export function validateVisualLayout(intent: VisualIntent): boolean {
  switch (intent.type) {
    case 'fraction_partition':
      return validateFractionPartitionLayout(intent)
    case 'number_line':
      return planNumberLinePointLayout(intent) !== null
    case 'category_of_total':
      return intent.categories.length >= 2 && intent.categories.length <= 4 &&
        intent.categories.every((item) => item.count >= 0) &&
        intent.categories.reduce((sum, item) => sum + item.count, 0) <= 40
    case 'equal_sharing':
      return intent.groupCount >= 2 && intent.groupCount <= 12 &&
        intent.totalObjects >= 1 && intent.totalObjects <= 40
    case 'chart_table':
      return intent.categories.length >= 1 && intent.categories.length <= 10 &&
        (intent.chartType !== 'bar' || 1120 / intent.categories.length >= 90)
    case 'number_comparison':
      return true
    case 'geometry':
      return intent.measurements.length >= 1 && intent.measurements.length <= 4
  }
}
