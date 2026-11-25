import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Membaca request header memastikan endpoint memakai waktu saat request,
  // bukan hasil prerender/cache statis.
  request.headers.get('x-vercel-id')
  return NextResponse.json(
    { now: Date.now() },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
