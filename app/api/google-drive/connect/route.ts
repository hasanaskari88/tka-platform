import { connection, NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    await connection()

    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = new URL(
      '/api/google-drive/callback',
      request.url
    ).toString()

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Konfigurasi Google OAuth belum lengkap.' },
        { status: 500 }
      )
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )

    const state = crypto.randomUUID()

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      state,
    })

    const response = NextResponse.redirect(authUrl)

    response.cookies.set('google_drive_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/google-drive',
      maxAge: 600,
    })

    return response
  } catch (error) {
    console.error('Google Drive connect error:', error)

    return NextResponse.json(
      { error: 'Gagal memulai koneksi Google Drive.' },
      { status: 500 }
    )
  }
}
