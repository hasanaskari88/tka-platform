import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })
  try {
    const supabase = createServiceRoleClient()
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase.from('ai_usage_logs')
      .select('request_id,task,provider,model,status,prompt_tokens,completion_tokens,total_tokens,latency_ms,error_message,created_at')
      .gte('created_at', since).order('created_at', { ascending: false }).limit(1000)
    if (error) throw error
    const logs = data || []
    const summary = logs.reduce((acc, row) => {
      const isImage = row.task === 'question_image_generation'
      const isSuccess = row.status === 'success'
      const isFailure = row.status === 'failed'
      const rowTokens = Number(row.total_tokens || 0)

      // Pertahankan statistik agregat lama agar konsumen API yang sudah ada tetap kompatibel.
      if (isSuccess) acc.calls += 1
      if (isFailure) acc.failures += 1
      acc.tokens += rowTokens

      // Pisahkan penggunaan gambar dari AI teks. Endpoint gambar tidak menyediakan token.
      if (isImage) {
        if (isSuccess) acc.imageCalls += 1
        if (isFailure) acc.imageFailures += 1
      } else {
        if (isSuccess) acc.textCalls += 1
        if (isFailure) acc.textFailures += 1
        acc.textTokens += rowTokens
      }

      if (!acc.providers[row.provider]) acc.providers[row.provider] = { calls: 0, failures: 0, tokens: 0 }
      if (isSuccess) acc.providers[row.provider].calls += 1
      if (isFailure) acc.providers[row.provider].failures += 1
      acc.providers[row.provider].tokens += rowTokens
      return acc
    }, {
      calls: 0,
      failures: 0,
      tokens: 0,
      textCalls: 0,
      textFailures: 0,
      textTokens: 0,
      imageCalls: 0,
      imageFailures: 0,
      providers: {} as Record<string, { calls: number; failures: number; tokens: number }>,
    })
    return NextResponse.json({ summary, logs })
  } catch (error) {
    console.error('AI usage GET:', error)
    return NextResponse.json({ error: 'Gagal membaca statistik penggunaan AI.' }, { status: 500 })
  }
}
