import { NextResponse } from 'next/server'
import {
  createHomepagePinsAdminClient,
  getPublicPinOrder,
} from '@/lib/homepage-pins/server'
import { HOMEPAGE_SURFACES, type HomepageSurface } from '@/lib/homepage-pins/types'

export async function GET(request: Request) {
  const surface = new URL(request.url).searchParams.get('surface')

  if (!surface || !HOMEPAGE_SURFACES.includes(surface as HomepageSurface)) {
    return NextResponse.json(
      { error: 'Permukaan konten tidak valid.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const adminClient = createHomepagePinsAdminClient()
    const pins = await getPublicPinOrder(adminClient, surface as HomepageSurface)

    return NextResponse.json(
      { surface, pins },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    )
  } catch (error) {
    console.error('Gagal memuat prioritas beranda:', error)
    return NextResponse.json(
      { error: 'Prioritas konten belum dapat dimuat.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
