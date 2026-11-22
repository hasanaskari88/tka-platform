import type {
  FactGraph,
  FactGraphSources,
  FactSourceRef,
  SemanticFact,
  SemanticRelationType,
  SemanticValidationResult,
} from '../contracts/facts'

type GoalRule = {
  requiredRoles: string[]
  minimumRoles?: Record<string, number>
  requiredRelations: SemanticRelationType[]
}

const GOAL_RULES: Record<FactGraph['requestedGoal'], GoalRule> = {
  category_of_total: {
    requiredRoles: ['target_category'],
    minimumRoles: { category_count: 2 },
    requiredRelations: ['belongs_to_category'],
  },
  equal_sharing: {
    requiredRoles: ['total_objects', 'group_count'],
    requiredRelations: ['divided_into', 'equal_share_of'],
  },
  fraction_partition: {
    requiredRoles: ['whole', 'total_parts', 'selected_parts'],
    requiredRelations: ['divided_into', 'equal_parts'],
  },
  number_comparison: {
    requiredRoles: ['first_value', 'second_value'],
    requiredRelations: ['compared_with'],
  },
  number_line: {
    requiredRoles: ['minimum', 'maximum', 'point_value'],
    requiredRelations: ['within_range', 'marks'],
  },
  geometry: {
    requiredRoles: ['shape', 'measurement'],
    requiredRelations: ['measured_by'],
  },
  chart_table: {
    requiredRoles: ['category', 'category_value'],
    requiredRelations: ['belongs_to_category', 'value_of'],
  },
}

const REQUIRED_RELATION_ROLES: Partial<Record<SemanticRelationType, Array<[string, string]>>> = {
  belongs_to_category: [['category_count', 'target_category'], ['category_value', 'category']],
  divided_into: [['total_objects', 'group_count'], ['whole', 'total_parts']],
  equal_share_of: [['total_objects', 'group_count']],
  equal_parts: [['whole', 'total_parts']],
  compared_with: [['first_value', 'second_value']],
  within_range: [['point_value', 'minimum'], ['point_value', 'maximum']],
  marks: [['point_value', 'minimum'], ['point_value', 'maximum']],
  measured_by: [['shape', 'measurement']],
  value_of: [['category_value', 'category']],
}

const VALID_SOURCES = new Set(['question', 'option', 'answer', 'explanation'])
const VALID_RELATIONS = new Set<SemanticRelationType>([
  'part_of', 'total_of', 'divided_into', 'equal_share_of', 'selected_from',
  'removed_from', 'remaining_of', 'compared_with', 'within_range', 'marks',
  'measured_by', 'belongs_to_category', 'value_of', 'equal_parts',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRational(value: unknown): boolean {
  if (!isRecord(value) || typeof value.numerator !== 'string' || typeof value.denominator !== 'string') return false
  if (value.numerator.length > 30 || value.denominator.length > 30) return false
  return /^-?\d+$/.test(value.numerator) && /^[1-9]\d*$/.test(value.denominator)
}

function validFactValue(value: unknown): boolean {
  if (!isRecord(value)) return false
  switch (value.kind) {
    case 'integer':
      return typeof value.value === 'number' && Number.isSafeInteger(value.value)
    case 'rational':
      return isRational(value.value)
    case 'text':
      return typeof value.value === 'string' && value.value.trim().length > 0 && value.value.length <= 120
    case 'quantity':
      return isRational(value.value) && typeof value.unit === 'string' &&
        value.unit.trim().length > 0 && value.unit.length <= 20
    default:
      return false
  }
}

function validSource(source: unknown, sources: FactGraphSources): boolean {
  if (!isRecord(source) || typeof source.source !== 'string' || !VALID_SOURCES.has(source.source)) return false
  if (!Number.isSafeInteger(source.start) || !Number.isSafeInteger(source.end) ||
    (source.start as number) < 0 || (source.end as number) <= (source.start as number)) return false
  if (typeof source.quote !== 'string' || !source.quote.trim()) return false
  const original = sources[source.source as keyof FactGraphSources]
  return typeof original === 'string' &&
    (source.end as number) <= original.length &&
    original.slice(source.start as number, source.end as number) === source.quote
}

function isPositiveFact(fact: SemanticFact): boolean {
  if (fact.value.kind === 'integer') return fact.value.value > 0
  if (fact.value.kind === 'rational') return BigInt(fact.value.value.numerator) > BigInt(0)
  if (fact.value.kind === 'quantity') return BigInt(fact.value.value.numerator) > BigInt(0)
  return fact.value.kind === 'text' && fact.value.value.trim().length > 0
}

const DERIVED_OPERATIONS = new Set(['add', 'subtract', 'multiply', 'divide', 'complement'])

function validProvenance(
  provenance: unknown,
  legacySource: unknown,
  sources: FactGraphSources,
  factIds: Set<string>,
  currentId: string,
): boolean {
  if (provenance === undefined) return validSource(legacySource, sources)
  if (!isRecord(provenance) || typeof provenance.kind !== 'string') return false
  if (provenance.kind === 'stated') {
    if (!validSource(provenance.source, sources)) return false
    const statedSource = provenance.source as FactSourceRef
    if (legacySource === undefined) return true
    if (!validSource(legacySource, sources) || !isRecord(legacySource)) return false
    return legacySource.source === statedSource.source &&
      legacySource.start === statedSource.start &&
      legacySource.end === statedSource.end &&
      legacySource.quote === statedSource.quote
  }
  if (provenance.kind !== 'derived' || typeof provenance.operation !== 'string' ||
    !DERIVED_OPERATIONS.has(provenance.operation) || !Array.isArray(provenance.inputFactIds) ||
    provenance.inputFactIds.length < 2 || provenance.inputFactIds.length > 8) return false
  return provenance.inputFactIds.every((id) =>
    typeof id === 'string' && id !== currentId && factIds.has(id),
  )
}

type BigRational = { numerator: bigint; denominator: bigint }

function gcd(a: bigint, b: bigint): bigint {
  let left = a < BigInt(0) ? -a : a
  let right = b < BigInt(0) ? -b : b
  while (right !== BigInt(0)) {
    const remainder = left % right
    left = right
    right = remainder
  }
  return left || BigInt(1)
}

function normalizeRational(value: BigRational): BigRational {
  if (value.denominator === BigInt(0)) return value
  const sign = value.denominator < BigInt(0) ? BigInt(-1) : BigInt(1)
  const divisor = gcd(value.numerator, value.denominator)
  return {
    numerator: (value.numerator / divisor) * sign,
    denominator: (value.denominator / divisor) * sign,
  }
}

function rationalFromFact(fact: SemanticFact): BigRational | null {
  if (fact.value.kind === 'integer') {
    return { numerator: BigInt(fact.value.value), denominator: BigInt(1) }
  }
  if (fact.value.kind === 'rational') {
    return normalizeRational({
      numerator: BigInt(fact.value.value.numerator),
      denominator: BigInt(fact.value.value.denominator),
    })
  }
  return null
}

function derivedValueMatches(fact: SemanticFact, factsById: Map<string, SemanticFact>): boolean {
  const provenance = fact.provenance
  if (!provenance || provenance.kind !== 'derived') return true
  const values: BigRational[] = []
  for (const id of provenance.inputFactIds) {
    const item = factsById.get(id)
    if (!item) return false
    const value = rationalFromFact(item)
    if (!value) return false
    values.push(value)
  }

  let expected: BigRational
  switch (provenance.operation) {
    case 'add':
      expected = values.reduce(
        (sum, value) => normalizeRational({
          numerator: sum.numerator * value.denominator + value.numerator * sum.denominator,
          denominator: sum.denominator * value.denominator,
        }),
        { numerator: BigInt(0), denominator: BigInt(1) },
      )
      break
    case 'subtract':
    case 'complement':
      if (values.length !== 2) return false
      expected = normalizeRational({
        numerator: values[0].numerator * values[1].denominator - values[1].numerator * values[0].denominator,
        denominator: values[0].denominator * values[1].denominator,
      })
      break
    case 'multiply':
      expected = values.reduce(
        (product, value) => normalizeRational({
          numerator: product.numerator * value.numerator,
          denominator: product.denominator * value.denominator,
        }),
        { numerator: BigInt(1), denominator: BigInt(1) },
      )
      break
    case 'divide':
      if (values.length !== 2 || values[1].numerator === BigInt(0)) return false
      expected = normalizeRational({
        numerator: values[0].numerator * values[1].denominator,
        denominator: values[0].denominator * values[1].numerator,
      })
      break
    default:
      return false
  }

  const actual = rationalFromFact(fact)
  return Boolean(actual &&
    expected.numerator * actual.denominator === actual.numerator * expected.denominator)
}

function hasDerivedCycle(facts: SemanticFact[]): boolean {
  const derived = new Map<string, string[]>()
  for (const fact of facts) {
    if (fact.provenance?.kind === 'derived') {
      derived.set(fact.id, fact.provenance.inputFactIds)
    }
  }
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false
    if (visited.has(id)) return true
    visiting.add(id)
    for (const input of derived.get(id) || []) {
      if (derived.has(input) && !visit(input)) return false
    }
    visiting.delete(id)
    visited.add(id)
    return true
  }
  for (const id of derived.keys()) if (!visit(id)) return true
  return false
}

function reject(message: string, reasonCode: 'FACTS_INCOMPLETE' | 'FACTS_CONFLICT' = 'FACTS_INCOMPLETE'): SemanticValidationResult {
  return { status: 'rejected', reasonCode, message }
}

/**
 * Validates that every fact and relation is tied to an exact source excerpt.
 * This is a semantic-structure gate, not a substitute for intent-specific
 * numeric validation or deterministic calculation.
 */
export function validateFactGraph(input: unknown, sources: FactGraphSources): SemanticValidationResult {
  if (!isRecord(input) || typeof input.requestedGoal !== 'string' ||
    !Object.prototype.hasOwnProperty.call(GOAL_RULES, input.requestedGoal) ||
    !Array.isArray(input.facts) || !Array.isArray(input.relations)) {
    return reject('Struktur graf fakta belum lengkap.')
  }

  const graph = input as unknown as FactGraph
  if (graph.facts.length < 1 || graph.facts.length > 40 || graph.relations.length > 80) {
    return reject('Jumlah fakta atau relasi berada di luar batas aman.')
  }

  const factIds = new Set<string>()
  for (const fact of graph.facts) {
    if (!isRecord(fact) || typeof fact.id !== 'string' || !/^[a-zA-Z0-9_-]{1,40}$/.test(fact.id) ||
      factIds.has(fact.id) || typeof fact.role !== 'string' || !/^[a-z][a-z0-9_]{1,39}$/.test(fact.role) ||
      !validFactValue(fact.value)) {
      return reject('Ada fakta yang tidak valid atau tidak memiliki kutipan sumber yang tepat.')
    }
    factIds.add(fact.id)
  }
  for (const fact of graph.facts) {
    if (!validProvenance(fact.provenance, fact.source, sources, factIds, fact.id)) {
      return reject('Asal fakta tidak valid atau referensi fakta turunan tidak lengkap.')
    }
  }
  if (hasDerivedCycle(graph.facts)) {
    return reject('Rantai fakta turunan membentuk siklus.', 'FACTS_CONFLICT')
  }

  const rule = GOAL_RULES[graph.requestedGoal]
  const roleCounts = new Map<string, number>()
  for (const fact of graph.facts) {
    roleCounts.set(fact.role, (roleCounts.get(fact.role) ?? 0) + 1)
  }
  for (const role of rule.requiredRoles) {
    if (!roleCounts.has(role)) return reject('Peran fakta wajib belum lengkap: ' + role + '.')
  }
  for (const [role, minimum] of Object.entries(rule.minimumRoles ?? {})) {
    if ((roleCounts.get(role) ?? 0) < minimum) return reject('Jumlah fakta untuk peran ' + role + ' belum cukup.')
  }

  const relationTypes = new Set<SemanticRelationType>()
  const relationKeys = new Set<string>()
  const factsById = new Map(graph.facts.map((fact) => [fact.id, fact]))
  for (const relation of graph.relations) {
    if (!isRecord(relation) || typeof relation.type !== 'string' ||
      !VALID_RELATIONS.has(relation.type as SemanticRelationType) ||
      typeof relation.from !== 'string' || typeof relation.to !== 'string' ||
      !factIds.has(relation.from) || !factIds.has(relation.to) ||
      relation.from === relation.to || !validProvenance(relation.provenance, relation.source, sources, factIds, relation.from)) {
      return reject('Ada hubungan antar fakta yang tidak valid atau tidak didukung kutipan sumber.')
    }
    const key = [relation.type, relation.from, relation.to].join(':')
    if (relationKeys.has(key)) return reject('Hubungan fakta yang sama tercantum lebih dari sekali.', 'FACTS_CONFLICT')
    const allowedRolePairs = REQUIRED_RELATION_ROLES[relation.type as SemanticRelationType]
    if (allowedRolePairs) {
      const fromRole = factsById.get(relation.from)?.role
      const toRole = factsById.get(relation.to)?.role
      if (!allowedRolePairs.some(([from, to]) => fromRole === from && toRole === to)) {
        return reject('Hubungan ' + relation.type + ' menghubungkan peran fakta yang tidak sesuai.', 'FACTS_CONFLICT')
      }
    }
    relationKeys.add(key)
    relationTypes.add(relation.type as SemanticRelationType)
  }

  if (graph.facts.some((fact) => fact.provenance?.kind === 'derived' && !derivedValueMatches(fact, factsById))) {
    return reject('Nilai fakta turunan tidak cocok dengan operasi dan fakta masukan yang dirujuk.', 'FACTS_CONFLICT')
  }

  for (const required of rule.requiredRelations) {
    if (!relationTypes.has(required)) {
      return reject('Hubungan semantik wajib belum dibuktikan: ' + required + '.')
    }
  }

  if (graph.requestedGoal === 'equal_sharing') {
    const total = graph.facts.find((fact) => fact.role === 'total_objects')
    const groups = graph.facts.find((fact) => fact.role === 'group_count')
    if (total && groups && total.value.kind === 'integer' && groups.value.kind === 'integer' &&
      (total.value.value <= 0 || groups.value.value < 2)) {
      return reject('Pembagian sama rata membutuhkan jumlah benda positif dan minimal dua kelompok.')
    }
  }

  if (graph.requestedGoal === 'fraction_partition') {
    const total = graph.facts.find((fact) => fact.role === 'total_parts')
    const selected = graph.facts.find((fact) => fact.role === 'selected_parts')
    if (total?.value.kind === 'integer' && selected?.value.kind === 'integer' &&
      (total.value.value < 2 || selected.value.value < 0 || selected.value.value > total.value.value)) {
      return reject('Jumlah bagian yang dipilih tidak sesuai dengan jumlah bagian keseluruhan.', 'FACTS_CONFLICT')
    }
  }

  if (graph.facts.some((fact) => fact.role === 'total_objects' || fact.role === 'group_count' ||
    fact.role === 'total_parts' || fact.role === 'selected_parts') &&
    graph.facts.some((fact) => !isPositiveFact(fact) && fact.value.kind !== 'integer')) {
    return { status: 'needs_teacher_review', reasonCode: 'NEEDS_TEACHER_REVIEW', message: 'Ada nilai fakta yang perlu diperiksa guru sebelum divisualisasikan.' }
  }

  return { status: 'accepted', reasonCode: null, message: 'Fakta, kutipan sumber, dan relasi semantik lolos pemeriksaan struktur.' }
}
