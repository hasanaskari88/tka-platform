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
  const darkTheme = ['space', 'jungle', 'ocean', 'disney'].includes(theme)
  const [exams, setExams] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<string[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leaderboardFilter, setLeaderboardFilter] = useState<string>('ALL')

  const fetchLeaderboard = async (filterVal: string, currentProfile?: any) => {
    const supabase = createClient()
    const activeProfile = currentProfile || userProfile

    let query = supabase
      .from('profiles')
      .select('id, full_name, username, class_code, xp, level, role')
      .not('class_code', 'ilike', 'guru')
      .order('xp', { ascending: false })
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

  useEffect(() => {
    async function loadPracticeData() {
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

      await fetchLeaderboard(leaderboardFilter, profile)
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

  const missionStyles = [
    {
      card: 'from-sky-500 via-blue-600 to-indigo-700',
      pill: 'border-cyan-200/60 bg-cyan-100/20 text-white',
      icon: '🧮',
      art: '✨',
      button: 'from-lime-300 to-emerald-400 text-emerald-950 hover:from-lime-200 hover:to-emerald-300',
    },
    {
      card: 'from-emerald-500 via-green-600 to-teal-700',
      pill: 'border-lime-200/60 bg-lime-100/20 text-white',
      icon: '🗺️',
      art: '🌿',
      button: 'from-violet-500 to-indigo-500 text-white hover:from-violet-400 hover:to-indigo-400',
    },
    {
      card: 'from-rose-500 via-pink-600 to-fuchsia-700',
      pill: 'border-pink-200/60 bg-white/20 text-white',
      icon: '⚡',
      art: '🌟',
      button: 'from-amber-300 to-yellow-400 text-amber-950 hover:from-amber-200 hover:to-yellow-300',
    },
  ]

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
                Halo, {userProfile?.full_name || 'Petualang SD Getasan'}! Pilih misi, asah kemampuan,
                kumpulkan XP, dan naikkan levelmu. Setiap soal adalah langkah menuju prestasi!
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🧠 Asah Otak</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">🏅 Kumpulkan XP</span>
                <span className="rounded-xl border border-white/20 bg-white/10 px-3 py-2">📚 Pahami Materi</span>
              </div>
            </div>

            <div className={`relative rounded-[1.7rem] border ${visual.heroPanel} p-5 shadow-2xl backdrop-blur-md`}>
              <div className="absolute -right-2 -top-3 rotate-12 rounded-xl bg-amber-300 px-3 py-1 text-xs font-black text-amber-950 shadow-lg">
                PLAYER
              </div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-cyan-200 bg-gradient-to-br from-cyan-300 to-blue-500 text-4xl shadow-lg">
                  🦉
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-blue-100">PETUALANG GETASAN</p>
                  <p className="mt-1 text-2xl font-black text-amber-300">{xp} XP</p>
                  <span className="mt-1 inline-block rounded-lg bg-violet-500/50 px-2.5 py-1 text-xs font-black">
                    LEVEL {level}
                  </span>
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-[11px] font-bold text-blue-100">
                  <span>PROGRES PETUALANGAN</span>
                  <span>{xp} XP</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full border border-white/20 bg-slate-950/60 p-[2px]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-lime-300 via-emerald-300 to-cyan-300 transition-all"
                    style={{ width: `${xpProgress}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-blue-200">Terus berlatih untuk meningkatkan pencapaianmu!</p>
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

            {exams.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {exams.map((exam, index) => {
                  const style = missionStyles[index % missionStyles.length]
                  return (
                    <article
                      key={exam.id}
                      className={`group relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-[1.7rem] bg-gradient-to-br ${style.card} p-5 text-white shadow-lg shadow-indigo-950/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl`}
                    >
                      <div className="absolute -right-5 -top-7 text-8xl opacity-15 transition duration-300 group-hover:rotate-12 group-hover:scale-110">
                        {style.art}
                      </div>
                      <div className="absolute -bottom-10 -right-4 text-8xl opacity-15">{style.icon}</div>
                      <div className="relative">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur ${style.pill}`}>
                          {exam.subtest || 'MISI UMUM'}
                        </span>
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
                          🚀 MULAI MISI <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className={`rounded-3xl border-2 border-dashed ${visual.surfaceBorder} ${visual.surface} px-6 py-12 text-center shadow-xl`}>
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${visual.badge} text-3xl`}>🗺️</div>
                <h3 className={`mt-4 text-lg font-black ${visual.heading}`}>Misi sedang disiapkan!</h3>
                <p className={`mx-auto mt-2 max-w-sm text-sm leading-6 ${visual.muted}`}>
                  Belum ada modul latihan mandiri yang dipublikasikan. Coba cek kembali nanti, ya!
                </p>
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
                  ⚙️ Akses Admin
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
