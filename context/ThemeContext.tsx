
'use client'

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

export type ThemeMode =
  | 'school'
  | 'space'
  | 'jungle'
  | 'ocean'
  | 'disney'
  | 'cartoon3d'
  | 'gaming'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  chromeVisible: boolean
  setChromeVisible: (visible: boolean) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'school',
  setTheme: () => {},
  chromeVisible: true,
  setChromeVisible: () => {},
})

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<ThemeMode>('school')
  const [chromeVisible, setChromeVisible] = useState(true)

  useEffect(() => {
    const savedTheme = localStorage.getItem('cbt_theme')

    const validThemes: ThemeMode[] = [
      'school',
      'space',
      'jungle',
      'ocean',
      'disney',
      'cartoon3d',
      'gaming',
    ]

    if (savedTheme && validThemes.includes(savedTheme as ThemeMode)) {
      setThemeState(savedTheme as ThemeMode)
    }
  }, [])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('cbt_theme', newTheme)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        chromeVisible,
        setChromeVisible,
      }}
    >
      <div
        className={`theme-${theme} flex min-h-screen flex-col transition-colors duration-500`}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
