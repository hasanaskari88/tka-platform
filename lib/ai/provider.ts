import { GoogleGenAI } from '@google/genai'

type JsonObject = Record<string, unknown>

type GenerateJsonInput = {
  task: string
  prompt: string
  groqSchema: JsonObject
  geminiSchema: JsonObject
  timeoutMs?: number
  maxOutputTokens?: number
}

export class AIProvidersUnavailableError extends Error {
  status: number
  constructor(message: string, status = 503) {
    super(message)
    this.name = 'AIProvidersUnavailableError'
    this.status = status
  }
}

function parseJsonObject(text: string | null | undefined): JsonObject {
  if (!text) throw new Error('Model tidak mengembalikan isi.')
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Format keluaran AI bukan objek JSON.')
  }
  return parsed as JsonObject
}

async function generateWithGroq(input: GenerateJsonInput): Promise<JsonObject> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY belum dikonfigurasi.')

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'Anda adalah asisten ahli pendidikan. Ikuti instruksi dan skema keluaran dengan cermat.' },
        { role: 'user', content: input.prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ai_result',
          strict: true,
          schema: input.groqSchema,
        },
      },
      max_completion_tokens: input.maxOutputTokens ?? 1200,
    }),
    signal: AbortSignal.timeout(input.timeoutMs ?? 45000),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    const error = new Error(`Groq HTTP ${response.status}: ${details.slice(0, 500)}`) as Error & { status?: number }
    error.status = response.status
    throw error
  }

  const payload = await response.json() as {
    choices?: Array<{ message?: { content?: string | null } }>
  }
  return parseJsonObject(payload.choices?.[0]?.message?.content)
}

async function generateWithGemini(input: GenerateJsonInput): Promise<JsonObject> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi.')

  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: input.timeoutMs ?? 45000 } })
  const response = await client.models.generateContent({
    model: process.env.GEMINI_TEXT_MODEL || 'gemini-4-hydrogen',
    contents: input.prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: input.geminiSchema as never,
      maxOutputTokens: input.maxOutputTokens ?? 1200,
    },
  })

  return parseJsonObject(response.text)
}

/**
 * Groq is the primary provider. Gemini is used only when Groq is unavailable,
 * rate-limited, rejects a request, or encounters a transient/server error. API keys stay server-side.
 */
export async function generateJsonWithFallback(input: GenerateJsonInput) {
  if (process.env.GROQ_API_KEY) {
    try {
      const data = await generateWithGroq(input)
      return { data, provider: 'Groq' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`AI provider Groq failed for ${input.task}:`, message)
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const data = await generateWithGemini(input)
      return { data, provider: 'Gemini' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`AI provider Gemini failed for ${input.task}:`, message)
    }
  }

  throw new AIProvidersUnavailableError(
    'Semua penyedia AI sedang tidak tersedia atau kuotanya habis. Silakan coba lagi nanti.',
    503
  )
}
