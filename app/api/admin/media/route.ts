import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { google } from 'googleapis'
import { decryptToken } from '@/lib/google-drive/token-encryption'

type MediaRow = {
  id: string
  upload_id: string
  original_name: string
  mime_type: string
  file_size_bytes: number
  provider: string
  storage_path: string | null
  public_url: string | null
  status: string
  created_at: string
  deleted_at: string | null
}

async function getQuestionRows(supabase: ReturnType<typeof createServiceRoleClient>) {
  const rows: Array<{ image_url: string | null; question_text: string | null; options: unknown; explanation: string | null }> = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('questions')
      .select('image_url,question_text,options,explanation')
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

async function getMaterialRows(supabase: ReturnType<typeof createServiceRoleClient>) {
  const rows: Array<{ file_url: string | null; description: string | null }> = []
  const pageSize = 1000
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from('study_materials')
      .select('file_url,description')
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < pageSize) break
  }
  return rows
}

function countUsage(
  questions: Awaited<ReturnType<typeof getQuestionRows>>,
  materials: Awaited<ReturnType<typeof getMaterialRows>>,
  url: string
) {
  const questionCount = questions.filter((row) =>
    row.image_url === url ||
    (row.question_text || '').includes(url) ||
    (row.explanation || '').includes(url) ||
    JSON.stringify(row.options ?? {}).includes(url)
  ).length
  const materialCount = materials.filter((row) =>
    row.file_url === url || (row.description || '').includes(url)
  ).length
  return { questionCount, materialCount, total: questionCount + materialCount }
}

async function findUsage(supabase: ReturnType<typeof createServiceRoleClient>, url: string) {
  const [questions, materials] = await Promise.all([
    getQuestionRows(supabase),
    getMaterialRows(supabase),
  ])
  return countUsage(questions, materials, url)
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const supabase = createServiceRoleClient()
    const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1))
    const pageSize = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('pageSize') || 18)))
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const [{ data, error }, { data: totals, error: totalsError }, { count, error: countError }] = await Promise.all([
      supabase.from('storage_upload_logs').select('*')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .range(from, to),
      supabase.from('storage_upload_logs').select('file_size_bytes').eq('status', 'success'),
      supabase.from('storage_upload_logs').select('id', { count: 'exact', head: true }).eq('status', 'success'),
    ])
    if (error) throw error
    if (totalsError) throw totalsError
    if (countError) throw countError

    const assets = (data || []) as MediaRow[]
    // Usage scanning hanya dijalankan untuk URL pada halaman yang sedang dibuka.
    // Jika pemeriksaan gagal, request gagal tertutup dan tidak memberi izin hapus.
    const [questionRows, materialRows] = await Promise.all([
      getQuestionRows(supabase),
      getMaterialRows(supabase),
    ])
    const withUsage = assets.map((asset) => ({
      ...asset,
      usage: asset.public_url ? countUsage(questionRows, materialRows, asset.public_url) : null,
    }))
    const total = count || 0
    const totalPages = Math.max(1, Math.ceil(total / pageSize))

    return NextResponse.json({
      assets: withUsage,
      page,
      pageSize,
      total,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
      summary: {
        count: total,
        bytes: (totals || []).reduce((sum, item) => sum + Number(item.file_size_bytes || 0), 0),
      },
    })
  } catch (error) {
    console.error('Media gallery GET:', error)
    return NextResponse.json({ error: 'Gagal memuat galeri media.' }, { status: 500 })
  }
}

async function deleteMediaById(supabase: ReturnType<typeof createServiceRoleClient>, id: string) {
  const { data: asset, error: readError } = await supabase
    .from('storage_upload_logs')
    .select('*')
    .eq('id', id)
    .single()
  if (readError || !asset) return { success: false, error: 'Media tidak ditemukan.' }
  if (asset.status !== 'success') return { success: false, error: 'Media ini sudah tidak aktif.' }
  if (!asset.public_url) return { success: false, error: 'URL media tidak tersedia.' }

  const usage = await findUsage(supabase, asset.public_url)
  if (usage.total > 0) return { success: false, error: 'Gambar masih digunakan.', usage }

  if (asset.provider === 'supabase') {
    if (!asset.storage_path) throw new Error('Path file Supabase tidak tersedia.')
    const { error } = await supabase.storage.from('question-images').remove([asset.storage_path])
    if (error) throw error
  } else if (asset.provider === 'imagekit') {
    if (!asset.storage_path || !process.env.IMAGEKIT_PRIVATE_KEY) throw new Error('ID file ImageKit atau private key tidak tersedia.')
    const auth = Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')
    const response = await fetch('https://api.imagekit.io/v1/files/' + encodeURIComponent(asset.storage_path), {
      method: 'DELETE',
      headers: { Authorization: 'Basic ' + auth },
    })
    if (!response.ok) throw new Error('ImageKit menolak penghapusan file.')
  } else if (asset.provider === 'google_drive') {
    if (!asset.storage_path || !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error('Konfigurasi Google Drive tidak lengkap.')
    const { data: connection, error: connectionError } = await supabase.from('google_drive_tokens')
      .select('refresh_token_encrypted').eq('id', 'primary').maybeSingle()
    if (connectionError || !connection) throw new Error('Google Drive belum terhubung.')
    const oauth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      (process.env.NEXT_PUBLIC_SITE_URL || 'https://grisan.vercel.app') + '/api/google-drive/callback'
    )
    oauth.setCredentials({ refresh_token: decryptToken(connection.refresh_token_encrypted) })
    await google.drive({ version: 'v3', auth: oauth }).files.delete({ fileId: asset.storage_path })
  } else {
    throw new Error('Penyedia penyimpanan ini belum didukung untuk penghapusan.')
  }

  const { error: updateError } = await supabase.from('storage_upload_logs')
    .update({ status: 'deleted', deleted_at: new Date().toISOString() }).eq('id', id)
  if (updateError) throw updateError
  return { success: true }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const body = await request.json()
    const ids: string[] = Array.isArray(body.ids)
      ? [...new Set(body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0))]
      : typeof body.id === 'string' && body.id
        ? [body.id]
        : []
    if (!ids.length) return NextResponse.json({ error: 'ID media tidak valid.' }, { status: 400 })
    if (ids.length > 50) return NextResponse.json({ error: 'Maksimal 50 gambar dapat dihapus sekaligus.' }, { status: 400 })

    const supabase = createServiceRoleClient()
    let deleted = 0
    const skipped: Array<{ id: string; reason: string }> = []
    for (const id of ids) {
      try {
        const result = await deleteMediaById(supabase, id)
        if (result.success) deleted++
        else skipped.push({ id, reason: result.error || 'Tidak dapat dihapus.' })
      } catch (error) {
        console.error('Media delete item failed:', id, error)
        skipped.push({ id, reason: error instanceof Error ? error.message : 'Terjadi kesalahan.' })
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      skipped,
      message: deleted + ' gambar berhasil dihapus.' + (skipped.length ? ' ' + skipped.length + ' gambar dilewati karena masih digunakan atau gagal dihapus.' : ''),
    })
  } catch (error) {
    console.error('Media gallery DELETE:', error)
    return NextResponse.json({ error: 'Gagal menghapus media.' }, { status: 500 })
  }
}
