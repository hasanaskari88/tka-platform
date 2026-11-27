import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }
  return null
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { id } = await context.params
    const body = await request.json()
    const enabled = body.enabled
    const requireFullscreen = body.requireFullscreen
    const maxViolations = Number(body.maxViolations)

    if (typeof enabled !== 'boolean' || typeof requireFullscreen !== 'boolean' ||
      !Number.isInteger(maxViolations) || maxViolations < 1 || maxViolations > 50) {
      return NextResponse.json({ error: 'Pengaturan pengawasan tidak valid.' }, { status: 400 })
    }

    const { data, error } = await auth.adminClient
      .from('exams')
      .update({
        proctor_enabled: enabled,
        proctor_require_fullscreen: requireFullscreen,
        proctor_max_violations: maxViolations,
      })
      .eq('id', id)
      .select('id, proctor_enabled, proctor_require_fullscreen, proctor_max_violations')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Paket ujian tidak ditemukan.' }, { status: 400 })
    }
    return NextResponse.json({ settings: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Kesalahan server.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
