'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUser(user)
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) setProfile(data)
      }
    }

    getUser()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-slate-200 px-8 py-4 font-sans">
      <div className="max-w-5xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-slate-800">
          TKA Platform
        </Link>

        <div className="flex items-center space-x-4">
          <Link
            href="/history"
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            📊 Riwayat Ujian
          </Link>

          <Link
            href="/admin"
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
          >
            ⚙️ Admin CMS
          </Link>

          {user ? (
            <div className="flex items-center space-x-3 border-l pl-4 border-slate-200">
              <div className="flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">
                  👤 {profile?.full_name || profile?.username}
                </span>
                {profile?.class_code && (
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 self-end mt-0.5">
                    Kelas: {profile.class_code}
                  </span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors ml-2"
              >
                Keluar
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Masuk / Daftar
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}