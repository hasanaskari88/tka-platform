'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const menuItems = [
  { href: '/admin', icon: '🏠', label: 'Dashboard' },
  { href: '/admin/bank-soal', icon: '📝', label: 'Bank Soal & Ujian' },
  { href: '/admin/konten', icon: '📢', label: 'Konten Website' },
  { href: '/admin/users', icon: '👩‍🎓', label: 'Data Peserta' },
  { href: '/admin/practice', icon: '🎮', label: 'Mode Latihan' },
  { href: '/admin/raport', icon: '📄', label: 'Raport & Sertifikat' },
  { href: '/admin/pengaturan-dokumen', icon: '⚙️', label: 'Pengaturan Dokumen' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`z-30 shrink-0 border-b border-slate-200 bg-white/95 p-3 shadow-sm transition-all md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r ${collapsed ? 'md:w-20' : 'md:w-64'}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className={`font-black text-indigo-700 ${collapsed ? 'md:hidden' : ''}`}>TKA ADMIN</span>
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50"
          aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
          title={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
        >
          {collapsed ? '☰' : '←'}
        </button>
      </div>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-1">
        {menuItems.map((item) => {
          const active = item.href === '/admin'
            ? pathname === '/admin'
            : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold transition ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-700'}`}
            >
              <span className="shrink-0 text-lg">{item.icon}</span>
              <span className={collapsed ? 'md:hidden' : ''}>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <Link
        href="/"
        title="Lihat Website"
        className={`mt-4 hidden rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 md:block ${collapsed ? 'text-center' : ''}`}
      >
        {collapsed ? '↗' : '← Lihat Website'}
      </Link>
    </aside>
  )
}
