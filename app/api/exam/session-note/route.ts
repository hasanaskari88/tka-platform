import { NextResponse } from 'next/server'
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

async function getClients() {
  const sessionClient = await createServerSupabaseClient()
  const { data: { user }, error } = await sessionClient.auth.getUser()
  if (error || !user) return { user: null, adminClient: null }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Layanan catatan belum dikonfigurasi.')
  const adminClient = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return { user, adminClient }
}

async function getOwnedSession(adminClient: any, sessionId: string, userId: string) {
  return adminClient
    .from('exam_sessions')
    .select('id, exam_id, user_id, status')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
}

export async function GET(request: Request) {
  try {
    const { user, adminClient } = await getClients()
    if (!user || !adminClient) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 })
    const sessionId = new URL(request.url).searchParams.get('sessionId') || ''
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return NextResponse.json({ error: 'Sesi tidak valid.' }, { status: 400 })
    const { data: session, error: sessionError } = await getOwnedSession(adminClient, sessionId, user.id)
    if (sessionError || !session) return NextResponse.json({ error: 'Sesi ujian tidak ditemukan.' }, { status: 404 })
    const { data, error } = await adminClient.from('exam_session_notes')
      .select('content, updated_at')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    return NextResponse.json({ note: data || { content: '', updated_at: null } }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Get exam note failed:', error)
    return NextResponse.json({ error: 'Catatan belum dapat dimuat.' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError
    const { user, adminClient } = await getClients()
    if (!user || !adminClient) return NextResponse.json({ error: 'Silakan login kembali.' }, { status: 401 })
    const body = await request.json()
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
    const content = typeof body.content === 'string' ? body.content : null
    if (!/^[0-9a-f-]{36}$/i.test(sessionId) || content === null || content.length > 10000) {
      return NextResponse.json({ error: 'Isi catatan tidak valid (maksimal 10.000 karakter).' }, { status: 400 })
    }
    const { data: session, error: sessionError } = await getOwnedSession(adminClient, sessionId, user.id)
    if (sessionError || !session) return NextResponse.json({ error: 'Sesi ujian tidak ditemukan.' }, { status: 404 })
    if (!['ongoing', 'paused'].includes(session.status)) {
      return NextResponse.json({ error: 'Catatan hanya dapat diubah selama sesi ujian aktif.' }, { status: 409 })
    }
    const now = new Date().toISOString()
    const { data, error } = await adminClient.from('exam_session_notes').upsert({
      session_id: session.id,
      exam_id: session.exam_id,
      user_id: user.id,
      content,
      updated_at: now,
    }, { onConflict: 'session_id,user_id' }).select('updated_at').single()
    if (error) throw error
    return NextResponse.json({ saved: true, updated_at: data.updated_at })
  } catch (error) {
    console.error('Save exam note failed:', error)
    return NextResponse.json({ error: 'Catatan belum berhasil disimpan.' }, { status: 500 })
  }
}
