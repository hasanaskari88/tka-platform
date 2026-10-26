'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

function MonitorContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Filter & Search States
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterClass, setFilterClass] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)

  // Ticker State untuk memperbarui timer live setiap detik
  const [now, setNow] = useState<number>(Date.now())

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timerInterval)
  }, [])

  // 🔄 Fetch Data dari Supabase
  const fetchData = async () => {
    if (!examId) return
    const supabase = createClient()

    // 1. Fetch Data Ujian
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (!examData) {
      alert('Ujian tidak ditemukan!')
      router.push('/admin')
      return
    }
    setExam(examData)

    // 2. Fetch Data Sesi Ujian
    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })

    // 3. Fetch Data Profil Siswa
    const { data: profileData } = await supabase.from('profiles').select('*')

    setExam(examData)
    setSessions(sessionData || [])
    setProfiles(profileData || [])
    setLastUpdated(new Date())
    setLoading(false)
  }

  // Load awal & Interval Auto-Refresh (setiap 5 detik)
  useEffect(() => {
    fetchData()

    let intervalId: NodeJS.Timeout
    if (autoRefresh) {
      intervalId = setInterval(() => {
        fetchData()
      }, 5000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [examId, autoRefresh])

  // Map Profile
  const profileMap = new Map()
  profiles.forEach((p) => profileMap.set(p.id, p))

  // Daftar Kelas Unik
  const uniqueClasses = Array.from(
    new Set(sessions.map((s) => profileMap.get(s.user_id)?.class_code || '-'))
  ).filter(Boolean)

  // Hitung Sisa Waktu Pengerjaan Siswa
  const calculateLiveTimer = (startTimeStr: string, durationMinutes: number) => {
    if (!startTimeStr) return { isExpired: true, displayTime: '00:00', remainingSeconds: 0 }
    const startMs = new Date(startTimeStr).getTime()
    const totalSec = (durationMinutes || 15) * 60
    const elapsedSec = Math.floor((now - startMs) / 1000)
    const remSec = totalSec - elapsedSec

    if (remSec <= 0) {
      return { isExpired: true, displayTime: 'Waktu Habis', remainingSeconds: 0 }
    }

    const m = Math.floor(remSec / 60)
    const s = remSec % 60
    const displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return { isExpired: false, displayTime, remainingSeconds: remSec }
  }

  // 🛑 AKSI 1: Paksa Selesai (Force Submit)
  const handleForceSubmit = async (session: any) => {
    const student = profileMap.get(session.user_id)
    const studentName = student?.full_name || 'Siswa'

    if (!confirm(`Apakah Anda yakin ingin memposting/memaksa SELESAI sesi ujian ${studentName}?`)) {
      return
    }

    const supabase = createClient()
    const nowIso = new Date().toISOString()

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        status: 'completed',
        completed_at: nowIso,
        submitted_at: nowIso,
        end_time: nowIso,
      })
      .eq('id', session.id)

    if (error) {
      alert(`Gagal memproses Force Submit: ${error.message}`)
    } else {
      fetchData()
    }
  }

  // 🔄 AKSI 2: Reset Sesi Ujian (Hapus Sesi agar Siswa Buka Ujian Bersih)
  const handleResetSession = async (session: any) => {
    const student = profileMap.get(session.user_id)
    const studentName = student?.full_name || 'Siswa'

    if (
      !confirm(
        `Apakah Anda yakin ingin MERESET sesi pengerjaan ${studentName}?\n\nSesi lama akan dihapus dan siswa dapat masuk kembali mengerjakan dari awal.`
      )
    ) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('exam_sessions').delete().eq('id', session.id)

    if (error) {
      alert(`Gagal mereset sesi: ${error.message}`)
    } else {
      fetchData()
    }
  }

  // ⏱️ AKSI 3: Perpanjang Waktu (Tambah 10 Menit)
  const handleExtendTime = async (session: any) => {
    const student = profileMap.get(session.user_id)
    const studentName = student?.full_name || 'Siswa'

    if (!confirm(`Tambahkan waktu pengerjaan 10 menit khusus untuk ${studentName}?`)) {
      return
    }

    const supabase = createClient()
    const currentStart = new Date(session.start_time).getTime()
    // Menambah 10 menit sama dengan menggeser start_time maju 10 menit
    const newStart = new Date(currentStart + 10 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        start_time: newStart,
      })
      .eq('id', session.id)

    if (error) {
      alert(`Gagal memperpanjang waktu: ${error.message}`)
    } else {
      fetchData()
    }
  }

  // FILTERING LOGIC
  const filteredSessions = sessions.filter((s) => {
    const student = profileMap.get(s.user_id) || {
      full_name: 'Tamu/Siswa',
      username: 'guest',
      class_code: '-',
    }

    const matchStatus = filterStatus === 'ALL' || s.status === filterStatus
    const matchClass = filterClass === 'ALL' || (student.class_code || '-') === filterClass
    const matchSearch =
      student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.username.toLowerCase().includes(searchQuery.toLowerCase())

    return matchStatus && matchClass && matchSearch
  })

  // STATISTIK KARTU MONITORING
  const totalOngoing = sessions.filter((s) => s.status === 'ongoing').length
  const totalCompleted = sessions.filter((s) => s.status === 'completed').length
  const completedScores = sessions.filter((s) => s.status === 'completed' && s.score !== null).map((s) => Number(s.score))
  const avgScore = completedScores.length > 0 ? completedScores.reduce((a, b) => a + b, 0) / completedScores.length : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center text-slate-600 font-medium">
        Memuat Dashboard Pengawasan Live...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      <Navbar />

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-900 text-white p-6 rounded-2xl shadow-md gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 uppercase flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Live Proctoring Active</span>
              </span>
              <span className="text-xs text-slate-400">
                Update: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              👁️ Pengawasan Ujian: {exam?.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtes: {exam?.subtest} • Durasi Standar: {exam?.duration_minutes} Menit
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                autoRefresh
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 shadow-sm'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {autoRefresh ? '⚡ Auto-Refresh ON (5s)' : '⏸️ Auto-Refresh PAUSED'}
            </button>

            <button
              onClick={fetchData}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
              title="Refresh Manual"
            >
              🔄 Refresh
            </button>

            <Link
              href={`/admin/exam/${examId}/results`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              📊 Rekap Nilai
            </Link>
          </div>
        </div>

        {/* 🟢 KARTU STATISTIK LIVE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Peserta Terdaftar</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {sessions.length} <span className="text-xs font-normal text-slate-400">Siswa</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">🟢 Sedang Mengerjakan</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {totalOngoing} <span className="text-xs font-normal text-emerald-500">Siswa</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/20">
            <span className="text-[10px] font-bold text-indigo-700 uppercase block">✅ Sudah Selesai</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {totalCompleted} <span className="text-xs font-normal text-indigo-500">Siswa</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm bg-purple-50/20">
            <span className="text-[10px] font-bold text-purple-700 uppercase block">Rata-Rata Nilai Live</span>
            <span className="text-2xl font-black text-purple-600 mt-1 block">
              {Math.round(avgScore * 10) / 10} <span className="text-xs font-normal text-purple-400">/ 100</span>
            </span>
          </div>
        </div>

        {/* FILTER BAR & SEARCH */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* SEARCH */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="🔍 Cari nama / username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>

            {/* FILTER STATUS */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 bg-slate-50 focus:outline-none"
            >
              <option value="ALL">Semua Status ({sessions.length})</option>
              <option value="ongoing">🟢 Sedang Mengerjakan ({totalOngoing})</option>
              <option value="completed">✅ Sudah Selesai ({totalCompleted})</option>
            </select>

            {/* FILTER KELAS */}
            {uniqueClasses.length > 0 && (
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 bg-indigo-50/50 focus:outline-none"
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="text-slate-500 font-medium">
            Menampilkan <strong className="text-slate-800">{filteredSessions.length}</strong> Sesi Ujian
          </div>
        </div>

        {/* TABEL PENGAWASAN LIVE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                <tr>
                  <th className="p-3 text-center w-10">No</th>
                  <th className="p-3">Identitas Siswa</th>
                  <th className="p-3 text-center">Kelas</th>
                  <th className="p-3 text-center">Waktu Mulai</th>
                  <th className="p-3 text-center">Status Pengerjaan</th>
                  <th className="p-3 text-center">Sisa Waktu Live</th>
                  <th className="p-3 text-center">Skor / Benar</th>
                  <th className="p-3 text-center w-48">Aksi Kendali Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredSessions.length > 0 ? (
                  filteredSessions.map((s, idx) => {
                    const student = profileMap.get(s.user_id) || {
                      full_name: 'Tamu/Siswa',
                      username: 'guest',
                      class_code: '-',
                    }

                    const timerInfo = calculateLiveTimer(s.start_time, exam?.duration_minutes)
                    const isOngoing = s.status === 'ongoing'

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* NO */}
                        <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>

                        {/* SISWA */}
                        <td className="p-3">
                          <span className="font-bold text-slate-800 block">{student.full_name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">@{student.username}</span>
                        </td>

                        {/* KELAS */}
                        <td className="p-3 text-center font-bold text-slate-700">
                          {student.class_code || '-'}
                        </td>

                        {/* WAKTU MULAI */}
                        <td className="p-3 text-center font-mono text-slate-600">
                          {s.start_time ? new Date(s.start_time).toLocaleTimeString() : '-'}
                        </td>

                        {/* STATUS BADGE */}
                        <td className="p-3 text-center">
                          {isOngoing ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                              🟢 Sedang Mengerjakan
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                              ✅ Selesai
                            </span>
                          )}
                        </td>

                        {/* SISA WAKTU LIVE */}
                        <td className="p-3 text-center font-mono font-bold">
                          {isOngoing ? (
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                timerInfo.isExpired
                                  ? 'bg-rose-100 text-rose-800 font-black animate-bounce'
                                  : 'bg-slate-100 text-indigo-700'
                              }`}
                            >
                              ⏱️ {timerInfo.displayTime}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-normal">Pengerjaan usai</span>
                          )}
                        </td>

                        {/* SKOR */}
                        <td className="p-3 text-center">
                          {s.score !== null && s.score !== undefined ? (
                            <span className="font-black text-indigo-600 text-sm">
                              {s.score} <span className="text-[10px] font-normal text-slate-400">({s.total_correct || 0} Benar)</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[10px]">Belum Submit</span>
                          )}
                        </td>

                        {/* AKSI PROKTOR */}
                        <td className="p-3 text-center space-x-1">
                          {isOngoing ? (
                            <>
                              <button
                                onClick={() => handleForceSubmit(s)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition-colors"
                                title="Paksa Selesai & Simpan Nilai"
                              >
                                🛑 Force Submit
                              </button>
                              <button
                                onClick={() => handleExtendTime(s)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition-colors"
                                title="Tambah Waktu +10 Menit"
                              >
                                ⏱️ +10M
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleResetSession(s)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded text-[10px] transition-colors"
                              title="Reset Sesi agar Siswa Dapat Ulang"
                            >
                              🔄 Reset Sesi
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Belum ada siswa yang sedang/telah mengerjakan ujian ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function MonitorPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Memuat Layar Pengawasan...</div>}>
      <MonitorContent />
    </Suspense>
  )
}