import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { decryptToken } from '@/lib/google-drive/token-encryption'

export const runtime = 'nodejs'
type FoundFile = { original_name: string; mime_type: string; file_size_bytes: number; provider: string; storage_path: string; public_url: string; created_at?: string }

async function listImageKit(): Promise<FoundFile[]> {
  const key = process.env.IMAGEKIT_PRIVATE_KEY
  if (!key) return []
  const auth = Buffer.from(key + ':').toString('base64')
  const found: FoundFile[] = []
  for (let skip = 0; skip < 5000; skip += 1000) {
    const url = new URL('https://api.imagekit.io/v1/files')
    url.searchParams.set('path', '/tka-platform')
    url.searchParams.set('limit', '1000')
    url.searchParams.set('skip', String(skip))
    const response = await fetch(url, { headers: { Authorization: 'Basic ' + auth }, cache: 'no-store' })
    if (!response.ok) throw new Error('Gagal membaca daftar file ImageKit.')
    const items = await response.json() as Array<Record<string, unknown>>
    for (const item of items) {
      if (!item.fileId || !item.url) continue
      found.push({
        original_name: String(item.name || 'gambar'),
        mime_type: String(item.fileType || 'image/jpeg') === 'image' ? 'image/jpeg' : String(item.fileType || 'image/jpeg'),
        file_size_bytes: Number(item.size || 1),
        provider: 'imagekit',
        storage_path: String(item.fileId),
        public_url: String(item.url),
        created_at: typeof item.createdAt === 'string' ? item.createdAt : undefined,
      })
    }
    if (items.length < 1000) break
  }
  return found
}

async function listGoogleDrive(): Promise<FoundFile[]> {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) return []
  const supabase = createServiceRoleClient()
  const { data: connection } = await supabase.from('google_drive_tokens')
    .select('refresh_token_encrypted,drive_folder_id').eq('id','primary').maybeSingle()
  if (!connection?.drive_folder_id) return []
  const oauth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET,
    (process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app') + '/api/google-drive/callback'
  )
  oauth.setCredentials({ refresh_token: decryptToken(connection.refresh_token_encrypted) })
  const drive = google.drive({ version: 'v3', auth: oauth })
  const found: FoundFile[] = []
  let pageToken: string | undefined
  do {
    const response = await drive.files.list({
      q: "'" + connection.drive_folder_id + "' in parents and trashed = false and mimeType contains 'image/'",
      pageSize: 1000, pageToken,
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime)',
    })
    for (const file of response.data.files || []) {
      if (!file.id) continue
      found.push({
        original_name: file.name || 'gambar',
        mime_type: file.mimeType || 'image/jpeg',
        file_size_bytes: Number(file.size || 1),
        provider: 'google_drive',
        storage_path: file.id,
        public_url: 'https://drive.google.com/thumbnail?id=' + file.id + '&sz=w1600',
        created_at: file.createdTime || undefined,
      })
    }
    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)
  return found
}

async function listSupabase(): Promise<FoundFile[]> {
  const supabase = createServiceRoleClient()
  const found: FoundFile[] = []
  async function walk(folder: string) {
    let offset = 0
    while (true) {
      const { data, error } = await supabase.storage.from('question-images').list(folder, { limit: 1000, offset })
      if (error) throw error
      for (const item of data || []) {
        const path = folder ? folder + '/' + item.name : item.name
        if (item.id === null) {
          await walk(path)
          continue
        }
        const mime = String(item.metadata?.mimetype || '')
        if (!mime.startsWith('image/')) continue
        const { data: urlData } = supabase.storage.from('question-images').getPublicUrl(path)
        found.push({
          original_name: item.name,
          mime_type: mime,
          file_size_bytes: Number(item.metadata?.size || 1),
          provider: 'supabase',
          storage_path: path,
          public_url: urlData.publicUrl,
          created_at: item.created_at || undefined,
        })
      }
      if (!data || data.length < 1000) break
      offset += 1000
    }
  }
  await walk('')
  return found
}

export async function POST() {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })
  try {
    const supabase = createServiceRoleClient()
    const results = await Promise.allSettled([listImageKit(), listGoogleDrive(), listSupabase()])
    const found = results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
    const errors = results.flatMap((result, index) => result.status === 'rejected'
      ? [{ provider: ['ImageKit','Google Drive','Supabase Storage'][index], message: result.reason instanceof Error ? result.reason.message : 'Gagal membaca penyimpanan.' }]
      : [])
    let imported = 0
    for (const file of found) {
      const { data: existing } = await supabase.from('storage_upload_logs')
        .select('id').eq('provider', file.provider).eq('storage_path', file.storage_path).maybeSingle()
      if (existing) continue
      const { error } = await supabase.from('storage_upload_logs').insert({
        ...file,
        status: 'success',
        provider_attempts: [{ provider: file.provider, status: 'imported' }],
      })
      if (!error) imported += 1
    }
    return NextResponse.json({ success: true, discovered: found.length, imported, errors })
  } catch (error) {
    console.error('Media inventory sync:', error)
    return NextResponse.json({ error: 'Inventarisasi media gagal dijalankan.' }, { status: 500 })
  }
}
