'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import ExamTokenModal from '@/components/ExamTokenModal'
import { useTheme } from '@/context/ThemeContext'

function HomePageContent() {
  const { theme } = useTheme()
  const [exams, setExams] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        // 1. Fetch Ujian Dipublikasikan
        const { data: examData, error: examErr } = await supabase
          .from('exams')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (examErr) {
          setError(examErr.message)
        } else {
          setExams(examData || [])
        }

        // 2. Fetch Pengumuman Sekolah (Fault-tolerant)
        try {
          const { data: annData } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })
          if (annData) setAnnouncements(annData)
        } catch (e) {
          console.log('Tabel announcements belum tersedia atau kosong.')
        }

        // 3. Fetch Modul Materi (Fault-tolerant)
        try {
          const { data: matData } = await supabase
            .from('study_materials')
            .select('*')
            .order('created_at', { ascending: false })
          if (matData) setMaterials(matData)
        } catch (e) {
          console.log('Tabel study_materials belum tersedia atau kosong.')
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleOpenTokenModal = (exam: any) => {
    setSelectedExam(exam)
    setIsModalOpen(true)
  }

  // 🎨 Konfigurasi Visual Berdasarkan Tema (Termasuk Disney, Cartoon 3D, Space, Jungle, Ocean, School)
  const themeMap: Record<string, any> = {
    space: {
      heroBg: 'bg-slate-900/90 border-purple-500/50 text-white shadow-purple-900/40',
      badge: '🚀 MISI JELAJAH ANTARIKSA',
      title: 'Selamat Datang di Galaksi Ujian TKA!',
      subtitle: 'Siapkan roket pengetahuannmu, taklukkan setiap soal, dan raih skor bintang tertinggi!',
      cardBg: 'bg-slate-900/90 border-purple-500/30 text-white hover:border-purple-400',
      cardTitle: 'text-purple-300 font-black',
      btnBg: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
      textMuted: 'text-purple-200/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-slate-900/80 border-purple-500/30 text-white',
    },
    jungle: {
      heroBg: 'bg-emerald-950/90 border-emerald-500/50 text-white shadow-emerald-950/50',
      badge: '🌿 PETUALANGAN RIMBA PENGETAHUAN',
      title: 'Jelajahi Hutan Ilmu SD Negeri Getasan!',
      subtitle: 'Jadilah penjelajah rimba yang pemberani. Selesaikan tantangan soal dan temukan harta karun nilai!',
      cardBg: 'bg-emerald-950/90 border-emerald-500/30 text-white hover:border-emerald-400',
      cardTitle: 'text-emerald-300 font-black',
      btnBg: 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30',
      badgeColor: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/50',
      textMuted: 'text-emerald-100/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-emerald-950/80 border-emerald-500/30 text-white',
    },
    ocean: {
      heroBg: 'bg-sky-950/90 border-cyan-500/50 text-white shadow-sky-950/50',
      badge: '🌊 JELAJAH SAMUDRA TKA',
      title: 'Salami Kedalaman Pengetahuan TKA!',
      subtitle: 'Mengarungi samudra soal dengan tenang dan teliti. Raih nilai setinggi puncak gelombang!',
      cardBg: 'bg-sky-950/90 border-cyan-500/30 text-white hover:border-cyan-400',
      cardTitle: 'text-cyan-300 font-black',
      btnBg: 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30',
      badgeColor: 'bg-sky-900/80 text-cyan-300 border-cyan-700/50',
      textMuted: 'text-cyan-100/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-sky-950/80 border-cyan-500/30 text-white',
    },
    disney: {
      heroBg: 'bg-gradient-to-r from-purple-900 via-pink-900 to-indigo-950 border-2 border-amber-400/60 text-white shadow-pink-950/50',
      badge: '🏰 NEGERI KEAJAIBAN & IMPIAN TKA',
      title: 'Istana Keajaiban Ilmu SD Negeri Getasan!',
      subtitle: 'Buka pintu impianmu, temukan keajaiban di setiap lembar soal, dan raih skor mahkota emas!',
      cardBg: 'bg-purple-950/90 border-2 border-amber-400/40 text-white hover:border-amber-300 shadow-xl',
      cardTitle: 'text-amber-300 font-black',
      btnBg: 'bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black shadow-amber-500/30',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
      textMuted: 'text-pink-100/90 font-medium',
      sectionTitle: 'text-amber-300 font-black',
      boxBg: 'bg-purple-950/80 border-amber-400/40 text-white',
    },
    cartoon3d: {
      heroBg: 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 border-4 border-slate-900 text-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]',
      badge: '🎨 DUNIA CARTOON 3D PLAYFUL',
      title: 'Petualangan Seru Belajar 3D TKA!',
      subtitle: 'Ayo belajar dengan gembira dan penuh warna! Selesaikan tantangan soal berwarna-warni!',
      cardBg: 'bg-white border-4 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:-translate-y-0.5 transition-all',
      cardTitle: 'text-indigo-700 font-black',
      btnBg: 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]',
      badgeColor: 'bg-yellow-200 text-slate-900 border-2 border-slate-900 font-black',
      textMuted: 'text-slate-700 font-semibold',
      sectionTitle: 'text-slate-900 font-black',
      boxBg: 'bg-amber-50 border-4 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]',
    },
    school: {
      heroBg: 'bg-white/95 border border-slate-200 text-slate-800 shadow-slate-200/60',
      badge: '🏫 PLATFORM CBT RESMI SD NEGERI GETASAN',
      title: 'Platform Tes Kemampuan Akademik (TKA)',
      subtitle: 'Sistem Simulasi & Asesmen Ujian Online SD Negeri Getasan',
      cardBg: 'bg-white/95 border border-slate-200 text-slate-800 hover:border-indigo-400 shadow-md',
      cardTitle: 'text-indigo-700 font-black',
      btnBg: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-indigo-600/20',
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      textMuted: 'text-slate-600 font-medium',
      sectionTitle: 'text-slate-800 font-black',
      boxBg: 'bg-white border border-slate-200 text-slate-800 shadow-sm',
    },
  }

  // Safe fallback agar tidak undefined
  const themeDetails = themeMap[theme] || themeMap.space

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

      <main className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 flex-grow w-full relative z-10">
        
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
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              {themeDetails.title}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed opacity-95">
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

        {/* 📢 3. SEKSI PAPAN PENGUMUMAN ADAPTIF */}
        {announcements.length > 0 && (
          <div className="space-y-3">
            <h2 className={`text-base sm:text-lg flex items-center space-x-2 ${themeDetails.sectionTitle}`}>
              <span>📢</span>
              <span>Pengumuman & Informasi Sekolah</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`p-5 rounded-2xl border backdrop-blur-md space-y-2 transition-all ${themeDetails.boxBg}`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded ${themeDetails.badgeColor}`}>
                      📌 {ann.category || 'Penting'}
                    </span>
                    <span className="text-[11px] opacity-75 font-mono">
                      {new Date(ann.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-extrabold">{ann.title}</h3>
                  <p className={`text-xs leading-relaxed ${themeDetails.textMuted}`}>{ann.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📚 4. SEKSI LINK MATERI & MODUL ADAPTIF */}
        {materials.length > 0 && (
          <div className="space-y-3">
            <h2 className={`text-base sm:text-lg flex items-center space-x-2 ${themeDetails.sectionTitle}`}>
              <span>📚</span>
              <span>Materi & Modul Belajar</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {materials.map((mat) => (
                <div
                  key={mat.id}
                  className={`p-4 rounded-2xl border backdrop-blur-md space-y-3 flex flex-col justify-between ${themeDetails.boxBg}`}
                >
                  <div className="space-y-1">
                    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded inline-block ${themeDetails.badgeColor}`}>
                      {mat.subject || 'Modul'}
                    </span>
                    <h3 className="text-xs font-bold leading-snug">{mat.title}</h3>
                    <p className={`text-[11px] line-clamp-2 ${themeDetails.textMuted}`}>{mat.description || '-'}</p>
                  </div>

                  <a
                    href={mat.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-2 text-center text-xs font-bold rounded-xl transition-all block ${themeDetails.btnBg}`}
                  >
                    📖 Buka Materi →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📝 5. JUDUL DAFTAR UJIAN */}
        <h2 className={`text-lg sm:text-xl flex items-center space-x-2 ${themeDetails.sectionTitle}`}>
          <span>📝</span>
          <span>Daftar Ujian Tersedia ({exams.length})</span>
        </h2>

        {/* 6. DAFTAR KARTU UJIAN CBT */}
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
                    <h3 className={`text-lg ${themeDetails.cardTitle}`}>
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

      {/* Modal Verifikasi Token Ujian (Disimpan & Dipertahankan) */}
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