'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useTheme, ThemeMode } from '@/context/ThemeContext'

export default function PracticeHubPage() {
  const { theme } = useTheme()

  const themeVisuals: Record<ThemeMode, { page: string; hero: string; heroPanel: string; accent: string; badge: string; surface: string; surfaceBorder: string; heading: string; muted: string; filter: string; miniSurface: string }> = {
    school: {
      page: 'text-slate-900',
      hero: 'from-indigo-700 via-violet-600 to-fuchsia-600',
      heroPanel: 'bg-[#091b59]/70 border-cyan-200/40',
      accent: 'text-indigo-600',
      badge: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      surface: 'bg-white/95 text-slate-900',
      surfaceBorder: 'border-indigo-100',
      heading: 'text-slate-900',
      muted: 'text-slate-500',
      filter: 'border-slate-200 bg-slate-50 text-slate-700 focus:border-indigo-400 focus:ring-indigo-100',
      miniSurface: 'border-indigo-100 bg-white/95',
    },
    space: {
      page: 'text-white',
      hero: 'from-slate-950 via-indigo-800 to-purple-700',
      heroPanel: 'bg-slate-950/75 border-cyan-300/40',
      accent: 'text-cyan-200',
      badge: 'bg-indigo-950/80 text-cyan-100 border-cyan-300/30',
      surface: 'bg-slate-950/80 text-white backdrop-blur-xl',
      surfaceBorder: 'border-cyan-300/25',
      heading: 'text-white',
      muted: 'text-blue-100/75',
      filter: 'border-cyan-300/30 bg-slate-950/80 text-white focus:border-cyan-300 focus:ring-cyan-300/20',
      miniSurface: 'border-cyan-300/20 bg-slate-950/70',
    },
    jungle: {
      page: 'text-white',
      hero: 'from-emerald-950 via-green-700 to-lime-600',
      heroPanel: 'bg-emerald-950/75 border-lime-300/40',
      accent: 'text-lime-200',
      badge: 'bg-emerald-950/80 text-lime-100 border-lime-300/30',
      surface: 'bg-emerald-950/80 text-white backdrop-blur-xl',
      surfaceBorder: 'border-lime-300/25',
      heading: 'text-white',
      muted: 'text-emerald-100/80',
      filter: 'border-lime-300/30 bg-emerald-950/80 text-white focus:border-lime-300 focus:ring-lime-300/20',
      miniSurface: 'border-lime-300/20 bg-emerald-950/70',
    },
    ocean: {
      page: 'text-white',
      hero: 'from-sky-950 via-blue-700 to-cyan-600',
      heroPanel: 'bg-blue-950/75 border-sky-300/40',
      accent: 'text-cyan-200',
      badge: 'bg-blue-950/80 text-cyan-100 border-cyan-300/30',
      surface: 'bg-blue-950/80 text-white backdrop-blur-xl',
      surfaceBorder: 'border-sky-300/25',
      heading: 'text-white',
      muted: 'text-sky-100/80',
      filter: 'border-sky-300/30 bg-blue-950/80 text-white focus:border-sky-300 focus:ring-sky-300/20',
      miniSurface: 'border-sky-300/20 bg-blue-950/70',
    },
    disney: {
      page: 'text-white',
      hero: 'from-purple-950 via-fuchsia-700 to-pink-600',
      heroPanel: 'bg-purple-950/75 border-pink-300/40',
      accent: 'text-pink-200',
      badge: 'bg-purple-950/80 text-pink-100 border-pink-300/30',
      surface: 'bg-purple-950/80 text-white backdrop-blur-xl',
      surfaceBorder: 'border-pink-300/25',
      heading: 'text-white',
      muted: 'text-pink-100/80',
      filter: 'border-pink-300/30 bg-purple-950/80 text-white focus:border-pink-300 focus:ring-pink-300/20',
      miniSurface: 'border-pink-300/20 bg-purple-950/70',
    },
    cartoon3d: {
      page: 'text-slate-900',
      hero: 'from-amber-400 via-orange-500 to-pink-500',
      heroPanel: 'bg-orange-950/80 border-orange-200 text-white',
      accent: 'text-orange-700',
      badge: 'bg-white/80 text-orange-800 border-orange-200',
      surface: 'bg-white/90 text-slate-900 backdrop-blur-xl',
      surfaceBorder: 'border-orange-200',
      heading: 'text-slate-900',
      muted: 'text-slate-600',
      filter: 'border-orange-200 bg-white/90 text-slate-800 focus:border-orange-400 focus:ring-orange-100',
      miniSurface: 'border-orange-200 bg-white/90',
    },
    gaming: {
      page: 'bg-slate-950 text-slate-100',
      hero: 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900',
      heroPanel: 'border border-cyan-400/30 bg-slate-900/80',
      accent: 'text-cyan-300',
      badge: 'border border-fuchsia-400/30 bg-fuchsia-950/60 text-fuchsia-200',
      surface: 'bg-slate-900/90',
      surfaceBorder: 'border-cyan-400/20',
      heading: 'text-white',
      muted: 'text-slate-300',
      filter: 'border border-cyan-400/20 bg-slate-900 text-slate-100',
      miniSurface: 'border border-indigo-400/20 bg-indigo-950/50',
    },
  }
  // Practice memakai identitas Arcade Game Hub yang konsisten dengan homepage.
  const visual = themeVisuals.gaming
  const darkTheme = true
  const [exams, setExams] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [leaderboardError, setLeaderboardError] = useState('')
  const [leaderboardFilter, setLeaderboardFilter] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [activityFilter, setActivityFilter] = useState<string>('ALL')
  const [subtestFilter, setSubtestFilter] = useState<string>('ALL')
  const [sortOrder, setSortOrder] = useState<string>('NEWEST')

  const fetchLeaderboard = async (filterVal: string, currentProfile?: any) => {
    try {
      const supabase = createClient()
      const activeProfile = currentProfile || userProfile

      let query = supabase
        .from('profiles')
        .select('id, full_name, username, class_code, xp, level, role, avatar_url')
        .not('class_code', 'ilike', 'guru')
        .order('xp', { ascending: false })
        .limit(15)

      if ((filterVal === 'MY_CLASS' || filterVal === 'CLASS') && activeProfile?.class_code) {
        query = query.eq('class_code', activeProfile.class_code)
      } else if (filterVal !== 'ALL' && filterVal !== 'MY_CLASS' && filterVal !== 'CLASS') {
        query = query.eq('class_code', filterVal)
      }

      const { data: topUsers, error } = await query
      if (error) throw error

      const cleanUsers = (topUsers || []).filter(
        (u: any) => String(u.class_code || '').trim().toLowerCase() !== 'guru'
      )
      setLeaderboard(cleanUsers)
      setLeaderboardError('')
    } catch (error) {
      console.error('Gagal memuat papan peringkat:', error)
      setLeaderboard([])
      setLeaderboardError('Papan peringkat belum dapat dimuat. Daftar latihan tetap bisa digunakan.')
    }
  }

  useEffect(() => {
    async function loadPracticeData() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        let profile = null
        if (user) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()

          if (profData) {
            profile = profData
            setUserProfile(profData)
          }
        }

        const { data: classData } = await supabase
          .from('profiles')
          .select('class_code')
          .not('class_code', 'is', null)

        if (classData) {
          const uniqueClasses = Array.from(
            new Set(
              classData
                .map((p: any) => String(p.class_code || '').trim())
                .filter((c: string) => c !== '' && c.toLowerCase() !== 'guru')
            )
          ).sort()
          setAvailableClasses(uniqueClasses as string[])
        }

        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })

        if (examError) {
          console.error('Gagal memuat daftar latihan:', examError)
          setLoadError('Daftar latihan belum dapat dimuat. Periksa koneksi internet, lalu coba lagi.')
          return
        }

        const filteredExams = (examData || []).filter(
          (exam: any) =>
            !exam.target_mode ||
            exam.target_mode === 'PRACTICE_ONLY' ||
            exam.target_mode === 'BOTH'
        )
        setExams(filteredExams)

        await fetchLeaderboard(leaderboardFilter, profile)
      } catch (error) {
        console.error('Terjadi kesalahan saat memuat halaman Practice:', error)
        setLoadError('Terjadi kendala saat memuat halaman latihan. Periksa koneksi internet, lalu coba lagi.')
      } finally {
        setLoading(false)
      }
    }

    loadPracticeData()
    // Initial data load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!loading) fetchLeaderboard(leaderboardFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaderboardFilter])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071638] font-sans text-white">
        <div className="rounded-3xl border border-cyan-300/30 bg-white/10 px-8 py-7 text-center shadow-2xl backdrop-blur">
          <div className="mx-auto mb-3 flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-3xl shadow-lg">
            🎮
          </div>
          <p className="text-lg font-black">Menyiapkan Arena Belajar...</p>
          <p className="mt-1 text-sm text-blue-100">Petualangan sebentar lagi dimulai!</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#071638] px-4 font-sans text-white">
        <div className="w-full max-w-md rounded-3xl border border-rose-300/30 bg-slate-950/80 p-7 text-center shadow-2xl">
          <div className="mb-3 text-5xl">📡</div>
          <h1 className="text-xl font-black">Arena belum bisa dibuka</h1>
          <p className="mt-2 text-sm leading-6 text-blue-100/80">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-400"
          >
            Coba Muat Ulang
          </button>
        </div>
      </div>
    )
  }

  const level = userProfile?.level || 1
  const xp = userProfile?.xp || 0
  const xpProgress = Math.min(100, Math.max(8, (xp % 200) / 2))
  const playerBadges = Array.isArray(userProfile?.badges)
    ? userProfile.badges
    : userProfile?.badges && typeof userProfile.badges === 'object'
      ? Object.values(userProfile.badges)
      : []
  const playerAvatar = String(userProfile?.avatar_url || '👾')
  const playerAvatarIsImage = playerAvatar.startsWith('http://') || playerAvatar.startsWith('https://')

  const missionStyles = {
    QUIZ: [
      { card: 'from-sky-500 via-blue-600 to-indigo-700', art: '✨' },
      { card: 'from-blue-600 via-indigo-600 to-violet-700', art: '💫' },
      { card: 'from-cyan-600 via-blue-700 to-indigo-800', art: '⚡' },
      { card: 'from-indigo-600 via-blue-600 to-sky-700', art: '🌠' },
    ],
    MAZE_GAME: [
      { card: 'from-emerald-500 via-green-600 to-teal-700', art: '🌿' },
      { card: 'from-green-600 via-emerald-600 to-cyan-700', art: '🍃' },
      { card: 'from-teal-500 via-green-700 to-emerald-800', art: '🌴' },
      { card: 'from-lime-600 via-emerald-600 to-green-800', art: '🧭' },
    ],
    FLASHCARD: [
      { card: 'from-rose-500 via-pink-600 to-fuchsia-700', art: '🌟' },
      { card: 'from-pink-500 via-fuchsia-600 to-purple-700', art: '💖' },
      { card: 'from-fuchsia-600 via-pink-600 to-rose-700', art: '🎀' },
      { card: 'from-rose-600 via-pink-700 to-purple-800', art: '✨' },
    ],
  }

  const availableSubtests = Array.from(
    new Set(
      exams
        .map((exam) => String(exam.subtest || '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, 'id'))

  const filteredExams = exams
    .filter((exam) => {
      const activityType = String(exam.activity_type || 'QUIZ').toUpperCase()
      const matchesActivity =
        activityFilter === 'ALL' || activityType === activityFilter
      const matchesSubtest =
        subtestFilter === 'ALL' || String(exam.subtest || '').trim() === subtestFilter
      const searchValue = [
        exam.title,
        exam.description,
        exam.subtest,
        activityType,
      ].join(' ').toLowerCase()
      return matchesActivity && matchesSubtest && searchValue.includes(searchTerm.trim().toLowerCase())
    })
    .sort((a, b) => {
      if (sortOrder === 'TITLE') return String(a.title || '').localeCompare(String(b.title || ''), 'id')
      if (sortOrder === 'OLDEST') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  const getMissionStyle = (activityType: string, variation = 0) => {
    const type = String(activityType || 'QUIZ').toUpperCase()
    const palette = type === 'FLASHCARD'
      ? missionStyles.FLASHCARD
      : type === 'MAZE_GAME'
        ? missionStyles.MAZE_GAME
        : missionStyles.QUIZ
    const variant = palette[variation % palette.length]
    if (type === 'FLASHCARD') return { ...variant, pill: 'border-pink-200/60 bg-white/20 text-white', icon: '🃏', label: 'FLASHCARD', action: 'BUKA KARTU', button: 'from-amber-300 to-yellow-400 text-amber-950 hover:from-amber-200 hover:to-yellow-300' }
    if (type === 'MAZE_GAME') return { ...variant, pill: 'border-lime-200/60 bg-lime-100/20 text-white', icon: '🤖', label: 'GAME LABIRIN', action: 'MAIN SEKARANG', button: 'from-violet-500 to-indigo-500 text-white hover:from-violet-400 hover:to-indigo-400' }
    return { ...variant, pill: 'border-cyan-200/60 bg-cyan-100/20 text-white', icon: '🧠', label: 'KUIS LATIHAN', action: 'MULAI LATIHAN', button: 'from-lime-300 to-emerald-400 text-emerald-950 hover:from-lime-200 hover:to-emerald-300' }
  }

  return (
    <div className="theme-gaming min-h-screen overflow-hidden bg-[#17102b] font-sans text-white">
      <Navbar />

      <main className="mx-auto max-w-[1500px] space-y-7 px-4 py-5 sm:px-6 lg:px-8">
        {/* HERO: GAME ADVENTURE */}
        <section className={`relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-r ${visual.hero} p-6 text-white shadow-[0_20px_50px_-20px_rgba(79,70,229,0.65)] sm:p-8 lg:p-9`}>
          <div className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-cyan-300/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/3 -z-10 h-64 w-64 rounded-full bg-pink-300/20 blur-3xl" />
          <div className="absolute right-[28%] top-8 hidden rotate-12 text-5xl opacity-30 sm:block">✦</div>
          <div className="absolute right-[38%] bottom-8 hidden text-3xl opacity-40 sm:block">⭐</div>

          <div className="grid items-center gap-7 lg:grid-cols-[1fr_330px]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] shadow-inner backdrop-blur">
                🎮 CBT Adventure • Modul Latihan Bebas
              </span>
              <h1 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Siap Jadi Juara,
                <span className="block text-amber-300 drop-shadow-sm">Petualang? 🚀</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-50 sm:text-base">
                Halo, {userProfile?.full_name || 'Petualang SD Getasan'}! Pilih misi, asah kemampuan,
                kumpulkan XP, dan naikkan levelmu. Setiap soal adalah langkah menuju prestasi!
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🧠 Asah Otak</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🏅 Kumpulkan XP</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">📚 Pahami Materi</span>
              </div>
            </div>

            <div className="arcade-player-card relative overflow-hidden rounded-[1.7rem] border-2 border-cyan-300/50 bg-slate-950/75 p-5 shadow-[0_12px_0_-5px_rgba(8,15,38,.9),0_20px_45px_rgba(0,0,0,.3)] backdrop-blur-md">
              <div className="arcade-scanlines pointer-events-none absolute inset-0 opacity-20" />
              <div className="absolute -right-5 -top-7 text-7xl opacity-10">✦</div>
              <div className="relative">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black tracking-[.2em] text-lime-200">PLAYER PROFILE</span>
                  <span className="rounded-lg border border-amber-200/40 bg-amber-300/20 px-2.5 py-1 text-[9px] font-black tracking-wider text-amber-100">ID • {userProfile?.username || 'GUEST'}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="arcade-player-avatar relative flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border-[3px] border-cyan-200/80 bg-gradient-to-br from-cyan-300/30 to-violet-500/40 text-4xl shadow-[0_7px_0_#11152f,0_0_25px_rgba(34,211,238,.2)]">
                    {playerAvatarIsImage ? <img src={playerAvatar} alt="Avatar pemain" className="h-full w-full object-cover" /> : playerAvatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-black text-white">{userProfile?.full_name || 'Pemain Tamu'}</p>
                    <p className="mt-1 truncate text-[10px] font-bold text-cyan-100/80">
                      {userProfile?.username ? '@' + userProfile.username : 'Username belum diatur'}
                      {userProfile?.class_code ? ` · Kelas ${userProfile.class_code}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="rounded-lg border border-amber-200/30 bg-amber-300/15 px-2.5 py-1 text-xs font-black text-amber-200">{xp} XP</span>
                      <span className="rounded-lg border border-violet-200/30 bg-violet-400/15 px-2.5 py-1 text-xs font-black text-violet-100">LEVEL {level}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-100">Koleksi pencapaian</span>
                    <span className="rounded-full border border-yellow-200/30 bg-yellow-200/10 px-2 py-1 text-[9px] font-black text-yellow-100">{playerBadges.length} BADGE</span>
                  </div>
                  {playerBadges.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {playerBadges.slice(0, 4).map((badge: any, index: number) => {
                        const badgeName = typeof badge === 'string' ? badge : badge?.name || badge?.title || badge?.label || badge?.badge_name || badge?.id || `Badge ${index + 1}`
                        const badgeIcon = typeof badge === 'object' ? badge?.icon || badge?.emoji || '🏅' : '🏅'
                        return (
                          <div key={badgeName + '-' + index} title={badgeName} className="arcade-player-badge group flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-yellow-200/25 bg-gradient-to-b from-yellow-200/15 to-amber-500/5 px-2 py-3 text-center">
                            <span className="arcade-badge-medal text-3xl">{badgeIcon}</span>
                            <span className="w-full truncate text-[9px] font-black text-yellow-50">{badgeName}</span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="arcade-badge-empty flex items-center gap-3 rounded-2xl border border-dashed border-cyan-200/25 bg-cyan-300/5 px-3 py-3">
                      <span className="arcade-badge-medal text-3xl">🏅</span>
                      <span className="text-[10px] font-semibold leading-4 text-blue-100/75">Badge pertamamu menunggu! Selesaikan misi untuk mengisi koleksi pencapaianmu.</span>
                    </div>
                  )}
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-[10px] font-black text-cyan-100"><span>PROGRES LEVEL</span><span>{xpProgress}%</span></div>
                  <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-slate-950/80 p-[2px]">
                    <div className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300 shadow-[0_0_12px_rgba(163,230,53,.5)] transition-all" style={{ width: `${xpProgress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(330px,0.9fr)]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.2em] ${visual.accent}`}>Pilih petualanganmu</p>
                <h2 className={`mt-1 flex items-center gap-2 text-xl font-black sm:text-2xl ${visual.page}`}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-2xl shadow-sm">🎯</span>
                  Misi Latihan Mandiri
                </h2>
              </div>
              <span className={`rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm ${visual.badge}`}>
                {exams.length} MISI TERSEDIA
              </span>
            </div>

            <div className={`rounded-3xl border p-4 shadow-sm ${visual.miniSurface}`}>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_190px_170px]">
                <label className="block">
                  <span className={`mb-1.5 block text-[10px] font-black uppercase tracking-wider ${visual.muted}`}>Cari latihan</span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Cari judul, mata pelajaran, atau deskripsi..."
                    className={`w-full rounded-xl border px-3 py-3 text-xs font-semibold outline-none focus:ring-4 ${visual.filter}`}
                  />
                </label>
                <label className="block">
                  <span className={`mb-1.5 block text-[10px] font-black uppercase tracking-wider ${visual.muted}`}>Mata pelajaran / subtes</span>
                  <select
                    value={subtestFilter}
                    onChange={(event) => setSubtestFilter(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-3 text-xs font-semibold outline-none focus:ring-4 ${visual.filter}`}
                  >
                    <option value="ALL">Semua mata pelajaran</option>
                    {availableSubtests.map((subtest) => <option key={subtest} value={subtest}>{subtest}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className={`mb-1.5 block text-[10px] font-black uppercase tracking-wider ${visual.muted}`}>Urutkan</span>
                  <select
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className={`w-full rounded-xl border px-3 py-3 text-xs font-semibold outline-none focus:ring-4 ${visual.filter}`}
                  >
                    <option value="NEWEST">Terbaru</option>
                    <option value="OLDEST">Terlama</option>
                    <option value="TITLE">Nama A–Z</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[
                  { value: 'ALL', label: 'Semua', icon: '🌈' },
                  { value: 'QUIZ', label: 'Kuis', icon: '🧠' },
                  { value: 'FLASHCARD', label: 'Flashcard', icon: '🃏' },
                  { value: 'MAZE_GAME', label: 'Game Labirin', icon: '🤖' },
                ].map((filter) => {
                  const active = activityFilter === filter.value
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActivityFilter(filter.value)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-2 text-[11px] font-extrabold transition ${active ? 'border-indigo-600 bg-indigo-600 text-white shadow-md' : `${visual.surfaceBorder} ${visual.surface} ${visual.heading} hover:border-indigo-400`}`}
                    >
                      {filter.icon} {filter.label}
                    </button>
                  )
                })}
                <span className={`ml-auto text-[10px] font-bold ${visual.muted}`}>
                  Menampilkan {filteredExams.length} dari {exams.length} latihan
                </span>
              </div>
            </div>

            {exams.length === 0 ? (
              <div className={`rounded-3xl border-2 border-dashed ${visual.surfaceBorder} ${visual.surface} px-6 py-12 text-center shadow-xl`}>
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${visual.badge} text-3xl`}>🗺️</div>
                <h3 className={`mt-4 text-lg font-black ${visual.heading}`}>Misi sedang disiapkan!</h3>
                <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${visual.muted}`}>
                  Belum ada modul latihan mandiri yang dipublikasikan. Coba cek kembali nanti, ya!
                </p>
              </div>
            ) : filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {filteredExams.map((exam, missionIndex) => {
                  const cardVariation = Array.from(
                    String(exam.id || exam.title || missionIndex)
                  ).reduce((total, character) => total + character.charCodeAt(0), 0) % 4
                  const style = getMissionStyle(exam.activity_type, cardVariation)
                  return (
                    <article
                      key={exam.id}
                      className={`arcade-mission-card arcade-mission-variant-${cardVariation} group relative flex min-h-[270px] flex-col justify-between overflow-hidden rounded-[1.7rem] border-2 border-white/25 bg-gradient-to-br ${style.card} p-5 text-white shadow-[0_9px_0_rgba(5,8,28,.45),0_18px_30px_rgba(0,0,0,.22)] transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
                    >
                      <div className="absolute -right-5 -top-7 text-8xl opacity-15 transition duration-300 group-hover:rotate-12 group-hover:scale-110">
                        {style.art}
                      </div>
                      <div className="absolute -bottom-10 -right-4 text-8xl opacity-15">{style.icon}</div>
                      <div className="relative">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur ${style.pill}`}>
                            {style.label}
                          </span>
                          <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-bold text-white/95">
                            {exam.subtest || 'Misi Umum'}
                          </span>
                        </div>
                        <h3 className="mt-4 text-xl font-black leading-snug">{exam.title}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/90">
                          {exam.description || 'Latihan interaktif dengan jawaban dan pembahasan instan.'}
                        </p>
                      </div>

                      <div className="relative mt-6">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-white/90">
                          <span className="h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_10px_rgba(190,242,100,0.9)]" />
                          Siap dimainkan
                        </div>
                        <Link
                          href={`/practice/${exam.id}`}
                          className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r px-4 py-3 text-center text-xs font-black shadow-lg transition hover:scale-[1.02] active:scale-[0.98] ${style.button}`}
                        >
                          {style.icon} {style.action} <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className={`rounded-3xl border-2 border-dashed ${visual.surfaceBorder} ${visual.surface} px-6 py-10 text-center shadow-sm`}>
                <div className="text-4xl">🔎</div>
                <h3 className={`mt-3 text-base font-black ${visual.heading}`}>Latihan belum ditemukan</h3>
                <p className={`mx-auto mt-1 max-w-sm text-xs leading-5 ${visual.muted}`}>Coba ubah kata pencarian atau filter yang dipilih.</p>
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setActivityFilter('ALL'); setSubtestFilter('ALL'); setSortOrder('NEWEST') }}
                  className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-indigo-500"
                >
                  Reset Filter
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className={`rounded-2xl border p-4 shadow-lg transition hover:-translate-y-1 ${visual.miniSurface}`}>
                <span className="text-2xl">🧠</span>
                <p className={`mt-2 text-sm font-black ${visual.heading}`}>Asah Strategi</p>
                <p className={`mt-1 text-xs leading-5 ${visual.muted}`}>Pahami soal dan temukan cara terbaik.</p>
              </div>
              <div className={`rounded-2xl border p-4 shadow-lg transition hover:-translate-y-1 ${visual.miniSurface}`}>
                <span className="text-2xl">🏆</span>
                <p className={`mt-2 text-sm font-black ${visual.heading}`}>Kejar Prestasi</p>
                <p className={`mt-1 text-xs leading-5 ${visual.muted}`}>Kumpulkan XP dari latihan yang tersedia.</p>
              </div>
              <div className={`rounded-2xl border p-4 shadow-lg transition hover:-translate-y-1 ${visual.miniSurface}`}>
                <span className="text-2xl">🌈</span>
                <p className={`mt-2 text-sm font-black ${visual.heading}`}>Terus Berkembang</p>
                <p className={`mt-1 text-xs leading-5 ${visual.muted}`}>Belajar rutin dan rayakan setiap kemajuan.</p>
              </div>
            </div>
          </section>

          {/* LEADERBOARD */}
          <aside className={`overflow-hidden rounded-[1.7rem] border ${visual.surfaceBorder} ${visual.surface} shadow-xl shadow-indigo-900/10`}>
            <div className="relative overflow-hidden border-b border-cyan-300/20 bg-gradient-to-r from-[#251044] via-[#171c49] to-[#0b2638] p-5 text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Hall of Fame</p>
                  <h2 className="mt-1 flex items-center gap-2 text-lg font-black">
                    <span className="text-2xl">🏆</span> Papan Juara
                  </h2>
                </div>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10px] font-black">TOP 15</span>
              </div>
              {userProfile?.role === 'admin' && (
                <span className="mt-3 inline-flex rounded-full bg-fuchsia-300/20 px-3 py-1 text-[10px] font-extrabold text-fuchsia-100 ring-1 ring-fuchsia-200/30">
                  ⚙️ Akses Admin
                </span>
              )}
            </div>

            <div className="space-y-4 p-4">
              <label htmlFor="leaderboard-class" className="block text-xs font-extrabold text-cyan-100">
                Lihat peringkat berdasarkan kelas
              </label>
              <select
                id="leaderboard-class"
                value={leaderboardFilter}
                onChange={(e) => setLeaderboardFilter(e.target.value)}
                className={`w-full rounded-xl border px-3 py-3 text-xs font-bold outline-none transition focus:ring-4 ${visual.filter}`}
              >
                <option value="ALL">🌐 Semua Kelas Siswa (Global)</option>
                {userProfile?.class_code && userProfile.class_code.toLowerCase() !== 'guru' && (
                  <option value="MY_CLASS">🏫 Kelas Saya ({userProfile.class_code})</option>
                )}
                {availableClasses.length > 0 && (
                  <optgroup label="📚 Pilih Kelas">
                    {availableClasses
                      .filter((cls) => cls.toLowerCase() !== 'guru')
                      .map((cls) => (
                        <option key={cls} value={cls}>Kelas {cls}</option>
                      ))}
                  </optgroup>
                )}
              </select>

              {leaderboardError && (
                <p role="status" className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] leading-5 text-amber-100">
                  {leaderboardError}
                </p>
              )}

              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((student, rank) => {
                    const rankStyle = rank === 0
                      ? 'arcade-rank-gold border-amber-300 bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-700 shadow-[0_0_24px_rgba(251,191,36,.28)]'
                      : rank === 1
                        ? 'arcade-rank-silver border-slate-300 bg-gradient-to-r from-slate-600 via-slate-500 to-slate-700 shadow-[0_0_20px_rgba(203,213,225,.2)]'
                        : rank === 2
                          ? 'arcade-rank-bronze border-orange-300 bg-gradient-to-r from-orange-800 via-orange-700 to-rose-800 shadow-[0_0_20px_rgba(251,146,60,.22)]'
                          : 'border-white/10 bg-slate-950/55 hover:border-cyan-300/40'
                    const rankBadge = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`
                    const rankText = 'text-white'

                    return (
                      <div
                        key={student.id}
                        className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition ${rankStyle}`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 text-sm font-black text-slate-700 shadow-sm">
                            {rankBadge}
                          </span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2.5">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/25 bg-slate-900/60 text-xl shadow-inner">{(String(student.avatar_url || '').startsWith('http://') || String(student.avatar_url || '').startsWith('https://')) ? <img src={student.avatar_url} alt="" className="h-full w-full object-cover" /> : (student.avatar_url || '👾')}</span>
                            <div className="min-w-0">
                              <p className={`truncate text-xs font-black ${rankText}`}>{student.full_name || student.username}</p>
                              <p className={`mt-1 truncate text-[10px] font-semibold ${rank < 3 ? 'text-white/90' : 'text-cyan-100/75'}`}>{student.username ? `@${student.username}` : (student.class_code ? `Kelas ${student.class_code}` : 'Pemain')}</p>
                            </div>
                          </div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-xs font-black ${rank < 3 ? 'text-white drop-shadow-sm' : 'text-amber-200'}`}>{student.xp || 0} XP</p>
                          <p className={`mt-1 text-[9px] font-bold uppercase ${rank < 3 ? 'text-white/85' : 'text-cyan-100/60'}`}>LEVEL {student.level || 1}</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className={`rounded-2xl px-4 py-8 text-center ${visual.miniSurface}`}>
                    <span className="text-3xl">🪹</span>
                    <p className={`mt-2 text-xs font-bold ${visual.muted}`}>Belum ada data siswa untuk peringkat ini.</p>
                  </div>
                )}
              </div>
              <p className={`rounded-xl px-3 py-2 text-[10px] leading-4 ${visual.badge}`}>
                💡 Belajar dengan tekun, hargai teman, dan jadilah juara dengan caramu sendiri!
              </p>
            </div>
          </aside>
        </div>

        {/* FOOTER MOTIVATION */}
        <section className="arcade-practice-footer relative overflow-hidden rounded-[1.7rem] border border-cyan-300/25 bg-gradient-to-r from-[#101b49] via-indigo-950 to-[#251044] p-5 text-white shadow-[0_12px_0_rgba(4,8,28,.35),0_22px_40px_rgba(0,0,0,.22)] sm:p-6">
          <div className="absolute -right-5 -top-10 text-8xl opacity-10">🏅</div>
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-3xl ring-1 ring-white/15">🚩</div>
              <div>
                <h2 className="text-base font-black sm:text-lg">Setiap Latihan Adalah Kemenangan!</h2>
                <p className="mt-1 max-w-2xl text-xs leading-5 text-blue-100">
                  Tidak harus langsung sempurna. Berani mencoba, mau belajar, dan terus berlatih adalah prestasi.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2 text-[10px] font-extrabold">
              <span className="rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 py-2">💎 SEMANGAT</span>
              <span className="rounded-xl border border-amber-200/20 bg-amber-300/10 px-3 py-2">⭐ SPORTIF</span>
              <span className="rounded-xl border border-emerald-200/20 bg-emerald-300/10 px-3 py-2">🚀 BERPRESTASI</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
