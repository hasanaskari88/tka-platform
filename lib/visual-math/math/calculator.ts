import type { RationalValue, VisualIntent, VisualReasonCode } from '../types'
import { compare, rational } from './rational'

export type IntentCalculation = {
  status: 'ready' | 'unsupported' | 'invalid'
  value: RationalValue | null
  comparison?: -1 | 0 | 1
  reasonCode: VisualReasonCode | null
  explanation: string
}

function invalid(reasonCode: VisualReasonCode, explanation: string): IntentCalculation {
  return { status: 'invalid', value: null, reasonCode, explanation }
}

function ready(value: RationalValue, explanation: string): IntentCalculation {
  return { status: 'ready', value, reasonCode: null, explanation }
}

function readyForDiagram(explanation: string): IntentCalculation {
  return { status: 'ready', value: null, reasonCode: null, explanation }
}

/** All numeric answers are computed here; AI-supplied answer values are never trusted. */
export function calculateVisualIntent(intent: VisualIntent): IntentCalculation {
  switch (intent.type) {
    case 'category_of_total': {
      const total = intent.categories.reduce((sum, category) => sum + category.count, 0)
      const target = intent.categories.find((category) => category.id === intent.targetCategoryId)
      if (!target) return invalid('FACTS_INCOMPLETE', 'Kategori yang ditanyakan tidak ditemukan.')
      if (!Number.isSafeInteger(total)) return invalid('INVALID_NUMBER', 'Jumlah seluruh kategori terlalu besar.')
      if (total <= 0) return invalid('FACTS_INCOMPLETE', 'Jumlah seluruh objek harus lebih dari nol.')
      return ready(rational(target.count, total), target.count + ' dari ' + total + ' objek termasuk kategori ' + target.label + '.')
    }

    case 'equal_sharing': {
      const groupCount = intent.groupCount
      const selectedGroupCount = intent.selectedGroupCount ?? 1
      if (!Number.isSafeInteger(intent.totalObjects) || intent.totalObjects <= 0 ||
        !Number.isSafeInteger(groupCount) || groupCount <= 0 ||
        !Number.isSafeInteger(selectedGroupCount) || selectedGroupCount <= 0 ||
        selectedGroupCount > groupCount) {
        return invalid('FACTS_INCOMPLETE', 'Jumlah objek atau kelompok tidak valid.')
      }
      return ready(
        rational(BigInt(intent.totalObjects) * BigInt(selectedGroupCount), BigInt(groupCount)),
        intent.totalObjects + ' ' + intent.objectLabel + ' dibagikan sama rata ke ' + groupCount + ' kelompok.',
      )
    }

    case 'fraction_partition': {
      if (!Number.isSafeInteger(intent.totalParts) || intent.totalParts < 2 ||
        !Number.isSafeInteger(intent.selectedParts) || intent.selectedParts < 0 ||
        intent.selectedParts > intent.totalParts) {
        return invalid('FACTS_INCOMPLETE', 'Jumlah bagian pecahan tidak valid.')
      }
      return ready(
        rational(intent.selectedParts, intent.totalParts),
        intent.selectedParts + ' dari ' + intent.totalParts + ' bagian ' + intent.wholeLabel +
          ' merupakan bagian yang ditanyakan (' + intent.selectedMeaning + ').',
      )
    }

    case 'number_comparison': {
      const result = compare(intent.first, intent.second)
      const expectedRelation = intent.requestedRelation
      const relationMatches = !expectedRelation || expectedRelation === 'compare' ||
        (expectedRelation === 'greater' && result === 1) ||
        (expectedRelation === 'less' && result === -1) ||
        (expectedRelation === 'equal' && result === 0)
      if (!relationMatches) {
        return invalid('MATH_VALIDATION_FAILED', 'Pernyataan perbandingan tidak sesuai dengan nilai yang diberikan.')
      }
      return {
        status: 'ready',
        value: null,
        comparison: result,
        reasonCode: null,
        explanation: 'Perbandingan dua nilai rasional selesai dihitung secara eksak.',
      }
    }

    case 'number_line':
      return readyForDiagram('Rentang dan titik garis bilangan telah divalidasi.')
    case 'geometry':
      if (intent.shape === 'other' || intent.measurements.length === 0) {
        return { status: 'unsupported', value: null, reasonCode: 'RENDERER_NOT_SUPPORTED', explanation: 'Bentuk geometri atau ukurannya belum didukung.' }
      }
      return readyForDiagram('Bentuk geometri dan ukuran yang disebutkan siap divisualisasikan.')
    case 'chart_table':
      return readyForDiagram('Data kategori siap disajikan sebagai diagram atau tabel.')
  }
}
