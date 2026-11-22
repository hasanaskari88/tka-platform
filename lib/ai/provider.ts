import { GoogleGenAI } from '@google/genai'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type JsonObject = Record<string, unknown>
type GenerateJsonInput = {
  task: string
  prompt: string
  groqSchema: JsonObject
  geminiSchema: JsonObject
  timeoutMs?: number
  deadlineAt?: number
  maxOutputTokens?: number
}
type Usage = { promptTokens?: number; completionTokens?: number; totalTokens?: number }
type ProviderResult = { data: JsonObject; model: string; usage?: Usage }
type ProviderFailure = { provider: 'Groq' | 'Gemini'; status?: number; message: string; retryAfter?: string }

export class AIProvidersUnavailableError extends Error {
  status: number
  constructor(message: string, status = 503) {
    super(message)
    this.name = 'AIProvidersUnavailableError'
    this.status = status
  }
}

function remainingBudget(input: GenerateJsonInput): number {
  return Math.max(0, (input.deadlineAt ?? (Date.now() + (input.timeoutMs ?? 45000))) - Date.now())
}

async function runWithinBudget<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Batas waktu total provider AI habis.')), Math.max(1, timeoutMs))
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function settleWithin<T>(promise: PromiseLike<T>, timeoutMs: number): Promise<T | null> {
  if (timeoutMs <= 0) return null
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs)
    Promise.resolve(promise).then(
      (value) => { clearTimeout(timer); resolve(value) },
      () => { clearTimeout(timer); resolve(null) },
    )
  })
}

function parseJsonObject(text: string | null | undefined): JsonObject {
  if (!text) throw new Error('Model tidak mengembalikan isi.')
  const parsed: unknown = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Format keluaran AI bukan objek JSON.')
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

async function getProviderConfig(deadlineAt: number) {
  const fallback = {
    provider_order: ['groq', 'gemini_primary', 'gemini_secondary'],
    providers: { groq: { enabled: true }, gemini_primary: { enabled: true }, gemini_secondary: { enabled: true } },
  }
  try {
    const supabase = createServiceRoleClient()
    const query = supabase.from('platform_service_settings').select('ai_config').eq('id', 'singleton').maybeSingle()
      .then(({ data }) => data?.ai_config || fallback)
    return await settleWithin(query, Math.min(1200, deadlineAt - Date.now() - 1500)) || fallback
  } catch {
    return fallback
  }
}

async function logAttempt(input: {
  requestId: string; task: string; provider: string; model?: string; status: 'success' | 'failed' | 'skipped'
  usage?: Usage; latencyMs?: number; error?: string; errorCode?: string
}, deadlineAt?: number) {
  try {
    const supabase = createServiceRoleClient()
    const insert = supabase.from('ai_usage_logs').insert({
      request_id: input.requestId,
      task: input.task,
      provider: input.provider,
      model: input.model || null,
      status: input.status,
      prompt_tokens: input.usage?.promptTokens ?? null,
      completion_tokens: input.usage?.completionTokens ?? null,
      total_tokens: input.usage?.totalTokens ?? null,
      latency_ms: input.latencyMs ?? null,
      error_code: input.errorCode || null,
      error_message: input.error?.slice(0, 500) || null,
    })
    await settleWithin(insert, deadlineAt === undefined ? 300 : Math.min(300, deadlineAt - Date.now() - 250))
  } catch (error) {
    console.error('AI usage log insert failed:', error)
  }
}

/** Catat pemakaian AI non-teks (misalnya generator gambar) pada tabel log yang sama. */
export async function recordAIUsage(input: {
  requestId: string
  task: string
  provider: string
  model: string
  status: 'success' | 'failed' | 'skipped'
  latencyMs?: number
  error?: string
  errorCode?: string
}) {
  await logAttempt(input)
}

async function generateWithGroq(input: GenerateJsonInput): Promise<ProviderResult> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY belum dikonfigurasi.')
  const model = process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b'

  for (let attempt = 1; attempt <= 2; attempt++) {
    const correction = attempt === 2
      ? '\n\nPERBAIKAN WAJIB: Respons sebelumnya ditolak karena tidak memenuhi JSON Schema untuk tugas "' + input.task + '". Periksa kembali seluruh instruksi tugas dan skema JSON yang diberikan pada permintaan ini. Kembalikan satu objek JSON yang valid dengan struktur dan tipe data yang tepat sesuai skema tersebut. Pastikan semua properti wajib tersedia, tidak menambahkan properti yang tidak diizinkan, dan jangan sertakan markdown atau teks di luar JSON.'
      : ''
    const remaining = remainingBudget(input)
    if (remaining <= 1000) throw new Error('Batas waktu total AI habis sebelum percobaan Groq berikutnya.')
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Anda adalah asisten ahli pendidikan. Kembalikan hanya objek JSON yang valid dan patuhi seluruh JSON Schema secara tepat. Setiap soal harus berupa objek dengan properti yang diminta, bukan string.' },
          { role: 'user', content: input.prompt + correction },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'ai_result', strict: true, schema: input.groqSchema } },
        max_completion_tokens: input.maxOutputTokens ?? 1200,
      }),
      signal: AbortSignal.timeout(Math.max(1000, remaining - 750)),
    })
    if (!response.ok) {
      const details = await response.text().catch(() => '')
      const rateLimits = getGroqRateLimitInfo(response.headers)
      const error = new Error(response.status === 429
        ? 'Groq HTTP 429: batas rate limit tercapai. Retry-After: ' + (rateLimits.retryAfter || 'tidak diberikan') + '.'
        : 'Groq HTTP ' + response.status + ': ' + details.slice(0, 500)) as Error & { status?: number; retryAfter?: string; schemaValidationFailed?: boolean }
      error.status = response.status
      error.retryAfter = rateLimits.retryAfter || undefined
      error.schemaValidationFailed = response.status === 400 && /json_validate_failed|schema|validation/i.test(details)
      if (error.schemaValidationFailed && attempt === 1) continue
      throw error
    }
    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string | null } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    return {
      data: parseJsonObject(payload.choices?.[0]?.message?.content),
      model,
      usage: payload.usage ? {
        promptTokens: payload.usage.prompt_tokens,
        completionTokens: payload.usage.completion_tokens,
        totalTokens: payload.usage.total_tokens,
      } : undefined,
    }
  }
  throw new Error('Groq gagal menghasilkan JSON yang sesuai skema setelah satu kali percobaan ulang.')
}

async function generateWithGemini(input: GenerateJsonInput, apiKey: string, model: string): Promise<ProviderResult> {
  const remaining = remainingBudget(input)
  if (remaining <= 1000) throw new Error('Batas waktu total AI habis sebelum permintaan Gemini.')
  const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: Math.max(1000, remaining - 750) } })
  const response = await client.models.generateContent({
    model,
    contents: input.prompt,
    config: { responseMimeType: 'application/json', responseSchema: input.geminiSchema as never, maxOutputTokens: input.maxOutputTokens ?? 1200 },
  })
  const usage = response.usageMetadata
  return {
    data: parseJsonObject(response.text),
    model,
    usage: usage ? {
      promptTokens: usage.promptTokenCount,
      completionTokens: usage.candidatesTokenCount,
      totalTokens: usage.totalTokenCount,
    } : undefined,
  }
}

/** Urutan provider dapat diatur admin. Kunci API hanya dibaca dari environment server. */
export async function generateJsonWithFallback(input: GenerateJsonInput) {
  const requestId = crypto.randomUUID()
  const failures: ProviderFailure[] = []
  const deadlineAt = Date.now() + (input.timeoutMs ?? 45000)
  const boundedInput: GenerateJsonInput = { ...input, deadlineAt }
  const config = await getProviderConfig(deadlineAt)
  const accounts = {
    groq: { label: 'Groq', provider: 'Groq' as const, apiKey: process.env.GROQ_API_KEY, model: process.env.GROQ_TEXT_MODEL || 'openai/gpt-oss-120b' },
    gemini_primary: { label: 'Gemini utama', provider: 'Gemini' as const, apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_TEXT_MODEL || 'gemini-4-hydrogen' },
    gemini_secondary: { label: 'Gemini cadangan akun kedua', provider: 'Gemini' as const, apiKey: process.env.GEMINI_API_KEY_2, model: process.env.GEMINI_TEXT_MODEL_2 || 'gemini-3.5-flash-lite' },
  }
  const order = Array.isArray(config?.provider_order) ? config.provider_order : ['groq', 'gemini_primary', 'gemini_secondary']

  for (const id of order) {
    const account = accounts[id as keyof typeof accounts]
    if (!account) continue
    const enabled = config?.providers?.[id]?.enabled !== false
    if (!enabled || !account.apiKey) {
      await logAttempt({ requestId, task: input.task, provider: account.provider, model: account.model, status: 'skipped', error: !enabled ? 'Dinonaktifkan admin.' : 'API key belum dikonfigurasi.' }, deadlineAt)
      continue
    }

    const remaining = deadlineAt - Date.now()
    if (remaining <= 2000) {
      await logAttempt({ requestId, task: input.task, provider: account.provider, model: account.model, status: 'skipped', error: 'Batas waktu total tidak cukup untuk memulai provider berikutnya.' }, deadlineAt)
      break
    }
    const started = Date.now()
    try {
      const providerBudget = Math.max(1, deadlineAt - Date.now() - 750)
      const operation = id === 'groq'
        ? generateWithGroq(boundedInput)
        : generateWithGemini(boundedInput, account.apiKey!, account.model)
      const result = await runWithinBudget(operation, providerBudget)
      await logAttempt({ requestId, task: input.task, provider: account.provider, model: result.model, status: 'success', usage: result.usage, latencyMs: Date.now() - started }, deadlineAt)
      return { data: result.data, provider: account.provider, model: result.model, usage: result.usage, requestId }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const details = error as Error & { status?: number; retryAfter?: string }
      failures.push({ provider: account.provider, status: details.status, message, retryAfter: details.retryAfter })
      await logAttempt({ requestId, task: input.task, provider: account.provider, model: account.model, status: 'failed', latencyMs: Date.now() - started, error: message, errorCode: details.status ? String(details.status) : undefined }, deadlineAt)
      console.error('AI provider ' + account.label + ' failed for ' + input.task + ':', message)
    }
  }

  const groqRateLimited = failures.some((failure) => failure.provider === 'Groq' && failure.status === 429)
  const geminiRateLimited = failures.some((failure) => failure.provider === 'Gemini' && /429|RESOURCE_EXHAUSTED|quota/i.test(failure.message))
  const groqSchemaFailed = failures.some((failure) => failure.provider === 'Groq' && /json_validate_failed|schema|validasi keluaran JSON/i.test(failure.message))
  let message = 'Layanan AI belum berhasil membuat soal. Silakan coba kembali beberapa saat lagi.'
  if (groqRateLimited && geminiRateLimited) message = 'Kuota permintaan AI sedang mencapai batas pada Groq dan Gemini. Silakan coba lagi setelah batas kuota direset.'
  else if (groqSchemaFailed && geminiRateLimited) message = 'Groq belum berhasil menghasilkan format soal yang valid, sedangkan kuota harian Gemini sedang habis. Silakan coba lagi setelah kuota Gemini pulih.'
  else if (groqRateLimited) {
    const retryAfter = failures.find((failure) => failure.provider === 'Groq' && failure.retryAfter)?.retryAfter
    message = retryAfter ? 'Batas penggunaan Groq sedang tercapai. Silakan coba lagi dalam sekitar ' + retryAfter + ' detik.' : 'Batas penggunaan Groq sedang tercapai. Silakan coba lagi setelah kuota rate limit tersedia.'
  } else if (geminiRateLimited) message = 'Kuota Gemini sedang mencapai batas. Groq juga belum berhasil memproses permintaan ini. Silakan coba lagi nanti.'
  throw new AIProvidersUnavailableError(message, 503)
}
