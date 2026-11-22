/**
 * Canonical, versioned contracts for AI-generated assessment questions.
 * AI supplies statements and evidence quotes; the server owns offsets and calculations.
 */

export const QUESTION_CONTRACT_VERSION = 1 as const

export type AssessmentQuestionType =
  | 'multiple_choice'
  | 'complex_multiple_choice'
  | 'true_false_matrix'
  | 'essay'

export type GradeBand = 2 | 3 | 4
export type CognitiveLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
export type FractionRole = 'selected' | 'unselected' | 'removed' | 'remaining'
export type FractionActionKey = 'colored' | 'eaten' | 'taken' | 'used' | 'given_away' | 'unknown'

export type FractionVisualSpec = {
  contractVersion: 2
  type: 'fraction_partition'
  visualRequirement: 'required' | 'optional' | 'none'
  wholeLabel: string
  totalParts: number
  totalEvidenceQuote: string
  statedSegments: Array<{
    role: FractionRole
    count: number
    evidenceQuote: string
  }>
  askedFor: FractionRole
  actionKey: FractionActionKey
}

export type QuestionBlueprint = {
  blueprintVersion: 1
  blueprintId: string
  grade: GradeBand
  subject: string
  topic: string
  subtopic: string
  competency: string
  indicator: string
  cognitiveLevel: CognitiveLevel
  questionType: AssessmentQuestionType
  visualRequirement: 'required' | 'optional' | 'none'
}

export type TrueFalseStatement = {
  id: string
  text: string
  answer: 'Benar' | 'Salah'
}

export type RubricCriterion = {
  criterion: string
  description: string
  points: number
}

export type GeneratedAssessmentQuestion = {
  contractVersion: typeof QUESTION_CONTRACT_VERSION
  blueprint: QuestionBlueprint
  questionType: AssessmentQuestionType
  question: string
  options?: Record<'A' | 'B' | 'C' | 'D', string>
  answer?: 'A' | 'B' | 'C' | 'D'
  answers?: Array<'A' | 'B' | 'C' | 'D'>
  statements?: TrueFalseStatement[]
  modelAnswer?: string
  rubric?: RubricCriterion[]
  maxScore?: number
  explanation: string
  visualSpec?: FractionVisualSpec
}

export type QuestionValidationIssueCode =
  | 'CONTRACT_VERSION_INVALID'
  | 'BLUEPRINT_MISMATCH'
  | 'QUESTION_EMPTY'
  | 'EXPLANATION_EMPTY'
  | 'OPTIONS_INVALID'
  | 'ANSWER_KEY_INVALID'
  | 'STATEMENTS_INVALID'
  | 'ESSAY_ANSWER_MISSING'
  | 'RUBRIC_INVALID'
  | 'VISUAL_SPEC_MISSING'
  | 'VISUAL_SPEC_INVALID'
  | 'VISUAL_EVIDENCE_MISSING'
  | 'VISUAL_FACTS_CONTRADICT'
  | 'VISUAL_ANSWER_MISMATCH'

export type QuestionValidationIssue = {
  code: QuestionValidationIssueCode
  message: string
  path?: string
}

export type QuestionValidationResult = {
  valid: boolean
  issues: QuestionValidationIssue[]
}
