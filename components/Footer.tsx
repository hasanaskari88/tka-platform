'use client'

import { useTheme } from '@/context/ThemeContext'

export default function Footer() {
  const { theme } = useTheme()

  const themeFooterMap = {
    space: {
      container: 'bg-slate-900/90 border-purple-500/30 text-white shadow-purple-950/50',
      title: 'text-purple-300 font-extrabold',
      textMuted: 'text-purple-200/80 font-medium',
      badge: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
      icon: '🚀',
    },
    jungle: {
      container: 'bg-emerald-950/90 border-emerald-500/30 text-white shadow-emerald-950/50',
      title: 'text-emerald-300 font-extrabold',
      textMuted: 'text-emerald-200/80 font-medium',
      badge: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50',
      icon: '🌿',
    },
    ocean: {
      container: 'bg-sky-950/90 border-cyan-500/30 text-white shadow-sky-950/50',
      title: 'text-cyan-300 font-extrabold',
      textMuted: 'text-cyan-200/80 font-medium',
      badge: 'bg-sky-900/80 text-cyan-300 border-cyan-700/50',
      icon: '🌊',
    },
    disney: {
      container: 'bg-purple-950/90 border-pink-500/30 text-white shadow-pink-950/50',
      title: 'text-amber-300 font-extrabold',
      textMuted: 'text-pink-100/80 font-medium',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
      icon: '🏰',
    },
    cartoon3d: {
      container: 'bg-amber-400 border-4 border-slate-900 text-slate-950 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]',
      title: 'text-slate-950 font-black',
      textMuted: 'text-slate-800 font-bold',
      badge: 'bg-yellow-200 text-slate-950 border-2 border-slate-900 font-black',
      icon: '🎨',
    },
    school: {
      container: 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50',
      title: 'text-indigo-600 font-extrabold',
      textMuted: 'text-slate-600 font-medium',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: '🏫',
    },
  }

  // Fallback aman agar tidak pernah undefined
  const themeFooterStyles = themeFooterMap[theme] || themeFooterMap.school

  return (
    <footer
      className={`relative z-10 w-full mt-auto border-t backdrop-blur-xl transition-all duration-500 ${themeFooterStyles.container}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-center md:text-left">
          {/* Identitas Sekolah */}
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <img
              src="/logo-sd-getasan.png"
              alt="Logo SD Negeri Getasan"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow shrink-0"
              onError={(e: any) => {
                e.currentTarget.style.display = 'none'
              }}
            />

            <div>
              <h3 className={`text-sm sm:text-base ${themeFooterStyles.title}`}>
                SD NEGERI GETASAN
              </h3>

              <p className={`text-[11px] sm:text-xs ${themeFooterStyles.textMuted}`}>
                Platform Ujian CBT &amp; Asesmen Akademik
              </p>
            </div>
          </div>

          {/* Alamat Sekolah */}
          <div className="space-y-1">
            <p className={`text-xs font-semibold ${themeFooterStyles.title}`}>
              📍 Alamat Sekolah
            </p>

            <p className={`text-[11px] leading-relaxed ${themeFooterStyles.textMuted}`}>
              Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang, Jawa Tengah (50774)
            </p>

            <p className={`text-[11px] ${themeFooterStyles.textMuted}`}>
              📧 sdnegerigetasan@gmail.com
            </p>
          </div>

          {/* Hak Cipta dan Tema */}
          <div className="md:text-right space-y-2">
            <span
              className={`inline-block px-3 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${themeFooterStyles.badge}`}
            >
              {themeFooterStyles.icon} TEMA: {theme.toUpperCase()}
            </span>

            <p className={`text-xs ${themeFooterStyles.textMuted}`}>
              © 2026 CBT SD Negeri Getasan. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}