
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type {
  User,
  AuthChangeEvent,
  Session,
} from '@supabase/supabase-js'

import { useTheme, type ThemeMode } from '@/context/ThemeContext'
import { createClient } from '@/lib/supabase/client'

const themes: { value: ThemeMode; label: string; icon: string }[] = [
  { value: 'school', label: 'Sekolah', icon: '🏫' },
  { value: 'space', label: 'Luar Angkasa', icon: '🚀' },
  { value: 'jungle', label: 'Hutan', icon: '🌿' },
  { value: 'ocean', label: 'Laut', icon: '🌊' },
  { value: 'disney', label: 'Disney', icon: '✨' },
  { value: 'cartoon3d', label: 'Kartun 3D', icon: '🎨' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
]

const navItems = [
  { href: '/', label: 'Beranda', icon: '🏠' },
  { href: '/ujian', label: 'Ujian', icon: '📝' },
  { href: '/hasil', label: 'Hasil', icon: '📊' },
  { href: '/materi', label: 'Materi', icon: '📚' },
]

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [supabase] = useState(() => createClient())

  const { theme, setTheme } = useTheme()

  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let mounted = true

    const loadUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (!mounted) return

        if (error) {
          console.error('Gagal memuat pengguna:', error.message)
          setUser(null)
        } else {
          setUser(data.user)
        }
      } catch (error) {
        if (!mounted) return

        console.error('Terjadi kesalahan saat memuat pengguna:', error)
        setUser(null)
      } finally {
        if (mounted) {
          setAuthLoading(false)
        }
      }
    }

    void loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (mounted) {
          setUser(session?.user ?? null)
          setAuthLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    setMobileMenuOpen(false)
    setThemeMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    if (loggingOut) return

    setLoggingOut(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('Gagal keluar:', error.message)
        window.alert('Gagal keluar dari akun. Silakan coba lagi.')
        return
      }

      setUser(null)
      setMobileMenuOpen(false)
      setThemeMenuOpen(false)

      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Terjadi kesalahan saat keluar:', error)
      window.alert('Terjadi kesalahan saat keluar dari akun.')
    } finally {
      setLoggingOut(false)
    }
  }

  const handleThemeChange = (nextTheme: ThemeMode) => {
    setTheme(nextTheme)
    setThemeMenuOpen(false)
    setMobileMenuOpen(false)
  }

  // Mode Fokus menyembunyikan navbar.
  // Tombol mengambang digunakan untuk menampilkan navbar kembali.
  if (!chromeVisible) {
    return (
      <button
        type="button"
        onClick={() => setChromeVisible(true)}
        className="fixed right-3 top-3 z-[100] rounded-full border border-white/30 bg-slate-900/85 px-3 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur"
        aria-label="Tampilkan kembali navbar"
      >
        ☰ Tampilkan menu
      </button>
    )
  }

  return (
    <header className="relative z-50 w-full">
      {/* Identitas sekolah */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-5 sm:py-3">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2"
          aria-label="Kembali ke beranda"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-xl sm:h-11 sm:w-11 sm:text-2xl">
            🏫
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold leading-tight sm:text-base">
              SD Negeri Getasan
            </span>
            <span className="hidden text-xs opacity-80 sm:block">
              Platform CBT Sekolah
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1.5">
          {/* Pemilih tema */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setThemeMenuOpen((open) => !open)
                setMobileMenuOpen(false)
              }}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-current/20 px-2 text-sm font-semibold transition hover:bg-white/15 sm:min-h-10 sm:px-3"
              aria-expanded={themeMenuOpen}
              aria-haspopup="menu"
              aria-label="Pilih tema"
            >
              🎨
              <span className="hidden sm:inline">Tema</span>
              <span className="text-xs">▾</span>
            </button>

            {themeMenuOpen && (
              <div
                className="absolute right-0 top-full mt-2 max-h-[65vh] w-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl"
                role="menu"
                aria-label="Pilih tema"
              >
                {themes.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    role="menuitem"
                    onClick={() => handleThemeChange(item.value)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
                      theme === item.value
                        ? 'bg-slate-100 font-bold'
                        : ''
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {theme === item.value && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Mode Fokus */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false)
              setThemeMenuOpen(false)
              setChromeVisible(false)
            }}
            className="inline-flex min-h-9 items-center justify-center rounded-xl border border-current/20 px-2 text-sm transition hover:bg-white/15 sm:min-h-10 sm:px-3"
            title="Sembunyikan navbar untuk fokus belajar"
            aria-label="Aktifkan Mode Fokus"
          >
            🎯
            <span className="ml-1 hidden sm:inline">Fokus</span>
          </button>

          {/* Tombol menu mobile */}
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen((open) => !open)
              setThemeMenuOpen(false)
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-current/20 text-lg sm:hidden"
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Navigasi utama */}
      <nav
        className="border-y border-current/10"
        aria-label="Navigasi utama"
      >
        <div className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 sm:justify-center sm:gap-2 sm:px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`)

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition sm:min-h-10 sm:px-4 ${
                  active
                    ? 'bg-white/25 shadow-sm'
                    : 'hover:bg-white/15'
                }`}
              >
                <span aria-hidden="true">{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}

          {/* Tautan profil */}
          {user && (
            <Link
              href="/profil"
              aria-current={pathname === '/profil' ? 'page' : undefined}
              className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition sm:min-h-10 sm:px-4 ${
                pathname === '/profil'
                  ? 'bg-white/25 shadow-sm'
                  : 'hover:bg-white/15'
              }`}
            >
              <span aria-hidden="true">👤</span>
              <span className="hidden sm:inline">Profil</span>
            </Link>
          )}
        </div>
      </nav>

      {/* Panel menu mobile */}
      {mobileMenuOpen && (
        <div className="absolute left-0 right-0 top-full border-b border-slate-200 bg-white p-3 text-slate-800 shadow-xl sm:hidden">
          <div className="mb-3 grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const active =
                item.href === '/'
                  ? pathname === '/'
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-xl border p-3 text-sm font-semibold ${
                    active
                      ? 'border-blue-400 bg-blue-50'
                      : 'border-slate-200'
                  }`}
                >
                  {item.icon} {item.label}
                </Link>
              )
            })}

            {user && (
              <Link
                href="/profil"
                aria-current={pathname === '/profil' ? 'page' : undefined}
                className={`rounded-xl border p-3 text-sm font-semibold ${
                  pathname === '/profil'
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-200'
                }`}
              >
                👤 Profil
              </Link>
            )}
          </div>

          <div className="mb-3 rounded-xl bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Pilih tema
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {themes.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handleThemeChange(item.value)}
                  className={`rounded-lg border px-2 py-2 text-left text-sm ${
                    theme === item.value
                      ? 'border-blue-400 bg-blue-50 font-bold'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {item.icon} {item.label}
                  {theme === item.value ? ' ✓' : ''}
                </button>
              ))}
            </div>
          </div>

          {authLoading ? (
            <p className="px-2 py-2 text-sm text-slate-500">
              Memeriksa akun...
            </p>
          ) : user ? (
            <div className="space-y-2">
              <p className="break-all px-2 text-xs text-slate-500">
                Masuk sebagai {user.email ?? 'pengguna'}
              </p>

              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                {loggingOut ? 'Sedang keluar...' : 'Keluar dari akun'}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Masuk
            </Link>
          )}
        </div>
      )}

      {/* Informasi akun untuk desktop */}
      <div className="hidden items-center justify-end gap-3 px-5 py-2 text-sm sm:flex">
        {authLoading ? (
          <span className="opacity-70">Memeriksa akun...</span>
        ) : user ? (
          <>
            <span className="max-w-64 truncate opacity-80">
              👤 {user.email ?? 'Pengguna'}
            </span>

            <button
              type="button"
              onClick={() => void handleLogout()}
              disabled={loggingOut}
              className="rounded-lg border border-current/20 px-3 py-1.5 font-semibold transition hover:bg-white/15 disabled:opacity-60"
            >
              {loggingOut ? 'Keluar...' : 'Keluar'}
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-lg border border-current/20 px-3 py-1.5 font-semibold transition hover:bg-white/15"
          >
            Masuk
          </Link>
        )}
      </div>
    </header>
  )
}
