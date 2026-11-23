import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'
import { isSameOriginRequest } from '@/lib/security/request-origin'
import {
  getAdminSurfaceData,
  getSurfaceSourceRows,
  isSurfaceItemEligible,
} from '@/lib/homepage-pins/server'
import { HOMEPAGE_SURFACES, type HomepageSurface } from '@/lib/homepage-pins/types'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_PINNED_ITEMS = 500

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

async function authorize() {
  const auth = await requireTrustedAdmin()
  if (!auth.authorized) {
    return { response: jsonError(auth.error, auth.status) } as const
  }
  return { auth } as const
}

export async function GET(request: Request) {
  const authorization = await authorize()
  if ('response' in authorization) return authorization.response

  const surface = new URL(request.url).searchParams.get('surface')
  if (!surface || !HOMEPAGE_SURFACES.includes(surface as HomepageSurface)) {
    return jsonError('Permukaan konten tidak valid.', 400)
  }

  try {
    const data = await getAdminSurfaceData(
      authorization.auth.adminClient,
      surface as HomepageSurface,
    )
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('Gagal memuat pengaturan prioritas:', error)
    return jsonError('Data pengaturan beranda belum dapat dimuat.', 500)
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonError('Permintaan lintas situs ditolak.', 403)
  }

  const authorization = await authorize()
  if ('response' in authorization) return authorization.response

  let body: any
  try {
    body = await request.json()
  } catch {
    return jsonError('Isi permintaan tidak valid.', 400)
  }

  const surface = body?.surface
  const itemIds = body?.itemIds

  if (!surface || !HOMEPAGE_SURFACES.includes(surface as HomepageSurface)) {
    return jsonError('Permukaan konten tidak valid.', 400)
  }
  if (!Array.isArray(itemIds) || itemIds.length > MAX_PINNED_ITEMS) {
    return jsonError('Daftar prioritas tidak valid atau terlalu banyak.', 400)
  }
  if (!itemIds.every((id: unknown) => typeof id === 'string' && UUID_PATTERN.test(id))) {
    return jsonError('Ada ID konten yang tidak valid.', 400)
  }
  if (new Set(itemIds).size !== itemIds.length) {
    return jsonError('Daftar prioritas tidak boleh berisi ID duplikat.', 400)
  }

  const typedSurface = surface as HomepageSurface
  const adminClient = authorization.auth.adminClient

  try {
    const { data: currentPins, error: currentPinsError } = await adminClient
      .from('homepage_content_pins')
      .select('exam_id,material_id,announcement_id')
      .eq('surface', typedSurface)

    if (currentPinsError) throw currentPinsError

    const currentPinnedIds = new Set(
      (currentPins || []).map((pin: any) => {
        if (typedSurface === 'cbt' || typedSurface === 'practice') return String(pin.exam_id || '')
        if (typedSurface === 'material') return String(pin.material_id || '')
        return String(pin.announcement_id || '')
      }),
    )

    const sourceRows = await getSurfaceSourceRows(adminClient, typedSurface, itemIds)
    const sourceById = new Map(sourceRows.map((row: any) => [String(row.id), row]))

    if (sourceById.size !== itemIds.length) {
      return jsonError('Ada konten yang sudah tidak tersedia.', 400)
    }

    for (const id of itemIds as string[]) {
      const row = sourceById.get(id)
      if (!row) return jsonError('Konten tidak ditemukan.', 400)

      // Pin lama boleh tetap tersimpan saat konten tidak eligible agar admin
      // dapat mengatur ulang atau melepasnya. Pin baru harus eligible.
      if (!isSurfaceItemEligible(typedSurface, row) && !currentPinnedIds.has(id)) {
        return jsonError('Konten yang belum layak tampil tidak dapat diprioritaskan.', 400)
      }
    }

    const { error: saveError } = await adminClient.rpc('replace_homepage_content_pins', {
      p_surface: typedSurface,
      p_item_ids: itemIds,
      p_updated_by: authorization.auth.userId,
    })

    if (saveError) throw saveError

    return NextResponse.json(
      { ok: true, surface: typedSurface, pinnedIds: itemIds },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Gagal menyimpan prioritas beranda:', error)
    return jsonError('Urutan prioritas gagal disimpan. Silakan coba kembali.', 500)
  }
}
