
'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import ExamTokenModal from '@/components/ExamTokenModal'
import { useTheme } from '@/context/ThemeContext'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

function HomePageContent() {
  const { theme } = useTheme()
  const [exams, setExams] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

    // FILTER MATERI
  const [materialSearch, setMaterialSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('Semua')
  const [materialSort, setMaterialSort] = useState('Terbaru')
  const [showMaterialFilters, setShowMaterialFilters] = useState(false)
  const [showExamFilters, setShowExamFilters] = useState(false)
  
  // FILTER UJIAN
  const [examSearch, setExamSearch] = useState('')
  const [selectedSubtest, setSelectedSubtest] = useState('Semua')
  const [examSort, setExamSort] = useState('Terbaru')
  const [examAccess, setExamAccess] = useState('Semua')
  
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient()

        // 0. Ambil profil pengguna untuk widget XP dan level.
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (profile) setUserProfile(profile)
        }

        // 1. Ambil ujian yang dipublikasikan.
        const { data: examData, error: examErr } = await supabase
          .from('exams')
          .select('*, author:profiles!exams_created_by_fkey(full_name)')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (examErr) {
          setError(examErr.message)
        } else {
          const filteredExams = (examData || []).filter(
            (exam: any) =>
              !exam.target_mode ||
              exam.target_mode === 'CBT_ONLY' ||
              exam.target_mode === 'BOTH',
          )

          setExams(filteredExams)
        }

        // 2. Ambil pengumuman sekolah.
        try {
          const { data: annData } = await supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false })

          if (annData) setAnnouncements(annData)
        } catch {
          console.log('Tabel announcements belum tersedia atau kosong.')
        }

        // 3. Ambil materi belajar.
        try {
          const { data: matData } = await supabase
            .from('study_materials')
            .select('*, author:profiles!study_materials_created_by_fkey(full_name)')
            .order('created_at', { ascending: false })

          if (matData) setMaterials(matData)
        } catch {
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

  // Fungsi logout.
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUserProfile(null)
    window.location.reload()
  }

  // Konfigurasi tampilan enam tema.
  const themeMap: Record<string, any> = {
    space: {
      heroBg:
        'bg-slate-900/90 border-purple-500/50 text-white shadow-purple-900/40',
      badge: '🚀 MISI JELAJAH ANTARIKSA',
      title: 'Selamat Datang di Galaksi Ujian TKA!',
      subtitle:
        'Siapkan roket pengetahuannmu, taklukkan setiap soal, dan raih skor bintang tertinggi!',
      cardBg:
        'bg-slate-900/95 border-purple-400/40 text-white hover:border-purple-300 hover:shadow-xl hover:shadow-purple-950/30',
      cardTitle: 'text-purple-300 font-black',
      btnBg:
        'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30',
      badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
      textMuted: 'text-purple-200/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-slate-900/80 border-purple-500/30 text-white',
    },

    jungle: {
      heroBg:
        'bg-emerald-950/90 border-emerald-500/50 text-white shadow-emerald-950/50',
      badge: '🌿 PETUALANGAN RIMBA PENGETAHUAN',
      title: 'Jelajahi Hutan Ilmu SD Negeri Getasan!',
      subtitle:
        'Jadilah penjelajah rimba yang pemberani. Selesaikan tantangan soal dan temukan harta karun nilai!',
      cardBg:
        'bg-emerald-950/95 border-emerald-400/40 text-white hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-950/30',
      cardTitle: 'text-emerald-300 font-black',
      btnBg:
        'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30',
      badgeColor:
        'bg-emerald-900/80 text-emerald-300 border-emerald-700/50',
      textMuted: 'text-emerald-100/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-emerald-950/80 border-emerald-500/30 text-white',
    },

    ocean: {
      heroBg:
        'bg-sky-950/90 border-cyan-500/50 text-white shadow-sky-950/50',
      badge: '🌊 JELAJAH SAMUDRA TKA',
      title: 'Salami Kedalaman Pengetahuan TKA!',
      subtitle:
        'Mengarungi samudra soal dengan tenang dan teliti. Raih nilai setinggi puncak gelombang!',
      cardBg:
        'bg-sky-950/95 border-cyan-400/40 text-white hover:border-cyan-300 hover:shadow-xl hover:shadow-sky-950/30',
      cardTitle: 'text-cyan-300 font-black',
      btnBg:
        'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30',
      badgeColor: 'bg-sky-900/80 text-cyan-300 border-cyan-700/50',
      textMuted: 'text-cyan-100/90 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg: 'bg-sky-950/80 border-cyan-500/30 text-white',
    },

    disney: {
      heroBg:
        'bg-gradient-to-r from-purple-900 via-pink-900 to-indigo-950 border-2 border-amber-400/60 text-white shadow-pink-950/50',
      badge: '🏰 NEGERI KEAJAIBAN & IMPIAN TKA',
      title: 'Istana Keajaiban Ilmu SD Negeri Getasan!',
      subtitle:
        'Buka pintu impianmu, temukan keajaiban di setiap lembar soal, dan raih skor mahkota emas!',
      cardBg:
        'bg-gradient-to-br from-purple-950/95 via-pink-950/95 to-indigo-950/95 border-2 border-amber-400/40 text-white hover:border-amber-300 hover:shadow-xl hover:shadow-pink-950/30',
      cardTitle: 'text-amber-300 font-black',
      btnBg:
        'bg-gradient-to-r from-amber-500 to-pink-600 hover:from-amber-400 hover:to-pink-500 text-white font-black shadow-amber-500/30',
      badgeColor:
        'bg-amber-500/20 text-amber-300 border-amber-400/50',
      textMuted: 'text-pink-100/90 font-medium',
      sectionTitle: 'text-amber-300 font-black',
      boxBg: 'bg-purple-950/80 border-amber-400/40 text-white',
    },

    cartoon3d: {
      heroBg:
        'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 border-4 border-slate-900 text-slate-950 shadow-[6px_6px_0px_0px_rgba(15,23,42,1)]',
      badge: '🎨 DUNIA CARTOON 3D PLAYFUL',
      title: 'Petualangan Seru Belajar 3D TKA!',
      subtitle:
        'Ayo belajar dengan gembira dan penuh warna! Selesaikan tantangan soal berwarna-warni!',
      cardBg:
        'bg-white border-4 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] hover:translate-x-0.5 hover:-translate-y-0.5',
      cardTitle: 'text-indigo-700 font-black',
      btnBg:
        'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]',
      badgeColor:
        'bg-yellow-200 text-slate-900 border-2 border-slate-900 font-black',
      textMuted: 'text-slate-700 font-semibold',
      sectionTitle: 'text-slate-900 font-black',
      boxBg:
        'bg-amber-50 border-4 border-slate-900 text-slate-900 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]',
    },

    gaming: {
      heroBg:
        'bg-gradient-to-br from-[#10102d]/95 via-[#111735]/95 to-[#080b1d]/95 border-2 border-cyan-400/50 text-white shadow-[0_0_35px_rgba(34,211,238,0.18)]',
      badge: '🕹️ ARCADE GAME HUB • MODE PETUALANGAN',
      title: 'Pilih Misi, Kumpulkan XP, Jadi Juara!',
      subtitle:
        'Jelajahi galaksi ilmu, selesaikan tantangan, kumpulkan XP, dan naikkan levelmu!',
      cardBg:
        'bg-[#0c1229]/95 border-2 border-cyan-400/30 text-white hover:border-fuchsia-400/70 hover:shadow-xl hover:shadow-cyan-950/40',
      cardTitle: 'text-cyan-300 font-black',
      btnBg:
        'bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-600 hover:from-cyan-400 hover:via-blue-500 hover:to-fuchsia-500 text-white font-black shadow-lg shadow-cyan-500/20',
      badgeColor:
        'bg-fuchsia-950/80 text-cyan-300 border border-cyan-400/40',
      textMuted: 'text-slate-300 font-medium',
      sectionTitle: 'text-white font-black',
      boxBg:
        'bg-[#0b1025]/95 border-2 border-indigo-400/30 text-white shadow-lg shadow-indigo-950/30',
    },

    school: {
      heroBg:
        'bg-white/95 border border-slate-200 text-slate-800 shadow-slate-200/60',
      badge: '🏫 PLATFORM CBT RESMI SD NEGERI GETASAN',
      title: 'Platform Tes Kemampuan Akademik (TKA)',
      subtitle: 'Sistem Simulasi & Asesmen Ujian Online SD Negeri Getasan',
      cardBg:
        'bg-white/95 border-slate-200 text-slate-800 shadow-md hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-950/10',
      cardTitle: 'text-indigo-700 font-black',
      btnBg:
        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-indigo-600/20',
      badgeColor: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
      textMuted: 'text-slate-600 font-medium',
      sectionTitle: 'text-slate-800 font-black',
      boxBg: 'bg-white border border-slate-200 text-slate-800 shadow-sm',
    },
  }

  const themeDetails = themeMap[theme] || themeMap.school
  // ========================================
// PENGOLAHAN DATA MATERI
// ========================================

const materialSubjects = useMemo(() => {
  const subjects = materials
    .map((mat) => String(mat.subject || 'Modul').trim())
    .filter((subject) => subject.length > 0)

  return Array.from(new Set(subjects)).sort(
    (a, b) => a.localeCompare(b, 'id')
  )
}, [materials])

const filteredMaterials = useMemo(() => {
  let result = [...materials]

  if (selectedSubject !== 'Semua') {
    result = result.filter(
      (mat) => String(mat.subject || 'Modul').trim() === selectedSubject
    )
  }

  if (materialSearch.trim()) {
    const keyword = materialSearch.toLowerCase()

    result = result.filter((mat) =>
      `${mat.title || ''} ${mat.description || ''} ${mat.subject || ''}`
        .toLowerCase()
        .includes(keyword)
    )
  }

  result.sort((a, b) => {
    if (materialSort === 'Nama A-Z') {
      return (a.title || '').localeCompare(
        b.title || '', 'id'
      )
    }

    if (materialSort === 'Penulis A-Z') {
  const authorA = a.author?.full_name || 'Tim Penyusun'
  const authorB = b.author?.full_name || 'Tim Penyusun'

  return authorA.localeCompare(authorB, 'id')
  }

    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()

    return materialSort === 'Terlama'
      ? dateA - dateB
      : dateB - dateA
  })

  return result
}, [materials, selectedSubject, materialSearch, materialSort])

// ========================================
// PENGOLAHAN DATA UJIAN
// ========================================

const examSubtests = useMemo(() => {
  return Array.from(
    new Set(
      exams.map((exam) =>
        exam.subtest?.trim() || 'UMUM'
      )
    )
  ).sort((a, b) => a.localeCompare(b, 'id'))
}, [exams])

const filteredExams = useMemo(() => {
  let result = [...exams]

  if (selectedSubtest !== 'Semua') {
    result = result.filter(
      (exam) =>
        (exam.subtest?.trim() || 'UMUM') === selectedSubtest
    )
  }

  if (examAccess === 'Butuh Token') {
    result = result.filter((exam) => !!exam.token)
  } else if (examAccess === 'Tanpa Token') {
    result = result.filter((exam) => !exam.token)
  }

  if (examSearch.trim()) {
    const keyword = examSearch.toLowerCase()

    result = result.filter((exam) =>
      `${exam.title || ''} ${exam.description || ''} ${exam.subtest || ''}`
        .toLowerCase()
        .includes(keyword)
    )
  }

  result.sort((a, b) => {
    if (examSort === 'Penulis A-Z') {
  const authorA = a.author?.full_name || 'Tim Penyusun'
  const authorB = b.author?.full_name || 'Tim Penyusun'

  return authorA.localeCompare(authorB, 'id')
  }

    if (examSort === 'Durasi terpendek') {
      return (a.duration_minutes || 0) -
        (b.duration_minutes || 0)
    }

    if (examSort === 'Durasi terpanjang') {
      return (b.duration_minutes || 0) -
        (a.duration_minutes || 0)
    }

    const dateA = new Date(a.created_at || 0).getTime()
    const dateB = new Date(b.created_at || 0).getTime()

    return examSort === 'Terlama'
      ? dateA - dateB
      : dateB - dateA
  })

  return result
}, [exams, selectedSubtest, examAccess, examSearch, examSort])

  // Kelompokkan hasil ujian berdasarkan subtes yang tersedia.
  const groupedExams = useMemo(() => {
    return filteredExams.reduce((groups: Record<string, any[]>, exam) => {
      const groupName = String(exam.subtest || 'UMUM').trim() || 'UMUM'
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(exam)
      return groups
    }, {})
  }, [filteredExams])

  
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
      <div
        className={`min-h-screen flex flex-col font-sans relative isolate ${
          theme === 'gaming'
            ? 'bg-[#17102b] text-white'
            : ''
        }`}
      >
        {theme === 'gaming' && (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
          >
            {/* Arena arcade: warna cerah, pola pixel, dan elemen permainan */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(249,115,22,0.28),_transparent_42%),radial-gradient(ellipse_at_bottom_right,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(135deg,#17102b_0%,#24133e_52%,#101b35_100%)]" />
            <div className="absolute inset-0 opacity-[0.12] bg-[linear-gradient(90deg,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] [background-size:24px_24px]" />
            <div className="absolute -left-24 top-1/4 h-80 w-80 rounded-full bg-orange-500/20 blur-[100px]" />
            <div className="absolute -right-20 top-1/3 h-96 w-96 rounded-full bg-emerald-400/15 blur-[110px]" />
            <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-[100px]" />
            <div className="absolute right-8 top-28 rotate-12 text-5xl opacity-20 sm:right-16 sm:text-7xl">🕹️</div>
            <div className="absolute bottom-24 left-5 -rotate-12 text-4xl opacity-20 sm:left-10 sm:text-6xl">🏆</div>
            <div className="absolute left-1/4 top-1/2 text-3xl opacity-20 sm:text-5xl">⭐</div>
          </div>
        )}

        <Navbar />


      <main className="mx-auto w-full max-w-6xl flex-grow space-y-8 p-4 sm:p-8 relative z-10">
        {/* Banner utama */}
        <section
          className={`relative overflow-hidden rounded-3xl border p-6 sm:p-8 backdrop-blur-xl shadow-2xl transition-all duration-300 ${themeDetails.heroBg}`}
        >
          <div className="relative z-10 space-y-2">
            <span
              className={`inline-block rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${themeDetails.badgeColor}`}
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
        </section>

        {/* Pesan error */}
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-rose-500/40 bg-rose-500/20 p-4 text-xs sm:text-sm text-rose-200 backdrop-blur-md"
          >
            ⚠️ {error}
          </div>
        )}

        {/* Widget latihan dan gamifikasi */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Banner latihan mandiri */}
          <div
            className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-xl md:col-span-2 ${themeDetails.boxBg}`}
          >
            <div className="relative z-10 max-w-md space-y-2">
              <span
                className={`inline-block rounded-full border px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${themeDetails.badgeColor}`}
              >
                🎮 PUSAT PETUALANGAN BELAJAR
              </span>

              <h2 className="text-xl sm:text-2xl font-black leading-tight">
                Asah Kemampuan & Kumpulkan XP!
              </h2>

              <p className={`text-xs leading-relaxed ${themeDetails.textMuted}`}>
                Jawab soal latihan bebas tanpa batas waktu, dapatkan pembahasan instan, dan capai posisi puncak di Papan Peringkat!
              </p>

              <Link
                href="/practice"
                className={`inline-block mt-2 rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${themeDetails.btnBg}`}
              >
                🚀 Masuk Ruang Latihan Mandiri →
              </Link>
            </div>

            <div className="hidden sm:block text-5xl transition-transform duration-300 hover:scale-110">
              🏆✨
            </div>
          </div>

          {/* Kartu status gamifikasi */}
          <div
            className={`flex flex-col justify-between space-y-3 rounded-3xl border p-5 shadow-md backdrop-blur-xl ${themeDetails.boxBg}`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-current/10 pb-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${themeDetails.sectionTitle}`}>
                ⭐ Status Gamifikasi
              </span>

              {userProfile ? (
                <span className="rounded-full border border-emerald-400/50 bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Aktif
                </span>
              ) : (
                <span className="rounded-full border border-amber-400/60 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                  Tamu
                </span>
              )}
            </div>

            {userProfile ? (
              <div className={`rounded-2xl border p-2.5 space-y-2 ${themeDetails.badgeColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-400/40 bg-indigo-600/20 text-xl shadow-sm">
                      {userProfile.avatar_url || '👨‍🚀'}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold">
                        {userProfile.full_name || 'Siswa SD Negeri Getasan'}
                      </p>

                      <p className="truncate text-[10px] opacity-80">
                        {userProfile.class_code
                          ? `Kelas ${userProfile.class_code}`
                          : `@${userProfile.username || 'siswa'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end space-y-1">
                    <Link
                      href="/profile"
                      className="text-[10px] font-extrabold underline opacity-90 transition-opacity hover:opacity-100"
                    >
                      ✏️ Edit Profil
                    </Link>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="text-[10px] font-extrabold text-rose-700 underline transition-colors hover:text-rose-900"
                    >
                      🚪 Keluar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border p-2.5 space-y-2 ${themeDetails.badgeColor}`}>
                <p className="text-[10px] font-medium leading-tight opacity-90">
                  ⚠️ Belum masuk akun. XP & Level tidak tersimpan di profil kamu.
                </p>

                <Link
                  href="/login"
                  className={`block w-full rounded-xl py-2 text-center text-[11px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 ${themeDetails.btnBg}`}
                >
                  🔑 Masuk (Login) Sekarang
                </Link>
              </div>
            )}

            {/* Total XP dan level */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`rounded-2xl border p-3 ${themeDetails.badgeColor}`}>
                <p className="text-[10px] font-bold uppercase opacity-80">
                  Total XP
                </p>
                <p className="text-base sm:text-lg font-black text-amber-500">
                  ⭐ {userProfile?.xp || 0}
                </p>
              </div>

              <div className={`rounded-2xl border p-3 ${themeDetails.badgeColor}`}>
                <p className="text-[10px] font-bold uppercase opacity-80">
                  Level Kamu
                </p>
                <p className="text-base sm:text-lg font-black text-amber-500">
                  🎖️ Lvl {userProfile?.level || 1}
                </p>
              </div>
            </div>

            <Link
              href="/practice"
              className={`block w-full rounded-xl py-2 text-center text-xs font-bold transition-all duration-200 hover:-translate-y-0.5 ${themeDetails.btnBg}`}
            >
              Lihat Leaderboard →
            </Link>
          </div>
        </section>

        {/* Pengumuman sekolah */}
        {announcements.length > 0 && (
          <section className="space-y-3">
            <h2 className={`flex items-center gap-2 text-base sm:text-lg ${themeDetails.sectionTitle}`}>
              <span>📢</span>
              <span>Pengumuman & Informasi Sekolah</span>
            </h2>

            <div
              className={`grid gap-4 ${
                announcements.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-1 md:grid-cols-2'
              }`}
            >
              {announcements.map((ann) => (
                <article
                  key={ann.id}
                  className={`space-y-3 rounded-2xl border p-5 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${themeDetails.boxBg}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${themeDetails.badgeColor}`}>
                      📌 {ann.category || 'Penting'}
                    </span>

                    <span className="text-[11px] font-mono opacity-75">
                      {new Date(ann.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-extrabold">
                    {ann.title}
                  </h3>

                  <div className={`text-xs leading-relaxed ${themeDetails.textMuted}`}>
                    <MathRenderer content={ann.content || ''} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Pusat Sumber Belajar — pratinjau ringkas */}
        {materials.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className={`flex items-center gap-2 text-lg sm:text-xl ${themeDetails.sectionTitle}`}>
                  <span>📚</span>
                  <span>Pusat Sumber Belajar</span>
                </h2>
                <p className={`mt-1 text-xs ${themeDetails.textMuted}`}>
                  Materi dan bahan belajar pilihan untuk menemani kegiatanmu.
                </p>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${themeDetails.badgeColor}`}>
                {materials.length} sumber
              </span>
            </div>

            <div className={`space-y-3 rounded-2xl border p-3 sm:p-4 ${themeDetails.boxBg}`}>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="search"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  placeholder="Cari judul atau mata pelajaran..."
                  aria-label="Cari sumber belajar"
                  className="min-w-0 flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  aria-label="Filter mata pelajaran"
                  className="rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                >
                  <option value="Semua">Semua mata pelajaran</option>
                  {materialSubjects.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-current/10 pt-2">
                <span className="text-[11px] font-semibold opacity-80">
                  Menampilkan {Math.min(filteredMaterials.length, 3)} dari {filteredMaterials.length} hasil
                </span>
                <label className="flex items-center gap-2 text-[11px] font-semibold">
                  <span>Urutkan</span>
                  <select
                    value={materialSort}
                    onChange={(e) => setMaterialSort(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-800"
                  >
                    <option value="Terbaru">Terbaru</option>
                    <option value="Terlama">Terlama</option>
                    <option value="Nama A-Z">Nama A–Z</option>
                    <option value="Penulis A-Z">Penulis A–Z</option>
                  </select>
                </label>
              </div>

              {filteredMaterials.length > 0 ? (
                <div className="divide-y divide-current/10">
                  {filteredMaterials.slice(0, 3).map((mat, index) => (
                    <article key={mat.id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-1">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-100 text-xl">
                        {['📕', '📘', '📗'][index % 3]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className={`truncate text-xs font-black ${themeDetails.cardTitle}`}>{mat.title}</h3>
                        <p className={`mt-0.5 truncate text-[10px] ${themeDetails.textMuted}`}>
                          {mat.subject || 'Umum'} · {mat.author_display_name || mat.author?.full_name || 'Tim Penyusun'}
                        </p>
                      </div>
                      {mat.file_url ? (
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer"
                          className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-black ${themeDetails.btnBg}`}>
                          Buka <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="shrink-0 text-[10px] text-slate-400">Belum tersedia</span>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-5 text-center text-xs font-semibold opacity-70">Sumber belajar tidak ditemukan. Coba kata kunci lain.</p>
              )}

              <div className="flex justify-end border-t border-current/10 pt-3">
                <Link href="/materi" className={`rounded-xl px-4 py-2.5 text-xs font-black transition hover:-translate-y-0.5 ${themeDetails.btnBg}`}>
                  Lihat semua sumber belajar ({materials.length}) →
                </Link>
              </div>
            </div>
          </section>
        )}

                {/* Pusat Ujian & Asesmen */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className={`flex items-center gap-2 text-lg sm:text-xl ${themeDetails.sectionTitle}`}>
                <span>📝</span>
                <span>Pusat Ujian & Asesmen</span>
              </h2>
              <p className={`mt-1 text-xs ${themeDetails.textMuted}`}>
                Pilih subtes dan temukan ujian yang ingin kamu kerjakan.
              </p>
            </div>
            <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${themeDetails.badgeColor}`}>
              {filteredExams.length} dari {exams.length} ujian
            </span>
          </div>
          
          <div className={`overflow-hidden rounded-2xl border ${themeDetails.boxBg}`}>
            <button
              type="button"
              onClick={() => setShowExamFilters((prev) => !prev)}
              aria-expanded={showExamFilters}
              className="flex w-full items-center justify-between gap-3 p-3 text-left transition hover:bg-black/5 sm:p-4"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="text-lg">🔎</span>
                <span className="text-xs font-extrabold sm:text-sm">
                  Cari, pilih subtes, dan sortir ujian
                </span>
              </span>
          
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-[10px] font-bold opacity-70">
                  {showExamFilters ? 'Tutup' : 'Buka filter'}
                </span>
                <span
                  className={`text-lg transition-transform duration-200 ${
                    showExamFilters ? 'rotate-180' : ''
                  }`}
                >
                  ▾
                </span>
              </span>
            </button>
          
            {showExamFilters && (
              <div className="space-y-3 border-t border-current/10 p-3 sm:p-4">
                <input
                  type="search"
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  placeholder="Cari nama atau deskripsi ujian..."
                  aria-label="Cari ujian"
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-800 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                />
          
                <div className="space-y-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide">
                    Pilih Subtes
                  </p>
          
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubtest('Semua')}
                      aria-pressed={selectedSubtest === 'Semua'}
                      className={`rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold transition ${
                        selectedSubtest === 'Semua'
                          ? themeDetails.btnBg
                          : 'border-current/20 bg-white text-slate-700 hover:bg-amber-50'
                      }`}
                    >
                      🌟 Semua Subtes
                    </button>
          
                    {examSubtests.map((subtest) => (
                      <button
                        key={subtest}
                        type="button"
                        onClick={() => setSelectedSubtest(subtest)}
                        aria-pressed={selectedSubtest === subtest}
                        className={`rounded-lg border-2 px-3 py-1.5 text-[11px] font-bold transition ${
                          selectedSubtest === subtest
                            ? themeDetails.btnBg
                            : 'border-current/20 bg-white text-slate-700 hover:bg-amber-50'
                        }`}
                      >
                        {subtest}
                      </button>
                    ))}
                  </div>
                </div>
          
                <div className="grid grid-cols-1 gap-3 border-t border-current/10 pt-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-[11px] font-semibold">
                    <span>Akses ujian</span>
                    <select
                      value={examAccess}
                      onChange={(e) => setExamAccess(e.target.value)}
                      className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                    >
                      <option value="Semua">Semua ujian</option>
                      <option value="Butuh Token">Butuh token</option>
                      <option value="Tanpa Token">Tanpa token</option>
                    </select>
                  </label>
          
                  <label className="flex flex-col gap-1.5 text-[11px] font-semibold">
                    <span>Urutkan ujian</span>
                    <select
                      value={examSort}
                      onChange={(e) => setExamSort(e.target.value)}
                      className="rounded-lg border-2 border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-amber-400"
                    >
                      <option value="Terbaru">Terbaru</option>
                      <option value="Terlama">Terlama</option>
                      <option value="Nama A-Z">Nama A–Z</option>
                      <option value="Penulis A-Z">Penulis A–Z</option>
                      <option value="Durasi terpendek">Durasi terpendek</option>
                      <option value="Durasi terpanjang">Durasi terpanjang</option>
                    </select>
                  </label>
                </div>
          
                <div className="flex justify-end border-t border-current/10 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExamSearch('')
                      setSelectedSubtest('Semua')
                      setExamSort('Terbaru')
                      setExamAccess('Semua')
                    }}
                    className="text-[11px] font-bold underline underline-offset-2 opacity-80 hover:opacity-100"
                  >
                    Reset filter ujian
                  </button>
                </div>
              </div>
            )}
          </div>


          {filteredExams.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(groupedExams).map(([subtest, group]) => (
                <section
                  key={subtest}
                  className={`overflow-hidden rounded-2xl border-2 ${themeDetails.boxBg}`}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3">
                    <div className="min-w-0">
                      <h3 className={`truncate text-sm font-black ${themeDetails.sectionTitle}`}>
                        📘 {subtest}
                      </h3>
                      <p className={`mt-0.5 text-[11px] ${themeDetails.textMuted}`}>
                        {group.length} ujian tersedia
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${themeDetails.badgeColor}`}>
                      {group.length} Ujian
                    </span>
                  </div>

                  <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
                    {group.map((exam: any) => (
                      <article
                        key={exam.id}
                        className={`flex min-w-0 flex-col justify-between gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-lg ${themeDetails.cardBg}`}
                      >
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <h4 className={`min-w-0 flex-1 text-sm font-black leading-snug ${themeDetails.cardTitle}`}>
                              {exam.title}
                            </h4>
                            {exam.token ? (
                              <span className="shrink-0 rounded-lg border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900">
                                🔒 Butuh Token
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-900">
                                🔓 Terbuka
                              </span>
                            )}
                          </div>

                          <p className={`text-xs leading-relaxed ${themeDetails.textMuted}`}>
                            {exam.description || 'Tidak ada deskripsi ujian.'}
                          </p>

                          {exam.start_time && (
                            <p className="flex items-center gap-1 text-xs font-semibold text-amber-500">
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
                        </div>
                        
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-current/15 pt-3">
                      <div className="flex min-w-0 flex-col gap-1">
                        <span className={`flex items-center gap-1 text-xs font-semibold ${themeDetails.textMuted}`}>
                          ⏱️ Durasi: {exam.duration_minutes || 0} menit
                        </span>
                        <span className={`max-w-full truncate text-[10px] font-semibold ${themeDetails.textMuted}`}>
                          ✍️ {exam.author_display_name || exam.author?.full_name || 'TIM Penyusun'}
                        </span>
                      </div>
                    
                      <button
                        type="button"
                        onClick={() => handleOpenTokenModal(exam)}
                        className={`rounded-xl px-4 py-2.5 text-xs font-bold shadow-md transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${themeDetails.btnBg}`}
                        suppressHydrationWarning
                      >
                        Mulai Ujian 🚀
                      </button>
                    </div>

                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className={`rounded-2xl border-2 border-dashed p-8 text-center ${themeDetails.boxBg}`}>
              <div className="mb-3 text-4xl">📝</div>
              <h3 className="text-sm font-black">
                {exams.length === 0 ? 'Belum Ada Ujian' : 'Ujian Tidak Ditemukan'}
              </h3>
              <p className={`mt-1 text-xs ${themeDetails.textMuted}`}>
                {exams.length === 0
                  ? 'Belum ada ujian yang dipublikasikan saat ini.'
                  : 'Coba ubah kata kunci atau filter yang dipilih.'}
              </p>
            </div>
          )}
        </section>

              </main>

      {/* Modal verifikasi token ujian */}
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
          <p className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-3 font-semibold text-white backdrop-blur-md">
            Memuat data ujian...
          </p>
        </div>
      }
    >
      <HomePageContent />
    </Suspense>
  )
}
