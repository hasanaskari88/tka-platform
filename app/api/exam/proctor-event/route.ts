import { NextResponse } from 'next/server'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError

    const sessionClient = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await sessionClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi login tidak valid.' }, { status: 401 })
    }

    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const eventType = body.eventType
    if (!UUID_PATTERN.test(sessionId) || !['tab_hidden', 'fullscreen_exit'].includes(eventType)) {
      return NextResponse.json({ error: 'Data pelanggaran tidak valid.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Layanan pengawasan belum dikonfigurasi.' }, { status: 503 })
    }

    const adminClient = createSupabaseClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data, error } = await adminClient.rpc('record_exam_proctor_event', {
      p_session_id: sessionId,
      p_user_id: user.id,
      p_event_type: eventType,
    })
    if (error) {
      console.error('Pencatatan pelanggaran ujian gagal:', error)
      return NextResponse.json({ error: 'Pelanggaran belum dapat dicatat.' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Proctor event API error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat mencatat pengawasan.' }, { status: 500 })
  }
}
