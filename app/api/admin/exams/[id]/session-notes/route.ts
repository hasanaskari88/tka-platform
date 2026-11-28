import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { id } = await context.params
    const { data, error } = await auth.adminClient
      .from('exam_session_notes')
      .select('id, session_id, user_id, content, created_at, updated_at')
      .eq('exam_id', id)
      .neq('content', '')
      .order('updated_at', { ascending: false })
      .limit(500)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ notes: data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
