import type { FactGraph, FactGraphSources, SemanticValidationResult } from '../contracts/facts'
import type { VisualIntent } from '../types'
import { validateFactGraph } from '../semantic/validate-fact-graph'
import { calculateVisualIntent, type IntentCalculation } from './calculator'

export type VisualOperation =
  | { kind: 'sum_and_ratio'; inputs: string[]; output: 'category_fraction' }
  | { kind: 'divide_equally'; inputs: ['total_objects', 'group_count']; output: 'objects_per_group' }
  | { kind: 'complement_fraction'; inputs: ['total_parts', 'selected_parts']; output: 'remaining_fraction' }
  | { kind: 'compare_rationals'; inputs: ['first_value', 'second_value']; output: 'comparison' }
  | { kind: 'map_to_interval'; inputs: ['minimum', 'maximum', 'point_value']; output: 'number_line_position' }
  | { kind: 'validate_measurements'; inputs: ['shape', 'measurement']; output: 'geometry_specification' }
  | { kind: 'preserve_category_values'; inputs: ['category', 'category_value']; output: 'chart_data' }

export type VisualOperationPlan = {
  operation: VisualOperation
  calculation: IntentCalculation
  semanticValidation: SemanticValidationResult
}

function operationFor(intent: VisualIntent): VisualOperation {
  switch (intent.type) {
    case 'category_of_total':
      return { kind: 'sum_and_ratio', inputs: ['category_count'], output: 'category_fraction' }
    case 'equal_sharing':
      return { kind: 'divide_equally', inputs: ['total_objects', 'group_count'], output: 'objects_per_group' }
    case 'fraction_partition':
      return { kind: 'complement_fraction', inputs: ['total_parts', 'selected_parts'], output: 'remaining_fraction' }
    case 'number_comparison':
      return { kind: 'compare_rationals', inputs: ['first_value', 'second_value'], output: 'comparison' }
    case 'number_line':
      return { kind: 'map_to_interval', inputs: ['minimum', 'maximum', 'point_value'], output: 'number_line_position' }
    case 'geometry':
      return { kind: 'validate_measurements', inputs: ['shape', 'measurement'], output: 'geometry_specification' }
    case 'chart_table':
      return { kind: 'preserve_category_values', inputs: ['category', 'category_value'], output: 'chart_data' }
  }
}

/** Semantic validation always precedes deterministic calculation. */
export function planVisualMathOperation(
  intent: VisualIntent,
  graph: FactGraph,
  sources: FactGraphSources,
): VisualOperationPlan {
  const semanticValidation = validateFactGraph(graph, sources)
  const calculation = semanticValidation.status === 'accepted'
    ? calculateVisualIntent(intent)
    : {
        status: 'invalid' as const,
        value: null,
        reasonCode: semanticValidation.reasonCode === 'FACTS_CONFLICT' ? 'FACTS_CONFLICT' as const : 'FACTS_INCOMPLETE' as const,
        explanation: semanticValidation.message,
      }
  return {
    operation: operationFor(intent),
    calculation,
    semanticValidation,
  }
}
