import { connection, NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/supabase/admin'

const ALLOWED_HOSTS = new Set(['waterpedia.co.id', 'www.waterpedia.co.id'])
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
])

export async function GET(request: NextRequest) {
  await connection()

  try {
    const admin = await requireAdmin()
    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status }
      )
    }

    const rawUrl = request.nextUrl.searchParams.get('url') || ''
    let imageUrl: URL

    try {
      imageUrl = new URL(rawUrl)
    } catch {
      return NextResponse.json({ error: 'Alamat gambar tidak valid.' }, { status: 400 })
    }

    if (
      imageUrl.protocol !== 'https:' ||
      !ALLOWED_HOSTS.has(imageUrl.hostname.toLowerCase()) ||
      imageUrl.username ||
      imageUrl.password
    ) {
      return NextResponse.json({ error: 'Sumber gambar tidak diizinkan.' }, { status: 403 })
    }

    const upstream = await fetch(imageUrl.toString(), {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; GrisanImageFetcher/1.0)',
        Referer: 'https://waterpedia.co.id/',
      },
    })

    if (upstream.status >= 300 && upstream.status < 400) {
      return NextResponse.json(
        { error: 'Situs sumber mengalihkan alamat gambar; pengalihan tidak diikuti demi keamanan.' },
        { status: 502 }
      )
    }

    if (!upstream.ok) {
      return NextResponse.json(
        { error: 'Situs sumber gagal mengirim gambar (HTTP ' + upstream.status + ').' },
        { status: 502 }
      )
    }

    const mimeType = (upstream.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase()

    if (!ALLOWED_IMAGE_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: 'Sumber tidak mengembalikan format gambar yang didukung.' },
        { status: 415 }
      )
    }

    const contentLength = Number(upstream.headers.get('content-length') || 0)
    if (contentLength > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran gambar melebihi batas 8 MB.' },
        { status: 413 }
      )
    }

    const bytes = Buffer.from(await upstream.arrayBuffer())
    if (!bytes.length || bytes.length > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran gambar tidak valid atau melebihi 8 MB.' },
        { status: 413 }
      )
    }

    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline',
      },
    })
  } catch (error) {
    console.error('External image proxy error:', error)
    return NextResponse.json(
      { error: 'Gambar gagal diambil dari situs sumber.' },
      { status: 502 }
    )
  }
}
