
'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import ExamTokenModal from '@/components/ExamTokenModal'
import { useTheme } from '@/context/ThemeContext'
import MathRenderer from '@/components/MathRenderer'
import { getSummaryHtml } from '@/lib/content-summary'
import Link from 'next/link'

function HomePageContent() {
  const { theme } = useTheme()
  const [exams, setExams] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [announcementPage, setAnnouncementPage] = useState(0)
  const ANNOUNCEMENTS_PER_PAGE = 2
  const [materials, setMaterials] = useState<any[]>([])
  const [homePinOrder, setHomePinOrder] = useState({ cbt: {} as Record<string, number>, cbtCategories: {} as Record<string, number>, material: {} as Record<string, number>, announcement: {} as Record<string, number> })
  const [userProfile, setUserProfile] = useState<any>(null)
  const [resumeSessions, setResumeSessions] = useState<any[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useState<any[]>([])
  const [globalStudentScores, setGlobalStudentScores] = useState<any[]>([])
  const [classLeaderboard, setClassLeaderboard] = useState<any[]>([])
  const [leaderboardMode, setLeaderboardMode] = useState<'GLOBAL' | 'CLASS'>('GLOBAL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

    // FILTER MATERI
  const [materialSearch, setMaterialSearch] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('Semua')
  const [materialSort, setMaterialSort] = useState('Prioritas')
  const [materialPage, setMaterialPage] = useState(0)
  const MATERIALS_PER_PAGE = 5
  const [showMaterialFilters, setShowMaterialFilters] = useState(false)
  const [showMaterialSearch, setShowMaterialSearch] = useState(false)
  const [showExamFilters, setShowExamFilters] = useState(false)
  const [showHallOfFame, setShowHallOfFame] = useState(false)
  const [showPlayerDashboard, setShowPlayerDashboard] = useState(false)
  
  // FILTER UJIAN
  const [examSearch, setExamSearch] = useState('')
  const [selectedSubtest, setSelectedSubtest] = useState('Semua')
  const [examSort, setExamSort] = useState('Prioritas')
  const [examAccess, setExamAccess] = useState('Semua')
  
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedArcadeMission, setSelectedArcadeMission] = useState(0)

  useEffect(() => {
    let active = true

    const loadPinSurface = async (surface: string): Promise<{ items: Record<string, number>; categories: Record<string, number> }> => {
      try {
        const response = await fetch('/api/homepage-pins?surface=' + surface, { cache: 'no-store' })
        if (!response.ok) return { items: {}, categories: {} }
        const payload = await response.json()
        const pins = Array.isArray(payload?.pins) ? payload.pins : []
        return { items: Object.fromEntries(pins.filter((pin: any) => (pin.scope || 'item') === 'item').map((pin: any) => [String(pin.id), Number(pin.sort_order)])), categories: Object.fromEntries(pins.filter((pin: any) => pin.scope === 'category').map((pin: any) => [String(pin.category_key), Number(pin.sort_order)])) }
      } catch (error) {
        console.warn('Prioritas beranda ' + surface + ' tidak tersedia:', error)
        return { items: {}, categories: {} }
      }
    }

    void Promise.all([
      loadPinSurface('cbt'),
      loadPinSurface('material'),
      loadPinSurface('announcement'),
    ]).then(([cbt, material, announcement]) => {
      if (active) setHomePinOrder({ cbt: cbt.items, cbtCategories: cbt.categories, material: material.items, announcement: announcement.items })
    })

    return () => { active = false }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchData() {
      try {
        const supabase = createClient()

        // Data utama halaman dimuat bersamaan agar tidak saling menunggu.
        const [
          authResult,
          examResult,
          announcementResult,
          materialResult,
        ] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('exams')
            .select('*, author:profiles!exams_created_by_fkey(full_name)')
            .eq('is_published', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('announcements')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          supabase
            .from('study_materials')
            .select('*, author:profiles!study_materials_created_by_fkey(full_name)')
            .order('created_at', { ascending: false }),
        ])

        const user = authResult.data?.user || null
        let currentProfile: any = null

        // Profil diperlukan untuk identitas siswa dan peringkat kelas.
        if (user) {
          const [{ data: profile, error: profileError }, { data: activeSessions, error: activeSessionsError }] = await Promise.all([
            supabase.from('profiles').select('id, full_name, username, class_code, avatar_url, xp, level, badges').eq('id', user.id).maybeSingle(),
            supabase.from('exam_sessions').select('id, exam_id, status, created_at').eq('user_id', user.id).in('status', ['ongoing', 'paused']).order('created_at', { ascending: false }).limit(5),
          ])
          if (activeSessionsError) console.error('Gagal memuat sesi ujian yang belum selesai:', activeSessionsError)
          else {
            const examRows = examResult.data || []
            setResumeSessions((activeSessions || []).map((session: any) => ({ ...session, exam: examRows.find((item: any) => item.id === session.exam_id) || null })).filter((session: any) => session.exam))
          }

          if (profileError) {
            console.error('Gagal memuat profil pengguna:', profileError)
          }

          if (profile) {
            currentProfile = profile
            if (isMounted) setUserProfile(profile)
          }
        }

        if (!isMounted) return

        if (examResult.error) {
          setError(examResult.error.message)
        } else {
          const filteredExams = (examResult.data || []).filter(
            (exam: any) =>
              !exam.target_mode ||
              exam.target_mode === 'CBT_ONLY' ||
              exam.target_mode === 'BOTH',
          )
          setExams(filteredExams)
        }

        if (announcementResult.error) {
          console.log('Pengumuman belum dapat dimuat:', announcementResult.error.message)
        } else if (announcementResult.data) {
          setAnnouncements(announcementResult.data)
        }

        if (materialResult.error) {
          console.log('Materi belajar belum dapat dimuat:', materialResult.error.message)
        } else if (materialResult.data) {
          setMaterials(materialResult.data)
        }

        // Tampilkan konten utama tanpa menunggu distribusi XP seluruh siswa.
        setLoading(false)

        // Data papan juara dan gelar arcade bersifat sekunder; muat paralel
        // setelah halaman utama sudah dapat digunakan.
        const [globalTopResult, studentScoresResult, classTopResult] =
          await Promise.all([
            supabase
              .from('profiles')
              .select('id, full_name, username, class_code, xp, level, avatar_url')
              .not('class_code', 'ilike', 'guru')
              .order('xp', { ascending: false })
              .limit(3),
            supabase
              .from('profiles')
              .select('id, class_code, xp')
              .order('xp', { ascending: false }),
            currentProfile?.class_code
              ? supabase
                  .from('profiles')
                  .select('id, full_name, username, class_code, xp, level, avatar_url')
                  .eq('class_code', currentProfile.class_code)
                  .not('class_code', 'ilike', 'guru')
                  .order('xp', { ascending: false })
                  .limit(3)
              : Promise.resolve({ data: [], error: null }),
          ])

        if (!isMounted) return

        if (globalTopResult.error) {
          console.error('Gagal memuat papan juara global:', globalTopResult.error)
        }
        setGlobalLeaderboard(
          (globalTopResult.data || []).filter(
            (student: any) => String(student.class_code || '').trim().toLowerCase() !== 'guru'
          )
        )

        if (studentScoresResult.error) {
          console.error('Gagal memuat distribusi XP siswa:', studentScoresResult.error)
        }
        setGlobalStudentScores(
          (studentScoresResult.data || []).filter(
            (student: any) => String(student.class_code || '').trim().toLowerCase() !== 'guru'
          )
        )

        if (classTopResult.error) {
          console.error('Gagal memuat papan juara kelas:', classTopResult.error)
        }
        setClassLeaderboard(
          (classTopResult.data || []).filter(
            (student: any) => String(student.class_code || '').trim().toLowerCase() !== 'guru'
          )
        )
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Terjadi kesalahan saat memuat data.')
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
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
        'Masuki arena belajar, selesaikan tantangan seru, buka pencapaian, dan tingkatkan levelmu setiap hari!',
      cardBg:
        'bg-gradient-to-br from-[#172b52] via-[#19133d] to-[#321447] border-2 border-cyan-300/35 text-white shadow-[0_7px_0_rgba(4,8,25,.65),0_15px_28px_rgba(0,0,0,.2)] hover:border-yellow-200/80 hover:shadow-[0_12px_0_rgba(4,8,25,.65),0_22px_35px_rgba(0,0,0,.3)]',
      cardTitle: 'text-cyan-300 font-black',
      btnBg:
        'bg-gradient-to-b from-cyan-300 via-blue-500 to-indigo-600 border border-cyan-100/70 text-white font-black shadow-[0_5px_0_#172554,0_10px_18px_rgba(34,211,238,.2)] hover:brightness-110',
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
    if (materialSort === 'Prioritas') {
      const orderA = homePinOrder.material[String(a.id)]
      const orderB = homePinOrder.material[String(b.id)]
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB
      if (orderA !== undefined) return -1
      if (orderB !== undefined) return 1
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }

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
}, [materials, selectedSubject, materialSearch, materialSort, homePinOrder.material])

const totalMaterialPages = Math.max(1, Math.ceil(filteredMaterials.length / MATERIALS_PER_PAGE))
const visibleMaterials = filteredMaterials.slice(
  materialPage * MATERIALS_PER_PAGE,
  (materialPage + 1) * MATERIALS_PER_PAGE
)

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
    if (examSort === 'Prioritas') {
      const orderA = homePinOrder.cbt[String(a.id)]
      const orderB = homePinOrder.cbt[String(b.id)]
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB
      if (orderA !== undefined) return -1
      if (orderB !== undefined) return 1
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    }

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
}, [exams, selectedSubtest, examAccess, examSearch, examSort, homePinOrder.cbt])

  const priorityExams = useMemo(() => {
    if (examSort !== 'Prioritas') return []
    return filteredExams
      .filter((exam) => homePinOrder.cbt[String(exam.id)] !== undefined)
      .sort((a, b) => homePinOrder.cbt[String(a.id)] - homePinOrder.cbt[String(b.id)])
  }, [filteredExams, examSort, homePinOrder.cbt])

  const examsForGrouping = useMemo(() => {
    if (examSort !== 'Prioritas') return filteredExams
    return filteredExams.filter((exam) => homePinOrder.cbt[String(exam.id)] === undefined)
  }, [filteredExams, examSort, homePinOrder.cbt])

  // Kelompokkan ujian reguler berdasarkan subtes; pin ditampilkan terpisah di atas.
  const groupedExams = useMemo(() => {
    return examsForGrouping.reduce((groups: Record<string, any[]>, exam) => {
      const groupName = String(exam.subtest || 'UMUM').trim() || 'UMUM'
      if (!groups[groupName]) groups[groupName] = []
      groups[groupName].push(exam)
      return groups
    }, {})
  }, [examsForGrouping])

  const displayExamGroups = useMemo(() => {
    const regularGroups = Object.entries(groupedExams).map(([subtest, group]) => ({ subtest, group }))
    const categoryGroups = examSort === 'Prioritas' ? regularGroups.filter(({ subtest }) => homePinOrder.cbtCategories[String(subtest).toLocaleLowerCase('id')] !== undefined).sort((a, b) => homePinOrder.cbtCategories[String(a.subtest).toLocaleLowerCase('id')] - homePinOrder.cbtCategories[String(b.subtest).toLocaleLowerCase('id')]) : []
    const prioritizedNames = new Set(categoryGroups.map((entry) => entry.subtest))
    return [...(priorityExams.length ? [{ subtest: '__PRIORITY__', group: priorityExams }] : []), ...categoryGroups, ...regularGroups.filter((entry) => !prioritizedNames.has(entry.subtest))]
  }, [groupedExams, priorityExams, homePinOrder.cbtCategories, examSort])

  const orderedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      const orderA = homePinOrder.announcement[String(a.id)]
      const orderB = homePinOrder.announcement[String(b.id)]
      if (orderA !== undefined && orderB !== undefined) return orderA - orderB
      if (orderA !== undefined) return -1
      if (orderB !== undefined) return 1
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })
  }, [announcements, homePinOrder.announcement])

  const totalAnnouncementPages = Math.max(1, Math.ceil(orderedAnnouncements.length / ANNOUNCEMENTS_PER_PAGE))
  const visibleAnnouncements = orderedAnnouncements.slice(
    announcementPage * ANNOUNCEMENTS_PER_PAGE,
    (announcementPage + 1) * ANNOUNCEMENTS_PER_PAGE,
  )

  useEffect(() => {
    setAnnouncementPage((page) => Math.min(page, totalAnnouncementPages - 1))
  }, [totalAnnouncementPages])

  // Gelar Arcade mengikuti peringkat XP global. Peringkat pertama selalu
  // mendapat Legenda Arena, berapa pun jumlah siswa; siswa dengan XP seri
  // memperoleh peringkat dan gelar yang sama.
  const arcadeLevel = Math.max(1, Number(userProfile?.level) || 1)
  const arcadeStudentCount = globalStudentScores.length
  const arcadePlayerScore = userProfile
    ? globalStudentScores.find((student) => student.id === userProfile.id)
    : null
  const arcadeRank = arcadePlayerScore
    ? globalStudentScores.filter(
        (student) => Number(student.xp || 0) > Number(arcadePlayerScore.xp || 0)
      ).length + 1
    : null
  const arcadePercentile = arcadeRank !== null && arcadeStudentCount > 0
    ? (arcadeRank / arcadeStudentCount) * 100
    : null

  const arcadeTier = arcadeRank === null
    ? { name: 'Petualang Baru', icon: '🌱', message: 'Setiap perjalanan hebat dimulai dari satu langkah. Mulai misi pertamamu dan kumpulkan pengalaman!' }
    : arcadeRank === 1
      ? { name: 'Legenda Arena', icon: '👑', message: 'Luar biasa! Kamu berada di peringkat pertama arena. Jadilah inspirasi dan tetap rendah hati!' }
      : arcadePercentile !== null && arcadePercentile <= 5
        ? { name: 'Grandmaster', icon: '💎', message: 'Prestasi yang luar biasa! Kamu termasuk kelompok teratas. Pertahankan konsistensi belajarmu!' }
        : arcadePercentile !== null && arcadePercentile <= 15
          ? { name: 'Master Pengetahuan', icon: '🏆', message: 'Kamu sudah melangkah jauh dan bersaing di kelompok unggulan. Terus tingkatkan kemampuan!' }
          : arcadePercentile !== null && arcadePercentile <= 35
            ? { name: 'Ksatria Cendekia', icon: '⚔️', message: 'Perkembanganmu sangat baik. Terus berlatih, karena peluang naik ke kelompok teratas selalu terbuka!' }
            : arcadePercentile !== null && arcadePercentile <= 65
              ? { name: 'Penjelajah Tangguh', icon: '🧭', message: 'Kamu terus bertumbuh. Satu latihan bermakna setiap hari akan membawamu lebih jauh!' }
              : { name: 'Calon Juara', icon: '🌟', message: 'Perjalananmu masih panjang dan penuh peluang. Tetap semangat, setiap XP adalah kemajuan!' }

  const arcadeBadges = Array.isArray(userProfile?.badges)
    ? userProfile.badges
    : userProfile?.badges && typeof userProfile.badges === 'object'
      ? Object.values(userProfile.badges)
      : []

  const activeLeaderboard =
    leaderboardMode === 'CLASS' ? classLeaderboard : globalLeaderboard

  
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
        className={`min-h-screen flex flex-col font-sans relative isolate theme-${theme} ${
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
        {/* Hero tema: 3D Cartoon dan Arcade Game Hub */}
        {theme === 'gaming' ? (
          <section className="arcade-hero relative isolate overflow-hidden rounded-[2rem] border-2 border-cyan-300/50 bg-gradient-to-br from-[#251044] via-[#171c49] to-[#0b2638] p-5 text-white shadow-[0_24px_0_-10px_rgba(4,8,25,0.75),0_30px_70px_-25px_rgba(34,211,238,0.65)] sm:p-8 lg:p-10">
            <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-20" />
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/25 blur-[90px]" />
            <div className="absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-cyan-400/20 blur-[100px]" />
            <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="max-w-xl space-y-4">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/50 bg-lime-300/10 px-2 py-1 text-[8px] font-black tracking-[0.12em] text-lime-200 shadow-[0_0_24px_rgba(190,242,100,0.18)] sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[10px] sm:tracking-[0.18em]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-lime-300" />
                  ARCADE GAME HUB • {userProfile?.username ? '@' + userProfile.username : 'PLAYER 1'}
                </span>
                <h1 className="text-3xl font-black leading-[1.08] tracking-tight sm:text-4xl lg:text-5xl">
                  Pilih Misi.<br /><span className="bg-gradient-to-r from-yellow-200 via-orange-300 to-pink-300 bg-clip-text text-transparent">Jadilah Juara!</span>
                </h1>
                <p className="max-w-lg text-sm leading-relaxed text-blue-100/85 sm:text-base">
                  Arena belajar penuh tantangan. Kumpulkan XP dari aktivitas belajar, naikkan level, dan buka pencapaian baru!
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-200/20 bg-slate-950/35 p-3 backdrop-blur-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-200/30 bg-gradient-to-br from-cyan-300/25 to-violet-400/25 text-3xl shadow-inner">
                    {userProfile?.avatar_url || '👾'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white">
                      {userProfile?.full_name || 'Pemain Tamu'}
                    </p>
                    <p className="truncate text-[10px] font-semibold text-cyan-100/75">
                      {userProfile?.username ? '@' + userProfile.username : userProfile ? 'Username belum diatur' : 'Masuk untuk menyimpan progres'}
                      {userProfile?.class_code ? ' · Kelas ' + userProfile.class_code : ''}
                    </p>
                  </div>
                  {!userProfile && (
                    <Link href="/login" className="shrink-0 rounded-lg bg-cyan-300 px-3 py-2 text-[10px] font-black text-slate-950">
                      MASUK
                    </Link>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-2 sm:gap-2 sm:pt-3">
                  <a href="#arcade-missions" className="arcade-3d-button rounded-xl border-2 border-yellow-100 bg-gradient-to-b from-yellow-300 to-orange-500 px-5 py-3 text-sm font-black text-[#32133d] shadow-[0_6px_0_#9a421b,0_10px_24px_rgba(249,115,22,.28)] transition hover:-translate-y-1 hover:shadow-[0_9px_0_#9a421b,0_16px_28px_rgba(249,115,22,.35)] active:translate-y-1 active:shadow-[0_2px_0_#9a421b]">
                    ▶ MULAI PETUALANGAN
                  </a>
                  <span className="rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 text-[10px] font-bold text-cyan-100 backdrop-blur sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                    ⭐ {userProfile?.xp || 0} XP <span className="mx-1 text-white/30">|</span> LEVEL {arcadeLevel}
                  </span>
                  <span className="rounded-lg border border-amber-200/30 bg-amber-200/10 px-2 py-1.5 text-[9px] font-black text-amber-100 sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs">
                    {arcadeTier.icon} {arcadeTier.name}
                  </span>
                </div>
                {userProfile && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {arcadeBadges.length > 0 ? (
                      arcadeBadges.slice(0, 4).map((badge: any, index: number) => {
                        const badgeName = typeof badge === 'string'
                          ? badge
                          : badge?.name || badge?.title || badge?.label || badge?.badge_name || badge?.id || 'Badge ' + (index + 1)
                        const badgeIcon = typeof badge === 'object'
                          ? badge?.icon || badge?.emoji || '🏅'
                          : '🏅'
                        return (
                          <span key={badgeName + '-' + index} title={badgeName} className="rounded-full border border-yellow-200/25 bg-yellow-200/10 px-2 py-0.5 text-[8px] font-bold text-yellow-100 sm:px-2.5 sm:py-1 sm:text-[10px]">
                            {badgeIcon} {badgeName}
                          </span>
                        )
                      })
                    ) : (
                      <span className="text-[10px] text-blue-100/60">🏅 Badge pertamamu menunggu untuk diraih!</span>
                    )}
                  </div>
                )}
              </div>

              <div className="arcade-stage relative mx-auto flex h-[250px] w-full max-w-[430px] items-center justify-center sm:h-[310px]" aria-label="Ilustrasi mesin arcade tiga dimensi">
                <div className="arcade-platform absolute bottom-5 h-8 w-[82%] rounded-[50%] bg-cyan-300/25 blur-md" />
                <div className="arcade-pixel absolute left-[8%] top-[16%] text-3xl text-yellow-200">✦</div>
                <div className="arcade-pixel absolute right-[8%] top-[25%] text-2xl text-pink-300">◆</div>
                <div className="arcade-cabinet relative z-10 h-[220px] w-[150px] rounded-[25px_25px_18px_18px] border-[5px] border-[#11152f] bg-gradient-to-br from-fuchsia-500 via-violet-600 to-indigo-800 p-2 shadow-[18px_22px_0_rgba(5,8,28,.55),0_25px_50px_rgba(0,0,0,.45)] sm:h-[255px] sm:w-[180px]">
                  <div className="absolute -left-3 top-8 h-12 w-2 rounded-l-full bg-cyan-300 shadow-[0_0_16px_#67e8f9]" />
                  <div className="absolute -right-3 top-8 h-12 w-2 rounded-r-full bg-pink-400 shadow-[0_0_16px_#f472b6]" />
                  <div className="rounded-xl border-2 border-cyan-200/70 bg-[#07172d] p-2 shadow-[inset_0_0_22px_rgba(34,211,238,.25)]">
                    <div className="flex items-center justify-between text-[8px] font-black tracking-[.2em] text-cyan-200"><span>GETASAN</span><span>★ 01</span></div>
                    <div className="arcade-screen mt-2 flex h-[88px] flex-col items-center justify-center rounded-lg border border-cyan-300/60 bg-gradient-to-b from-[#102e55] to-[#111033] text-center shadow-[0_0_20px_rgba(34,211,238,.25)] sm:h-[105px]">
                      <span className="arcade-mascot text-4xl drop-shadow-[0_6px_0_rgba(0,0,0,.3)] sm:text-5xl">👾</span>
                      <span className="mt-1 text-[9px] font-black tracking-[.25em] text-yellow-200">LET'S PLAY!</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-5">
                    <div className="relative h-8 w-8 rounded-full border-4 border-[#11152f] bg-gradient-to-br from-red-300 to-red-600 shadow-[0_4px_0_#7f1d1d]" />
                    <div className="relative h-8 w-8 rounded-full border-4 border-[#11152f] bg-gradient-to-br from-yellow-200 to-orange-500 shadow-[0_4px_0_#9a3412]" />
                    <div className="relative h-8 w-8 rounded-full border-4 border-[#11152f] bg-gradient-to-br from-lime-200 to-emerald-500 shadow-[0_4px_0_#166534]" />
                  </div>
                  <div className="absolute -bottom-3 left-1/2 h-3 w-24 -translate-x-1/2 rounded-b-xl bg-[#090d24] shadow-[0_7px_0_rgba(0,0,0,.3)]" />
                </div>
                <div className="arcade-coin absolute right-[13%] top-[13%] flex h-12 w-12 items-center justify-center rounded-full border-4 border-yellow-100 bg-gradient-to-br from-yellow-200 to-amber-500 text-xl font-black text-amber-900 shadow-[0_8px_0_#9a5b12,0_12px_25px_rgba(250,204,21,.35)]">★</div>
                <div className="arcade-coin arcade-coin-delay absolute bottom-[20%] left-[10%] flex h-10 w-10 items-center justify-center rounded-full border-4 border-cyan-100 bg-gradient-to-br from-cyan-200 to-blue-500 text-lg font-black text-blue-950 shadow-[0_7px_0_#164e63]">XP</div>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-80" />
          </section>
        ) : theme === 'cartoon3d' ? (
          <section className="cartoon3d-hero relative isolate overflow-hidden rounded-[2rem] border-[4px] border-slate-900 bg-gradient-to-br from-amber-300 via-orange-400 to-yellow-300 p-6 text-slate-950 shadow-[0_12px_0_#172033,0_22px_35px_rgba(15,23,42,.18)] sm:p-9">
            <div className="absolute -right-10 -top-14 h-52 w-52 rounded-full bg-white/35 blur-2xl" />
            <div className="relative z-10 grid items-center gap-5 sm:grid-cols-[1fr_auto]">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex rounded-full border-2 border-slate-900 bg-white/75 px-3 py-1 text-[10px] font-black tracking-widest">🎨 DUNIA CARTOON 3D PLAYFUL</span>
                <h1 className="text-3xl font-black leading-tight sm:text-4xl">Petualangan Seru Belajar 3D TKA!</h1>
                <p className="max-w-xl text-sm font-semibold leading-relaxed text-slate-800">Ayo belajar dengan gembira! Jelajahi materi, selesaikan tantangan, dan raih bintang prestasi.</p>
                <Link href="/practice" className="cartoon3d-button inline-flex rounded-xl border-2 border-slate-900 bg-white px-4 py-2.5 text-xs font-black shadow-[0_5px_0_#172033] transition hover:-translate-y-1 hover:shadow-[0_8px_0_#172033] active:translate-y-1 active:shadow-[0_2px_0_#172033]">🚀 MULAI BELAJAR</Link>
              </div>
              <div className="cartoon3d-stage relative mx-auto flex h-40 w-48 items-center justify-center sm:h-52 sm:w-60">
                <div className="cartoon3d-cloud absolute right-1 top-1 text-5xl">☁️</div>
                <div className="cartoon3d-star absolute left-3 top-3 text-3xl">⭐</div>
                <div className="cartoon3d-mascot relative z-10 flex h-28 w-28 items-center justify-center rounded-[2rem] border-[5px] border-slate-900 bg-gradient-to-br from-cyan-200 to-blue-400 text-6xl shadow-[0_12px_0_#172033,0_18px_25px_rgba(15,23,42,.2)] sm:h-36 sm:w-36 sm:text-7xl">🤖</div>
                <div className="absolute bottom-1 h-5 w-40 rounded-[50%] bg-slate-900/20 blur-sm" />
              </div>
            </div>
          </section>
        ) : (
          <section className={`theme-story-hero relative isolate overflow-hidden rounded-3xl border p-6 sm:p-8 shadow-2xl transition-all duration-300 ${themeDetails.heroBg}`}>
            <div className="relative z-10 grid items-center gap-5 sm:grid-cols-[1fr_auto]">
              <div className="max-w-2xl space-y-3">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${themeDetails.badgeColor}`}>{themeDetails.badge}</span>
                <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-3xl lg:text-4xl">{themeDetails.title}</h1>
                <p className={`max-w-xl text-sm leading-relaxed sm:text-base ${themeDetails.textMuted}`}>{themeDetails.subtitle}</p>
                <Link href="/practice" className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-black transition hover:-translate-y-1 active:translate-y-0.5 ${themeDetails.btnBg}`}>🚀 MULAI PETUALANGAN</Link>
              </div>
              <div className={`theme-story-art relative mx-auto flex h-36 w-36 items-center justify-center rounded-[2rem] border-4 text-7xl sm:h-44 sm:w-44 sm:text-8xl ${theme === 'space' ? 'border-indigo-950/30 bg-indigo-300/25 shadow-[0_10px_0_rgba(30,41,59,.3)]' : theme === 'jungle' ? 'border-emerald-950/30 bg-lime-300/30 shadow-[0_10px_0_rgba(20,83,45,.3)]' : theme === 'ocean' ? 'border-sky-950/30 bg-cyan-200/30 shadow-[0_10px_0_rgba(7,89,133,.3)]' : theme === 'disney' ? 'border-amber-200/50 bg-pink-300/20 shadow-[0_10px_0_rgba(88,28,135,.3)]' : 'border-sky-900/20 bg-sky-200/40 shadow-[0_10px_0_rgba(30,64,175,.2)]'}`}>
                <span className="relative z-10 drop-shadow-[0_8px_5px_rgba(15,23,42,.2)]">{theme === 'space' ? '🚀' : theme === 'jungle' ? '🦁' : theme === 'ocean' ? '🐬' : theme === 'disney' ? '🏰' : '📚'}</span>
                <span className="absolute -right-3 -top-3 text-3xl">⭐</span>
                <span className="absolute -bottom-3 -left-3 text-3xl">{theme === 'space' ? '🪐' : theme === 'jungle' ? '🌿' : theme === 'ocean' ? '🐠' : theme === 'disney' ? '✨' : '✏️'}</span>
              </div>
            </div>
          </section>
        )}

        {theme === 'gaming' && (
          <section className="overflow-hidden rounded-2xl border border-cyan-300/25 bg-gradient-to-br from-[#101b3d]/95 via-[#17143c]/95 to-[#25123e]/95 p-2.5 shadow-[0_18px_40px_rgba(0,0,0,.22)] sm:rounded-3xl sm:p-5">
            <button type="button" onClick={() => setShowHallOfFame((value) => !value)} aria-expanded={showHallOfFame} className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left sm:hidden">
              <span className="text-xs font-black text-cyan-100">🏆 HALL OF FAME · Arena Peringkat</span>
              <span className="text-sm text-cyan-200">{showHallOfFame ? '⌃' : '⌄'}</span>
            </button>
            <div className={showHallOfFame ? 'block sm:block' : 'hidden sm:block'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black tracking-[.22em] text-cyan-300">HALL OF FAME</span>
                <h2 className="mt-1 text-lg font-black text-white sm:text-xl">🏆 Arena Peringkat</h2>
                <p className="mt-1 text-xs text-blue-100/70">Peringkat dihitung dari total XP siswa.</p>
              </div>
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button type="button" onClick={() => setLeaderboardMode('GLOBAL')} className={`rounded-lg px-3 py-2 text-[10px] font-black transition ${leaderboardMode === 'GLOBAL' ? 'bg-cyan-300 text-slate-950' : 'text-cyan-100 hover:bg-white/10'}`}>
                  🌐 GLOBAL
                </button>
                <button type="button" onClick={() => setLeaderboardMode('CLASS')} disabled={!userProfile?.class_code} className={`rounded-lg px-3 py-2 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${leaderboardMode === 'CLASS' ? 'bg-cyan-300 text-slate-950' : 'text-cyan-100 hover:bg-white/10'}`}>
                  🏫 KELAS
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {activeLeaderboard.length > 0 ? activeLeaderboard.map((student, index) => (
                <div key={student.id} className={`flex items-center gap-3 rounded-2xl border p-3 ${student.id === userProfile?.id ? 'border-yellow-300/60 bg-yellow-300/10' : 'border-white/10 bg-white/[0.04]'}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-lg font-black">{index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black text-white">{student.full_name || student.username || 'Siswa'}</p>
                    <p className="truncate text-[10px] text-cyan-100/65">{student.class_code ? 'Kelas ' + student.class_code : 'Siswa Getasan'}</p>
                  </div>
                  <span className="shrink-0 text-xs font-black text-amber-200">{student.xp || 0} XP</span>
                </div>
              )) : (
                <p className="rounded-xl border border-white/10 bg-white/[0.04] p-4 text-xs text-blue-100/70 sm:col-span-3">
                  {leaderboardMode === 'CLASS' && !userProfile?.class_code
                    ? 'Masuk dan lengkapi kelas pada profil untuk melihat peringkat kelas.'
                    : 'Belum ada data peringkat yang dapat ditampilkan.'}
                </p>
              )}
            </div>
            <p className="mt-3 rounded-xl border border-fuchsia-300/20 bg-fuchsia-300/[0.07] px-3 py-2 text-xs font-semibold text-fuchsia-100">
              {userProfile
                ? activeLeaderboard.findIndex((student) => student.id === userProfile.id) === 0
                  ? '👑 Luar biasa, ' + (userProfile.full_name || 'Petualang') + '! Kamu berada di peringkat pertama. Terus jadi teladan!'
                  : activeLeaderboard.findIndex((student) => student.id === userProfile.id) === 1
                    ? '🥈 Hebat! Kamu berada di peringkat kedua. Sedikit lagi menuju puncak!'
                    : activeLeaderboard.findIndex((student) => student.id === userProfile.id) === 2
                      ? '🥉 Keren! Kamu masuk tiga besar. Terus berlatih untuk meraih posisi lebih tinggi!'
                      : arcadeTier.message
                : 'Masuk ke akunmu untuk menyimpan XP, mengoleksi badge, dan ikut bersaing secara sehat.'}
            </p>
            <div className="mt-3 text-right">
              <Link href="/practice" className="text-[10px] font-black text-cyan-200 underline decoration-cyan-300/50 underline-offset-4 hover:text-white">
                Lihat papan peringkat lengkap →
              </Link>
            </div>
            </div>
          </section>
        )}

        {theme === 'gaming' && (
          <section id="arcade-missions" className="space-y-2 sm:space-y-4">
            <button type="button" onClick={() => setShowPlayerDashboard((value) => !value)} aria-expanded={showPlayerDashboard} className="flex w-full items-center justify-between gap-2 rounded-xl border border-cyan-300/20 bg-slate-950/25 px-3 py-2 text-left sm:hidden">
              <span className="text-xs font-black text-cyan-100">🎮 PLAYER DASHBOARD · Pilih Misi</span>
              <span className="text-sm text-cyan-200">{showPlayerDashboard ? '⌃' : '⌄'}</span>
            </button>
            <div className="hidden items-end justify-between gap-3 sm:flex">
              <div>
                <span className="text-[10px] font-black tracking-[.22em] text-cyan-300">PLAYER DASHBOARD</span>
                <h2 className="mt-1 text-xl font-black text-white sm:text-2xl">Pilih Misi Hari Ini</h2>
                <p className="mt-1 text-xs text-blue-100/70">Pilih kartu untuk melihat tantangan dan mulai bermain.</p>
              </div>
              <div className="rounded-xl border border-fuchsia-300/30 bg-fuchsia-400/10 px-3 py-2 text-xs font-black text-fuchsia-100">🏅 LEVEL {userProfile?.level || 1}</div>
            </div>
            <div className={showPlayerDashboard ? 'block sm:block' : 'hidden sm:block'}>
            <div className="mb-2 flex justify-end sm:hidden"><span className="rounded-lg border border-fuchsia-300/30 bg-fuchsia-400/10 px-2 py-1 text-[9px] font-black text-fuchsia-100">🏅 LEVEL {userProfile?.level || 1}</span></div>
            <div className="grid gap-2 sm:gap-4 md:grid-cols-3">
              {[
                { icon: '🧠', title: 'Latihan Otak', tag: 'PUZZLE RUN', desc: 'Asah kemampuan lewat latihan mandiri dan kumpulkan XP dari jawabanmu.', href: '/practice', color: 'from-cyan-400 to-blue-600', shadow: '#075985' },
                { icon: '📚', title: 'Jelajah Buku', tag: 'KNOWLEDGE QUEST', desc: 'Temukan sumber belajar baru dan siapkan strategi sebelum ujian.', href: '/materi', color: 'from-lime-300 to-emerald-600', shadow: '#166534' },
                { icon: '🏆', title: 'Tantangan TKA', tag: 'CHAMPION STAGE', desc: 'Pilih ujian yang tersedia dan buktikan kemampuan terbaikmu.', href: '#ujian', color: 'from-amber-300 to-orange-600', shadow: '#9a3412' },
              ].map((mission, index) => (
                <button key={mission.tag} type="button" onClick={() => setSelectedArcadeMission(index)} className={`arcade-mission-card group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-300 ${selectedArcadeMission === index ? 'border-yellow-200 bg-white/15 ring-2 ring-yellow-200/40' : 'border-white/15 bg-white/[0.06] hover:border-cyan-200/60 hover:bg-white/10'}`}>
                  <div className={`absolute -right-7 -top-8 h-28 w-28 rounded-full bg-gradient-to-br ${mission.color} opacity-20 blur-xl transition group-hover:opacity-40`} />
                  <div className="relative flex items-start justify-between gap-3">
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-white/30 bg-gradient-to-br text-3xl shadow-[0_6px_0_rgba(0,0,0,.25)] ${mission.color}`}>{mission.icon}</span>
                    <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-[9px] font-black tracking-wider text-cyan-100">{mission.tag}</span>
                  </div>
                  <h3 className="relative mt-4 text-base font-black text-white">{mission.title}</h3>
                  <p className="relative mt-1 text-xs leading-relaxed text-blue-100/70">{mission.desc}</p>
                  <div className="relative mt-4 flex items-center justify-between text-[10px] font-black text-yellow-200"><span>{selectedArcadeMission === index ? '✓ DIPILIH' : 'PILIH MISI'}</span><span>➜</span></div>
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 rounded-2xl border border-cyan-300/30 bg-gradient-to-r from-[#14234a]/95 to-[#251443]/95 p-4 shadow-[0_12px_30px_rgba(0,0,0,.22)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest text-cyan-200">MISI TERPILIH</p>
                <p className="mt-1 text-sm font-black text-white">{['Latihan Otak','Jelajah Buku','Tantangan TKA'][selectedArcadeMission]}</p>
                <p className="mt-1 text-xs text-blue-100/70">{['Masuk ke ruang latihan untuk mencoba tantangan dan memperoleh XP.','Buka koleksi sumber belajar dan pilih bahan yang ingin kamu pelajari.','Lihat daftar ujian, pilih subtes, lalu kerjakan tantangan TKA.'][selectedArcadeMission]}</p>
              </div>
              <Link href={['/practice','/materi','#ujian'][selectedArcadeMission]} className="arcade-3d-button shrink-0 rounded-xl border-2 border-cyan-100 bg-gradient-to-b from-cyan-300 to-blue-500 px-5 py-3 text-center text-xs font-black text-[#07172d] shadow-[0_5px_0_#075985] transition hover:-translate-y-1 hover:shadow-[0_8px_0_#075985] active:translate-y-1">MULAI MISI TERPILIH →</Link>
            </div>
            </div>
          </section>
        )}
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
        <section className={`grid grid-cols-1 gap-4 ${theme === 'gaming' ? 'md:grid-cols-1' : 'md:grid-cols-3'}`}>
          {/* Banner latihan mandiri */}
          <div
            className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-xl ${theme === 'gaming' ? 'md:col-span-1' : 'md:col-span-2'} ${themeDetails.boxBg}`}
          >
            <div className="relative z-10 max-w-md space-y-2">
              <span
                className={`inline-flex rounded-full border px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-wide sm:px-3 sm:py-1 sm:text-[10px] sm:tracking-wider ${themeDetails.badgeColor}`}
              >
                🎮 PETUALANGAN BELAJAR
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

          {/* Kartu status tetap untuk tema selain Gaming; pada Gaming sudah menyatu dengan hero. */}
          {theme !== 'gaming' && (
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
          )}
        </section>

        {resumeSessions.length > 0 && (
          <section className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-slate-800 shadow-sm">
            <div className="mb-1 flex items-center gap-2 text-xs font-extrabold"><span>⏳</span><span>Ada ujian yang belum selesai</span><span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-[10px]">{resumeSessions.length}</span></div>
            <div className="space-y-1">{resumeSessions.map((session: any) => (
              <div key={session.id} className="flex items-center justify-between gap-2 border-t border-amber-200 py-1.5">
                <div className="min-w-0"><p className="truncate text-xs font-bold">{session.exam?.title || 'Ujian sebelumnya'}</p><p className="text-[10px] text-slate-500">{session.exam?.subtest || 'Ujian'} · {session.status === 'paused' ? 'Dijeda' : 'Belum selesai'}</p></div>
                <Link href={`/exam/${session.exam_id}`} className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-[10px] font-black text-white hover:bg-amber-600">Lanjutkan</Link>
              </div>
            ))}</div>
          </section>
        )}

        {/* Pengumuman sekolah */}
        {announcements.length > 0 && (
          <section className="space-y-3">
            <h2 className={`flex items-center gap-2 text-base sm:text-lg ${themeDetails.sectionTitle}`}>
              <span>📢</span>
              <span>Pengumuman & Informasi Sekolah</span>
            </h2>

            <div
              className={`grid gap-3 ${
                visibleAnnouncements.length === 1
                  ? 'grid-cols-1'
                  : 'grid-cols-2'
              }`}
            >
              {visibleAnnouncements.map((ann) => (
                <article
                  key={ann.id}
                  className={`min-w-0 space-y-2 rounded-2xl border p-3 sm:p-4 backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${themeDetails.boxBg}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className={`rounded px-2 py-0.5 text-[9px] sm:text-[10px] font-bold uppercase ${themeDetails.badgeColor}`}>
                      📌 {ann.category || 'Penting'}
                    </span>

                    <span className="text-[9px] sm:text-[10px] font-mono opacity-75">
                      {new Date(ann.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <h3 className="break-words text-xs sm:text-sm font-extrabold">
                    {ann.title}
                  </h3>

                  <div
                    className={`break-words text-[10px] sm:text-xs leading-relaxed ${themeDetails.textMuted} overflow-hidden`}
                    style={ann.summary_mode === 'auto' ? { maxHeight: Math.min(900, Math.max(120, Number(ann.summary_height_px) || 280)) + 'px' } : undefined}
                  >
                    <MathRenderer content={ann.content_html ? getSummaryHtml(ann.content_html, ann.summary_mode || 'auto') : ann.content || ''} />
                  </div>
                  {(ann.content_html || ann.content) && (
                    <Link href={'/pengumuman/' + ann.id} className="inline-flex rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-indigo-700">
                      Baca selengkapnya →
                    </Link>
                  )}
                </article>
              ))}
            </div>

            {orderedAnnouncements.length > ANNOUNCEMENTS_PER_PAGE && (
              <div className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${themeDetails.boxBg}`}>
                <button
                  type="button"
                  onClick={() => setAnnouncementPage((page) => Math.max(0, page - 1))}
                  disabled={announcementPage === 0}
                  className="rounded-lg border border-current/20 px-3 py-1.5 text-[10px] font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  ← Sebelumnya
                </button>
                <span className="text-[10px] font-bold tabular-nums">
                  {announcementPage + 1} / {totalAnnouncementPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAnnouncementPage((page) => Math.min(totalAnnouncementPages - 1, page + 1))}
                  disabled={announcementPage >= totalAnnouncementPages - 1}
                  className="rounded-lg border border-current/20 px-3 py-1.5 text-[10px] font-bold transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Berikutnya →
                </button>
              </div>
            )}
          </section>
        )}

        {/* Pusat Sumber Belajar — pratinjau ringkas */}
        {materials.length > 0 && (
          <section className="space-y-2 sm:space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2 sm:gap-3">
              <div>
                <h2 className={`flex items-center gap-2 text-lg sm:text-xl ${themeDetails.sectionTitle}`}>
                  <span>📚</span>
                  <span>Pusat Sumber Belajar</span>
                </h2>
                <p className={`mt-1 text-xs ${themeDetails.textMuted}`}>
                  Materi dan bahan belajar pilihan untuk menemani kegiatanmu.
                </p>
              </div>

            </div>

            <div className={`space-y-2 rounded-xl border p-2 sm:space-y-3 sm:rounded-2xl sm:p-4 ${themeDetails.boxBg}`}>
              <div className="flex items-center gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:flex-[2]">
                  <button
                    type="button"
                    onClick={() => setShowMaterialSearch(true)}
                    aria-label="Buka pencarian materi"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 bg-white text-base text-slate-700 sm:hidden ${showMaterialSearch || materialSearch ? 'hidden' : 'flex'}`}
                  >
                    🔎
                  </button>
                  <input
                    type="search"
                    value={materialSearch}
                    onChange={(e) => {
                      setMaterialSearch(e.target.value)
                      setMaterialPage(0)
                      setShowMaterialSearch(true)
                    }}
                    onFocus={() => setShowMaterialSearch(true)}
                    placeholder="Cari..."
                    aria-label="Cari judul atau mata pelajaran"
                    className={`min-w-0 flex-1 rounded-lg border-2 border-slate-200 bg-white px-2.5 py-2 text-[11px] font-medium text-slate-800 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs ${showMaterialSearch || materialSearch ? 'block' : 'hidden sm:block'}`}
                  />
                  <button
                    type="button"
                    onClick={() => { setMaterialSearch(''); setMaterialPage(0); setShowMaterialSearch(false) }}
                    aria-label="Tutup pencarian"
                    className={`h-9 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 sm:hidden ${showMaterialSearch || materialSearch ? 'flex' : 'hidden'}`}
                  >
                    ✕
                  </button>
                </div>
                <select
                  value={selectedSubject}
                  onChange={(e) => {
                    setSelectedSubject(e.target.value)
                    setMaterialPage(0)
                  }}
                  aria-label="Filter mata pelajaran"
                  className="min-w-0 flex-1 rounded-lg border-2 border-slate-200 bg-white px-2 py-2 text-[10px] font-bold text-slate-800 outline-none focus:border-amber-400 sm:flex-1 sm:rounded-xl sm:px-3 sm:py-2.5 sm:text-xs"
                >
                  <option value="Semua">Semua mapel</option>
                  {materialSubjects.map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-current/10 pt-1.5 sm:pt-2">
                <span className="text-[9px] font-medium opacity-75 sm:text-[11px]">
                  {filteredMaterials.length === 0 ? 0 : materialPage * MATERIALS_PER_PAGE + 1}–{Math.min((materialPage + 1) * MATERIALS_PER_PAGE, filteredMaterials.length)} dari {filteredMaterials.length}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-[11px] font-semibold sm:inline">Urutkan</span>
                  <select
                    value={materialSort}
                    onChange={(e) => {
                      setMaterialSort(e.target.value)
                      setMaterialPage(0)
                    }}
                    aria-label="Urutkan sumber belajar"
                    className="max-w-[142px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-bold text-slate-800 sm:max-w-none sm:text-[11px]"
                  >
                    <option value="Prioritas">⭐ Prioritas</option>
                    <option value="Terbaru">Terbaru</option>
                    <option value="Terlama">Terlama</option>
                    <option value="Nama A-Z">Nama A–Z</option>
                    <option value="Penulis A-Z">Penulis A–Z</option>
                  </select>
                </div>
              </div>

              {filteredMaterials.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visibleMaterials.map((mat, index) => (
                    <article key={mat.id} className={`flex min-w-0 items-center gap-2 rounded-xl border border-current/10 p-2.5 transition hover:-translate-y-0.5 hover:shadow-md ${themeDetails.cardBg}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-100 text-lg">
                        {['📕', '📘', '📗', '📙', '📚'][(materialPage * MATERIALS_PER_PAGE + index) % 5]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className={`break-words text-[11px] font-black leading-snug sm:text-xs ${themeDetails.cardTitle}`}>{mat.title || 'Tanpa judul'}</h3>
                        <p className={`mt-1 line-clamp-1 text-[9px] leading-snug sm:text-[10px] ${themeDetails.textMuted}`}>
                          {mat.subject || 'Umum'} · {mat.author_display_name || mat.author?.full_name || 'Tim Penyusun'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {mat.content_html && (
                          <Link href={'/materi/' + mat.id} className={`rounded-lg px-2 py-1.5 text-[9px] font-black ${themeDetails.btnBg}`}>Baca ↗</Link>
                        )}
                        {mat.file_url && (
                          <a href={mat.file_url} target="_blank" rel="noopener noreferrer" className={`rounded-lg border border-current/15 px-2 py-1.5 text-[9px] font-black ${themeDetails.btnBg}`}>Buka ↗</a>
                        )}
                        {!mat.content_html && !mat.file_url && <span className="text-[9px] text-slate-400">Belum tersedia</span>}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="py-5 text-center text-xs font-semibold opacity-70">Sumber belajar tidak ditemukan. Coba kata kunci lain.</p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-current/10 pt-3">
                <div className="flex items-center gap-2" aria-label="Navigasi halaman sumber belajar">
                  <button
                    type="button"
                    onClick={() => setMaterialPage((page) => Math.max(0, page - 1))}
                    disabled={materialPage === 0}
                    aria-label="Sumber belajar sebelumnya"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-current/20 text-lg font-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &lt;
                  </button>
                  <span className="min-w-[76px] text-center text-[11px] font-bold tabular-nums">
                    {materialPage + 1} / {totalMaterialPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMaterialPage((page) => Math.min(totalMaterialPages - 1, page + 1))}
                    disabled={materialPage >= totalMaterialPages - 1}
                    aria-label="Sumber belajar berikutnya"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-current/20 text-lg font-black transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    &gt;
                  </button>
                </div>
                <Link href="/materi" className={`rounded-xl px-4 py-2.5 text-xs font-black transition hover:-translate-y-0.5 ${themeDetails.btnBg}`}>
                  Lihat semua sumber belajar ({materials.length}) →
                </Link>
              </div>
            </div>
          </section>
        )}

                {/* Pusat Ujian & Asesmen */}
        <section id="ujian" className="space-y-5">
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
                      <option value="Prioritas">⭐ Prioritas</option>
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
                      setExamSort('Prioritas')
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
              {displayExamGroups.map(({ subtest, group }) => (
                <section
                  key={subtest}
                  className={`overflow-hidden rounded-2xl border-2 ${themeDetails.boxBg}`}
                >
                  <div className="flex items-center justify-between gap-3 border-b border-current/10 px-4 py-3">
                    <div className="min-w-0">
                      <h3 className={`truncate text-sm font-black ${themeDetails.sectionTitle}`}>
                        {subtest === '__PRIORITY__' ? '⭐ Ujian Prioritas' : (examSort === 'Prioritas' && homePinOrder.cbtCategories[String(subtest).toLocaleLowerCase('id')] !== undefined ? '📌 Subtes Prioritas • ' : '📘 ') + subtest}
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
