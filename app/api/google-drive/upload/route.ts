
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { google } from 'googleapis'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/google-drive/token-encryption'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 8 * 1024 * 1024

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]

function isValidImage(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    )
  }

  if (mimeType === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
      )
    )
  }

  if (mimeType === 'image/gif') {
    const signature = buffer.subarray(0, 6).toString('ascii')
    return signature === 'GIF87a' || signature === 'GIF89a'
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    )
  }

  return false
}

function safeFileName(name: string) {
  const cleaned = name
    .replace(/[^\w.\- ]/g, '_')
    .trim()
    .slice(0, 100)

  return cleaned || `gambar-${Date.now()}`
}

export async function POST(request: NextRequest) {
  try {
    // 1. Pastikan pengguna adalah admin
    const admin = await requireAdmin()

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    // 2. Baca file dari formulir
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'Pilih gambar terlebih dahulu.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format gambar harus JPG, PNG, WEBP, atau GIF.' },
        { status: 400 }
      )
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran gambar harus lebih dari 0 dan maksimal 8 MB.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    if (!isValidImage(buffer, file.type)) {
      return NextResponse.json(
        { error: 'Isi file tidak sesuai dengan format gambar.' },
        { status: 400 }
      )
    }

    // 3. Periksa konfigurasi server
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

    // 4. Ambil token Google dari Supabase
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
        { error: 'Google Drive belum terhubung. Hubungkan akun Google terlebih dahulu.' },
        { status: 400 }
      )
    }

    // 5. Siapkan koneksi Google Drive
    const refreshToken = decryptToken(
      connection.refresh_token_encrypted
    )

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`
    )

    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    })

    const drive = google.drive({
      version: 'v3',
      auth: oauth2Client,
    })

    // 6. Buat folder aplikasi jika belum tersedia
    let folderId = connection.drive_folder_id

    if (!folderId) {
      const folderResponse = await drive.files.create({
        requestBody: {
          name: 'TKA Platform - Gambar Soal',
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      })

      folderId = folderResponse.data.id || null

      if (!folderId) {
        throw new Error('Gagal membuat folder penyimpanan Google Drive.')
      }

      const { error: folderSaveError } = await supabaseAdmin
        .from('google_drive_tokens')
        .update({
          drive_folder_id: folderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'primary')

      if (folderSaveError) {
        throw new Error('Gagal menyimpan informasi folder Google Drive.')
      }
    }

    // 7. Unggah gambar ke Google Drive
    const uploadedFile = await drive.files.create({
      requestBody: {
        name: safeFileName(file.name),
        mimeType: file.type,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: Readable.from(buffer),
      },
      fields: 'id,name,mimeType,size,webViewLink',
    })

    const fileId = uploadedFile.data.id

    if (!fileId) {
      throw new Error('Google Drive tidak mengembalikan ID gambar.')
    }

    // 8. Izinkan gambar dibuka oleh siapa pun yang memiliki tautan
    await drive.permissions.create({
      fileId,
      requestBody: {
        type: 'anyone',
        role: 'reader',
      },
    })

    // 9. Siapkan alamat gambar
    const imageUrl =
      `https://drive.google.com/uc?export=view&id=${fileId}`

    return NextResponse.json({
      success: true,
      message: 'Gambar berhasil diunggah.',
      file: {
        id: fileId,
        name: uploadedFile.data.name,
        mimeType: uploadedFile.data.mimeType,
        size: uploadedFile.data.size,
        imageUrl,
        webViewLink: uploadedFile.data.webViewLink,
      },
    })
  } catch (error) {
    console.error('Google Drive upload error:', error)

    return NextResponse.json(
      { error: 'Gagal mengunggah gambar ke Google Drive. Periksa koneksi dan konfigurasi server.' },
      { status: 500 }
    )
  }
}
