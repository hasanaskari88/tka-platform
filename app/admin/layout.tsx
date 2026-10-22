'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAdminAccess() {
      const supabase = createClient()
      
      // 1. Cek Sesi Login User
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        // Jika belum login, lempar ke halaman login
        router.replace('/login')
        return
      }

      // 2. Ambil Data Profil User dari Supabase
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // 3. Cek apakah role user adalah 'admin'
      if (profile && profile.role === 'admin') {
        setAuthorized(true)
      } else {
        alert('Akses Ditolak: Halaman ini khusus untuk Admin / Guru!')
        router.replace('/')
      }
      setLoading(false)
    }

    checkAdminAccess()
  }, [router])

  // Tampilan Loading saat pemeriksaan hak akses berlangsung
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-slate-600 font-medium text-sm">
          Memeriksa hak akses admin...
        </p>
      </div>
    )
  }

  // Jika tidak berhak, jangan tampilkan isi halaman
  if (!authorized) {
    return null
  }

  return <>{children}</>
}