import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/context/ThemeContext'
import ThemeBackground from '@/components/ThemeBackground'
import Footer from '@/components/Footer'
import FocusModeButton from '@/components/FocusModeButton'

export const metadata: Metadata = {
  title: 'CBT SD NEGERI GETASAN',
  description: 'Platform Ujian CBT Interaktif SD Negeri Getasan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen flex flex-col justify-between relative">
        <ThemeProvider>
          <ThemeBackground />
          <div className="relative z-10 flex-grow">{children}</div>
          <Footer />
          <FocusModeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}