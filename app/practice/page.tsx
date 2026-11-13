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
  const visual = themeVisuals[theme] || themeVisuals.school
  const darkTheme = ['space', 'jungle', 'ocean', 'disney', 'gaming'].includes(theme)
  const [exams, setExams] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [completedAttempts, setCompletedAttempts] = useState(0)
  const [perfectAttempts, setPerfectAttempts] = useState(0)
  const [isIdentityModalOpen, setIsIdentityModalOpen] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [leaderboardFilter, setLeaderboardFilter] = useState<string>('ALL')
  const [globalRank, setGlobalRank] = useState<number | null>(null)
  const [classRank, setClassRank] = useState<number | null>(null)
  const [missionSearch, setMissionSearch] = useState('')
  const [isMissionSearchOpen, setIsMissionSearchOpen] = useState(false)
  const [missionType, setMissionType] = useState('ALL')
  const [missionSubject, setMissionSubject] = useState('ALL')
  const [missionSort, setMissionSort] = useState('NEWEST')

  const fetchLeaderboard = async (filterVal: string, currentProfile?: any) => {
    const supabase = createClient()
    const activeProfile = currentProfile || userProfile

    let query = supabase
      .from('profiles')
      .select('id, full_name, username, class_code, xp, level, role')
      .not('class_code', 'ilike', 'guru')
      .order('xp', { ascending: false })
      .order('id', { ascending: true })
      .limit(15)

    if ((filterVal === 'MY_CLASS' || filterVal === 'CLASS') && activeProfile?.class_code) {
      query = query.eq('class_code', activeProfile.class_code)
    } else if (filterVal !== 'ALL' && filterVal !== 'MY_CLASS' && filterVal !== 'CLASS') {
      query = query.eq('class_code', filterVal)
    }

    const { data: topUsers } = await query
    if (topUsers) {
      const cleanUsers = topUsers.filter(
        (u: any) => String(u.class_code || '').trim().toLowerCase() !== 'guru'
      )
      setLeaderboard(cleanUsers)
    }
  }

  const fetchPlayerRanks = async (profile: any) => {
    if (!profile?.id) {
      setGlobalRank(null)
      setClassRank(null)
      return
    }

    const supabase = createClient()
    const playerXp = Number(profile.xp || 0)

    const getRank = async (classCode?: string) => {
      let higherQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('class_code', 'ilike', 'guru')
        .gt('xp', playerXp)

      let tieQuery = supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .not('class_code', 'ilike', 'guru')
        .eq('xp', playerXp)
        .lt('id', profile.id)

      if (classCode) {
        higherQuery = higherQuery.eq('class_code', classCode)
        tieQuery = tieQuery.eq('class_code', classCode)
      }

      const [higherResult, tieResult] = await Promise.all([higherQuery, tieQuery])
      if (higherResult.error || tieResult.error) return null

      return (higherResult.count || 0) + (tieResult.count || 0) + 1
    }

    const [overall, inClass] = await Promise.all([
      getRank(),
      profile.class_code && String(profile.class_code).trim().toLowerCase() !== 'guru'
        ? getRank(String(profile.class_code))
        : Promise.resolve(null),
    ])

    setGlobalRank(overall)
    setClassRank(inClass)
  }

  useEffect(() => {
    async function loadPracticeData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let profile = null
      if (user) {
        const { data: attemptData } = await supabase
          .from('practice_attempts')
          .select('id, score, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
        if (attemptData) {
          setCompletedAttempts(attemptData.length)
          setPerfectAttempts(attemptData.filter((attempt: any) => Number(attempt.score || 0) >= 100).length)
        }

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

      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (examData) {
        const filteredExams = examData.filter(
          (exam: any) =>
            !exam.target_mode ||
            exam.target_mode === 'PRACTICE_ONLY' ||
            exam.target_mode === 'BOTH'
        )
        setExams(filteredExams)
      }

      await Promise.all([
        fetchLeaderboard(leaderboardFilter, profile),
        fetchPlayerRanks(profile),
      ])
      setLoading(false)
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

  const level = userProfile?.level || 1
  const xp = userProfile?.xp || 0
  const xpProgress = Math.min(100, Math.max(8, (xp % 200) / 2))
  const rankTitles = [
    { min: 1, max: 1, title: 'Legenda Getasan', icon: '👑', color: 'border-amber-300/50 bg-amber-300/15 text-amber-100' },
    { min: 2, max: 2, title: 'Sang Maestro', icon: '💎', color: 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100' },
    { min: 3, max: 3, title: 'Ksatria Emas', icon: '🏆', color: 'border-yellow-300/50 bg-yellow-300/15 text-yellow-100' },
    { min: 4, max: 4, title: 'Sang Juara', icon: '🔥', color: 'border-orange-300/50 bg-orange-300/15 text-orange-100' },
    { min: 5, max: 5, title: 'Bintang Utama', icon: '⭐', color: 'border-violet-300/50 bg-violet-300/15 text-violet-100' },
    { min: 6, max: 8, title: 'Elite Getasan', icon: '⚡', color: 'border-sky-300/50 bg-sky-300/15 text-sky-100' },
    { min: 9, max: 15, title: 'Kesatria Muda', icon: '🛡️', color: 'border-emerald-300/50 bg-emerald-300/15 text-emerald-100' },
    { min: 16, max: 24, title: 'Penjelajah Hebat', icon: '🚀', color: 'border-indigo-300/50 bg-indigo-300/15 text-indigo-100' },
    { min: 25, max: 40, title: 'Bintang Potensial', icon: '🌟', color: 'border-pink-300/50 bg-pink-300/15 text-pink-100' },
    { min: 41, max: 60, title: 'Pejuang Prestasi', icon: '🎯', color: 'border-teal-300/50 bg-teal-300/15 text-teal-100' },
    { min: 61, max: Number.POSITIVE_INFINITY, title: 'Petualang Tangguh', icon: '🌱', color: 'border-lime-300/50 bg-lime-300/15 text-lime-100' },
  ]
  const getRankTitle = (rank: number | null) =>
    rankTitles.find((item) => rank !== null && rank >= item.min && rank <= item.max) ||
    { title: 'Petualang Getasan', icon: '🧭', color: 'border-white/20 bg-white/10 text-white' }
  const globalTitle = getRankTitle(globalRank)
  const classTitle = getRankTitle(classRank)
  const earnedBadges = Array.isArray(userProfile?.badges)
    ? userProfile.badges.map((badge: any, index: number) => {
        if (typeof badge === 'string') {
          return { id: badge, title: badge, icon: '🏅', description: '' }
        }
        if (!badge || typeof badge !== 'object') return null
        return {
          id: badge.id || badge.name || badge.title || index,
          title: badge.name || badge.title || badge.label || badge.badge_name || 'Badge',
          icon: badge.icon || badge.emoji || '🏅',
          description: badge.description || badge.desc || '',
        }
      }).filter(Boolean)
    : []

  // Badge lama dari profil tetap dipertahankan. Badge tambahan berikut terbuka
  // otomatis berdasarkan total XP, tanpa mengubah data badge yang sudah tersimpan.
  const xpMilestoneBadges = [
    { id: 'xp-100', title: 'Pemula Tangguh', icon: '🌱', description: 'Kumpulkan 100 XP.', threshold: 100 },
    { id: 'xp-250', title: 'Pengumpul Bintang', icon: '⭐', description: 'Kumpulkan 250 XP.', threshold: 250 },
    { id: 'xp-500', title: 'Pemburu Ilmu', icon: '🔎', description: 'Kumpulkan 500 XP.', threshold: 500 },
    { id: 'xp-1000', title: 'Juara Belajar', icon: '🏆', description: 'Kumpulkan 1.000 XP.', threshold: 1000 },
    { id: 'xp-2000', title: 'Legenda Cilik', icon: '👑', description: 'Kumpulkan 2.000 XP.', threshold: 2000 },
    { id: 'xp-3500', title: 'Bintang Getasan', icon: '💫', description: 'Kumpulkan 3.500 XP.', threshold: 3500 },
  ]
  const unlockedXpBadges = xpMilestoneBadges.filter((badge) => xp >= badge.threshold)
  const nextXpBadge = xpMilestoneBadges.find((badge) => xp < badge.threshold)
  const activityBadgeCatalog = [
    { id: 'first-mission', title: 'Langkah Pertama', icon: '👣', description: 'Selesaikan 1 latihan sampai tuntas.', unlocked: completedAttempts >= 1 },
    { id: 'practice-five', title: 'Rajin Berlatih', icon: '📘', description: 'Selesaikan 5 latihan.', unlocked: completedAttempts >= 5 },
    { id: 'practice-ten', title: 'Pejuang Konsisten', icon: '🛡️', description: 'Selesaikan 10 latihan.', unlocked: completedAttempts >= 10 },
    { id: 'perfect-one', title: 'Jawaban Sempurna', icon: '🎯', description: 'Raih nilai 100 pada satu latihan.', unlocked: perfectAttempts >= 1 },
    { id: 'perfect-three', title: 'Sang Penyempurna', icon: '💯', description: 'Raih nilai 100 sebanyak 3 kali.', unlocked: perfectAttempts >= 3 },
    { id: 'xp-100', title: 'Pemula Tangguh', icon: '🌱', description: 'Kumpulkan 100 XP.', unlocked: xp >= 100 },
    { id: 'xp-250', title: 'Pengumpul Bintang', icon: '⭐', description: 'Kumpulkan 250 XP.', unlocked: xp >= 250 },
    { id: 'xp-500', title: 'Pemburu Ilmu', icon: '🔎', description: 'Kumpulkan 500 XP.', unlocked: xp >= 500 },
    { id: 'xp-1000', title: 'Juara Belajar', icon: '🏆', description: 'Kumpulkan 1.000 XP.', unlocked: xp >= 1000 },
    { id: 'xp-2000', title: 'Legenda Cilik', icon: '👑', description: 'Kumpulkan 2.000 XP.', unlocked: xp >= 2000 },
    { id: 'xp-3500', title: 'Bintang Getasan', icon: '💫', description: 'Kumpulkan 3.500 XP.', unlocked: xp >= 3500 },
  ]
  const activityUnlockedBadges = activityBadgeCatalog.filter((badge) => badge.unlocked)
  const displayedBadges = [...earnedBadges, ...activityUnlockedBadges.filter(
    (badge) => !earnedBadges.some((earned: any) => String(earned.id) === badge.id || earned.title === badge.title)
  )]
  const allBadgeCatalog = [
    ...activityBadgeCatalog,
    ...earnedBadges.filter((earned: any) => !activityBadgeCatalog.some((badge) => badge.title === earned.title)).map((badge: any) => ({ ...badge, unlocked: true })),
  ]
  const avatarChoices = ['🚀', '🧑‍🚀', '👩‍🚀', '🦊', '🐼', '🦁', '🐯', '🐸', '🐵', '🐨', '🐱', '🐰', '🐻', '🦄', '🐲', '🤖', '👾', '🌟']
  const currentAvatar = typeof userProfile?.avatar_url === 'string' && userProfile.avatar_url.length <= 12 && !userProfile.avatar_url.includes('/')
    ? userProfile.avatar_url
    : globalTitle.icon

  const choosePlayerIcon = async (icon: string) => {
    if (!userProfile?.id || isSavingAvatar) return
    setIsSavingAvatar(true)
    setAvatarMessage('')
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ avatar_url: icon }).eq('id', userProfile.id)
    setIsSavingAvatar(false)
    if (error) {
      setAvatarMessage('Ikon belum dapat disimpan. Coba lagi.')
      return
    }
    setUserProfile((previous: any) => ({ ...previous, avatar_url: icon }))
    setAvatarMessage('Ikon pemain berhasil diperbarui!')
  }

  const normalizedActivityType = (value: unknown) => {
    const type = String(value || 'QUIZ').trim().toUpperCase()
    if (type === 'MAZE_GAME' || type === 'MAZE') return 'MAZE_GAME'
    if (type === 'FLASHCARD' || type === 'FLASH_CARDS') return 'FLASHCARD'
    if (type === 'QUIZ' || type === 'CBT' || type === 'EXAM') return 'QUIZ'
    return 'OTHER'
  }
  const activityMeta: Record<string, { label: string; icon: string; pill: string; button: string }> = {
    QUIZ: { label: 'Kuis & Latihan', icon: '🧠', pill: 'border-cyan-100/70 bg-cyan-100/20 text-white', button: 'from-lime-300 to-emerald-400 text-emerald-950 hover:from-lime-200 hover:to-emerald-300' },
    MAZE_GAME: { label: 'Petualangan Maze', icon: '🗺️', pill: 'border-lime-100/70 bg-lime-100/20 text-white', button: 'from-violet-400 to-indigo-500 text-white hover:from-violet-300 hover:to-indigo-400' },
    FLASHCARD: { label: 'Kartu Kilat', icon: '⚡', pill: 'border-pink-100/70 bg-white/20 text-white', button: 'from-amber-300 to-yellow-400 text-amber-950 hover:from-amber-200 hover:to-yellow-300' },
    OTHER: { label: 'Aktivitas', icon: '✨', pill: 'border-violet-100/70 bg-white/20 text-white', button: 'from-cyan-300 to-sky-400 text-sky-950 hover:from-cyan-200 hover:to-sky-300' },
  }

  // Variasi warna kartu stabil berdasarkan ID, bukan posisi dalam daftar.
  const missionPalettes = [
    { card: 'from-fuchsia-500 via-purple-600 to-indigo-800', glow: 'bg-fuchsia-200/30', edge: 'border-fuchsia-200/70', accent: 'text-fuchsia-100', art: '✦' },
    { card: 'from-orange-400 via-rose-500 to-pink-700', glow: 'bg-amber-200/35', edge: 'border-amber-200/80', accent: 'text-amber-100', art: '✺' },
    { card: 'from-cyan-500 via-blue-600 to-indigo-800', glow: 'bg-cyan-200/35', edge: 'border-cyan-200/80', accent: 'text-cyan-100', art: '✧' },
    { card: 'from-lime-400 via-emerald-600 to-teal-800', glow: 'bg-lime-200/30', edge: 'border-lime-200/80', accent: 'text-lime-100', art: '✹' },
    { card: 'from-violet-500 via-purple-600 to-fuchsia-800', glow: 'bg-violet-200/35', edge: 'border-violet-200/80', accent: 'text-violet-100', art: '✷' },
    { card: 'from-amber-400 via-orange-500 to-red-700', glow: 'bg-yellow-100/35', edge: 'border-yellow-200/80', accent: 'text-yellow-100', art: '★' },
    { card: 'from-teal-400 via-cyan-600 to-blue-800', glow: 'bg-teal-100/35', edge: 'border-teal-100/80', accent: 'text-teal-100', art: '❋' },
    { card: 'from-pink-500 via-rose-600 to-red-800', glow: 'bg-pink-100/35', edge: 'border-pink-100/80', accent: 'text-pink-100', art: '✿' },
  ]
  const getMissionVariant = (id: string) => Array.from(String(id)).reduce((total, char) => total + char.charCodeAt(0), 0) % missionPalettes.length

  const activityCounts = exams.reduce((counts: Record<string, number>, exam) => {
    const type = normalizedActivityType(exam.activity_type)
    counts[type] = (counts[type] || 0) + 1
    return counts
  }, { ALL: exams.length, QUIZ: 0, MAZE_GAME: 0, FLASHCARD: 0, OTHER: 0 })

  const quizSubjects = Array.from(new Set(
    exams
      .filter((exam) => normalizedActivityType(exam.activity_type) === 'QUIZ')
      .map((exam) => String(exam.subtest || '').trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, 'id'))

  const filteredExams = exams
    .filter((exam) => {
      const type = normalizedActivityType(exam.activity_type)
      const query = missionSearch.trim().toLowerCase()
      const searchable = [exam.title, exam.description, exam.subtest, type].join(' ').toLowerCase()
      const matchesSubject = missionType !== 'QUIZ' || missionSubject === 'ALL' || String(exam.subtest || '').trim() === missionSubject
      return (!query || searchable.includes(query)) && (missionType === 'ALL' || type === missionType) && matchesSubject
    })
    .sort((a, b) => {
      if (missionSort === 'TITLE') return String(a.title || '').localeCompare(String(b.title || ''), 'id')
      if (missionSort === 'OLDEST') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

  return (
    <div className={`min-h-screen overflow-hidden bg-transparent font-sans ${visual.page}`}>
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
                Halo, {userProfile?.full_name || 'Adik Hebat'}! 👋 Teruslah melangkah, teruslah belajar,
                dan tunjukkan kemampuan terbaikmu. Setiap usaha adalah kebanggaan!
              </p>
              <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-3 shadow-inner backdrop-blur-sm">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-100">🏅 Koleksi Badge</p>
                  <span className="rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[9px] font-bold text-blue-50">{displayedBadges.length} terkumpul</span>
                </div>
                {displayedBadges.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {displayedBadges.slice(0, 8).map((badge: any) => (
                      <span key={badge.id} title={badge.description || badge.title} className="inline-flex max-w-full items-center gap-1 rounded-lg border border-amber-200/30 bg-amber-300/15 px-2 py-1.5 text-[9px] font-bold leading-tight text-amber-50 sm:px-2.5 sm:text-[10px]">
                        <span className="shrink-0">{badge.icon}</span><span className="truncate">{badge.title}</span>
                      </span>
                    ))}
                    {displayedBadges.length > 8 && <span className="rounded-lg bg-white/10 px-2.5 py-1.5 text-[9px] font-bold text-blue-50 sm:text-[10px]">+{displayedBadges.length - 8} badge</span>}
                  </div>
                ) : (
                  <p className="text-[10px] leading-4 text-blue-100">Perjalanan hebat dimulai dari satu latihan. Selesaikan misi dan kumpulkan XP untuk membuka badge pertamamu.</p>
                )}
                {nextXpBadge && (
                  <div className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-slate-950/20 px-2.5 py-2">
                    <span className="text-lg opacity-80">{nextXpBadge.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[9px] font-extrabold text-white">Target berikutnya: {nextXpBadge.title}</p>
                      <p className="text-[9px] text-blue-100">{Math.max(0, nextXpBadge.threshold - xp).toLocaleString('id-ID')} XP lagi</p>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold text-amber-100">{Math.min(100, Math.round((xp / nextXpBadge.threshold) * 100))}%</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🧠 Asah Otak</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🏅 Kumpulkan XP</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">📚 Pahami Materi</span>
              </div>
            </div>

            <div className={`relative rounded-[1.7rem] border ${visual.heroPanel} p-5 shadow-2xl backdrop-blur-md`}>
              <div className="absolute -right-2 -top-3 rotate-12 rounded-xl border border-amber-200/70 bg-gradient-to-r from-amber-300 to-yellow-200 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-950 shadow-lg">
                Identitas Pemain
              </div>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => { setAvatarMessage(''); setIsIdentityModalOpen(true) }} aria-label="Ubah ikon identitas pemain" className="group relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-300 to-blue-500 text-4xl shadow-lg transition hover:scale-105 focus:outline-none focus:ring-4 focus:ring-amber-300/50">
                  {currentAvatar}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-900 bg-amber-300 text-xs text-slate-900 shadow">✎</span>
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-blue-100">{userProfile?.full_name || 'Pemain Getasan'}</p>
                  <p className="mt-1 text-lg font-black text-amber-300">{globalTitle.title}</p>
                  <p className="mt-1 text-[10px] font-bold text-blue-100">
                    {userProfile?.class_code ? `Kelas ${userProfile.class_code}` : 'Pejuang prestasi Getasan'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setIsIdentityModalOpen(true)} className="rounded-xl border border-cyan-200/30 bg-cyan-300/15 px-3 py-2 text-[10px] font-extrabold text-cyan-50 transition hover:bg-cyan-300/25">🎨 Atur ikon & badge</button>
                <span className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold text-blue-100">🏅 {displayedBadges.length} badge terbuka</span>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-black text-amber-300">{xp.toLocaleString('id-ID')} XP</p>
                  <span className="mt-1 inline-block rounded-lg bg-violet-500/50 px-2.5 py-1 text-xs font-black">LEVEL {level}</span>
                </div>
                <span className="rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[10px] font-bold text-blue-100">
                  {userProfile?.class_code ? `Kelas ${userProfile.class_code}` : 'Siswa Getasan'}
                </span>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex justify-between text-[10px] font-bold text-blue-100">
                  <span>PROGRES XP BERIKUTNYA</span>
                  <span>{Math.round(xpProgress)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-slate-950/60 p-[2px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300 transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-blue-200">{xp % 200} / 200 XP pada progres saat ini.</p>
              </div>


              {isIdentityModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="player-custom-title">
                  <div className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-slate-900 text-white shadow-2xl">
                    <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-indigo-950 to-violet-900 p-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Personalisasi pemain</p>
                        <h3 id="player-custom-title" className="mt-1 text-xl font-black">Pilih Ikon & Koleksi Badge</h3>
                        <p className="mt-1 text-xs text-blue-100">Pilih ikon profil atau gunakan badge yang sudah kamu dapatkan.</p>
                      </div>
                      <button type="button" onClick={() => setIsIdentityModalOpen(false)} aria-label="Tutup popup" className="rounded-xl bg-white/10 px-3 py-2 text-lg hover:bg-white/20">✕</button>
                    </div>
                    <div className="max-h-[calc(88vh-100px)] space-y-5 overflow-y-auto p-5">
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-amber-200">🙂 Ikon Profil</h4>
                          <span className="text-[10px] text-slate-300">Pilih salah satu ikon</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                          {avatarChoices.map((icon) => (
                            <button key={icon} type="button" onClick={() => choosePlayerIcon(icon)} disabled={isSavingAvatar} aria-label={`Pilih ikon ${icon}`} className={`flex aspect-square items-center justify-center rounded-xl border text-2xl transition hover:scale-105 disabled:opacity-50 ${currentAvatar === icon ? 'border-amber-300 bg-amber-300/20 ring-2 ring-amber-300/40' : 'border-white/10 bg-white/5 hover:border-cyan-300/50 hover:bg-white/10'}`}>{icon}</button>
                          ))}
                        </div>
                      </section>
                      <section>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-sm font-black text-amber-200">🏅 Galeri Badge</h4>
                          <span className="text-[10px] text-slate-300">{allBadgeCatalog.filter((badge: any) => badge.unlocked).length} / {allBadgeCatalog.length} terbuka</span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {allBadgeCatalog.map((badge: any) => (
                            <div key={badge.id} className={`flex min-w-0 items-center gap-3 rounded-2xl border p-3 ${badge.unlocked ? 'border-amber-300/30 bg-amber-300/10' : 'border-white/10 bg-white/[0.03] opacity-75'}`}>
                              <button type="button" disabled={!badge.unlocked || isSavingAvatar} onClick={() => choosePlayerIcon(badge.icon)} title={badge.unlocked ? 'Gunakan sebagai ikon profil' : 'Badge masih terkunci'} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${badge.unlocked ? 'bg-amber-300/15 hover:bg-amber-300/30' : 'bg-slate-800 grayscale'}`}>{badge.unlocked ? badge.icon : '🔒'}</button>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black">{badge.title}</p>
                                <p className="mt-1 text-[10px] leading-4 text-slate-300">{badge.description || 'Badge pencapaian dari perjalanan belajarmu.'}</p>
                                <p className={`mt-1 text-[9px] font-extrabold uppercase tracking-wide ${badge.unlocked ? 'text-emerald-300' : 'text-amber-200'}`}>{badge.unlocked ? '✓ Sudah diperoleh · tekan ikon untuk memakai' : 'Terkunci · selesaikan syaratnya'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                      {avatarMessage && <p role="status" className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100">{avatarMessage}</p>}
                      {isSavingAvatar && <p className="text-xs text-cyan-200">Menyimpan pilihan...</p>}
                      <p className="text-[10px] leading-4 text-slate-400">Badge yang terkunci tetap terlihat agar kamu tahu target berikutnya. Ikon profil tersimpan pada akunmu.</p>
                    </div>
                  </div>
                </div>
              )}
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
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold shadow-sm ${visual.badge}`}>
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                {filteredExams.length} <span className="opacity-60">/ {exams.length}</span> misi tampil
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'ALL', label: 'Semua Misi', icon: '🎮', count: activityCounts.ALL, active: 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/20' },
                { id: 'QUIZ', label: 'Kuis', icon: '🧠', count: activityCounts.QUIZ, active: 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-600/25' },
                { id: 'MAZE_GAME', label: 'Maze', icon: '🗺️', count: activityCounts.MAZE_GAME, active: 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/25' },
                { id: 'FLASHCARD', label: 'Flashcard', icon: '⚡', count: activityCounts.FLASHCARD, active: 'border-pink-600 bg-pink-600 text-white shadow-lg shadow-pink-600/25' },
                { id: 'OTHER', label: 'Lainnya', icon: '✨', count: activityCounts.OTHER, active: 'border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-600/25' },
              ].map((chip) => {
                const selected = missionType === chip.id
                return (
                  <button key={chip.id} type="button" onClick={() => setMissionType(chip.id)} aria-pressed={selected}
                    className={`group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-extrabold transition duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-cyan-300/30 ${selected ? chip.active : `${visual.surfaceBorder} ${visual.surface} ${visual.heading} hover:border-cyan-400`}`}>
                    <span>{chip.icon}</span><span>{chip.label}</span>
                    <span className={`min-w-6 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${selected ? 'bg-white/20 text-white' : 'bg-slate-500/10'}`}>{chip.count}</span>
                  </button>
                )
              })}
            </div>

            <div className={`flex flex-wrap items-center gap-2 rounded-2xl border p-2.5 sm:p-3 ${visual.surfaceBorder} ${visual.surface}`}>
              <div className={`relative flex items-center transition-all duration-200 ${isMissionSearchOpen || missionSearch ? 'w-full sm:w-64' : 'w-10'}`}>
                {!isMissionSearchOpen && !missionSearch ? (
                  <button type="button" onClick={() => setIsMissionSearchOpen(true)} aria-label="Buka pencarian aktivitas" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg transition hover:scale-105 ${visual.filter}`}>
                    🔎
                  </button>
                ) : (
                  <>
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base">🔎</span>
                    <input autoFocus type="search" value={missionSearch} onChange={(event) => setMissionSearch(event.target.value)} onBlur={() => { if (!missionSearch.trim()) setIsMissionSearchOpen(false) }} placeholder="Cari misi atau mapel..." aria-label="Cari aktivitas" className={`w-full rounded-xl border px-3 py-2.5 pl-10 pr-9 text-sm font-semibold outline-none transition focus:ring-4 ${visual.filter}`} />
                    <button type="button" onClick={() => { setMissionSearch(''); setIsMissionSearchOpen(false) }} aria-label="Tutup pencarian" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100">✕</button>
                  </>
                )}
              </div>
              <label className="min-w-[145px] flex-1 sm:flex-none">
                <span className="sr-only">Filter jenis aktivitas</span>
                <select value={missionType} onChange={(event) => { setMissionType(event.target.value); if (event.target.value !== 'QUIZ') setMissionSubject('ALL') }} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none focus:ring-4 ${visual.filter}`}>
                  <option value="ALL">🎮 Semua Aktivitas</option><option value="QUIZ">🧠 Kuis & Latihan</option><option value="MAZE_GAME">🗺️ Maze</option><option value="FLASHCARD">⚡ Flashcard</option><option value="OTHER">✨ Aktivitas Lain</option>
                </select>
              </label>
              {missionType === 'QUIZ' && quizSubjects.length > 0 && (
                <label className="min-w-[140px] flex-1 sm:flex-none">
                  <span className="sr-only">Filter mata pelajaran</span>
                  <select value={missionSubject} onChange={(event) => setMissionSubject(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none focus:ring-4 ${visual.filter}`}>
                    <option value="ALL">📚 Semua Mapel</option>
                    {quizSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
                  </select>
                </label>
              )}
              <label className="min-w-[130px] flex-1 sm:flex-none">
                <span className="sr-only">Urutkan aktivitas</span>
                <select value={missionSort} onChange={(event) => setMissionSort(event.target.value)} className={`w-full rounded-xl border px-3 py-2.5 text-xs font-bold outline-none focus:ring-4 ${visual.filter}`}>
                  <option value="NEWEST">🕒 Terbaru</option><option value="OLDEST">📅 Terlama</option><option value="TITLE">🔤 Nama A–Z</option>
                </select>
              </label>
            </div>

            {filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredExams.map((exam) => {
                  const type = normalizedActivityType(exam.activity_type)
                  const style = activityMeta[type]
                  const palette = missionPalettes[getMissionVariant(exam.id)]
                  return (
                    <article
                      key={exam.id}
                      className={`group relative flex min-h-[238px] flex-col justify-between overflow-hidden rounded-[1.5rem] border-2 ${palette.edge} bg-gradient-to-br ${palette.card} p-4 text-white shadow-lg shadow-slate-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-2xl`}
                    >
                      <div className={`pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl transition duration-300 group-hover:scale-125 ${palette.glow}`} />
                      <div className="pointer-events-none absolute -bottom-8 -right-2 text-8xl text-white/20 transition duration-300 group-hover:-rotate-12 group-hover:scale-110">{palette.art}</div>
                      <div className="pointer-events-none absolute right-4 top-16 text-5xl opacity-15">{style.icon}</div>
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-white/70 via-white/10 to-transparent" />
                      <div className="relative">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide shadow-sm backdrop-blur-md ${style.pill}`}><span className="text-xs">{style.icon}</span>{style.label}</span>
                          <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/35 bg-slate-950/25 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-sm backdrop-blur-md"><span aria-hidden="true">📚</span><span className="truncate">{exam.subtest || 'MISI UMUM'}</span></span>
                        </div>
                        <h3 className="mt-3 max-w-[92%] text-lg font-black leading-snug drop-shadow-sm sm:text-xl">{exam.title}</h3>
                        <p className="mt-2 line-clamp-3 text-sm leading-5 text-white/90">
                          {exam.description || 'Latihan interaktif dengan jawaban dan pembahasan instan.'}
                        </p>
                      </div>

                      <div className="relative mt-6">
                        <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wide text-white/90">
                          <span className={`h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_12px_rgba(190,242,100,0.95)]`} />
                          <span className={palette.accent}>SIAP DIMAINKAN</span>
                        </div>
                        <Link
                          href={`/practice/${exam.id}`}
                          className={`flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r px-4 py-2.5 text-center text-xs font-black shadow-lg transition hover:scale-[1.02] active:scale-[0.98] ${style.button}`}
                        >
                          🚀 MULAI MISI <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className={`rounded-3xl border-2 border-dashed ${visual.surfaceBorder} ${visual.surface} px-6 py-12 text-center shadow-xl`}>
                {exams.length > 0 && <div className="mb-4"><span className="text-3xl">🔍</span><p className={`mt-2 text-sm font-bold ${visual.heading}`}>Misi tidak ditemukan</p><p className={`mt-1 text-xs ${visual.muted}`}>Coba ubah kata kunci atau filter aktivitas.</p><button type="button" onClick={() => { setMissionSearch(''); setIsMissionSearchOpen(false); setMissionType('ALL'); setMissionSubject('ALL') }} className={`mt-3 rounded-xl px-4 py-2 text-xs font-black ${visual.badge}`}>Reset pencarian</button></div>}
                {exams.length === 0 && (
                  <>
                    <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${visual.badge} text-3xl`}>🗺️</div>
                    <h3 className={`mt-4 text-lg font-black ${visual.heading}`}>Misi sedang disiapkan!</h3>
                    <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${visual.muted}`}>
                      Belum ada modul latihan mandiri yang dipublikasikan. Coba cek kembali nanti, ya!
                    </p>
                  </>
                )}
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
            <div className="bg-gradient-to-r from-[#10265c] via-indigo-800 to-violet-800 p-5 text-white">
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
                  🏟️ Grisan Arena
                </span>
              )}
            </div>

            <div className="space-y-4 p-4">
              <label htmlFor="leaderboard-class" className="block text-xs font-extrabold text-slate-600">
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

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-blue-200/20 bg-blue-950/10 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-blue-500">🌐 Global</p>
                  <p className="mt-1 text-xl font-black text-cyan-500">{globalRank ? `#${globalRank}` : '—'}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Semua kelas</p>
                </div>
                <div className="rounded-xl border border-emerald-200/30 bg-emerald-950/5 p-3">
                  <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600">🏫 {userProfile?.class_code ? `Kelas ${userProfile.class_code}` : 'Kelas'}</p>
                  <p className="mt-1 text-xl font-black text-emerald-600">{classRank ? `#${classRank}` : '—'}</p>
                  <p className="text-[10px] font-semibold text-slate-500">Peringkat kelasmu</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-500/10 px-3 py-2">
                <p className="text-[10px] font-bold text-indigo-700">
                  {leaderboardFilter === 'ALL'
                    ? '🌐 Menampilkan peringkat global'
                    : leaderboardFilter === 'MY_CLASS' || leaderboardFilter === 'CLASS'
                      ? `🏫 Menampilkan peringkat kelas ${userProfile?.class_code || ''}`
                      : `🏫 Menampilkan peringkat kelas ${leaderboardFilter}`}
                </p>
                <span className="shrink-0 text-[9px] font-black text-indigo-600">TOP 15</span>
              </div>

              <div className="space-y-2">
                {leaderboard.length > 0 ? (
                  leaderboard.map((student, rank) => {
                    const rankStyle = darkTheme
                      ? rank === 0
                        ? 'border-amber-300/40 bg-amber-400/15'
                        : rank === 1
                          ? 'border-slate-300/30 bg-white/10'
                          : rank === 2
                            ? 'border-orange-300/40 bg-orange-400/15'
                            : `border-white/10 ${visual.miniSurface} hover:border-indigo-300/50`
                      : rank === 0
                        ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-100'
                        : rank === 1
                          ? 'border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100'
                          : rank === 2
                            ? 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50'
                            : `border-white/10 ${visual.miniSurface} hover:border-indigo-300/50`
                    const rankBadge = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`

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
                            <p className={`truncate text-xs font-black ${visual.heading}`}>{student.full_name || student.username}</p>
                            <p className={`mt-1 text-[10px] font-semibold ${visual.muted}`}>
                              {student.class_code ? `Kelas ${student.class_code}` : `@${student.username}`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-black text-indigo-700">{student.xp || 0} XP</p>
                          <p className="mt-1 text-[9px] font-bold uppercase text-slate-400">LEVEL {student.level || 1}</p>
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
        <section className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-r from-[#0b1d49] via-blue-900 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
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
