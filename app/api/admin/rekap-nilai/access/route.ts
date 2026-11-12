import { NextResponse } from 'next/server'
import { getRekapNilaiAccess } from '@/lib/supabase/rekap-nilai-access'

export async function GET() {
  const access = await getRekapNilaiAccess()
  if (!access.authorized) {
    return NextResponse.json({ error: access.error }, { status: access.status })
  }

  return NextResponse.json({ authorized: true })
}
