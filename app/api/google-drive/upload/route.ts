import { NextRequest, NextResponse } from 'next/server'

/**
 * Endpoint lama dipertahankan agar editor dan halaman yang belum diperbarui
 * tetap kompatibel. Semua unggahan diteruskan ke layanan media terpusat.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const response = await fetch(new URL('/api/media/upload', request.url), {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') || '' },
      body: formData,
      cache: 'no-store',
    })
    const result = await response.json().catch(() => ({ error: 'Respons layanan media tidak valid.' }))
    return NextResponse.json(result, { status: response.status })
  } catch (error) {
    console.error('Legacy media upload proxy:', error)
    return NextResponse.json({ error: 'Gagal meneruskan unggahan ke layanan media.' }, { status: 500 })
  }
}
