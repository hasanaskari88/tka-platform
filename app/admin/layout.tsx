'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminSidebar from '@/components/admin/AdminSidebar'

function AdminLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
      <p className="text-slate-600 font-medium text-sm">
        Memeriksa hak akses admin...
      </p>
    </div>
  )
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdminAccess() {
      setLoading(true)
      setAuthorized(false)

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          router.replace('/login')
          return
        }

        // Guru kelas aktif boleh membuka halaman Rekap Nilai saja.
        // Endpoint server memeriksa teacher_signatories.user_id.
        const isRekapNilaiPath =
          pathname === '/admin/rekap-nilai' ||
          pathname.startsWith('/admin/rekap-nilai/')

        if (isRekapNilaiPath) {
          const response = await fetch('/api/admin/rekap-nilai/access', {
            method: 'GET',
            cache: 'no-store',
          })

          if (response.ok) {
            setAuthorized(true)
          } else {
            const payload = await response.json().catch(() => null)
            alert(payload?.error || 'Akses Rekap Nilai hanya untuk admin atau guru kelas yang memiliki penugasan aktif.')
            router.replace('/')
          }
          return
        }

        // Halaman admin lainnya tetap menggunakan pemeriksaan role yang lama.
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile && profile.role === 'admin') {
          setAuthorized(true)
        } else {
          alert('Akses Ditolak: Halaman ini khusus untuk Admin / Guru!')
          router.replace('/')
        }
      } catch (error) {
        console.error('Pemeriksaan akses admin gagal:', error)
        alert('Hak akses gagal diperiksa. Silakan muat ulang halaman.')
        router.replace('/')
      } finally {
        setLoading(false)
      }
    }

    void checkAdminAccess()
  }, [router, pathname])

  if (loading) return <AdminLoading />
  if (!authorized) return null

  return (
    <div className="min-h-screen w-full bg-slate-50 md:flex">
      <Suspense fallback={<div className="hidden shrink-0 md:block md:w-64" />}>
        <AdminSidebar />
      </Suspense>
      <main className="min-h-screen min-w-0 flex-1">{children}</main>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  )
}
