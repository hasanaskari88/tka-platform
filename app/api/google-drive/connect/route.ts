
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri =
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`

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
