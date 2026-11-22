import type { VisualIntent } from '../types'
import type {
  FactGraph,
  FactGraphSources,
  FactSourceRef,
  SemanticFact,
  SemanticRelation,
} from '../contracts/facts'

export type BuildFactGraphResult = {
  graph: FactGraph | null
  sources: FactGraphSources
  reason: string | null
}

function findExactSource(question: string, evidence: string): FactSourceRef | null {
  if (!evidence.trim()) return null
  const start = question.indexOf(evidence)
  if (start < 0) return null
  return {
    source: 'question',
    start,
    end: start + evidence.length,
    quote: evidence,
  }
}

function textFact(id: string, role: string, value: string, source: FactSourceRef): SemanticFact {
  return { id, role, value: { kind: 'text', value }, source, provenance: { kind: 'stated', source } }
}

function integerFact(id: string, role: string, value: number, source: FactSourceRef): SemanticFact {
  return { id, role, value: { kind: 'integer', value }, source, provenance: { kind: 'stated', source } }
}

function rationalFact(
  id: string,
  role: string,
  value: { numerator: string; denominator: string },
  source: FactSourceRef,
): SemanticFact {
  return { id, role, value: { kind: 'rational', value }, source, provenance: { kind: 'stated', source } }
}

/**
 * Converts a validated legacy intent into an evidence-linked semantic graph.
 * All references point to the exact AI evidence excerpt; no value is inferred here.
 */
export function buildFactGraphFromIntent(
  intent: VisualIntent,
  evidence: string,
  question: string,
): BuildFactGraphResult {
  const source = findExactSource(question, evidence)
  if (!source) return { graph: null, sources: { question }, reason: 'Kutipan bukti harus sama persis dengan bagian teks soal.' }

  const facts: SemanticFact[] = []
  const relations: SemanticRelation[] = []
  const relate = (type: SemanticRelation['type'], from: string, to: string) => {
    relations.push({ type, from, to, source, provenance: { kind: 'stated', source } })
  }

  switch (intent.type) {
    case 'category_of_total': {
      intent.categories.forEach((category, index) => {
        facts.push(textFact('category_' + index, 'category', category.label, source))
        facts.push(integerFact('count_' + index, 'category_count', category.count, source))
      })
      const target = intent.categories.find((category) => category.id === intent.targetCategoryId)
      if (!target) return { graph: null, sources: { question }, reason: 'Kategori sasaran tidak ditemukan.' }
      facts.push(textFact('target_category', 'target_category', target.label, source))
      const targetIndex = intent.categories.findIndex((category) => category.id === intent.targetCategoryId)
      relate('belongs_to_category', 'count_' + targetIndex, 'target_category')
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    }
    case 'equal_sharing':
      facts.push(integerFact('total_objects', 'total_objects', intent.totalObjects, source))
      facts.push(integerFact('group_count', 'group_count', intent.groupCount, source))
      facts.push(textFact('object_label', 'object_label', intent.objectLabel, source))
      relate('divided_into', 'total_objects', 'group_count')
      relate('equal_share_of', 'total_objects', 'group_count')
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    case 'fraction_partition':
      facts.push(textFact('whole', 'whole', intent.wholeLabel, source))
      facts.push(integerFact('total_parts', 'total_parts', intent.totalParts, source))
      facts.push(integerFact('selected_parts', 'selected_parts', intent.selectedParts, source))
      facts.push(textFact('selected_meaning', 'selected_meaning', intent.selectedMeaning, source))
      relate('divided_into', 'whole', 'total_parts')
      relate('equal_parts', 'whole', 'total_parts')
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    case 'number_comparison':
      facts.push(rationalFact('first_value', 'first_value', intent.first, source))
      facts.push(rationalFact('second_value', 'second_value', intent.second, source))
      relate('compared_with', 'first_value', 'second_value')
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    case 'number_line':
      facts.push(rationalFact('minimum', 'minimum', intent.minimum, source))
      facts.push(rationalFact('maximum', 'maximum', intent.maximum, source))
      intent.points.forEach((point, index) => {
        const id = 'point_' + index
        facts.push(rationalFact(id, 'point_value', point.value, source))
        facts.push(textFact('point_label_' + index, 'point_label', point.label, source))
        relate('within_range', id, 'minimum')
        relate('within_range', id, 'maximum')
        relate('marks', id, 'minimum')
        relate('marks', id, 'maximum')
      })
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    case 'geometry':
      facts.push(textFact('shape', 'shape', intent.shape, source))
      intent.measurements.forEach((measurement, index) => {
        const id = 'measurement_' + index
        facts.push({
          id,
          role: 'measurement',
          value: measurement.unit
            ? { kind: 'quantity', value: measurement.value, unit: measurement.unit }
            : { kind: 'rational', value: measurement.value },
          source,
          provenance: { kind: 'stated', source },
        })
        relate('measured_by', 'shape', id)
      })
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
    case 'chart_table':
      intent.categories.forEach((category, index) => {
        facts.push(textFact('category_' + index, 'category', category.label, source))
        facts.push(integerFact('value_' + index, 'category_value', category.value, source))
        relate('belongs_to_category', 'value_' + index, 'category_' + index)
        relate('value_of', 'value_' + index, 'category_' + index)
      })
      return { graph: { requestedGoal: intent.type, facts, relations }, sources: { question }, reason: null }
  }
}
