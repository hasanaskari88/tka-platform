'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'

function MonitorContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questionsCount, setQuestionsCount] = useState<number>(0)
  const [sessions, setSessions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Mode Tampilan: 'live' (Semua Sesi Realtime) vs 'best' (Ringkasan Siswa & Multi-Attempt)
  const [viewMode, setViewMode] = useState<'best' | 'live'>('live')

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

    // 2. Fetch Jumlah Soal
    const { count: qCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)

    // 3. Fetch Data Sesi Ujian
    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    // 4. Fetch Data Profil Siswa
    const { data: profileData } = await supabase.from('profiles').select('*')

    setExam(examData)
    setQuestionsCount(qCount || 0)
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

  // Helper Hitung Benar Eksak / Estimasi
  const getDisplayCorrect = (s: any) => {
    if (!s) return 0
    if (s.total_correct !== null && s.total_correct !== undefined && Number(s.total_correct) > 0) {
      return Number(s.total_correct)
    }
    if (s.score !== null && s.score !== undefined && questionsCount > 0) {
      return Math.round((Number(s.score) / 100) * questionsCount)
    }
    return 0
  }

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

  // ⏸️ AKSI 1: PAUSE SESI UJIAN (Bekukan Layar & Waktu Siswa)
    const handlePauseSession = async (sessionId: string) => {
    if (!confirm('Jeda ujian siswa ini?')) return

    const supabase = createClient()
    const pausedAt = new Date().toISOString()

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        status: 'paused',
        paused_at: pausedAt,
      })
      .eq('id', sessionId)
      .eq('status', 'ongoing')

    if (error) {
      alert(`Gagal menjeda ujian: ${error.message}`)
      return
    }

    await fetchData()
  }

  // ▶️ AKSI 2: RESUME SESI UJIAN (Lanjutkan Pengerjaan Siswa)
    const handleResumeSession = async (session: any) => {
    if (!confirm('Lanjutkan ujian siswa ini?')) return

    const supabase = createClient()
    const now = Date.now()
    const pausedAtMs = session.paused_at
      ? new Date(session.paused_at).getTime()
      : now

    const pauseSeconds = Math.max(
      0,
      Math.floor((now - pausedAtMs) / 1000)
    )

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        status: 'ongoing',
        paused_at: null,
        paused_duration_seconds:
          (Number(session.paused_duration_seconds) || 0) + pauseSeconds,
      })
      .eq('id', session.id)
      .eq('status', 'paused')

    if (error) {
      alert(`Gagal melanjutkan ujian: ${error.message}`)
      return
    }

    await fetchData()
  }

  // 🛑 AKSI 3: Force Submit
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
      .in('status', ['ongoing', 'paused'])

    if (error) {
      alert(`Gagal memproses Force Submit: ${error.message}`)
    } else {
      fetchData()
    }
  }

  
  // 🔄 AKSI 4: Reset Sesi Ujian
  const handleResetSession = async (sessionId: string) => {
    if (
      !confirm(
        'Reset sesi ini? Sesi dan seluruh jawabannya akan dihapus permanen. Siswa harus memulai ujian dari awal.'
      )
    ) {
      return
    }

    const supabase = createClient()

    try {
      // Hapus sesi. Jawaban terkait ikut terhapus melalui ON DELETE CASCADE.
      const { data: deletedSession, error } = await supabase
        .from('exam_sessions')
        .delete()
        .eq('id', sessionId)
        .select('id')
        .maybeSingle()

      if (error) {
        throw new Error(`Gagal menghapus sesi: ${error.message}`)
      }

      if (!deletedSession) {
        throw new Error(
          'Sesi tidak terhapus. Periksa izin akses database atau apakah sesi sudah dihapus.'
        )
      }

      await fetchData()

      alert(
        'Sesi berhasil dihapus beserta seluruh jawabannya. Siswa harus memulai ujian dari awal.'
      )
    } catch (error) {
      console.error('Gagal mereset sesi:', error)

      alert(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan saat mereset sesi.'
      )

      await fetchData()
    }
  }



  // ⏱️ AKSI 5: Perpanjang Waktu (+10 Menit)
    const handleExtendTime = async (sessionId: string) => {
    if (!confirm('Tambahkan waktu ujian 10 menit?')) return

    const supabase = createClient()

    const { data: session, error: fetchError } = await supabase
      .from('exam_sessions')
      .select('extra_time_seconds, status')
      .eq('id', sessionId)
      .maybeSingle()

    if (fetchError || !session) {
      alert(`Gagal membaca sesi: ${fetchError?.message || 'Sesi tidak ditemukan'}`)
      return
    }

    if (!['ongoing', 'paused'].includes(session.status)) {
      alert('Tambahan waktu hanya dapat diberikan pada sesi aktif atau pause.')
      return
    }

    const { error } = await supabase
      .from('exam_sessions')
      .update({
        extra_time_seconds:
          (Number(session.extra_time_seconds) || 0) + 600,
      })
      .eq('id', sessionId)
      .in('status', ['ongoing', 'paused'])

    if (error) {
      alert(`Gagal menambah waktu: ${error.message}`)
      return
    }

    await fetchData()
  }

  // FILTERING LOGIC SESI LIVE
  const filteredSessions = [...sessions].reverse().filter((s) => {
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

  // 📊 PENGELOMPOKAN REKAP PER SISWA
  const studentSessionsGroup = new Map<string, any[]>()
  sessions.forEach((s) => {
    if (!s.user_id) return
    if (!studentSessionsGroup.has(s.user_id)) {
      studentSessionsGroup.set(s.user_id, [])
    }
    studentSessionsGroup.get(s.user_id)!.push(s)
  })

  const studentSummaryList: any[] = []
  studentSessionsGroup.forEach((userSessions, userId) => {
    const student = profileMap.get(userId) || {
      full_name: 'Tamu/Siswa',
      username: 'guest',
      class_code: '-',
    }

    const sorted = [...userSessions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const firstAttempt = sorted[0]
    const lastAttempt = sorted[sorted.length - 1]

    let bestAttempt = sorted[0]
    sorted.forEach((s) => {
      const sc = s.score !== null && s.score !== undefined ? Number(s.score) : -1
      const bestSc =
        bestAttempt.score !== null && bestAttempt.score !== undefined ? Number(bestAttempt.score) : -1
      if (sc > bestSc) bestAttempt = s
    })

    studentSummaryList.push({
      userId,
      student,
      attemptsCount: sorted.length,
      firstScore: firstAttempt?.score !== null && firstAttempt?.score !== undefined ? Number(firstAttempt.score) : null,
      firstCorrect: getDisplayCorrect(firstAttempt),
      lastScore: lastAttempt?.score !== null && lastAttempt?.score !== undefined ? Number(lastAttempt.score) : null,
      lastCorrect: getDisplayCorrect(lastAttempt),
      lastStatus: lastAttempt?.status,
      bestScore: bestAttempt?.score !== null && bestAttempt?.score !== undefined ? Number(bestAttempt.score) : null,
      bestCorrect: getDisplayCorrect(bestAttempt),
    })
  })

  const bestFilteredList = studentSummaryList.filter((item) => {
    const matchClass = filterClass === 'ALL' || (item.student.class_code || '-') === filterClass
    const matchSearch =
      item.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.student.username.toLowerCase().includes(searchQuery.toLowerCase())
    return matchClass && matchSearch
  })

  bestFilteredList.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0))

  // STATISTIK KARTU MONITORING
  const totalOngoing = sessions.filter((s) => s.status === 'ongoing').length
  const totalPaused = sessions.filter((s) => s.status === 'paused').length
  const completedScores = bestFilteredList
    .map((item) => item.bestScore)
    .filter((sc) => sc !== null) as number[]

  const avgBestScore =
    completedScores.length > 0 ? completedScores.reduce((a, b) => a + b, 0) / completedScores.length : 0
  const passCount = completedScores.filter((sc) => sc >= 75).length
  const passRate = completedScores.length > 0 ? Math.round((passCount / completedScores.length) * 100) : 0

  // EXPORT EXCEL
  const handleExportExcel = () => {
    if (bestFilteredList.length === 0) return alert('Tidak ada data siswa untuk di-export.')

    const exportRows = bestFilteredList.map((item, idx) => {
      const isPassed = item.bestScore !== null && item.bestScore >= 75
      return {
        No: idx + 1,
        'Nama Lengkap': item.student.full_name,
        Username: item.student.username,
        Kelas: item.student.class_code || '-',
        'Jumlah Percobaan': `${item.attemptsCount}x`,
        'Nilai Pertama (First)': item.firstScore !== null ? item.firstScore : '-',
        'Benar Pertama': item.firstScore !== null ? `${item.firstCorrect}/${questionsCount}` : '-',
        'Nilai Terakhir (Last)': item.lastScore !== null ? item.lastScore : '-',
        'Benar Terakhir': item.lastScore !== null ? `${item.lastCorrect}/${questionsCount}` : '-',
        'Nilai Terbaik (Best)': item.bestScore !== null ? item.bestScore : '-',
        'Benar Terbaik': item.bestScore !== null ? `${item.bestCorrect}/${questionsCount}` : '-',
        'Status KKM (≥75)': isPassed ? 'TUNTAS' : 'BELUM TUNTAS',
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ringkasan Nilai Siswa')

    const classNameClean = filterClass === 'ALL' ? 'Semua_Kelas' : `Kelas_${filterClass}`
    const examTitleClean = (exam?.title || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_')
    XLSX.writeFile(workbook, `Rekap_Nilai_${examTitleClean}_${classNameClean}.xlsx`)
  }

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
              <span className="text-xs text-slate-400">Update: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              👁️ Pengawasan Ujian: {exam?.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtes: {exam?.subtest} • Durasi: {exam?.duration_minutes} Menit • Total Soal: {questionsCount}
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
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl border border-emerald-500 transition-colors flex items-center space-x-1 shadow-sm"
            >
              <span>📊</span>
              <span>Export Excel (.xlsx)</span>
            </button>

            <Link
              href={`/admin/exam/${examId}/results`}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              📊 Rekap Sesi
            </Link>
          </div>
        </div>

        {/* 🟢 KARTU STATISTIK RINGKASAN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Peserta Terdaftar</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">
              {bestFilteredList.length} <span className="text-xs font-normal text-slate-400">Siswa</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20">
            <span className="text-[10px] font-bold text-emerald-700 uppercase block">🟢 Mengerjakan / ⏸️ Pause</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">
              {totalOngoing} <span className="text-xs font-normal text-amber-600">({totalPaused} Dipause)</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm bg-indigo-50/20">
            <span className="text-[10px] font-bold text-indigo-700 uppercase block">🏆 Rata-Rata Terbaik</span>
            <span className="text-2xl font-black text-indigo-600 mt-1 block">
              {Math.round(avgBestScore * 10) / 10} <span className="text-xs font-normal text-indigo-400">/ 100</span>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm bg-teal-50/20">
            <span className="text-[10px] font-bold text-teal-700 uppercase block">Ketuntasan KKM (≥75)</span>
            <span className="text-2xl font-black text-teal-600 mt-1 block">
              {passRate}% <span className="text-xs font-normal text-teal-500">({passCount})</span>
            </span>
          </div>
        </div>

        {/* TAB MODE & FILTER BAR */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
          <div className="flex p-1 bg-slate-100 rounded-xl space-x-1 font-bold">
            <button
              onClick={() => setViewMode('live')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'live' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📺 Semua Sesi Real-Time ({sessions.length})
            </button>
            <button
              onClick={() => setViewMode('best')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'best' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏆 Ringkasan Siswa & Multi-Attempt ({bestFilteredList.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <input
              type="text"
              placeholder="🔍 Cari nama / username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 w-full sm:w-48"
            />

            {viewMode === 'live' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="ALL">Semua Status</option>
                <option value="ongoing">🟢 Sedang Mengerjakan</option>
                <option value="paused">⏸️ Dipause</option>
                <option value="completed">✅ Sudah Selesai</option>
              </select>
            )}

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg font-bold text-indigo-700 bg-indigo-50 focus:outline-none"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {viewMode === 'live' ? (
            /* TABEL LIVE SESSIONS DENGAN TOMBOL PAUSE & RESUME */
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
                    <th className="p-3 text-center w-52">Aksi Kendali Proktor</th>
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
                      const isPaused = s.status === 'paused'
                      const correctCount = getDisplayCorrect(s)

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{student.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{student.username}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {student.class_code || '-'}
                          </td>
                          <td className="p-3 text-center font-mono text-slate-600">
                            {s.start_time ? new Date(s.start_time).toLocaleTimeString() : '-'}
                          </td>
                          <td className="p-3 text-center">
                            {isOngoing && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                                🟢 Mengerjakan
                              </span>
                            )}
                            {isPaused && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                ⏸️ Dipause (Terkunci)
                              </span>
                            )}
                            {s.status === 'completed' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                ✅ Selesai
                              </span>
                            )}
                          </td>
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
                            ) : isPaused ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs">
                                ⏸️ Dihentikan
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-normal">Pengerjaan usai</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono">
                            {s.score !== null && s.score !== undefined ? (
                              <span className="font-black text-indigo-600 text-sm">
                                {s.score}{' '}
                                <span className="text-[11px] font-bold text-emerald-600">
                                  ({correctCount} Benar)
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Belum Submit</span>
                            )}
                          </td>
                          <td className="p-3 text-center space-x-1">
                            {isOngoing && (
                              <>
                                <button
                                  onClick={() => handlePauseSession(s.id)}
                                  className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded text-[10px] transition-colors"
                                  title="Pause Ujian & Kunci Layar Siswa"
                                >
                                  ⏸️ Pause
                                </button>
                                <button
                                  onClick={() => handleForceSubmit(s)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition-colors"
                                  title="Paksa Selesai & Simpan Nilai"
                                >
                                  🛑 Submit
                                </button>
                              </>
                            )}

                            {isPaused && (
                              <>
                                <button
                                  onClick={() => handleResumeSession(s)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition-colors shadow-sm"
                                  title="Buka Kuncian & Lanjutkan Ujian"
                                >
                                  ▶️ Lanjutkan
                                </button>
                                <button
                                  onClick={() => handleForceSubmit(s)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-[10px] transition-colors"
                                  title="Paksa Selesai & Simpan Nilai"
                                >
                                  🛑 Submit
                                </button>
                              </>
                            )}

                            <button
                              onClick={() => handleResetSession(s.id)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold rounded text-[10px] transition-colors"
                              title="Hapus sesi dan jawaban agar siswa mulai dari awal"
                            >
                              🔄 Reset Sesi
                            </button>
                          </td>

                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada sesi ujian yang terdeteksi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* TABEL REKAP MULTI-ATTEMPT */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-800">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Identitas Siswa</th>
                    <th className="p-3 text-center">Kelas</th>
                    <th className="p-3 text-center">Percobaan</th>
                    <th className="p-3 text-center bg-amber-50/50">1st Attempt (Pertama)</th>
                    <th className="p-3 text-center bg-sky-50/50">Last Attempt (Terakhir)</th>
                    <th className="p-3 text-center bg-indigo-50/50">Best Score (Terbaik)</th>
                    <th className="p-3 text-center">Status KKM (≥75)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bestFilteredList.length > 0 ? (
                    bestFilteredList.map((item, idx) => {
                      const isPassed = item.bestScore !== null && item.bestScore >= 75
                      return (
                        <tr key={item.userId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-800 block">{item.student.full_name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{item.student.username}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {item.student.class_code || '-'}
                          </td>
                          <td className="p-3 text-center font-bold">
                            <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-300 text-slate-700 rounded-full text-[10px]">
                              {item.attemptsCount}x
                            </span>
                          </td>
                          <td className="p-3 text-center font-mono bg-amber-50/30">
                            {item.firstScore !== null ? (
                              <span className="font-bold text-amber-900">
                                {item.firstScore}{' '}
                                <span className="text-[10px] font-normal text-amber-700">
                                  ({item.firstCorrect} Benar)
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono bg-sky-50/30">
                            {item.lastScore !== null ? (
                              <span className="font-bold text-sky-900">
                                {item.lastScore}{' '}
                                <span className="text-[10px] font-normal text-sky-700">
                                  ({item.lastCorrect} Benar)
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">-</span>
                            )}
                          </td>
                          <td className="p-3 text-center font-mono bg-indigo-50/30">
                            {item.bestScore !== null ? (
                              <span className="font-black text-indigo-700 text-sm">
                                {item.bestScore}{' '}
                                <span className="text-[11px] font-bold text-emerald-600">
                                  ({item.bestCorrect} Benar)
                                </span>
                              </span>
                            ) : (
                              <span className="text-slate-400 italic text-[10px]">Belum Ada</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {item.bestScore !== null ? (
                              isPassed ? (
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded-full text-[10px]">
                                  ✓ Tuntas
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold border border-rose-300 rounded-full text-[10px]">
                                  ✗ Belum Tuntas
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                        Belum ada data pengerjaan siswa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
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