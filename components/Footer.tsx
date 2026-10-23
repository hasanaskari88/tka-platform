
'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/context/ThemeContext'

export default function Footer() {
  const { theme } = useTheme()

  // Tahun awal konsisten saat prerendering.
  // Tahun akan diperbarui setelah komponen berjalan di browser.
  const [currentYear, setCurrentYear] = useState<number>(2026)

  useEffect(() => {
    setCurrentYear(new Date().getFullYear())
  }, [])

  const themeFooterStyles = {
    space: {
      container:
        'bg-slate-900/90 border-purple-500/30 text-white shadow-purple-950/50',
      title: 'text-purple-300',
      textMuted: 'text-purple-200/80',
      badge: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
      icon: '🚀',
    },
    jungle: {
      container:
        'bg-emerald-950/90 border-emerald-500/30 text-white shadow-emerald-950/50',
      title: 'text-emerald-300',
      textMuted: 'text-emerald-200/80',
      badge: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50',
      icon: '🌿',
    },
    ocean: {
      container:
        'bg-sky-950/90 border-cyan-500/30 text-white shadow-sky-950/50',
      title: 'text-cyan-300',
      textMuted: 'text-cyan-200/80',
      badge: 'bg-sky-900/80 text-cyan-300 border-cyan-700/50',
      icon: '🌊',
    },
    school: {
      container:
        'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50',
      title: 'text-indigo-600',
      textMuted: 'text-slate-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: '🏫',
    },
  }[theme]

  return (
    <footer
      className={`relative z-10 w-full mt-auto border-t backdrop-blur-xl transition-all duration-500 ${themeFooterStyles.container}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Identitas Sekolah */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo-sd-getasan.png"
              alt="Logo SD Negeri Getasan"
              className="w-12 h-12 object-contain drop-shadow"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            <div>
              <h3
                className={`font-black text-sm sm:text-base ${themeFooterStyles.title}`}
              >
                SD NEGERI GETASAN
              </h3>

              <p className={`text-xs ${themeFooterStyles.textMuted}`}>
                Platform Ujian CBT &amp; Asesmen Akademik
              </p>
            </div>
          </div>

          {/* Alamat */}
          <div className="text-center md:text-left space-y-1">
            <p className={`text-xs font-semibold ${themeFooterStyles.title}`}>
              📍 Alamat Sekolah
            </p>

            <p
              className={`text-[11px] leading-relaxed ${themeFooterStyles.textMuted}`}
            >
              Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang, Jawa Tengah
              (50774)
            </p>

            <p className={`text-[11px] ${themeFooterStyles.textMuted}`}>
              📧 sdnegerigetasan@gmail.com
            </p>
          </div>

          {/* Hak Cipta & Badge Tema */}
          <div className="text-center md:text-right space-y-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${themeFooterStyles.badge}`}
            >
              {themeFooterStyles.icon} TEMA: {theme.toUpperCase()}
            </span>

            <p
              className={`text-xs ${themeFooterStyles.textMuted}`}
              suppressHydrationWarning
            >
              © {currentYear} CBT SD Negeri Getasan. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
