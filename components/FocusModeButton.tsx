'use client'

import { Suspense } from 'react'
import { useTheme } from '@/context/ThemeContext'
import { usePathname } from 'next/navigation'

function FocusModeButtonContent() {
  const pathname = usePathname()
  const { chromeVisible, setChromeVisible } = useTheme()

  if (pathname.startsWith('/admin') || chromeVisible) return null

  return (
    <button
      type="button"
      onClick={() => setChromeVisible(true)}
      className="fixed bottom-5 right-5 z-[9999] rounded-full bg-indigo-600 px-5 py-3 font-bold text-white shadow-xl transition hover:bg-indigo-700"
      aria-label="Tampilkan kembali menu"
    >
      ☰ Tampilkan Menu
    </button>
  )
}

export default function FocusModeButton() {
  return (
    <Suspense fallback={null}>
      <FocusModeButtonContent />
    </Suspense>
  )
}
