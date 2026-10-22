'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import ExamTokenModal from '@/components/ExamTokenModal'
import { useTheme } from '@/context/ThemeContext'

function HomePageContent() {
  const { theme } = useTheme()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchExams() {
      try {
        const supabase = createClient()
        // Filter hanya mengambil paket ujian yang status is_published = true
        const { data, error } = await supabase
          .from('exams')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (error) {
          setError(error.message)
        } else {
          setExams(data || [])
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data.')
      } finally {
        setLoading(false)
      }
    }

    fetchExams()
  }, [])

  const handleOpenTokenModal = (exam: any) => {
    setSelectedExam(exam)
    setIsModalOpen(true)
  }

  // Konfigurasi Visual Hero Banner & Kartu Berdasarkan Tema
  const themeDetails = {
    space: {
      heroBg: 'bg-slate-900/80 border-purple-500/40 text-white shadow-purple-900/30',
      badge: '🚀 MISI JELAJAH ANTARIKSA',
      title: 'Selamat Datang di Galaksi Ujian TKA!',
      subtitle: 'Siapkan roket pengetahuannmu, taklukkan setiap soal, dan raih skor bintang tertinggi!',
      cardBg: 'bg-slate-900/80 border-purple-500/30 text-white hover:border-purple-400',
      cardTitle: 'text-purple-300',
      btnBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
      textMuted: 'text-purple-200/80',
      sectionTitle: 'text-white',
    },
    jungle: {
      heroBg: 'bg-emerald-950/80 border-emerald-500/40 text-white shadow-emerald-950/40',
      badge: '🌿 PETUALANGAN RIMBA PENGETAHUAN',
      title: 'Jelajahi Hutan Ilmu SD Negeri Getasan!',
      subtitle: 'Jadilah penjelajah rimba yang pemberani. Selesaikan tantangan soal dan temukan harta karun nilai!',
      cardBg: 'bg-emerald-950/80 border-emerald-500/30 text-white hover:border-emerald-400',
      cardTitle: 'text-emerald-300',
      btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white',
      badgeColor: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50',
      textMuted: 'text-emerald-200/80',
      sectionTitle: 'text-white',
    },
    ocean: {
      heroBg: 'bg-sky-950/80 border-cyan-500/40 text-white shadow-sky-950/40',
      badge: '🌊 JELAJAH SAMUDRA TKA',
      title: 'Salami Kedalaman Pengetahuan TKA!',
      subtitle: 'Mengarungi samudra soal dengan tenang dan teliti. Raih nilai setinggi puncak gelombang!',
      cardBg: 'bg-sky-950/80 border-cyan-500/30 text-white hover:border-cyan-400',
      cardTitle: 'text-cyan-300',
      btnBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
      badgeColor: 'bg-sky-900/80 text-cyan-300 border-cyan-700/50',
      textMuted: 'text-cyan-200/80',
      sectionTitle: 'text-white',
    },
    school: {
      heroBg: 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/50',
      badge: '🏫 PLATFORM CBT RESMI SD NEGERI GETASAN',
      title: 'Platform Tes Kemampuan Akademik (TKA)',
      subtitle: 'Sistem Simulasi & Asesmen Ujian Online SD Negeri Getasan',
      cardBg: 'bg-white/90 border-slate-200 text-slate-800 hover:border-indigo-300',
      cardTitle: 'text-indigo-600',
      btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      textMuted: 'text-slate-600',
      sectionTitle: 'text-slate-800',
    },
  }[theme]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans">
        <p className="text-white/80 font-semibold bg-slate-900/60 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
          Memuat data ujian...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col font-sans relative">
      <Navbar />

      <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 flex-grow w-full relative z-10">
        
        {/* 1. HERO BANNER INTERAKTIF SESUAI TEMA */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-xl shadow-2xl transition-all duration-500 relative overflow-hidden ${themeDetails.heroBg}`}
        >
          <div className="space-y-2 relative z-10">
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold border uppercase tracking-wider ${themeDetails.badgeColor}`}
            >
              {themeDetails.badge}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug">
              {themeDetails.title}
            </h1>
            <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
              {themeDetails.subtitle}
            </p>
          </div>
        </div>

        {/* 2. PESAN ERROR JIKA ADA */}
        {error && (
          <div className="p-4 bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs sm:text-sm rounded-2xl backdrop-blur-md">
            ⚠️ {error}
          </div>
        )}

        {/* 3. JUDUL DAFTAR UJIAN */}
        <h2 className={`text-lg sm:text-xl font-bold flex items-center space-x-2 ${themeDetails.sectionTitle}`}>
          <span>📝</span>
          <span>Daftar Ujian Tersedia:</span>
        </h2>

        {/* 4. DAFTAR KARTU UJIAN CBT */}
        <div className="grid gap-4">
          {exams && exams.length > 0 ? (
            exams.map((exam) => (
              <div
                key={exam.id}
                className={`p-6 rounded-2xl border backdrop-blur-xl shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 space-y-3 ${themeDetails.cardBg}`}
              >
                {/* HEAD KARTU */}
                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="space-y-1">
                    <h3 className={`text-lg font-extrabold ${themeDetails.cardTitle}`}>
                      {exam.title}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase inline-block border ${themeDetails.badgeColor}`}
                    >
                      {exam.subtest || 'UMUM'}
                    </span>
                  </div>

                  {/* BADGE TOKEN */}
                  {exam.token ? (
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl backdrop-blur-md">
                      🔒 Butuh Token
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl backdrop-blur-md">
                      🔓 Terbuka
                    </span>
                  )}
                </div>

                {/* DESKRIPSI SOAL */}
                <p className={`text-xs sm:text-sm leading-relaxed ${themeDetails.textMuted}`}>
                  {exam.description || 'Tidak ada deskripsi ujian.'}
                </p>

                {/* JADWAL BUKA UJIAN */}
                {exam.start_time && (
                  <p className="text-xs font-semibold text-amber-400 flex items-center space-x-1">
                    <span>📅</span>
                    <span>
                      Jadwal Buka:{' '}
                      {new Date(exam.start_time).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </p>
                )}

                {/* FOOTER KARTU & TOMBOL MULAI UJIAN */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <span className={`text-xs font-semibold flex items-center space-x-1 ${themeDetails.textMuted}`}>
                    <span>⏱️</span>
                    <span>Durasi: {exam.duration_minutes} Menit</span>
                  </span>

                  <button
                    onClick={() => handleOpenTokenModal(exam)}
                    className={`px-5 py-2 text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 ${themeDetails.btnBg}`}
                    suppressHydrationWarning
                  >
                    Mulai Ujian 🚀
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-xs sm:text-sm font-medium text-white/70 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10">
              Belum ada ujian yang dipublikasikan saat ini.
            </div>
          )}
        </div>
      </main>

      {/* Modal Verifikasi Token Ujian */}
      <ExamTokenModal
        exam={selectedExam}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center font-sans">
          <p className="text-white/80 font-semibold bg-slate-900/60 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/10">
            Memuat data ujian...
          </p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}