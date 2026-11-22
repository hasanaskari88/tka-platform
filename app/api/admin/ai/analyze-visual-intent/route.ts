import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'
import { calculateVisualIntent } from '@/lib/visual-math/math/calculator'
import { validateVisualIntent } from '@/lib/visual-math/analysis/validate-intent'
import { buildAiVisualIntent } from '@/lib/visual-math/analysis/build-ai-intent'
import { extractKnownVisualIntent } from '@/lib/visual-math/analysis/known-patterns'
import type { VisualMathResult } from '@/lib/visual-math/types'

export const maxDuration = 60

function cleanText(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength)
    : ''
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
      'Analisis kebutuhan visual matematika untuk setiap soal. AI bertugas mengenali intent dan mengekstrak fakta yang tertulis; jangan menghitung hasil matematika.',
      'Gunakan hanya fakta yang benar-benar ada dalam teks soal. Jangan mengambil angka dari pembahasan, jangan menebak satuan, dan jangan menambah kategori.',
      'Kutip satu bagian teks soal secara persis pada properti evidence. Kutipan harus benar-benar muncul di teks soal dan memuat semua angka serta label yang dipakai.',
      'Jika fakta tidak cukup, bertentangan, atau bukti tidak dapat dikutip, pilih intentType none.',
      '',
      'Mata pelajaran: ' + (subject || 'Tidak disebutkan'),
      'Materi: ' + (topic || 'Tidak disebutkan'),
      '',
      'SOAL:',
      JSON.stringify(unresolvedQuestions),
      '',
      'Pilih intentType dan isi facts sebagai STRING JSON:',
      '- category_of_total: facts = {"categories":[{"id":"apel","label":"apel","count":10},{"id":"jeruk","label":"jeruk","count":6}],"targetCategoryId":"apel"}',
      '- equal_sharing: facts = {"objectLabel":"jeruk","totalObjects":6,"groupCount":5,"selectedGroupCount":1}',
      '- fraction_partition: facts = {"wholeLabel":"pizza","totalParts":8,"selectedParts":3,"selectedMeaning":"removed"}',
      '- number_comparison: facts = {"first":{"numerator":"1","denominator":"2"},"second":{"numerator":"3","denominator":"4"},"requestedRelation":"compare"}',
      '- number_line: facts = {"minimum":{"numerator":"0","denominator":"1"},"maximum":{"numerator":"1","denominator":"1"},"points":[{"label":"A","value":{"numerator":"1","denominator":"2"}}]}',
      '- geometry: facts = {"shape":"rectangle","measurements":[{"label":"panjang","value":{"numerator":"8","denominator":"1"},"unit":"cm"},{"label":"lebar","value":{"numerator":"4","denominator":"1"},"unit":"cm"}]}',
      '- chart_table: facts = {"chartType":"bar","categories":[{"label":"apel","value":4},{"label":"jeruk","value":3}]}',
      '- none: facts = "{}". Gunakan jika tidak membutuhkan visual atau fakta tidak dapat dibuktikan.',
      '',
      'Aturan tambahan: count/total harus bilangan bulat nonnegatif; pecahan memakai pembilang dan penyebut integer dalam string; requestedRelation gunakan compare kecuali pernyataan eksplisit; selectedMeaning gunakan selected, removed, atau remaining.',
      'Jangan menghasilkan jawaban atau hasil hitung. Kembalikan satu hasil untuk setiap index yang diberikan, tanpa mengubah index.',
    ].join('\n')

    let data: Record<string, unknown> = {}
    let provider = 'deterministic_partial'
    try {
      const aiResponse = await generateJsonWithFallback({
        task: 'ekstraksi intent dan fakta visual matematika',
        prompt,
        maxOutputTokens: 3600,
        groqSchema: {
          type: 'object',
          properties: {
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  index: { type: 'integer' },
                  intentType: { type: 'string', enum: ['category_of_total', 'equal_sharing', 'fraction_partition', 'number_comparison', 'number_line', 'geometry', 'chart_table', 'none'] },
                  confidence: { type: 'number' },
                  reason: { type: 'string' },
                  evidence: { type: 'string' },
                  facts: { type: 'string' },
                },
                required: ['index', 'intentType', 'confidence', 'reason', 'evidence', 'facts'],
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
                  intentType: { type: 'STRING', enum: ['category_of_total', 'equal_sharing', 'fraction_partition', 'number_comparison', 'number_line', 'geometry', 'chart_table', 'none'] },
                  confidence: { type: 'NUMBER' },
                  reason: { type: 'STRING' },
                  evidence: { type: 'STRING' },
                  facts: { type: 'STRING' },
                },
                required: ['index', 'intentType', 'confidence', 'reason', 'evidence', 'facts'],
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
            (entry as Record<string, unknown>).index === question.index,
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

        const confidence = typeof raw.confidence === 'number' ? raw.confidence : Number.NaN
        const built = buildAiVisualIntent(raw, question.question)
        if (!built.intent || !Number.isFinite(confidence) || confidence < 0.85 || confidence > 1) {
          return {
            index: question.index,
            result: {
              version: 1,
              status: built.reasonCode === 'RENDERER_NOT_SUPPORTED' || built.reasonCode === 'INTENT_NOT_RECOGNIZED' ? 'unsupported' : 'ambiguous',
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
