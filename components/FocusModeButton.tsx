
'use client'

import { useTheme } from '@/context/ThemeContext'

export default function FocusModeButton() {
  const { chromeVisible, setChromeVisible } = useTheme()

  if (chromeVisible) return null

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
