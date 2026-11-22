import type { RationalValue, VisualIntent } from '../types'

export type FactSourceKind = 'question' | 'option' | 'answer' | 'explanation'

export type FactSourceRef = {
  source: FactSourceKind
  start: number
  end: number
  quote: string
}

export type SemanticFactValue =
  | { kind: 'integer'; value: number }
  | { kind: 'rational'; value: RationalValue }
  | { kind: 'text'; value: string }
  | { kind: 'quantity'; value: RationalValue; unit: string }

export type SemanticProvenance =
  | { kind: 'stated'; source: FactSourceRef }
  | {
      kind: 'derived'
      operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'complement'
      inputFactIds: string[]
    }

export type SemanticFact = {
  id: string
  role: string
  value: SemanticFactValue
  source?: FactSourceRef
  provenance?: SemanticProvenance
}

export type SemanticRelationType =
  | 'part_of'
  | 'total_of'
  | 'divided_into'
  | 'equal_share_of'
  | 'selected_from'
  | 'removed_from'
  | 'remaining_of'
  | 'compared_with'
  | 'within_range'
  | 'marks'
  | 'measured_by'
  | 'belongs_to_category'
  | 'value_of'
  | 'equal_parts'

export type SemanticRelation = {
  type: SemanticRelationType
  from: string
  to: string
  source?: FactSourceRef
  provenance?: SemanticProvenance
}

export type FactGraph = {
  requestedGoal: VisualIntent['type']
  facts: SemanticFact[]
  relations: SemanticRelation[]
}

export type FactGraphSources = Partial<Record<FactSourceKind, string>>

export type SemanticValidationCode =
  | 'FACTS_INCOMPLETE'
  | 'FACTS_CONFLICT'
  | 'NEEDS_TEACHER_REVIEW'

export type SemanticValidationResult =
  | { status: 'accepted'; reasonCode: null; message: string }
  | { status: 'rejected' | 'needs_teacher_review'; reasonCode: SemanticValidationCode; message: string }
