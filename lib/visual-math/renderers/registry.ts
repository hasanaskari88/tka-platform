import type {
  CategoryOfTotalIntent,
  EqualSharingIntent,
  FractionPartitionIntent,
  GeometryIntent,
  NumberComparisonIntent,
  NumberLineIntent,
  ChartTableIntent,
  VisualIntent,
} from '../types'
import { formatFraction, formatMixedNumber } from '../math/rational'
import { calculateVisualIntent } from '../math/calculator'
import {
  createCategoryOfTotalImage,
  createEqualSharingImage,
  createFractionPartitionImage,
  createNumberComparisonImage,
  createNumberLineImage,
  createGeometryImage,
  createChartTableImage,
} from './canvas'
import { validateRenderArtifact } from '../quality/validate-artifact'
import { validateVisualIntent } from '../analysis/validate-intent'
import { validateVisualLayout } from '../quality/validate-visual-layout'
import type { RenderArtifact, RenderContext, RendererQualityResult, VisualRenderer } from './types'

const DEFAULT_CONTEXT: RenderContext = { width: 1600, height: 900, locale: 'id-ID' }

const RENDERERS: VisualRenderer[] = [
  {
    id: 'category-total-canvas',
    version: 1,
    supports: (intent) => intent.type === 'category_of_total',
    render: (intent) => createCategoryOfTotalImage(intent as CategoryOfTotalIntent),
  },
  {
    id: 'equal-sharing-canvas',
    version: 1,
    supports: (intent) => intent.type === 'equal_sharing',
    render: (intent) => createEqualSharingImage(intent as EqualSharingIntent),
  },
  {
    id: 'fraction-partition-canvas',
    version: 1,
    supports: (intent) => intent.type === 'fraction_partition',
    render: (intent) => createFractionPartitionImage(intent as FractionPartitionIntent),
  },
  {
    id: 'number-comparison-canvas',
    version: 1,
    supports: (intent) => intent.type === 'number_comparison',
    render: (intent) => createNumberComparisonImage(intent as NumberComparisonIntent),
  },
  {
    id: 'number-line-canvas',
    version: 1,
    supports: (intent) => intent.type === 'number_line',
    render: (intent) => createNumberLineImage(intent as NumberLineIntent),
  },
  {
    id: 'geometry-canvas',
    version: 1,
    supports: (intent) => intent.type === 'geometry',
    render: (intent) => createGeometryImage(intent as GeometryIntent),
  },
  {
    id: 'chart-table-canvas',
    version: 1,
    supports: (intent) => intent.type === 'chart_table',
    render: (intent) => createChartTableImage(intent as ChartTableIntent),
  },
]

function representedValues(intent: VisualIntent): string[] {
  switch (intent.type) {
    case 'category_of_total':
      return intent.categories.map((item) => item.label + '=' + item.count)
    case 'equal_sharing': {
      const result = calculateVisualIntent(intent)
      return [String(intent.totalObjects), String(intent.groupCount), result.value ? formatMixedNumber(result.value) : '']
    }
    case 'fraction_partition': {
      const result = calculateVisualIntent(intent)
      return [String(intent.totalParts), String(intent.selectedParts), result.value ? formatFraction(result.value) : '']
    }
    case 'number_comparison':
      return [formatMixedNumber(intent.first), formatMixedNumber(intent.second)]
    case 'number_line':
      return [
        formatMixedNumber(intent.minimum),
        formatMixedNumber(intent.maximum),
        ...intent.points.map((point) => point.label + '=' + formatMixedNumber(point.value)),
      ]
    case 'geometry':
      return intent.measurements.map((item) =>
        item.label + '=' + formatMixedNumber(item.value) + (item.unit ? ' ' + item.unit : ''),
      )
    case 'chart_table':
      return intent.categories.map((item) => item.label + '=' + item.value)
  }
}

function expectedElementCount(intent: VisualIntent): number {
  switch (intent.type) {
    case 'category_of_total':
      return intent.categories.reduce((sum, item) => sum + item.count, 0)
    case 'equal_sharing':
      return intent.groupCount
    case 'fraction_partition':
      return intent.totalParts
    case 'number_comparison':
      return 2
    case 'number_line':
      return intent.points.length
    case 'geometry':
      return intent.measurements.length
    case 'chart_table':
      return intent.categories.length
  }
}

/** Selects a renderer by intent type, then applies the artifact quality gate. */
export async function renderVisualMathArtifact(
  intent: VisualIntent,
  context: RenderContext = DEFAULT_CONTEXT,
): Promise<RendererQualityResult> {
  if (
    !context ||
    context.width !== 1600 ||
    context.height !== 900 ||
    context.locale !== 'id-ID'
  ) {
    return {
      status: 'rejected',
      reasonCode: 'INVALID_DIMENSIONS',
      message: 'Renderer Canvas saat ini hanya mendukung ukuran 1600 × 900 dan locale Indonesia.',
    }
  }

  // Re-check at runtime: TypeScript types do not protect this boundary from
  // malformed JSON, stale client state, or accidental casts.
  const safeIntent = validateVisualIntent(intent)
  if (!safeIntent) {
    return {
      status: 'rejected',
      reasonCode: 'INVALID_INTENT',
      message: 'Data visual matematika tidak valid. Gambar tidak dibuat.',
    }
  }

  if (!validateVisualLayout(safeIntent)) {
    return {
      status: 'rejected',
      reasonCode: 'INVALID_LAYOUT',
      message: 'Susunan visual terlalu rapat atau tidak dapat ditampilkan dengan jelas.',
    }
  }

  const renderer = RENDERERS.find((candidate) => candidate.supports(safeIntent))
  if (!renderer) {
    return {
      status: 'rejected',
      reasonCode: 'NO_RENDERER',
      message: 'Tidak ada renderer yang mendukung jenis visual ini.',
    }
  }

  try {
    const blob = await renderer.render(safeIntent, context)
    if (!blob || blob.size <= 0) {
      return { status: 'rejected', reasonCode: 'BLOB_EMPTY', message: 'Renderer tidak menghasilkan gambar.' }
    }

    const artifact: RenderArtifact = {
      blob,
      mimeType: 'image/png',
      width: context.width,
      height: context.height,
      elementCount: expectedElementCount(safeIntent),
      representedValues: representedValues(safeIntent),
      rendererId: renderer.id,
      rendererVersion: renderer.version,
    }
    return validateRenderArtifact(artifact)
  } catch {
    return {
      status: 'rejected',
      reasonCode: 'RENDER_FAILED',
      message: 'Renderer mengalami kesalahan. Gambar tidak dibuat.',
    }
  }
}
