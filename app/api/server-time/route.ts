import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Membaca header request memastikan waktu diambil saat request,
  // bukan dari hasil prerender atau cache statis.
  request.headers.get('x-vercel-id')

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_database_time')
  const databaseTimeMs = data ? Date.parse(String(data)) : Number.NaN

  if (error || !Number.isFinite(databaseTimeMs)) {
    return NextResponse.json(
      { error: 'Waktu database belum dapat dibaca.' },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  return NextResponse.json(
    { now: databaseTimeMs },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
