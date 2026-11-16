import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/google-drive/token-encryption'

export const runtime = 'nodejs'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
])

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    const fileId = request.nextUrl.searchParams.get('id') || ''
    if (!/^[a-zA-Z0-9_-]{10,200}$/.test(fileId)) {
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
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: connection, error } = await supabaseAdmin
      .from('google_drive_tokens')
      .select('refresh_token_encrypted')
      .eq('id', 'primary')
      .maybeSingle()

    if (error || !connection?.refresh_token_encrypted) {
      return NextResponse.json(
        { error: 'Koneksi Google Drive tidak tersedia.' },
        { status: 503 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      new URL('/api/google-drive/callback', request.url).toString()
    )

    oauth2Client.setCredentials({
      refresh_token: decryptToken(connection.refresh_token_encrypted),
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const metadata = await drive.files.get({
      fileId,
      fields: 'id,mimeType',
    })

    const mimeType = String(metadata.data.mimeType || '').toLowerCase()
    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'File Google Drive tersebut bukan gambar yang didukung.' },
        { status: 415 }
      )
    }

    const imageResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    const data = imageResponse.data as ArrayBuffer | Uint8Array
    const bytes = Buffer.isBuffer(data)
      ? data
      : data instanceof ArrayBuffer
        ? Buffer.from(data)
        : Buffer.from(data)

    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran gambar tidak valid atau melebihi 8 MB.' },
        { status: 413 }
      )
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('Google Drive image proxy error:', error)
    return NextResponse.json(
      { error: 'Gambar gagal dimuat dari Google Drive.' },
      { status: 502 }
    )
  }
}
