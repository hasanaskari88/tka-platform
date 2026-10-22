'use client'

import { useTheme } from '@/context/ThemeContext'

export default function ThemeBackground() {
  const { theme } = useTheme()

  if (theme === 'space') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-purple-950">
        {/* Bintang-Bintang Bersinar */}
        <div className="absolute inset-0 opacity-50 bg-[radial-gradient(#fff_1.5px,transparent_1.5px)] [background-size:28px_28px] animate-pulse"></div>
        
        {/* Planet & Nebula Dekorasi */}
        <div className="absolute top-12 left-10 w-40 h-40 bg-purple-600/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-60 h-60 bg-cyan-500/20 rounded-full blur-3xl"></div>
        
        {/* Maskot Planet Melayang */}
        <div className="absolute top-24 right-16 text-6xl opacity-40 animate-bounce duration-[6000ms]">🪐</div>
        <div className="absolute bottom-32 left-12 text-5xl opacity-30 animate-pulse">🚀</div>
      </div>
    )
  }

  if (theme === 'jungle') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-b from-emerald-950 via-teal-950 to-slate-950">
        {/* Cahaya Rimba & Kunang-Kunang */}
        <div className="absolute inset-0 bg-[radial-gradient(#84cc16_1.5px,transparent_1.5px)] [background-size:36px_36px] opacity-30 animate-pulse"></div>
        <div className="absolute -top-10 left-1/3 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-1/4 w-72 h-72 bg-lime-500/15 rounded-full blur-3xl"></div>

        {/* Hiasan Dedaunan & Maskot Rimba */}
        <div className="absolute top-20 left-8 text-6xl opacity-30">🌿</div>
        <div className="absolute top-1/3 right-10 text-6xl opacity-25">🦜</div>
        <div className="absolute bottom-24 left-1/4 text-5xl opacity-20">🦁</div>
      </div>
    )
  }

  if (theme === 'ocean') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-b from-sky-950 via-blue-950 to-slate-950">
        {/* Gelombang Air & Gelembung */}
        <div className="absolute top-0 inset-x-0 h-48 bg-gradient-to-b from-cyan-400/20 to-transparent blur-2xl"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_2px,transparent_2px)] [background-size:32px_32px] opacity-30 animate-pulse"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>

        {/* Maskot Biota Laut */}
        <div className="absolute top-28 right-12 text-6xl opacity-35 animate-bounce duration-[5000ms]">🐋</div>
        <div className="absolute bottom-36 left-16 text-5xl opacity-30">🐠</div>
        <div className="absolute top-1/2 left-8 text-5xl opacity-25">🐙</div>
      </div>
    )
  }

  // Default: Resmi SD
  return (
    <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-slate-100 via-sky-50 to-slate-200"></div>
  )
}