import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

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

async function findUsage(supabase: ReturnType<typeof createServiceRoleClient>, url: string) {
  const questions = await getQuestionRows(supabase)
  const questionCount = questions.filter((row) =>
    row.image_url === url ||
    (row.question_text || '').includes(url) ||
    (row.explanation || '').includes(url) ||
    JSON.stringify(row.options ?? {}).includes(url)
  ).length

  const { data: materials, error } = await supabase
    .from('study_materials')
    .select('id,file_url,description')
  if (error) throw error
  const materialCount = (materials || []).filter((row) =>
    row.file_url === url || (row.description || '').includes(url)
  ).length

  return { questionCount, materialCount, total: questionCount + materialCount }
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('storage_upload_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error

    const assets = await Promise.all((data as MediaRow[] || []).map(async (asset) => {
      if (!asset.public_url || asset.status !== 'success') return { ...asset, usage: null }
      const usage = await findUsage(supabase, asset.public_url)
      return { ...asset, usage }
    }))

    return NextResponse.json({
      assets,
      summary: {
        count: assets.filter((item) => item.status === 'success').length,
        bytes: assets.filter((item) => item.status === 'success').reduce((sum, item) => sum + Number(item.file_size_bytes || 0), 0),
      },
    })
  } catch (error) {
    console.error('Media gallery GET:', error)
    return NextResponse.json({ error: 'Gagal memuat galeri media.' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin.authorized) return NextResponse.json({ error: admin.error }, { status: admin.status })

  try {
    const { id } = await request.json()
    if (typeof id !== 'string' || !id) return NextResponse.json({ error: 'ID media tidak valid.' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { data: asset, error: readError } = await supabase
      .from('storage_upload_logs')
      .select('*')
      .eq('id', id)
      .single()
    if (readError || !asset) return NextResponse.json({ error: 'Media tidak ditemukan.' }, { status: 404 })
    if (asset.status !== 'success') return NextResponse.json({ error: 'Media ini sudah tidak aktif.' }, { status: 409 })
    if (!asset.public_url) return NextResponse.json({ error: 'URL media tidak tersedia.' }, { status: 400 })

    const usage = await findUsage(supabase, asset.public_url)
    if (usage.total > 0) {
      return NextResponse.json({
        error: 'Gambar masih digunakan dan tidak boleh dihapus.',
        usage,
      }, { status: 409 })
    }

    if (asset.provider === 'supabase') {
      if (!asset.storage_path) throw new Error('Path file Supabase tidak tersedia.')
      const { error } = await supabase.storage.from('question-images').remove([asset.storage_path])
      if (error) throw error
    } else if (asset.provider === 'imagekit') {
      if (!asset.storage_path || !process.env.IMAGEKIT_PRIVATE_KEY) {
        throw new Error('ID file ImageKit atau private key tidak tersedia.')
      }
      const auth = Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')
      const response = await fetch('https://api.imagekit.io/v1/files/' + encodeURIComponent(asset.storage_path), {
        method: 'DELETE',
        headers: { Authorization: 'Basic ' + auth },
      })
      if (!response.ok) throw new Error('ImageKit menolak penghapusan file.')
    } else {
      return NextResponse.json({ error: 'Penghapusan untuk penyedia ini belum diaktifkan.' }, { status: 501 })
    }

    const { error: updateError } = await supabase
      .from('storage_upload_logs')
      .update({ status: 'deleted', deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Media gallery DELETE:', error)
    return NextResponse.json({ error: 'Gagal menghapus media. File tidak ditandai terhapus.' }, { status: 500 })
  }
}
