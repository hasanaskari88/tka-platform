import type { RationalValue } from '../types'
import { multiply, parseRational, rational } from './rational'

export type QuantityDimension =
  | 'scalar'
  | 'length'
  | 'mass'
  | 'time'
  | 'volume'
  | 'count:item'
  | 'count:person'
  | 'count:animal'
  | 'count:sheet'
  | 'count:book'
  | 'count:box'
  | 'count:part'

export type ParsedQuantity = {
  value: RationalValue
  dimension: QuantityDimension
  canonicalUnit: string | null
  originalUnit: string | null
}

type UnitDefinition = {
  dimension: QuantityDimension
  canonicalUnit: string
  factor: RationalValue
}

const units: Record<string, UnitDefinition> = {}

function registerUnit(
  aliases: string[],
  dimension: QuantityDimension,
  canonicalUnit: string,
  numerator: number,
  denominator = 1,
): void {
  const definition = {
    dimension,
    canonicalUnit,
    factor: rational(numerator, denominator),
  }
  for (const alias of aliases) units[alias] = definition
}

registerUnit(['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres'], 'length', 'm', 1000)
registerUnit(['m', 'meter', 'meters', 'metre', 'metres'], 'length', 'm', 1)
registerUnit(['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres'], 'length', 'm', 1, 100)
registerUnit(['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres'], 'length', 'm', 1, 1000)

registerUnit(['kg', 'kilogram', 'kilograms'], 'mass', 'g', 1000)
registerUnit(['g', 'gram', 'grams'], 'mass', 'g', 1)
registerUnit(['mg', 'milligram', 'milligrams'], 'mass', 'g', 1, 1000)

registerUnit(['jam', 'hour', 'hours', 'hr', 'h'], 'time', 's', 3600)
registerUnit(['menit', 'minute', 'minutes', 'min'], 'time', 's', 60)
registerUnit(['detik', 'second', 'seconds', 'sec', 's'], 'time', 's', 1)

registerUnit(['liter', 'liters', 'litre', 'litres', 'l'], 'volume', 'ml', 1000)
registerUnit(['mililiter', 'milliliter', 'milliliters', 'millilitre', 'ml'], 'volume', 'ml', 1)

// Count units are deliberately kept separate: an item, a person, and a box
// are not interchangeable merely because their numeric counts match.
registerUnit(['buah', 'butir', 'item', 'items', 'apel', 'apple', 'buah apel', 'jeruk', 'orange', 'buah jeruk', 'pisang', 'banana', 'buah pisang', 'bola', 'kelereng', 'permen', 'koin'], 'count:item', 'buah', 1)
registerUnit(['orang', 'siswa', 'murid', 'people', 'person'], 'count:person', 'orang', 1)
registerUnit(['ekor'], 'count:animal', 'ekor', 1)
registerUnit(['lembar', 'helai'], 'count:sheet', 'lembar', 1)
registerUnit(['buku'], 'count:book', 'buku', 1)
registerUnit(['kotak'], 'count:box', 'kotak', 1)
registerUnit(['bagian'], 'count:part', 'bagian', 1)

function normalizeUnit(unit: string): string {
  return unit.trim().toLocaleLowerCase('id-ID').replace(/\.$/, '').replace(/\s+/g, ' ')
}

/**
 * Parses a numeric quantity and converts supported units to a canonical unit.
 * Unknown units are rejected rather than silently discarded.
 */
export function parseQuantity(rawInput: string): ParsedQuantity | null {
  if (typeof rawInput !== 'string' || !rawInput.trim()) return null
  const scalar = parseRational(rawInput)
  if (scalar) {
    return {
      value: scalar,
      dimension: 'scalar',
      canonicalUnit: null,
      originalUnit: null,
    }
  }

  const parts = rawInput.trim().split(/\s+/)
  // Try longer suffixes first so phrases such as "buah jeruk" remain intact.
  for (let splitIndex = 1; splitIndex < parts.length; splitIndex += 1) {
    const numericText = parts.slice(0, splitIndex).join(' ')
    const originalUnit = normalizeUnit(parts.slice(splitIndex).join(' '))
    const definition = units[originalUnit]
    if (!definition) continue

    const numericValue = parseRational(numericText)
    if (!numericValue) continue

    return {
      value: multiply(numericValue, definition.factor),
      dimension: definition.dimension,
      canonicalUnit: definition.canonicalUnit,
      originalUnit,
    }
  }

  return null
}

export function areQuantitiesEquivalent(
  first: ParsedQuantity,
  second: ParsedQuantity,
): boolean {
  const scalarAndCount =
    (first.dimension === 'scalar' && second.dimension.startsWith('count:')) ||
    (second.dimension === 'scalar' && first.dimension.startsWith('count:'))
  if (first.dimension !== second.dimension && !scalarAndCount) return false
  return (
    first.value.numerator === second.value.numerator &&
    first.value.denominator === second.value.denominator
  )
}
