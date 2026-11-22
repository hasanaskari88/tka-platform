import type { RationalValue, VisualReasonCode } from '../types'
import { calculateVisualIntent } from '../math/calculator'
import { areEquivalent } from '../math/rational'
import { parseQuantity } from '../math/quantity'
import { extractKnownVisualIntent } from '../analysis/known-patterns'

export type KnownAnswerValidation = {
  status: 'valid' | 'invalid' | 'not_supported'
  reasonCode: VisualReasonCode | null
  expectedValue: RationalValue | null
  message: string
}

/**
 * Validates the keyed option only when the question matches a deterministic
 * pattern understood by the engine. Unsupported questions are not guessed.
 */
export function validateKnownNumericAnswer(
  question: string,
  selectedOption: string,
): KnownAnswerValidation {
  const intent = extractKnownVisualIntent(question)
  if (!intent) {
    return {
      status: 'not_supported',
      reasonCode: 'NEEDS_TEACHER_REVIEW',
      expectedValue: null,
      message: 'Pola soal belum didukung untuk pemeriksaan kunci otomatis.',
    }
  }

  const calculation = calculateVisualIntent(intent)
  if (calculation.status !== 'ready' || !calculation.value) {
    return {
      status: 'not_supported',
      reasonCode: calculation.reasonCode || 'NEEDS_TEACHER_REVIEW',
      expectedValue: null,
      message: calculation.explanation,
    }
  }

  const parsedOption = parseQuantity(selectedOption)
  if (!parsedOption) {
    return {
      status: 'invalid',
      reasonCode: 'INVALID_NUMBER',
      expectedValue: calculation.value,
      message: 'Nilai pada pilihan kunci belum dapat dibaca sebagai angka atau satuan yang didukung.',
    }
  }

  const expectedDimension = intent.type === 'equal_sharing' ? 'count:item' : 'scalar'
  if (parsedOption.dimension !== 'scalar' && parsedOption.dimension !== expectedDimension) {
    return {
      status: 'invalid',
      reasonCode: 'UNIT_MISMATCH',
      expectedValue: calculation.value,
      message: 'Satuan pada pilihan kunci tidak sesuai dengan satuan yang ditanyakan.',
    }
  }

  if (!areEquivalent(calculation.value, parsedOption.value)) {
    return {
      status: 'invalid',
      reasonCode: 'ANSWER_KEY_MISMATCH',
      expectedValue: calculation.value,
      message: 'Pilihan yang ditandai sebagai kunci tidak sama dengan hasil perhitungan deterministik.',
    }
  }

  return {
    status: 'valid',
    reasonCode: null,
    expectedValue: calculation.value,
    message: 'Kunci jawaban cocok dengan hasil perhitungan deterministik.',
  }
}
