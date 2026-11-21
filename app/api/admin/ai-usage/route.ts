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
      acc.calls += row.status === 'success' ? 1 : 0
      acc.failures += row.status === 'failed' ? 1 : 0
      acc.tokens += Number(row.total_tokens || 0)
      if (!acc.providers[row.provider]) acc.providers[row.provider] = { calls: 0, failures: 0, tokens: 0 }
      if (row.status === 'success') acc.providers[row.provider].calls += 1
      if (row.status === 'failed') acc.providers[row.provider].failures += 1
      acc.providers[row.provider].tokens += Number(row.total_tokens || 0)
      return acc
    }, { calls: 0, failures: 0, tokens: 0, providers: {} as Record<string, { calls: number; failures: number; tokens: number }> })
    return NextResponse.json({ summary, logs })
  } catch (error) {
    console.error('AI usage GET:', error)
    return NextResponse.json({ error: 'Gagal membaca statistik penggunaan AI.' }, { status: 500 })
  }
}
