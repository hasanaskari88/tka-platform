
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
  const [showMobileMenu, setShowMobileMenu] = useState(false)

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
    setShowMobileMenu(false)
    router.push('/login')
  }

  // Konfigurasi tema: dipertahankan
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
    gaming: {
      name: 'Gaming',
      icon: '🎮',
      style: 'from-cyan-500 via-blue-600 to-fuchsia-600 text-white',
    },
  }

  const currentThemeConfig =
    themeConfig[theme] || themeConfig.school

  const navLink =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-2.5 text-xs font-bold text-slate-700 transition-colors duration-200 hover:border-indigo-100 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 sm:px-3'

  const activeGameLink =
    'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-2 py-2 text-xs font-black text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:px-3'

  const mobileNavItem =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-bold leading-tight text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 active:scale-95'

  const mobileActiveItem =
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-gradient-to-b from-indigo-50 to-violet-50 px-0.5 py-2 text-[10px] font-black leading-tight text-indigo-700 shadow-sm transition active:scale-95'

  // Sembunyikan Navbar ketika Mode Fokus aktif
  if (!chromeVisible) {
    return null
  }

  return (
    <header className="sticky top-0 z-40 w-full font-sans shadow-[0_8px_30px_-18px_rgba(15,23,42,0.45)]">

      {/* STRIP INFORMASI SEKOLAH: TIDAK DIUBAH */}
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
            <span className="sm:hidden">Email Sekolah</span>
          </a>
        </div>
      </div>

      {/* NAVBAR UTAMA */}
      <nav className="border-b border-indigo-100 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-5 lg:py-4">

          {/* IDENTITAS SEKOLAH */}
          <div className="flex min-w-0 items-center justify-between gap-2 lg:justify-start">
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

            {/* HAMBURGER MOBILE */}
            <div className="relative shrink-0 lg:hidden">
              <button
                type="button"
                aria-label={
                  showMobileMenu
                    ? 'Tutup menu navigasi'
                    : 'Buka menu navigasi'
                }
                aria-expanded={showMobileMenu}
                aria-haspopup="menu"
                onClick={() => {
                  setShowMobileMenu((previous) => !previous)
                  setShowThemeMenu(false)
                }}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-indigo-50"
              >
                <span className="text-xl leading-none">
                  {showMobileMenu ? '✕' : '☰'}
                </span>
                <span className="text-xs">Menu</span>
              </button>

              {showMobileMenu && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu navigasi"
                    className="fixed inset-0 z-[60] cursor-default bg-black/10"
                    onClick={() => setShowMobileMenu(false)}
                  />

                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[70] mt-2 max-h-[75vh] w-64 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-2xl border border-indigo-100 bg-white p-2 shadow-2xl"
                  >
                    <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Navigasi Lainnya
                    </p>

                    <Link
                      href="/admin"
                      role="menuitem"
                      onClick={() => setShowMobileMenu(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span>⚙️</span>
                      <span>Admin</span>
                    </Link>

                    <div className="my-2 border-t border-slate-100" />

                    {user ? (
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          void handleLogout()
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                      >
                        <span>↪</span>
                        <span>Logout</span>
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        role="menuitem"
                        onClick={() => setShowMobileMenu(false)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <span>🔑</span>
                        <span>Masuk</span>
                      </Link>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BARIS NAVIGASI KHUSUS MOBILE */}
          <div className="grid grid-cols-5 items-stretch gap-1 lg:hidden">

            {/* TEMA MOBILE */}
            <div className="relative flex min-w-0">
              <button
                type="button"
                aria-label={`Pilih tema: ${currentThemeConfig.name}`}
                aria-expanded={showThemeMenu}
                aria-haspopup="menu"
                title={currentThemeConfig.name}
                onClick={() => {
                  setShowThemeMenu((previous) => !previous)
                  setShowMobileMenu(false)
                }}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl bg-gradient-to-b px-0.5 py-2 text-[10px] font-black shadow-sm ring-1 ring-black/5 transition active:scale-95 ${currentThemeConfig.style}`}
              >
                <span className="text-lg leading-none">
                  {currentThemeConfig.icon}
                </span>
                <span>Tema</span>
              </button>

              {showThemeMenu && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu tema"
                    className="fixed inset-0 z-[60] cursor-default bg-black/10"
                    onClick={() => setShowThemeMenu(false)}
                  />

                  <div
                    role="menu"
                    className="absolute left-0 top-full z-[70] mt-2 w-52 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-indigo-100 bg-white p-2 shadow-xl"
                  >
                    <p className="px-2 pb-3 pt-1 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      🎨 Pilih Dunia Belajarmu
                    </p>

                    <div className="flex flex-col gap-1">
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
                            className={`flex min-h-10 w-full items-center gap-2 rounded-xl border px-2 py-2 text-left text-xs font-bold transition ${                              theme === key
                                ? 'border-indigo-200 bg-indigo-50 text-indigo-800'
                                : 'border-slate-100 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="text-lg">
                              {themeConfig[key].icon}
                            </span>
                            <span className="min-w-0 flex-1">
                              {themeConfig[key].name}
                            </span>
                            {theme === key && (
                              <span className="text-indigo-600">✓</span>
                            )}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BERANDA MOBILE */}
            <Link
              href="/"
              title="Beranda"
              aria-label="Beranda"
              className={mobileNavItem}
            >
              <span className="text-lg leading-none">🏠</span>
              <span>Beranda</span>
            </Link>

            {/* RIWAYAT MOBILE: tetap mengikuti status login */}
            {user ? (
              <Link
                href="/history"
                title="Riwayat"
                aria-label="Riwayat"
                className={mobileNavItem}
              >
                <span className="text-lg leading-none">📊</span>
                <span>Riwayat</span>
              </Link>
            ) : (
              <div
                aria-hidden="true"
                className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] text-slate-300"
              >
                <span className="text-lg leading-none">📊</span>
                <span>Riwayat</span>
              </div>
            )}

            {/* LATIHAN MANDIRI MOBILE */}
            <Link
              href="/practice"
              title="Latihan Mandiri"
              aria-label="Latihan Mandiri"
              className={mobileActiveItem}
            >
              <span className="text-lg leading-none">🎮</span>
              <span>Latihan</span>
            </Link>

            {/* MODE FOKUS MOBILE */}
            <button
              type="button"
              onClick={() => {
                setShowThemeMenu(false)
                setShowMobileMenu(false)
                setChromeVisible(false)
              }}
              title="Mode Fokus"
              aria-label="Aktifkan Mode Fokus"
              className={mobileNavItem}
            >
              <span className="text-lg leading-none">⛶</span>
              <span>Fokus</span>
            </button>
          </div>

          {/* NAVIGASI DESKTOP: DIPERTAHANKAN */}
          <div className="hidden items-center gap-1.5 lg:flex">

            {/* PEMILIH TEMA DESKTOP */}
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label={`Pilih tema: ${currentThemeConfig.name}`}
                aria-expanded={showThemeMenu}
                aria-haspopup="menu"
                title={currentThemeConfig.name}
                onClick={() => {
                  setShowThemeMenu((previous) => !previous)
                  setShowMobileMenu(false)
                }}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-1 rounded-xl bg-gradient-to-r px-2 text-xs font-black shadow-md ring-1 ring-black/5 transition hover:shadow-lg active:scale-95 sm:gap-1.5 sm:px-3 ${currentThemeConfig.style}`}
              >
                <span>{currentThemeConfig.icon}</span>
                <span>{currentThemeConfig.name}</span>
                <span aria-hidden="true">▾</span>
              </button>

              {showThemeMenu && (
                <>
                  <button
                    type="button"
                    aria-label="Tutup menu tema"
                    className="fixed inset-0 z-[60] cursor-default"
                    onClick={() => setShowThemeMenu(false)}
                  />

                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[70] mt-2 w-60 rounded-2xl border border-indigo-100 bg-white p-2 shadow-2xl"
                  >
                    <p className="px-3 pb-2 pt-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
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
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition ${
                            theme === key
                              ? 'bg-indigo-50 text-indigo-800 ring-1 ring-indigo-200'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-lg">
                            {themeConfig[key].icon}
                          </span>
                          <span className="flex-1">
                            {themeConfig[key].name}
                          </span>
                          {theme === key && <span>✓</span>}
                        </button>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            <Link
              href="/"
              className={navLink}
              title="Beranda"
              aria-label="Beranda"
            >
              <span>🏠</span>
              <span>Beranda</span>
            </Link>

            {user && (
              <Link
                href="/history"
                className={navLink}
                title="Riwayat"
                aria-label="Riwayat"
              >
                <span>📊</span>
                <span>Riwayat</span>
              </Link>
            )}

            <Link
              href="/practice"
              className={activeGameLink}
              title="Latihan Mandiri"
              aria-label="Latihan Mandiri"
            >
              <span className="text-base">🎮</span>
              <span>Latihan Mandiri</span>
            </Link>

            <Link
              href="/admin"
              className={navLink}
              title="Admin"
              aria-label="Admin"
            >
              <span>⚙️</span>
              <span>Admin</span>
            </Link>

            <button
              type="button"
              onClick={() => setChromeVisible(false)}
              title="Mode Fokus"
              aria-label="Aktifkan Mode Fokus"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700 sm:px-3"
            >
              <span>⛶</span>
              <span>Mode Fokus</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={() => void handleLogout()}
                title="Logout"
                aria-label="Logout"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 px-2 py-2.5 text-xs font-black text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-100 hover:shadow-md sm:px-3"
              >
                <span>↪</span>
                <span>Logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                title="Masuk"
                aria-label="Masuk"
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-2 py-2.5 text-xs font-black text-white shadow-md transition hover:-translate-y-0.5 hover:from-blue-500 hover:to-violet-600 hover:shadow-lg sm:px-3"
              >
                <span>🔑</span>
                <span>Masuk</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}
