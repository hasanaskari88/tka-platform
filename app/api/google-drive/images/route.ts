
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/google-drive/token-encryption'

export async function GET(request: NextRequest) {
  try {
    // 1. Pastikan pengguna adalah admin
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    // 2. Periksa konfigurasi server
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (
      !clientId ||
      !clientSecret ||
      !encryptionKey ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error('Konfigurasi server belum lengkap.')
    }

    // 3. Ambil informasi koneksi Google Drive
    const supabaseAdmin = createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    const { data: connection, error: connectionError } =
      await supabaseAdmin
        .from('google_drive_tokens')
        .select('refresh_token_encrypted, drive_folder_id')
        .eq('id', 'primary')
        .maybeSingle()

    if (connectionError || !connection) {
      return NextResponse.json(
        { error: 'Google Drive belum terhubung.' },
        { status: 400 }
      )
    }

    if (!connection.drive_folder_id) {
      return NextResponse.json({
        success: true,
        files: [],
        nextPageToken: null,
      })
    }

    // 4. Hubungkan Google Drive
    const refreshToken = decryptToken(
      connection.refresh_token_encrypted
    )

    const redirectUri =
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })

    // 5. Ambil daftar gambar dari folder aplikasi
    const { searchParams } = new URL(request.url)
    const pageToken = searchParams.get('pageToken') || undefined

    const response = await drive.files.list({
      q: [
        `'${connection.drive_folder_id}' in parents`,
        "mimeType contains 'image/'",
        'trashed = false',
      ].join(' and '),
      pageSize: 100,
      pageToken,
      orderBy: 'name',
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,webViewLink)',
    })

    const files = (response.data.files || [])
      .filter((file) => file.id)
      .map((file) => ({
        id: file.id!,
        name: file.name || 'Tanpa nama',
        mimeType: file.mimeType || 'image/jpeg',
        size: file.size || '0',
        createdTime: file.createdTime || null,
        imageUrl:
          `https://drive.google.com/thumbnail?id=${file.id}&sz=w1600`,
        webViewLink: file.webViewLink || null,
      }))

    return NextResponse.json({
      success: true,
      files,
      nextPageToken: response.data.nextPageToken || null,
    })
  } catch (error) {
    console.error('Google Drive images error:', error)

    return NextResponse.json(
      {
        error: 'Gagal mengambil daftar gambar dari Google Drive.',
      },
      { status: 500 }
    )
  }
}
