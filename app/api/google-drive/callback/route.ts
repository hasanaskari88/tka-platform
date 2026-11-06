
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { encryptToken } from '@/lib/google-drive/token-encryption'



function finish(
  request: NextRequest,
  destination: string
) {
  const response = NextResponse.redirect(
    new URL(destination, request.url)
  )

  response.cookies.set('google_drive_oauth_state', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/google-drive',
    maxAge: 0,
  })

  return response
}

export async function GET(request: NextRequest) {
  try {
    // 1. Periksa state untuk mencegah CSRF
    const returnedState = request.nextUrl.searchParams.get('state')
    const savedState = request.cookies.get(
      'google_drive_oauth_state'
    )?.value

    if (!returnedState || !savedState || returnedState !== savedState) {
      return finish(
        request,
        '/admin?googleDrive=invalid_state'
      )
    }

    // 2. Pastikan pengguna masih admin
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return finish(
        request,
        admin.status === 401
          ? '/login?googleDrive=unauthorized'
          : '/admin?googleDrive=forbidden'
      )
    }

    // 3. Periksa apakah Google mengembalikan error
    const googleError = request.nextUrl.searchParams.get('error')

    if (googleError) {
      return finish(
        request,
        '/admin?googleDrive=cancelled'
      )
    }

    const code = request.nextUrl.searchParams.get('code')

    if (!code) {
      return finish(
        request,
        '/admin?googleDrive=missing_code'
      )
    }

    // 4. Siapkan OAuth Google
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (
      !clientId ||
      !clientSecret ||
      !supabaseUrl ||
      !serviceRoleKey
    ) {
      throw new Error('Konfigurasi server belum lengkap.')
    }

    const redirectUri =
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    // 5. Tukarkan authorization code dengan token
    const { tokens } = await oauth2Client.getToken(code)

    // 6. Hubungkan Supabase Admin Client khusus server
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

    // 7. Ambil data koneksi sebelumnya jika ada
    const { data: existing, error: readError } =
      await supabaseAdmin
        .from('google_drive_tokens')
        .select('refresh_token_encrypted, drive_folder_id')
        .eq('id', 'primary')
        .maybeSingle()

    if (readError) {
      throw new Error('Gagal membaca data koneksi Google Drive.')
    }

    // 8. Gunakan refresh token baru atau pertahankan token lama
    let encryptedRefreshToken = existing?.refresh_token_encrypted

    if (tokens.refresh_token) {
      encryptedRefreshToken = encryptToken(tokens.refresh_token)
    }

    if (!encryptedRefreshToken) {
      throw new Error(
        'Google tidak memberikan refresh token. Silakan ulangi koneksi.'
      )
    }

    // 9. Simpan token terenkripsi
    const { error: saveError } = await supabaseAdmin
      .from('google_drive_tokens')
      .upsert(
        {
          id: 'primary',
          refresh_token_encrypted: encryptedRefreshToken,
          drive_folder_id: existing?.drive_folder_id ?? null,
          connected_by: admin.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (saveError) {
      throw new Error('Gagal menyimpan koneksi Google Drive.')
    }

    return finish(
      request,
      '/admin?googleDrive=connected'
    )
  } catch (error) {
    console.error('Google Drive callback error:', error)

    return finish(
      request,
      '/admin?googleDrive=error'
    )
  }
}
