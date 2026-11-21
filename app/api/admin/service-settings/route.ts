import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const STORAGE_IDS = ['imagekit', 'google_drive', 'supabase']
const AI_IDS = ['groq', 'gemini_primary', 'gemini_secondary']

function validConfig(value: unknown, allowed: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const config = value as { provider_order?: unknown; providers?: unknown }
  if (!Array.isArray(config.provider_order) || !config.provider_order.every((id) => allowed.includes(id))) return false
  if (new Set(config.provider_order).size !== config.provider_order.length) return false
  if (!config.providers || typeof config.providers !== 'object' || Array.isArray(config.providers)) return false
  return true
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('platform_service_settings')
      .select('storage_config, ai_config, updated_at')
      .eq('id', 'singleton')
      .single()
    if (error) throw error

    const { data: driveConnection, error: driveError } = await supabase
      .from('google_drive_tokens')
      .select('id, updated_at')
      .eq('id', 'primary')
      .maybeSingle()
    if (driveError) throw driveError

    return NextResponse.json({
      ...data,
      google_drive: {
        connected: Boolean(driveConnection),
        connected_at: driveConnection?.updated_at || null,
      },
      availability: {
        imagekit: Boolean(process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_URL_ENDPOINT),
        google_drive: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
        supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        groq: Boolean(process.env.GROQ_API_KEY),
        gemini_primary: Boolean(process.env.GEMINI_API_KEY),
        gemini_secondary: Boolean(process.env.GEMINI_API_KEY_2),
      },
    })
  } catch (error) {
    console.error('Service settings GET:', error)
    return NextResponse.json({ error: 'Gagal membaca pengaturan layanan.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const body = await request.json()
    if (!validConfig(body.storage_config, STORAGE_IDS) || !validConfig(body.ai_config, AI_IDS)) {
      return NextResponse.json({ error: 'Format pengaturan penyedia tidak valid.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase
      .from('platform_service_settings')
      .upsert({
        id: 'singleton',
        storage_config: body.storage_config,
        ai_config: body.ai_config,
        updated_by: admin.user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Service settings PATCH:', error)
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan layanan.' }, { status: 500 })
  }
}
