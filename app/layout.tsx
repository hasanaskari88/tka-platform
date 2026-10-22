import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import { ThemeProvider } from "@/context/ThemeContext";
import ThemeBackground from "@/components/ThemeBackground";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CBT SD NEGERI GETASAN - Platform Ujian Digital Interaktif",
  description: "Sistem Ujian Berbasis Komputer SD NEGERI GETASAN Kabupaten Semarang",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex flex-col font-sans antialiased relative bg-slate-950 text-slate-100 overflow-x-hidden">
        <ThemeProvider>
          {/* Background Tema Interaktif */}
          <ThemeBackground />

          {/* Area Konten Utama (Mengisi Ruang Kosong di Atas Footer) */}
          <div className="flex-1 flex flex-col relative z-10">
            {children}
          </div>

          {/* Footer Responsif Berdasarkan Tema */}
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}