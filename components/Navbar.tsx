'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme, ThemeMode } from '@/context/ThemeContext'
import Link from 'next/link'

export default function Navbar() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null))
    const { data: authListener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
    })
    return () => authListener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  const themeConfig: Record<ThemeMode, { name: string; icon: string; bg: string }> = {
    school: { name: 'Resmi SD', icon: '🏫', bg: 'bg-indigo-600 text-white' },
    space: { name: 'Luar Angkasa', icon: '🚀', bg: 'bg-purple-600 text-white' },
    jungle: { name: 'Hutan Rimba', icon: '🌿', bg: 'bg-emerald-600 text-white' },
    ocean: { name: 'Jelajah Laut', icon: '🌊', bg: 'bg-sky-600 text-white' },
    disney: { name: 'Disney Magis', icon: '🏰', bg: 'bg-gradient-to-r from-pink-600 to-purple-600 text-white' },
    cartoon3d: { name: 'Cartoon 3D', icon: '🎨', bg: 'bg-amber-400 text-slate-950 border-2 border-slate-900 font-bold' },
  }

  const currentThemeConfig = themeConfig[theme] || themeConfig.school

  return (
    <header className="w-full sticky top-0 z-40 shadow-lg font-sans relative">
      {/* 1. KOP IDENTITAS SEKOLAH (RESPONSIF MOBILE) */}
      <div className="bg-gradient-to-r from-sky-950 via-indigo-950 to-blue-950 text-white text-[10px] sm:text-xs py-1.5 px-3 sm:px-8 border-b border-sky-800/50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 text-center sm:text-left">
          <div className="flex items-center space-x-1.5 text-sky-100 font-medium truncate max-w-full">
            <span className="truncate">📍 Jl. P.Diponegoro Km 6, Getasan, Kab. Semarang (50774)</span>
          </div>
          <div className="flex items-center space-x-4 text-sky-200 shrink-0">
            <a href="mailto:sdnegerigetasan@gmail.com" className="hover:text-white transition-colors truncate">
              ✉️ sdnegerigetasan@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* 2. NAVBAR UTAMA */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 sm:h-20 flex justify-between items-center gap-2">
          
          {/* BRAND LOGO & NAMA SEKOLAH ADAPTIF */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group min-w-0">
            <img
              src="/logo-sd-getasan.png"
              alt="Logo SD NEGERI GETASAN"
              className="w-8 h-8 sm:w-12 sm:h-12 object-contain drop-shadow-md transition-transform group-hover:scale-105 shrink-0"
              onError={(e: any) => {
                e.target.style.display = 'none'
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1.5">
                <span className="text-sm sm:text-lg md:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-600 tracking-tight truncate">
                  SD NEGERI GETASAN
                </span>
                <span className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-bold bg-sky-100 text-sky-800 rounded-full border border-sky-200 shrink-0">
                  EST. 1951
                </span>
              </div>
              <p className="text-[9px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
                CBT & Asesmen Ujian Online
              </p>
            </div>
          </Link>

          {/* NAVIGASI & PEMILIH TEMA */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            
            {/* WIDGET PEMILIH TEMA */}
            <div className="relative">
              <button
                onClick={() => setShowThemeMenu(!showThemeMenu)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center space-x-1 sm:space-x-1.5 shadow-sm transition-all active:scale-95 border ${currentThemeConfig.bg}`}
              >
                <span>{currentThemeConfig.icon}</span>
                <span className="hidden sm:inline">{currentThemeConfig.name}</span>
                <span className="text-[9px] sm:text-[10px]">▼</span>
              </button>

              {/* DROPDOWN PILIHAN TEMA */}
              {showThemeMenu && (
                <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 p-2 z-50 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                    🎨 Pilih Tema Halaman
                  </div>

                  {(Object.keys(themeConfig) as ThemeMode[]).map((key) => (
                    <button
                      key={key}
                      onClick={() => {
                        setTheme(key)
                        setShowThemeMenu(false)
                      }}
                      className={`w-full flex items-center space-x-2.5 px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-left transition-all ${
                        theme === key
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-sm sm:text-base">{themeConfig[key].icon}</span>
                      <span>{themeConfig[key].name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/"
              className="px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <span className="sm:hidden">🏠</span>
              <span className="hidden sm:inline">🏠 Beranda</span>
            </Link>

            {user && (
              <Link
                href="/history"
                className="px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all flex items-center space-x-1"
              >
                <span>📊</span>
                <span className="hidden sm:inline">Riwayat</span>
              </Link>
            )}
            <Link
              href="/practice"
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors border border-indigo-200/80 flex items-center space-x-1"
            >
              <span>🎮 Latihan Mandiri</span>
            </Link>
            <Link
              href="/admin"
              className="px-2 py-1.5 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <span className="sm:hidden">⚙️</span>
              <span className="hidden sm:inline">⚙️ Admin</span>
            </Link>

            {user ? (
              <button
                onClick={handleLogout}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-[11px] sm:text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] sm:text-xs font-bold rounded-xl shadow-sm hover:shadow-indigo-200 transition-all"
              >
                🔑 Masuk
              </Link>
            )}
          </div>

        </div>
      </nav>
    </header>
  )
}