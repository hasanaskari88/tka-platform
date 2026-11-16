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

type ProviderFailure = {
  provider: 'Groq' | 'Gemini'
  status?: number
  message: string
  retryAfter?: string
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

function getGroqRateLimitInfo(headers: Headers) {
  return {
    remainingRequests: headers.get('x-ratelimit-remaining-requests'),
    requestLimit: headers.get('x-ratelimit-limit-requests'),
    remainingTokens: headers.get('x-ratelimit-remaining-tokens'),
    tokenLimit: headers.get('x-ratelimit-limit-tokens'),
    resetRequests: headers.get('x-ratelimit-reset-requests'),
    resetTokens: headers.get('x-ratelimit-reset-tokens'),
    retryAfter: headers.get('retry-after'),
  }
}

function logGroqRateLimits(headers: Headers, task: string) {
  const limits = getGroqRateLimitInfo(headers)
  console.info(`Groq rate limits for ${task}:`, limits)
}

async function generateWithGroq(input: GenerateJsonInput): Promise<JsonObject> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY belum dikonfigurasi.')

  // Retry hanya untuk kegagalan validasi keluaran JSON. Jangan retry HTTP 429
  // karena itu justru akan menambah beban pada kuota organisasi.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const correction = attempt === 2
      ? '\n\nPERBAIKAN WAJIB: Percobaan sebelumnya tidak memenuhi JSON Schema. Kembalikan SATU objek JSON dengan properti tingkat atas "questions" berupa array. Setiap elemen array HARUS berupa objek soal lengkap sesuai skema, bukan string, bukan array, dan bukan teks biasa. Pastikan semua properti wajib tersedia dan tipe datanya tepat. Jangan sertakan markdown atau teks di luar JSON.'
      : ''

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'system',
            content: 'Anda adalah asisten ahli pendidikan. Kembalikan hanya objek JSON yang valid dan patuhi seluruh JSON Schema secara tepat. Setiap soal harus berupa objek dengan properti yang diminta, bukan string.',
          },
          { role: 'user', content: input.prompt + correction },
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

    logGroqRateLimits(response.headers, input.task)

    if (!response.ok) {
      const details = await response.text().catch(() => '')
      const rateLimits = getGroqRateLimitInfo(response.headers)
      const error = new Error(
        response.status === 429
          ? `Groq HTTP 429: batas rate limit tercapai. Retry-After: ${rateLimits.retryAfter || 'tidak diberikan'}.`
          : `Groq HTTP ${response.status}: ${details.slice(0, 500)}`
      ) as Error & { status?: number; retryAfter?: string; schemaValidationFailed?: boolean }
      error.status = response.status
      error.retryAfter = rateLimits.retryAfter || undefined
      error.schemaValidationFailed = response.status === 400 && /json_validate_failed|schema|validation/i.test(details)

      if (error.schemaValidationFailed && attempt === 1) {
        console.warn(`Groq JSON schema validation failed for ${input.task}; retrying once with explicit format correction.`)
        continue
      }
      throw error
    }

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
    }
    return parseJsonObject(payload.choices?.[0]?.message?.content)
  }

  throw new Error('Groq gagal menghasilkan JSON yang sesuai skema setelah satu kali percobaan ulang.')
}

async function generateWithGemini(
  input: GenerateJsonInput,
  apiKey: string,
  model: string
): Promise<JsonObject> {
  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: input.timeoutMs ?? 45000 } })
  const response = await client.models.generateContent({
    model,
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
 * Groq is the primary provider. Gemini is the fallback when Groq is unavailable,
 * rate-limited, or cannot produce valid JSON. API keys stay server-side.
 */
export async function generateJsonWithFallback(input: GenerateJsonInput) {
  const failures: ProviderFailure[] = []

  if (process.env.GROQ_API_KEY) {
    try {
      const data = await generateWithGroq(input)
      return { data, provider: 'Groq' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const details = error as Error & { status?: number; retryAfter?: string }
      failures.push({
        provider: 'Groq',
        status: details.status,
        message,
        retryAfter: details.retryAfter,
      })
      console.error(`AI provider Groq failed for ${input.task}:`, message)
    }
  }

  const geminiAccounts = [
    {
      label: 'Gemini utama',
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_TEXT_MODEL || 'gemini-4-hydrogen',
    },
    {
      label: 'Gemini cadangan akun kedua',
      apiKey: process.env.GEMINI_API_KEY_2,
      model: process.env.GEMINI_TEXT_MODEL_2 || 'gemini-3.5-flash-lite',
    },
  ].filter((account): account is { label: string; apiKey: string; model: string } => Boolean(account.apiKey))

  for (const account of geminiAccounts) {
    try {
      const data = await generateWithGemini(input, account.apiKey, account.model)
      console.info(`AI provider succeeded for ${input.task}: ${account.label} (${account.model})`)
      return { data, provider: 'Gemini' as const }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const details = error as Error & { status?: number }
      failures.push({ provider: 'Gemini', status: details.status, message })
      console.error(`AI provider ${account.label} failed for ${input.task}:`, message)
    }
  }

  const groqRateLimited = failures.some((failure) => failure.provider === 'Groq' && failure.status === 429)
  const geminiRateLimited = failures.some((failure) =>
    failure.provider === 'Gemini' && /429|RESOURCE_EXHAUSTED|quota/i.test(failure.message)
  )
  const groqSchemaFailed = failures.some((failure) =>
    failure.provider === 'Groq' && /json_validate_failed|schema|validasi keluaran JSON/i.test(failure.message)
  )

  let message = 'Layanan AI belum berhasil membuat soal. Silakan coba kembali beberapa saat lagi.'
  if (groqRateLimited && geminiRateLimited) {
    message = 'Kuota permintaan AI sedang mencapai batas pada Groq dan Gemini. Silakan coba lagi setelah batas kuota direset.'
  } else if (groqSchemaFailed && geminiRateLimited) {
    message = 'Groq belum berhasil menghasilkan format soal yang valid, sedangkan kuota harian Gemini sedang habis. Silakan coba lagi setelah kuota Gemini pulih.'
  } else if (groqRateLimited) {
    const retryAfter = failures.find((failure) => failure.provider === 'Groq' && failure.retryAfter)?.retryAfter
    message = retryAfter
      ? `Batas penggunaan Groq sedang tercapai. Silakan coba lagi dalam sekitar ${retryAfter} detik.`
      : 'Batas penggunaan Groq sedang tercapai. Silakan coba lagi setelah kuota rate limit tersedia.'
  } else if (geminiRateLimited) {
    message = 'Kuota Gemini sedang mencapai batas. Groq juga belum berhasil memproses permintaan ini. Silakan coba lagi nanti.'
  }

  throw new AIProvidersUnavailableError(message, 503)
}
