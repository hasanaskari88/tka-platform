'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Megaphone, Users, Gamepad2, FileText, Settings2, Cloud, ChevronLeft, Menu, ExternalLink } from 'lucide-react'

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', group: 'UTAMA' },
  { href: '/admin/bank-soal', icon: ClipboardList, label: 'Bank Soal & Ujian', group: 'PEMBELAJARAN' },
  { href: '/admin/practice', icon: Gamepad2, label: 'Mode Latihan', group: 'PEMBELAJARAN' },
  { href: '/admin/users', icon: Users, label: 'Data Peserta', group: 'PENGELOLAAN' },
  { href: '/admin/raport', icon: FileText, label: 'Raport & Sertifikat', group: 'PENGELOLAAN' },
  { href: '/admin/konten', icon: Megaphone, label: 'Konten Website', group: 'PENGELOLAAN' },
  { href: '/admin/pengaturan-dokumen', icon: Settings2, label: 'Pengaturan Dokumen', group: 'PENGATURAN' },
  { href: '/admin/pengaturan-google-drive', icon: Cloud, label: 'Google Drive', group: 'PENGATURAN' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  let previousGroup = ''

  return (
    <aside className={`z-30 shrink-0 border-b border-slate-200 bg-white p-2 shadow-sm transition-[width] duration-200 md:sticky md:top-0 md:h-screen md:overflow-y-auto md:border-b-0 md:border-r md:p-3 ${collapsed ? 'md:w-16' : 'md:w-60'}`}>
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-indigo-50 px-2.5 py-3">
        <div className={`flex min-w-0 items-center gap-2 ${collapsed ? 'md:justify-center' : ''}`}>
          <img src="/logo-sd-getasan.png" alt="Logo SD Negeri Getasan" className="h-9 w-9 shrink-0 rounded-lg object-contain" />
          <span className={`min-w-0 text-xs font-black leading-tight text-indigo-900 ${collapsed ? 'md:hidden' : ''}`}>SD NEGERI GETASAN<span className="block text-[9px] font-semibold text-indigo-500">ADMIN CENTER</span></span>
        </div>
        <button type="button" onClick={() => setCollapsed(v => !v)} className="hidden rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-indigo-700 md:inline-flex" aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'} title={collapsed ? 'Perluas menu' : 'Ciutkan menu'}>
          {collapsed ? <Menu size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-1">
        {menuItems.map((item) => {
          const active = item.href === '/admin' ? pathname === '/admin' : pathname === item.href || pathname.startsWith(item.href + '/')
          const showGroup = item.group !== previousGroup
          previousGroup = item.group
          return <div key={item.href} className="min-w-0">
            {showGroup && <p className={`mb-1 mt-3 hidden px-2 text-[9px] font-black tracking-[0.12em] text-slate-400 md:block ${collapsed ? 'md:hidden' : ''}`}>{item.group}</p>}
            <Link href={item.href} title={item.label} aria-current={active ? 'page' : undefined} className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2.5 text-xs font-semibold transition ${active ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'} ${collapsed ? 'md:justify-center md:px-1.5' : ''}`}>
              <item.icon size={16} strokeWidth={2} className="shrink-0" /><span className={collapsed ? 'md:hidden' : 'truncate'}>{item.label}</span>
            </Link>
          </div>
        })}
      </nav>
      <Link href="/" title="Lihat Website" className={`mt-4 flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2.5 text-xs font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 ${collapsed ? 'md:justify-center md:px-1.5' : ''}`}>
        <ExternalLink size={15} className="shrink-0" /><span className={collapsed ? 'md:hidden' : ''}>Lihat Website</span>
      </Link>
    </aside>
  )
}
