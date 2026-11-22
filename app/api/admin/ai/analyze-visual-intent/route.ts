import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'
import { calculateVisualIntent } from '@/lib/visual-math/math/calculator'
import { validateVisualIntent } from '@/lib/visual-math/analysis/validate-intent'
import { extractKnownVisualIntent } from '@/lib/visual-math/analysis/known-patterns'
import type {
  VisualIntent,
  VisualMathResult,
  VisualReasonCode,
} from '@/lib/visual-math/types'

export const maxDuration = 60

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''
}

function buildIntent(
  raw: Record<string, unknown>,
): { intent: VisualIntent | null; reasonCode: VisualReasonCode | null; reason: string } {
  if (raw.intentType === 'none') {
    return {
      intent: null,
      reasonCode: 'RENDERER_NOT_SUPPORTED',
      reason: cleanText(raw.reason, 240) || 'Soal tidak memerlukan visual matematika yang didukung.',
    }
  }

  return {
    intent: null,
    reasonCode: 'FACTS_INCOMPLETE',
    reason: 'AI mengenali kemungkinan visual matematika, tetapi pola bahasanya belum memiliki ekstraksi fakta deterministik. Gambar dihentikan agar tidak menebak.',
  }
}

function createKnownQuestionResult(question: string): VisualMathResult | null {
  const intent = extractKnownVisualIntent(question)
  if (!intent) return null

  const validatedIntent = validateVisualIntent(intent)
  if (!validatedIntent) {
    return {
      version: 1,
      status: 'invalid',
      intent: null,
      calculatedValue: null,
      confidence: 1,
      reasonCode: 'AI_RESPONSE_INVALID',
      explanation: 'Intent hasil ekstraksi deterministik tidak lolos validasi struktur.',
      trace: {
        traceId: randomUUID(),
        stages: [
          { stage: 'deterministic_semantic_extraction', status: 'ok' },
          { stage: 'intent_schema_validation', status: 'failed', reasonCode: 'AI_RESPONSE_INVALID' },
        ],
      },
    }
  }

  const calculation = calculateVisualIntent(validatedIntent)
  return {
    version: 1,
    status: calculation.status,
    intent: calculation.status === 'ready' ? validatedIntent : null,
    calculatedValue: calculation.value,
    confidence: 1,
    reasonCode: calculation.reasonCode,
    explanation: calculation.explanation,
    trace: {
      traceId: randomUUID(),
      stages: [
        { stage: 'deterministic_semantic_extraction', status: 'ok' },
        { stage: 'intent_schema_validation', status: 'ok' },
        {
          stage: 'deterministic_calculation',
          status: calculation.status === 'ready' ? 'ok' : 'failed',
          reasonCode: calculation.reasonCode || undefined,
        },
      ],
    },
  }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json()
    const subject = cleanText(body.subject, 80)
    const topic = cleanText(body.topic, 300)
    const questions = Array.isArray(body.questions) ? body.questions.slice(0, 15) : []
    if (!questions.length) {
      return NextResponse.json({ error: 'Daftar soal wajib dikirim.' }, { status: 400 })
    }

    const safeQuestions = questions.map((question: unknown, index: number) => {
      const item = question && typeof question === 'object' ? question as Record<string, unknown> : {}
      return {
        index,
        question: cleanText(item.question, 3000),
        explanation: cleanText(item.explanation, 1500),
      }
    })
    if (safeQuestions.some((item: { question: string }) => !item.question)) {
      return NextResponse.json({ error: 'Teks soal tidak boleh kosong.' }, { status: 400 })
    }

    const deterministicResults = new Map<number, VisualMathResult>()
    const unresolvedQuestions = safeQuestions.filter((question: { index: number; question: string }) => {
      const result = createKnownQuestionResult(question.question)
      if (result) deterministicResults.set(question.index, result)
      return !result
    })

    if (unresolvedQuestions.length === 0) {
      return NextResponse.json({
        success: true,
        provider: 'deterministic',
        results: safeQuestions.map((question: { index: number }) => ({
          index: question.index,
          result: deterministicResults.get(question.index),
        })),
      })
    }

    const prompt = [
      'Klasifikasikan kebutuhan visual matematika dari setiap soal. Jangan menghitung dan jangan mengarang fakta.',
      '',
      'Mata pelajaran: ' + (subject || 'Tidak disebutkan'),
      'Materi: ' + (topic || 'Tidak disebutkan'),
      '',
      'SOAL:',
      JSON.stringify(unresolvedQuestions),
      '',
      'Pilih intentType:',
      '- category_of_total: menanyakan bagian satu kategori dari keseluruhan beberapa kategori.',
      '- equal_sharing: membagi sejumlah benda sama rata ke beberapa kelompok.',
      '- fraction_partition: membagi satu keseluruhan menjadi bagian sama besar.',
      '- none: tidak membutuhkan diagram matematika atau tidak cukup informasi.',
      '',
      'AI hanya mengklasifikasikan maksud. Fakta dan perhitungan akan diperiksa terpisah oleh program. Jika tidak yakin, pilih none dengan confidence rendah.',
      'Kembalikan JSON dengan index, intentType, confidence (0 sampai 1), dan reason untuk setiap soal.',
    ].join('\n')

    let data: Record<string, unknown> = {}
    let provider = 'deterministic_partial'
    try {
      const aiResponse = await generateJsonWithFallback({
      task: 'ekstraksi intent visual matematika',
      prompt,
      maxOutputTokens: 2600,
      groqSchema: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                index: { type: 'integer' },
                intentType: { type: 'string', enum: ['category_of_total', 'equal_sharing', 'fraction_partition', 'none'] },
                confidence: { type: 'number' },
                reason: { type: 'string' },
              },
              required: ['index', 'intentType', 'confidence', 'reason'],
              additionalProperties: false,
            },
          },
        },
        required: ['results'],
        additionalProperties: false,
      },
      geminiSchema: {
        type: 'OBJECT',
        properties: {
          results: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                index: { type: 'INTEGER' },
                intentType: { type: 'STRING', enum: ['category_of_total', 'equal_sharing', 'fraction_partition', 'none'] },
                confidence: { type: 'NUMBER' },
                reason: { type: 'STRING' },
              },
              required: ['index', 'intentType', 'confidence', 'reason'],
            },
          },
        },
        required: ['results'],
      },
      })
      data = aiResponse.data as Record<string, unknown>
      provider = aiResponse.provider
    } catch (aiError) {
      if (deterministicResults.size === 0) throw aiError
      const partialResults = safeQuestions.map((question: { index: number }) => {
        const knownResult = deterministicResults.get(question.index)
        return {
          index: question.index,
          result: knownResult || {
            version: 1,
            status: 'unsupported',
            intent: null,
            calculatedValue: null,
            confidence: null,
            reasonCode: 'NEEDS_TEACHER_REVIEW',
            explanation: 'Analisis AI tidak tersedia untuk soal ini. Visual matematika tidak dibuat.',
            trace: {
              traceId: randomUUID(),
              stages: [
                { stage: 'ai_extraction', status: 'failed', reasonCode: 'NEEDS_TEACHER_REVIEW' },
              ],
            },
          },
        }
      })
      return NextResponse.json({
        success: true,
        provider: 'deterministic_partial',
        results: partialResults,
      })
    }

    const rawResults = Array.isArray(data.results) ? data.results : []
    const results: Array<{ index: number; result: VisualMathResult }> = safeQuestions.map(
      (question: { index: number; question: string }): { index: number; result: VisualMathResult } => {
        const deterministicResult = deterministicResults.get(question.index)
        if (deterministicResult) {
          return { index: question.index, result: deterministicResult }
        }

        const raw = rawResults.find(
          (entry: unknown) =>
            entry &&
            typeof entry === 'object' &&
            Number((entry as Record<string, unknown>).index) === question.index,
        ) as Record<string, unknown> | undefined

        if (!raw) {
          return {
            index: question.index,
            result: {
              version: 1,
              status: 'unsupported',
              intent: null,
              calculatedValue: null,
              confidence: null,
              reasonCode: 'AI_RESPONSE_INVALID',
              explanation: 'AI tidak mengembalikan analisis untuk soal ini.',
              trace: { traceId: randomUUID(), stages: [{ stage: 'ai_extraction', status: 'failed', reasonCode: 'AI_RESPONSE_INVALID' }] },
            },
          }
        }

        const confidence = Number(raw.confidence)
        const built = buildIntent(raw)
        if (!built.intent || !Number.isFinite(confidence) || confidence < 0.8 || confidence > 1) {
          return {
            index: question.index,
            result: {
              version: 1,
              status: built.reasonCode === 'RENDERER_NOT_SUPPORTED' ? 'unsupported' : 'ambiguous',
              intent: null,
              calculatedValue: null,
              confidence: Number.isFinite(confidence) ? confidence : null,
              reasonCode: built.reasonCode || 'NEEDS_TEACHER_REVIEW',
              explanation: built.reason,
              trace: {
                traceId: randomUUID(),
                stages: [
                  { stage: 'ai_extraction', status: 'ok' },
                  { stage: 'deterministic_fact_check', status: 'failed', reasonCode: built.reasonCode || 'NEEDS_TEACHER_REVIEW' },
                ],
              },
            },
          }
        }

        const validatedIntent = validateVisualIntent(built.intent)
        if (!validatedIntent) {
          return {
            index: question.index,
            result: {
              version: 1,
              status: 'invalid',
              intent: null,
              calculatedValue: null,
              confidence,
              reasonCode: 'AI_RESPONSE_INVALID',
              explanation: 'Struktur intent dari AI tidak lolos validasi.',
              trace: {
                traceId: randomUUID(),
                stages: [
                  { stage: 'ai_extraction', status: 'ok' },
                  { stage: 'intent_schema_validation', status: 'failed', reasonCode: 'AI_RESPONSE_INVALID' },
                ],
              },
            },
          }
        }

        const calculation = calculateVisualIntent(validatedIntent)
        const status = calculation.status === 'ready' ? 'ready' : calculation.status
        return {
          index: question.index,
          result: {
            version: 1,
            status,
            intent: status === 'ready' ? validatedIntent : null,
            calculatedValue: calculation.value,
            confidence,
            reasonCode: calculation.reasonCode,
            explanation: calculation.explanation || built.reason,
            trace: {
              traceId: randomUUID(),
              stages: [
                { stage: 'ai_extraction', status: 'ok' },
                { stage: 'deterministic_fact_check', status: 'ok' },
                { stage: 'intent_schema_validation', status: 'ok' },
                {
                  stage: 'deterministic_calculation',
                  status: calculation.status === 'ready' ? 'ok' : 'failed',
                  reasonCode: calculation.reasonCode || undefined,
                },
              ],
            },
          },
        }
      },
    )

    return NextResponse.json({ success: true, provider, results })
  } catch (error) {
    console.error('Visual math intent analysis failed:', error)
    const status = error instanceof AIProvidersUnavailableError ? error.status : 500
    const message = error instanceof AIProvidersUnavailableError
      ? error.message
      : 'Gagal menganalisis intent matematika.'
    return NextResponse.json({ error: message }, { status })
  }
}
