'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function PracticeHubPage() {
  const [exams, setExams] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userProfile, setUserProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // 🟢 STATE FILTER LEADERBOARD (GLOBAL ATAU PER KELAS)
  const [leaderboardFilter, setLeaderboardFilter] = useState<'ALL' | 'CLASS'>('ALL')

  // 🟢 FUNGSI MENGAMBIL DATA LEADERBOARD DENGAN FILTER
  const fetchLeaderboard = async (filterType: 'ALL' | 'CLASS', currentProfile?: any) => {
    const supabase = createClient()
    const activeProfile = currentProfile || userProfile

    let query = supabase
      .from('profiles')
      .select('id, full_name, username, class_code, xp, level')
      .order('xp', { ascending: false })
      .limit(10)

    // Filter khusus kelas siswa jika memilih tab 'CLASS'
    if (filterType === 'CLASS' && activeProfile?.class_code) {
      query = query.eq('class_code', activeProfile.class_code)
    }

    const { data: topUsers } = await query
    if (topUsers) setLeaderboard(topUsers)
  }

  useEffect(() => {
    async function loadPracticeData() {
      const supabase = createClient()

      // 1. Ambil Data User Aktif
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

      // 2. Ambil Paket Ujian Terpublikasi untuk Latihan Mandiri
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false })

      if (examData) {
        // Filter: Tampilkan hanya ujian khusus PRACTICE_ONLY, BOTH, atau fallback (tanpa target_mode)
        const filteredExams = examData.filter(
          (exam: any) =>
            !exam.target_mode ||
            exam.target_mode === 'PRACTICE_ONLY' ||
            exam.target_mode === 'BOTH'
        )
        setExams(filteredExams)
      }

      // 3. Ambil Leaderboard Awal
      await fetchLeaderboard(leaderboardFilter, profile)

      setLoading(false)
    }

    loadPracticeData()
  }, [])

  // 🟢 EFEK SAMPING SAAT TAB LEADERBOARD BERUBAH
  useEffect(() => {
    if (!loading) {
      fetchLeaderboard(leaderboardFilter)
    }
  }, [leaderboardFilter])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat Portal Latihan Mandiri...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <Navbar />

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* WIDGET HERO GAMIFIKASI SISWA */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="space-y-2">
            <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[11px] font-extrabold uppercase border border-white/30 tracking-wider">
              🎮 MODUL LATIHAN BEBAS
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">
              Halo, {userProfile?.full_name || 'Petualang SD Getasan'}! 👋
            </h1>
            <p className="text-xs text-purple-100 max-w-lg leading-relaxed">
              Asah kemampuanmu secara mandiri tanpa batasan waktu ujian! Kumpulkan XP, dapatkan jawaban & pembahasan instan, dan capai posisi puncak di Papan Peringkat!
            </p>
          </div>

          {/* STATS BADGE & LEVEL SISWA */}
          <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 shrink-0">
            <div className="w-14 h-14 bg-amber-400 border-2 border-white rounded-2xl flex items-center justify-center text-2xl shadow-md animate-bounce">
              ⭐
            </div>
            <div>
              <span className="text-[10px] text-purple-200 uppercase font-bold block">
                Peringkat & Skor
              </span>
              <p className="text-lg font-black text-amber-300">
                {userProfile?.xp || 0} XP
              </p>
              <span className="text-xs font-bold bg-purple-900/60 px-2 py-0.5 rounded text-purple-100">
                Level {userProfile?.level || 1}
              </span>
            </div>
          </div>
        </div>

        {/* UTAMA GRID: MODUL LATIHAN & LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* KOLOM KIRI (2/3): DAFTAR MODUL LATIHAN BEBAS */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
              <span>📚</span>
              <span>Pilih Modul Latihan Mandiri ({exams.length})</span>
            </h2>

            {exams.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exams.map((exam) => (
                  <div
                    key={exam.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-full uppercase border border-indigo-100">
                        {exam.subtest || 'UMUM'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {exam.description || 'Latihan interaktif dengan jawaban dan pembahasan instan.'}
                      </p>
                    </div>

                    <Link
                      href={`/practice/${exam.id}`}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl text-center shadow-sm transition-colors block"
                    >
                      🚀 Mulai Latihan Mandiri →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs sm:text-sm font-medium text-slate-500 bg-white rounded-2xl border border-slate-200">
                Belum ada modul latihan mandiri yang dipublikasikan.
              </div>
            )}
          </div>

          {/* KOLOM KANAN (1/3): PAPAN PERINGKAT / LEADERBOARD (DENGAN TAB FILTER) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1">
                <span>🏆</span>
                <span>Papan Peringkat</span>
              </h2>

              {/* TAB FILTER PER KELAS / GLOBAL */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-[10px] font-bold">
                <button
                  onClick={() => setLeaderboardFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    leaderboardFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🌐 Semua
                </button>
                <button
                  onClick={() => setLeaderboardFilter('CLASS')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    leaderboardFilter === 'CLASS'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🏫 Kelas {userProfile?.class_code || 'Saya'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {leaderboard.length > 0 ? (
                leaderboard.map((student, rank) => {
                  let rankBadge = `${rank + 1}`
                  let rankBg = 'bg-slate-100 text-slate-700'
                  if (rank === 0) {
                    rankBadge = '🥇'
                    rankBg = 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                  } else if (rank === 1) {
                    rankBadge = '🥈'
                    rankBg = 'bg-slate-200 text-slate-800 font-bold'
                  } else if (rank === 2) {
                    rankBadge = '🥉'
                    rankBg = 'bg-orange-100 text-orange-900 font-bold'
                  }

                  return (
                    <div
                      key={student.id}
                      className={`p-3 rounded-xl flex justify-between items-center text-xs transition-all ${rankBg}`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 flex items-center justify-center font-bold text-sm shrink-0">
                          {rankBadge}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">
                            {student.full_name}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {student.class_code ? `Kelas ${student.class_code}` : `@${student.username}`}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-indigo-700">
                          {student.xp || 0} XP
                        </span>
                        <span className="block text-[9px] text-slate-400 font-bold uppercase">
                          Lvl {student.level || 1}
                        </span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-center text-xs text-slate-400 py-4">
                  Belum ada data siswa untuk peringkat ini.
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}