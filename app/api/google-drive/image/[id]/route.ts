import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/google-drive/token-encryption'


interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    const { id } = await context.params
    if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json({ error: 'ID gambar tidak valid.' }, { status: 400 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!clientId || !clientSecret || !encryptionKey || !supabaseUrl || !serviceRoleKey) {
      throw new Error('Konfigurasi server Google Drive belum lengkap.')
    }

    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: connection, error } = await supabaseAdmin
      .from('google_drive_tokens')
      .select('refresh_token_encrypted')
      .eq('id', 'primary')
      .maybeSingle()

    if (error || !connection) {
      return NextResponse.json({ error: 'Google Drive belum terhubung.' }, { status: 400 })
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`
    )
    oauth2Client.setCredentials({
      refresh_token: decryptToken(connection.refresh_token_encrypted),
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const metadata = await drive.files.get({
      fileId: id,
      fields: 'id,mimeType,name',
    })

    const mimeType = metadata.data.mimeType || 'application/octet-stream'
    if (!mimeType.startsWith('image/')) {
      return NextResponse.json({ error: 'File yang diminta bukan gambar.' }, { status: 415 })
    }

    const media = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    const bytes = Buffer.from(media.data as ArrayBuffer)

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('Google Drive image proxy error:', error)
    return NextResponse.json(
      { error: 'Gagal mengambil gambar dari Google Drive.' },
      { status: 500 }
    )
  }
}
