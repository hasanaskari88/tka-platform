'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type ThemeMode = 'school' | 'space' | 'jungle' | 'ocean' | 'disney' | 'cartoon3d'

interface ThemeContextType {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'school',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('school')

  useEffect(() => {
    const savedTheme = localStorage.getItem('cbt_theme') as ThemeMode
    if (
      savedTheme &&
      ['school', 'space', 'jungle', 'ocean', 'disney', 'cartoon3d'].includes(savedTheme)
    ) {
      setThemeState(savedTheme)
    }
  }, [])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    localStorage.setItem('cbt_theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div className={`theme-${theme} transition-colors duration-500 min-h-screen flex flex-col justify-between`}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)