
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme, ThemeMode } from '@/context/ThemeContext'
import Link from 'next/link'

export default function Navbar() {
  const router = useRouter()

  const {
    theme,
    setTheme,
    chromeVisible,
    setChromeVisible,
  } = useTheme()

  const [user, setUser] = useState<any>(null)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  // Memantau status login Supabase
  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null)
    })

    const { data: authListener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null)
      })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Logout pengguna
  const handleLogout = async () => {
    const supabase = createClient()

    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
  }

  // Konfigurasi tema
  const themeConfig: Record<
    ThemeMode,
    { name: string; icon: string; style: string }
  > = {
    school: {
      name: 'Resmi SD',
      icon: '🏫',
      style: 'from-blue-600 to-indigo-600 text-white',
    },
    space: {
      name: 'Luar Angkasa',
      icon: '🚀',
      style: 'from-violet-600 to-fuchsia-600 text-white',
    },
    jungle: {
      name: 'Hutan Rimba',
      icon: '🌿',
      style: 'from-emerald-500 to-green-700 text-white',
    },
    ocean: {
      name: 'Jelajah Laut',
      icon: '🌊',
      style: 'from-sky-500 to-blue-700 text-white',
    },
    disney: {
      name: 'Disney Magis',
      icon: '🏰',
      style: 'from-pink-600 to-purple-600 text-white',
    },
    cartoon3d: {
      name: 'Cartoon 3D',
      icon: '🎨',
      style: 'from-amber-300 to-yellow-400 text-slate-950',
    },
  }

  const currentThemeConfig =
    themeConfig[theme] || themeConfig.school

  const navLink =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-extrabold text-slate-700 transition-all hover:-translate-y-0.5 hover:bg-indigo-50 hover:text-indigo-700'

  const activeGameLink =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-3 py-2 text-xs font-black text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md'

  // Sembunyikan Navbar ketika Mode Fokus aktif.
  // Semua hooks tetap dipanggil sebelum kondisi ini.
  if (!chromeVisible) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full font-sans shadow-[0_8px_30px_-18px_rgba(15,23,42,0.45)]">

      {/* STRIP INFORMASI SEKOLAH */}
      <div className="border-b border-blue-400/20 bg-gradient-to-r from-[#071638] via-[#102a66] to-[#071638] px-3 py-2 text-[10px] text-blue-50 sm:px-6 sm:text-xs">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-x-4 gap-y-1">

          <span className="min-w-0 truncate font-semibold">
            📍 Jl. P. Diponegoro Km 6, Getasan, Kab. Semarang (50774)
          </span>

          <a
            href="mailto:sdnegerigetasan@gmail.com"
            className="shrink-0 font-semibold text-cyan-200 transition hover:text-white"
          >
            ✉️{' '}
            <span className="hidden sm:inline">
              sdnegerigetasan@gmail.com
            </span>
            <span className="sm:hidden">
              Email Sekolah
            </span>
          </a>

        </div>
      </div>

      {/* NAVBAR UTAMA */}
      <nav className="border-b border-indigo-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:py-4">

          {/* IDENTITAS SEKOLAH */}
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
          >
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-100 via-white to-indigo-100 shadow-sm ring-1 ring-indigo-100 transition group-hover:rotate-3 group-hover:scale-105 sm:h-14 sm:w-14">
              <img
                src="/logo-sd-getasan.png"
                alt="Logo SD Negeri Getasan"
                className="h-9 w-9 object-contain sm:h-12 sm:w-12"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-gradient-to-r from-blue-800 via-indigo-700 to-violet-600 bg-clip-text text-base font-black tracking-tight text-transparent sm:text-xl">
                  SD NEGERI GETASAN
                </span>

                <span className="hidden rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-black text-cyan-800 xl:inline-flex">
                  EST. 1951
                </span>
              </div>

              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:text-[10px]">
                CBT Adventure • Asesmen Ujian Online
              </p>
            </div>
          </Link>

          {/* DAFTAR NAVIGASI */}
          <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:justify-end lg:overflow-visible lg:pb-0">

            {/* PEMILIH TEMA */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-expanded={showThemeMenu}
                aria-haspopup="menu"
                onClick={() => setShowThemeMenu((previous) => !previous)}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r px-3 py-2 text-[11px] font-black shadow-md ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg active:scale-95 sm:text-xs ${currentThemeConfig.style}`}
              >
                <span>{currentThemeConfig.icon}</span>
                <span>{currentThemeConfig.name}</span>
                <span className="text-[9px]">▾</span>
              </button>

              {showThemeMenu && (
                <>
                  {/* Lapisan untuk menutup menu saat area luar diklik */}
                  <button
                    type="button"
                    aria-label="Tutup menu tema"
                    className="fixed inset-0 z-40 cursor-default"
                    onClick={() => setShowThemeMenu(false)}
                  />

                  {/* Daftar pilihan tema */}
                  <div
                    role="menu"
                    className="absolute right-0 z-50 mt-3 w-52 rounded-2xl border border-indigo-100 bg-white p-2 shadow-[0_20px_60px_-15px_rgba(30,41,59,0.35)]"
                  >
                    <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      🎨 Pilih Dunia Belajarmu
                    </p>

                    {(Object.keys(themeConfig) as ThemeMode[]).map(
                      (key) => (
                        <button
                          key={key}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setTheme(key)
                            setShowThemeMenu(false)
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-extrabold transition ${
                            theme === key
                              ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-800 ring-1 ring-indigo-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-lg">
                            {themeConfig[key].icon}
                          </span>

                          <span className="flex-1">
                            {themeConfig[key].name}
                          </span>

                          {theme === key && (
                            <span className="text-indigo-600">
                              ✓
                            </span>
                          )}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            {/* BERANDA */}
            <Link href="/" className={navLink}>
              <span>🏠</span>
              <span>Beranda</span>
            </Link>

            {/* RIWAYAT */}
            {user && (
              <Link href="/history" className={navLink}>
                <span>📊</span>
                <span>Riwayat</span>
              </Link>
            )}

            {/* LATIHAN MANDIRI */}
            <Link href="/practice" className={activeGameLink}>
              <span className="text-base">🎮</span>
              <span>Latihan Mandiri</span>
            </Link>

            {/* ADMIN */}
            <Link href="/admin" className={navLink}>
              <span>⚙️</span>
              <span>Admin</span>
            </Link>

            {/* MODE FOKUS */}
            <button
              type="button"
              onClick={() => setChromeVisible(false)}
              title="Sembunyikan Navbar dan Footer"
              aria-label="Aktifkan Mode Fokus"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              <span>⛶</span>
              <span>Mode Fokus</span>
            </button>

            {/* LOGIN / LOGOUT */}
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-3 py-2 text-xs font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md"
              >
                <span>↪</span>
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-600 hover:shadow-lg"
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
