import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { google } from 'googleapis'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { decryptToken } from '@/lib/google-drive/token-encryption'

export const maxDuration = 60

const MAX_FILE_SIZE = 8 * 1024 * 1024
const MAX_REQUEST_SIZE = MAX_FILE_SIZE + 256 * 1024

async function readBoundedBody(request: NextRequest, maxBytes: number): Promise<Buffer | null> {
  const reader = request.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)), total)
}
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

function validImage(buffer: Buffer, type: string) {
  if (type === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  if (type === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
  if (type === 'image/gif') return ['GIF87a','GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  if (type === 'image/webp') return buffer.length >= 12 && buffer.subarray(0,4).toString('ascii') === 'RIFF' && buffer.subarray(8,12).toString('ascii') === 'WEBP'
  return false
}
function safeName(value: string) {
  return value.replace(/[^\w.\- ]/g, '_').trim().slice(0, 100) || 'gambar'
}
function extension(type: string) {
  return ({ 'image/jpeg':'jpg', 'image/png':'png', 'image/webp':'webp', 'image/gif':'gif' } as Record<string,string>)[type] || 'img'
}

async function uploadImageKit(file: File, buffer: Buffer, timeoutMs: number) {
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key || !process.env.IMAGEKIT_URL_ENDPOINT) throw new Error('Konfigurasi ImageKit belum lengkap.')
  const body = new FormData()
  body.append('file', new Blob([new Uint8Array(buffer)], { type: file.type }), file.name)
  body.append('fileName', safeName(file.name))
  body.append('useUniqueFileName', 'true')
  body.append('folder', '/tka-platform')
  const auth = Buffer.from(key + ':').toString('base64')
  const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + auth },
    body,
    signal: AbortSignal.timeout(Math.max(1000, Math.min(timeoutMs, 60000))),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.fileId || !data.url) throw new Error('ImageKit upload gagal: ' + (data.message || response.status))
  return { provider: 'imagekit', path: String(data.fileId), url: String(data.url), name: String(data.name || file.name) }
}

async function uploadGoogleDrive(file: File, buffer: Buffer, timeoutMs: number) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const encryptionKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY
  if (!clientId || !clientSecret || !encryptionKey) throw new Error('Konfigurasi Google Drive belum lengkap.')
  const supabase = createServiceRoleClient()
  const connectionResult = await runWithinTimeout(
    Promise.resolve(supabase.from('google_drive_tokens')
      .select('refresh_token_encrypted,drive_folder_id').eq('id','primary').maybeSingle()),
    timeoutMs,
  )
  const { data: connection, error } = connectionResult
  if (error || !connection) throw new Error('Google Drive belum terhubung.')
  const oauth = new google.auth.OAuth2(clientId, clientSecret,
    `${process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app'}/api/google-drive/callback`)
  oauth.setCredentials({ refresh_token: decryptToken(connection.refresh_token_encrypted) })
  const drive = google.drive({ version: 'v3', auth: oauth })
  let folderId = connection.drive_folder_id as string | null
  if (!folderId) {
    const folder = await drive.files.create({ requestBody: { name: 'TKA Platform - Gambar Soal', mimeType: 'application/vnd.google-apps.folder' }, fields: 'id' }, { timeout: timeoutMs })
    folderId = folder.data.id || null
    if (!folderId) throw new Error('Folder Google Drive gagal dibuat.')
    await runWithinTimeout(Promise.resolve(supabase.from('google_drive_tokens').update({ drive_folder_id: folderId, updated_at: new Date().toISOString() }).eq('id','primary')), timeoutMs)
  }
  const uploaded = await drive.files.create({
    requestBody: { name: safeName(file.name), mimeType: file.type, parents: [folderId] },
    media: { mimeType: file.type, body: Readable.from(buffer) },
    fields: 'id,name,size,webViewLink',
  }, { timeout: timeoutMs })
  const fileId = uploaded.data.id
  if (!fileId) throw new Error('Google Drive tidak mengembalikan ID file.')
  await drive.permissions.create({ fileId, requestBody: { type: 'anyone', role: 'reader' } }, { timeout: timeoutMs })
  return { provider: 'google_drive', path: fileId, url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`, name: uploaded.data.name || file.name }
}

async function uploadSupabase(file: File, buffer: Buffer, _timeoutMs: number) {
  const supabase = createServiceRoleClient()
  const path = `${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${extension(file.type)}`
  const { error } = await runWithinTimeout(Promise.resolve(supabase.storage.from('question-images').upload(path, buffer, {
    contentType: file.type, upsert: false, cacheControl: '31536000',
  })), _timeoutMs)
  if (error) throw error
  const { data } = supabase.storage.from('question-images').getPublicUrl(path)
  return { provider: 'supabase', path, url: data.publicUrl, name: safeName(file.name) }
}

async function runWithinTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Batas waktu penyimpanan habis.')), Math.max(1, timeoutMs))
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_SIZE) {
    return NextResponse.json({ error: 'Ukuran permintaan melebihi batas 8 MB.' }, { status: 413 })
  }

  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const rawBody = await readBoundedBody(request, MAX_REQUEST_SIZE)
    if (!rawBody) {
      return NextResponse.json({ error: 'Ukuran permintaan melebihi batas 8 MB.' }, { status: 413 })
    }
    const requestBody = new Uint8Array(rawBody.byteLength)
    requestBody.set(rawBody)
    const form = await new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: requestBody,
    }).formData()
    const file = form.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Pilih gambar terlebih dahulu.' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: 'Format gambar harus JPG, PNG, WEBP, atau GIF.' }, { status: 400 })
    if (!file.size || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Ukuran gambar maksimal 8 MB.' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!validImage(buffer, file.type)) return NextResponse.json({ error: 'Isi file tidak sesuai format gambar.' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const settingsResult = await runWithinTimeout(Promise.resolve(supabase.from('platform_service_settings').select('storage_config').eq('id','singleton').maybeSingle()), 1500).catch(() => ({ data: null }))
    const config = settingsResult.data?.storage_config || { provider_order: ['imagekit','google_drive','supabase'], providers: {} }
    const order = Array.isArray(config.provider_order) ? config.provider_order : ['imagekit','google_drive','supabase']
    const uploaders: Record<string, (timeoutMs: number) => Promise<{ provider: string; path: string; url: string; name: string }>> = {
      imagekit: (timeoutMs) => uploadImageKit(file, buffer, timeoutMs),
      google_drive: (timeoutMs) => uploadGoogleDrive(file, buffer, timeoutMs),
      supabase: (timeoutMs) => uploadSupabase(file, buffer, timeoutMs),
    }
    const attempts: Array<{ provider: string; status: string; duration_ms: number; message?: string }> = []
    let uploaded: { provider: string; path: string; url: string; name: string } | null = null
    const deadlineAt = Date.now() + 50000
    for (const provider of order) {
      if (!uploaders[provider] || config.providers?.[provider]?.enabled === false) continue
      const remaining = deadlineAt - Date.now()
      if (remaining <= 1500) {
        attempts.push({ provider, status: 'skipped', duration_ms: 0, message: 'Sisa batas waktu tidak cukup untuk provider berikutnya.' })
        break
      }
      const started = Date.now()
      try {
        uploaded = await runWithinTimeout(uploaders[provider](remaining - 1000), remaining - 1000)
        attempts.push({ provider, status: 'success', duration_ms: Date.now() - started })
        break
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        attempts.push({ provider, status: 'failed', duration_ms: Date.now() - started, message: message.slice(0, 300) })
      }
    }
    if (!uploaded) {
      await runWithinTimeout(Promise.resolve(supabase.from('storage_upload_logs').insert({
        original_name: safeName(file.name), mime_type: file.type, file_size_bytes: file.size,
        provider: 'none', status: 'failed', provider_attempts: attempts, uploaded_by: admin.user.id,
      })), 800).catch(() => null)
      return NextResponse.json({ error: 'Semua penyedia penyimpanan gagal. Periksa pengaturan dan koneksi layanan.', attempts }, { status: 503 })
    }

    let log: { id?: string; upload_id?: string } | null = null
    let logError: unknown = null
    try {
      const logResult = await runWithinTimeout(Promise.resolve(supabase.from('storage_upload_logs').insert({
        original_name: uploaded.name, mime_type: file.type, file_size_bytes: file.size,
        provider: uploaded.provider, storage_path: uploaded.path, public_url: uploaded.url,
        status: 'success', provider_attempts: attempts, uploaded_by: admin.user.id,
      }).select('id,upload_id').single()), 1000)
      log = logResult.data
      logError = logResult.error
    } catch (error) {
      logError = error
    }
    if (logError) console.error('Media upload log insert failed:', logError)

    return NextResponse.json({
      success: true,
      message: 'Gambar berhasil diunggah.',
      inventoryPending: Boolean(logError),
      warning: logError ? 'File tersimpan, tetapi pencatatan inventaris media belum berhasil. Sinkronisasi ulang diperlukan.' : null,
      file: { id: log?.id || null, uploadId: log?.upload_id || null, name: uploaded.name, mimeType: file.type, size: file.size, imageUrl: uploaded.url, url: uploaded.url, provider: uploaded.provider },
    })
  } catch (error) {
    console.error('Central media upload error:', error)
    return NextResponse.json({ error: 'Gagal mengunggah gambar.' }, { status: 500 })
  }
}
