import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const { id } = await context.params
    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    if (!sessionId) return NextResponse.json({ error: 'ID sesi tidak valid.' }, { status: 400 })

    const { data, error } = await auth.adminClient
      .from('exam_sessions')
      .update({
        status: 'ongoing',
        proctor_auto_paused: false,
        proctor_pause_reason: null,
      })
      .eq('id', sessionId)
      .eq('exam_id', id)
      .eq('status', 'paused')
      .select('id')
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Sesi tidak ditemukan atau statusnya sudah berubah.' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
