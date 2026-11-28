'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import * as XLSX from 'xlsx'

function MonitorContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetSessionId = searchParams.get('sessionId')

  const [exam, setExam] = useState<any>(null)
  const [questionsCount, setQuestionsCount] = useState<number>(0)
  const [sessions, setSessions] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const profilesLoadedRef = useRef(false)
  const profilesCacheRef = useRef<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Mode Tampilan: 'live' (Semua Sesi Realtime) vs 'best' (Ringkasan Siswa & Multi-Attempt)
  const [viewMode, setViewMode] = useState<'best' | 'live'>('live')

  // Filter & Search States
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterClass, setFilterClass] = useState<string>('ALL')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [bulkActionLoading, setBulkActionLoading] = useState<'pause' | 'resume' | 'force-submit' | 'extend' | null>(null)
  const [forceSubmitScope, setForceSubmitScope] = useState<'all' | 'ongoing'>('all')
  const [extendMinutes, setExtendMinutes] = useState(5)
  const [proctorEnabled, setProctorEnabled] = useState(false)
  const [proctorRequireFullscreen, setProctorRequireFullscreen] = useState(true)
  const [proctorMaxViolations, setProctorMaxViolations] = useState(3)
  const [proctorSaving, setProctorSaving] = useState(false)
  const [proctorEvents, setProctorEvents] = useState<any[]>([])
  const [sessionNotes, setSessionNotes] = useState<any[]>([])
  const proctorDirtyRef = useRef(false)

  // Ticker State untuk memperbarui timer live setiap detik
  const [now, setNow] = useState<number>(Date.now())
  const serverClockOffsetRef = useRef(0)

  useEffect(() => {
    let active = true
    fetch('/api/server-time', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (active && payload && Number.isFinite(Number(payload.now))) {
        serverClockOffsetRef.current = Number(payload.now) - Date.now()
        setNow(Date.now() + serverClockOffsetRef.current)
      }
    }).catch((error) => console.warn('Sinkronisasi waktu monitor gagal:', error))
    const timerInterval = setInterval(() => setNow(Date.now() + serverClockOffsetRef.current), 1000)
    return () => { active = false; clearInterval(timerInterval) }
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

    // 3. Ambil sesi bertahap agar tidak terkena batas hasil API.
    const sessionData: any[] = []
    for (let offset = 0; ; offset += 500) {
      const { data: pageData, error: pageError } = await supabase.from('exam_sessions').select('*').eq('exam_id', examId).order('created_at', { ascending: true }).range(offset, offset + 499)
      if (pageError) { console.error('Gagal memuat sesi:', pageError); break }
      sessionData.push(...(pageData || []))
      if (!pageData || pageData.length < 500) break
    }
    let profileData = profilesCacheRef.current
    if (!profilesLoadedRef.current) {
      const { data, error: profileError } = await supabase.from('profiles').select('id, full_name, username, class_code')
      if (!profileError) { profileData = data || []; profilesCacheRef.current = profileData; setProfiles(profileData); profilesLoadedRef.current = true }
    }
    setExam(examData)
    if (!proctorDirtyRef.current) {
      setProctorEnabled(Boolean(examData.proctor_enabled))
      setProctorRequireFullscreen(examData.proctor_require_fullscreen !== false)
      setProctorMaxViolations(Number(examData.proctor_max_violations) || 3)
    }
    setQuestionsCount(qCount || 0); setSessions(sessionData); setProfiles(profileData)
    try {
      const [eventResponse, noteResponse] = await Promise.all([
        fetch(`/api/admin/exams/${examId}/proctor-events`, { cache: 'no-store' }),
        fetch(`/api/admin/exams/${examId}/session-notes`, { cache: 'no-store' }),
      ])
      if (eventResponse.ok) {
        const eventPayload = await eventResponse.json()
        setProctorEvents(Array.isArray(eventPayload.events) ? eventPayload.events : [])
      }
      if (noteResponse.ok) {
        const notePayload = await noteResponse.json()
        setSessionNotes(Array.isArray(notePayload.notes) ? notePayload.notes : [])
      }
    } catch (error) {
      console.warn('Riwayat pengawasan atau catatan siswa belum dapat dimuat:', error)
    }
    setLastUpdated(new Date())
    setLoading(false)
  }

  useEffect(() => {
    if (!targetSessionId || loading || viewMode !== 'live') return
    const target = sessions.find((session) => session.id === targetSessionId)
    if (!target) return
    setFilterStatus('ALL')
    setFilterClass('ALL')
    setSearchQuery('')
    const timer = window.setTimeout(() => {
      document.getElementById('session-' + targetSessionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [targetSessionId, loading, sessions, viewMode])

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

  // Jumlah benar hanya ditampilkan jika data evaluasi eksak tersedia.
  const getDisplayCorrect = (s: any) => {
    if (!s || s.total_correct === null || s.total_correct === undefined) return null
    return Number(s.total_correct)
  }

  // Hitung Sisa Waktu Pengerjaan Siswa
  const calculateLiveTimer = (session: any, durationMinutes: number) => {
    if (!session?.start_time) return { isExpired: false, displayTime: 'Waktu belum tersedia', remainingSeconds: null }
    const startMs = new Date(session.start_time).getTime()
    if (!Number.isFinite(startMs)) return { isExpired: false, displayTime: 'Waktu tidak valid', remainingSeconds: null }
    const totalSec = (durationMinutes || 15) * 60
    const accumulatedPause = Number(session.paused_duration_seconds) || 0
    const pausedAtMs = session.paused_at ? new Date(session.paused_at).getTime() : null
    const currentPause = pausedAtMs ? Math.max(0, Math.floor((now - pausedAtMs) / 1000)) : 0
    const extraTime = Number(session.extra_time_seconds) || 0
    const elapsedSec = Math.max(0, Math.floor((now - startMs) / 1000) - accumulatedPause - currentPause)
    const remSec = totalSec + extraTime - elapsedSec

    if (remSec <= 0) {
      return { isExpired: true, displayTime: 'Waktu Habis', remainingSeconds: 0 }
    }

    const m = Math.floor(remSec / 60)
    const s = remSec % 60
    const displayTime = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return { isExpired: false, displayTime, remainingSeconds: remSec }
  }

  const handleSaveProctorSettings = async () => {
    setProctorSaving(true)
    try {
      const response = await fetch(`/api/admin/exams/${examId}/proctor-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: proctorEnabled,
          requireFullscreen: proctorRequireFullscreen,
          maxViolations: proctorMaxViolations,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Pengaturan gagal disimpan.')
      setExam((current: any) => ({ ...current, ...payload.settings }))
      proctorDirtyRef.current = false
      alert('Pengaturan pengawasan berhasil disimpan.')
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Pengaturan pengawasan gagal disimpan.')
    } finally {
      setProctorSaving(false)
    }
  }

    // ⏸️ AKSI 1: PAUSE SESI UJIAN (Bekukan Layar & Waktu Siswa)
    const handlePauseSession = async (sessionId: string) => {
    if (!confirm('Jeda ujian siswa ini?')) return

    const supabase = createClient()

    const { error } = await supabase
      .from('exam_sessions')
      .update({ status: 'paused' })
      .eq('id', sessionId)
      .eq('status', 'ongoing')

    if (error) {
      alert(`Gagal menjeda ujian: ${error.message}`)
      return
    }

    await fetchData()
  }

  // ⏸️▶️ KENDALI MASSAL SESUAI FILTER KELAS
  const handleBulkSessionAction = async (action: 'pause' | 'resume') => {
    const targetStatus = action === 'pause' ? 'ongoing' : 'paused'
    const targetSessions = sessions.filter((session) => {
      const studentClass = profileMap.get(session.user_id)?.class_code || '-'
      const matchesClass = filterClass === 'ALL' || studentClass === filterClass
      return matchesClass && session.status === targetStatus
    })

    if (targetSessions.length === 0) {
      alert(action === 'pause'
        ? 'Tidak ada siswa yang sedang mengerjakan pada cakupan kelas ini.'
        : 'Tidak ada siswa yang sedang pause pada cakupan kelas ini.')
      return
    }

    const scopeLabel = filterClass === 'ALL' ? 'SEMUA KELAS' : `KELAS ${filterClass}`
    const actionLabel = action === 'pause' ? 'PAUSE' : 'LANJUTKAN'
    if (!confirm(`${actionLabel} ${targetSessions.length} sesi ujian di ${scopeLabel}?\n\nSesi yang sudah selesai tidak akan diubah.`)) return

    setBulkActionLoading(action)
    const supabase = createClient()

    try {
      if (action === 'pause') {
        const sessionIds = targetSessions.map((session) => session.id)
        const { data: pausedRows, error } = await supabase
          .from('exam_sessions')
          .update({ status: 'paused' })
          .eq('exam_id', examId)
          .eq('status', 'ongoing')
          .in('id', sessionIds)
          .select('id')

        if (error) throw error
        if ((pausedRows || []).length !== sessionIds.length) {
          throw new Error(`Hanya ${(pausedRows || []).length} dari ${sessionIds.length} sesi yang berhasil dipause. Sebagian status sesi mungkin sudah berubah.`)
        }
      } else {
        const results = await Promise.all(targetSessions.map(async (session) => {
          const response = await fetch(`/api/admin/exams/${examId}/resume-session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: session.id }),
          })
          const payload = await response.json()
          return { ok: response.ok, error: payload.error }
        }))
        const failed = results.filter((result) => !result.ok)
        if (failed.length > 0) {
          throw new Error(`${failed.length} dari ${targetSessions.length} sesi gagal dilanjutkan. ${failed[0].error || 'Sebagian status sesi mungkin sudah berubah.'}`)
        }
      }

      await fetchData()
      alert(`${targetSessions.length} sesi di ${scopeLabel} berhasil ${action === 'pause' ? 'dipause' : 'dilanjutkan'}.`)
    } catch (error: any) {
      alert(`Gagal menjalankan ${actionLabel.toLowerCase()} massal: ${error.message || 'Kesalahan tidak diketahui'}`)
      await fetchData()
    } finally {
      setBulkActionLoading(null)
    }
  }

  // ▶️ AKSI 2: RESUME SESI UJIAN (Lanjutkan Pengerjaan Siswa)
    const handleResumeSession = async (session: any) => {
    if (!confirm('Lanjutkan ujian siswa ini?')) return

    try {
      const response = await fetch(`/api/admin/exams/${examId}/resume-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Gagal melanjutkan sesi.')
      await fetchData()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal melanjutkan ujian.')
    }
  }

  // 🛑 AKSI 3: Force Submit
  const handleForceSubmit = async (session: any) => {
    const studentName = profileMap.get(session.user_id)?.full_name || 'Siswa'
    if (session.force_submit_state === 'requested') { alert('Perintah pengumpulan untuk siswa ini sudah berjalan.'); return }
    if (!confirm(`Kirim permintaan pengumpulan kepada ${studentName}? Siswa memiliki waktu maksimal 5 menit. Jika tidak merespons, server akan menutup sesi dengan jawaban terakhir yang tersimpan.`)) return
    const { error } = await createClient().from('exam_sessions').update({ force_submit_state: 'requested' }).eq('id', session.id).in('status', ['ongoing', 'paused'])
    if (error) alert(`Gagal mengirim perintah: ${error.message}`); else await fetchData()
  }

  const handleForceSubmitAll = async () => {
    const targets = sessions.filter((session) => {
      const cls = profileMap.get(session.user_id)?.class_code || '-'
      const classMatches = filterClass === 'ALL' || cls === filterClass
      const statusMatches = forceSubmitScope === 'all' ? ['ongoing', 'paused'].includes(session.status) : session.status === 'ongoing'
      return classMatches && statusMatches && session.force_submit_state !== 'requested'
    })
    if (!targets.length) { alert('Tidak ada sesi yang sesuai.'); return }
    if (!confirm(`Kirim Force Submit ke ${targets.length} sesi? Siswa mendapat waktu maksimal 5 menit.`)) return
    setBulkActionLoading('force-submit')
    try {
      const supabase = createClient()
      for (let offset = 0; offset < targets.length; offset += 50) {
        const ids = targets.slice(offset, offset + 50).map((x) => x.id)
        const { error } = await supabase.from('exam_sessions').update({ force_submit_state: 'requested' }).in('id', ids).in('status', forceSubmitScope === 'all' ? ['ongoing', 'paused'] : ['ongoing'])
        if (error) throw error
      }
      await fetchData(); alert(`Perintah dikirim ke ${targets.length} sesi. Batas respons 5 menit.`)
    } catch (error: any) { alert(`Force Submit All gagal: ${error?.message || 'Kesalahan tidak diketahui'}`); await fetchData() }
    finally { setBulkActionLoading(null) }
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



  // Tambahan waktu kelipatan lima menit, maksimal sepertiga alokasi asli.
  const maxExtraMinutes = Math.floor((Number(exam?.duration_minutes || 0) / 3) / 5) * 5
  const handleExtendTime = async (sessionId: string) => {
    if (extendMinutes < 5 || extendMinutes % 5 !== 0 || extendMinutes > maxExtraMinutes) {
      alert(`Maksimal tambahan waktu ujian ini ${maxExtraMinutes} menit.`); return
    }
    const supabase = createClient()
    const { data: session, error: fetchError } = await supabase.from('exam_sessions').select('extra_time_seconds, status').eq('id', sessionId).maybeSingle()
    if (fetchError || !session) { alert(`Gagal membaca sesi: ${fetchError?.message || 'Sesi tidak ditemukan'}`); return }
    const previous = Number(session.extra_time_seconds) || 0
    const next = previous + extendMinutes * 60
    if (!['ongoing', 'paused'].includes(session.status)) { alert('Tambahan waktu hanya untuk sesi aktif atau pause.'); return }
    if (next > maxExtraMinutes * 60) { alert('Batas tambahan waktu kumulatif siswa ini sudah tercapai.'); return }
    const { error } = await supabase.from('exam_sessions').update({ extra_time_seconds: next }).eq('id', sessionId).eq('extra_time_seconds', previous).in('status', ['ongoing', 'paused'])
    if (error) alert(`Gagal menambah waktu: ${error.message}`)
    await fetchData()
  }

  const handleExtendTimeAll = async () => {
    if (extendMinutes < 5 || extendMinutes > maxExtraMinutes) { alert(`Maksimal tambahan waktu ujian ini ${maxExtraMinutes} menit.`); return }
    const targets = sessions.filter((session) => {
      const cls = profileMap.get(session.user_id)?.class_code || '-'
      return (filterClass === 'ALL' || cls === filterClass) && ['ongoing', 'paused'].includes(session.status)
    })
    if (!targets.length) { alert('Tidak ada sesi aktif atau pause pada kelas yang dipilih.'); return }
    if (!confirm(`Tambahkan ${extendMinutes} menit ke ${targets.length} sesi? Batas kumulatif per siswa ${maxExtraMinutes} menit.`)) return
    setBulkActionLoading('extend')
    try {
      const supabase = createClient()
      let updated = 0, skipped = 0
      for (const session of targets) {
        const previous = Number(session.extra_time_seconds) || 0
        if (previous + extendMinutes * 60 > maxExtraMinutes * 60) { skipped++; continue }
        const { data, error } = await supabase.from('exam_sessions').update({ extra_time_seconds: previous + extendMinutes * 60 })
          .eq('id', session.id).eq('extra_time_seconds', previous).in('status', ['ongoing', 'paused']).select('id')
        if (error) throw error
        if (data?.length) updated++; else skipped++
      }
      await fetchData()
      alert(`Tambahan waktu diberikan kepada ${updated} siswa. ${skipped} sesi dilewati karena batas tercapai atau data berubah.`)
    } catch (error: any) { alert(`Tambah Waktu All gagal: ${error?.message || 'Kesalahan tidak diketahui'}`); await fetchData() }
    finally { setBulkActionLoading(null) }
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
  const passCount = completedScores.filter((sc) => sc >= 70).length
  const passRate = completedScores.length > 0 ? Math.round((passCount / completedScores.length) * 100) : 0

  // EXPORT EXCEL
  const handleExportExcel = () => {
    if (bestFilteredList.length === 0) return alert('Tidak ada data siswa untuk di-export.')

    const exportRows = bestFilteredList.map((item, idx) => {
      const isPassed = item.bestScore !== null && item.bestScore >= 70
      return {
        No: idx + 1,
        'Nama Lengkap': item.student.full_name,
        Username: item.student.username,
        Kelas: item.student.class_code || '-',
        'Jumlah Percobaan': `${item.attemptsCount}x`,
        'Nilai Pertama (First)': item.firstScore !== null ? item.firstScore : '-',
        'Benar Pertama': item.firstScore !== null ? `${item.firstCorrect ?? '-'}/${questionsCount}` : '-',
        'Nilai Terakhir (Last)': item.lastScore !== null ? item.lastScore : '-',
        'Benar Terakhir': item.lastScore !== null ? `${item.lastCorrect ?? '-'}/${questionsCount}` : '-',
        'Nilai Terbaik (Best)': item.bestScore !== null ? item.bestScore : '-',
        'Benar Terbaik': item.bestScore !== null ? `${item.bestCorrect ?? '-'}/${questionsCount}` : '-',
        'Status KKM (≥70)': isPassed ? 'TUNTAS' : 'BELUM TUNTAS',
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

      <main className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6">
        {/* HEADER & CONTROLS */}
        <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-4 text-white shadow-md sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 uppercase flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Live Proctoring Active</span>
              </span>
              <span className="text-xs text-slate-400">Pembaruan terakhir: {lastUpdated.toLocaleTimeString()}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black mt-1">
              👁️ Pengawasan Ujian: {exam?.title}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Subtes: {exam?.subtest} • Durasi: {exam?.duration_minutes} Menit • Total Soal: {questionsCount}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 transition-colors hover:bg-slate-700">← Dashboard</Link>
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

            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 p-1">
              <select value={forceSubmitScope} onChange={(e) => setForceSubmitScope(e.target.value as 'all' | 'ongoing')} className="rounded-lg bg-slate-700 px-2 py-2 text-[10px] font-bold text-white"><option value="all">Ongoing + Pause</option><option value="ongoing">Ongoing saja</option></select>
              <button onClick={handleForceSubmitAll} disabled={bulkActionLoading !== null} className="rounded-lg bg-rose-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">{bulkActionLoading === 'force-submit' ? 'Mengirim...' : 'Force Submit All'}</button>
              <select value={extendMinutes} onChange={(e) => setExtendMinutes(Number(e.target.value))} className="rounded-lg bg-slate-700 px-2 py-2 text-[10px] font-bold text-white">
                {Array.from({ length: Math.floor(maxExtraMinutes / 5) }, (_, i) => (i + 1) * 5).map((minutes) => <option key={minutes} value={minutes}>{minutes} menit</option>)}
              </select>
              <button onClick={handleExtendTimeAll} disabled={bulkActionLoading !== null || maxExtraMinutes < 5} className="rounded-lg bg-indigo-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">{bulkActionLoading === 'extend' ? 'Menambah...' : 'Tambah Waktu All'}</button>
            </div>
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

        <section className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-black text-slate-800">🔐 Pengaturan Pengawasan Ujian</h2>
              <p className="mt-1 text-[11px] text-slate-500">Pelanggaran mencapai batas akan menjeda sesi. Jawaban tidak dikumpulkan otomatis.</p>
            </div>
            <button type="button" onClick={handleSaveProctorSettings} disabled={proctorSaving} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50">
              {proctorSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={proctorEnabled} onChange={(e) => { proctorDirtyRef.current = true; setProctorEnabled(e.target.checked) }} />
              Aktifkan pengawasan
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700">
              <input type="checkbox" checked={proctorRequireFullscreen} onChange={(e) => { proctorDirtyRef.current = true; setProctorRequireFullscreen(e.target.checked) }} disabled={!proctorEnabled} />
              Wajib Full Screen
            </label>
            <label className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700">
              Batas pelanggaran
              <select value={proctorMaxViolations} onChange={(e) => { proctorDirtyRef.current = true; setProctorMaxViolations(Number(e.target.value)) }} disabled={!proctorEnabled} className="rounded-lg border border-slate-300 bg-white px-2 py-1">
                {[1,2,3,4,5,6,7,8,9,10,15,20,25,30,50].map((value) => <option key={value} value={value}>{value} kali</option>)}
              </select>
            </label>
          </div>
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-black text-slate-700">📝 Catatan Pribadi Siswa</h3>
              <span className="text-[10px] font-semibold text-slate-500">{sessionNotes.length} catatan tersimpan</span>
            </div>
            {sessionNotes.length > 0 ? (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {sessionNotes.map((note) => {
                  const student = profiles.find((profile) => profile.id === note.user_id)
                  const session = sessions.find((item) => item.id === note.session_id)
                  return (
                    <article key={note.id} className="rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-black text-slate-800">{student?.full_name || 'Siswa'} <span className="font-normal text-slate-500">· Kelas {student?.class_code || '-'}</span></span>
                        <span className="text-[10px] text-slate-500">{new Date(note.updated_at).toLocaleString('id-ID')} {session?.status ? `· ${session.status}` : ''}</span>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700">{note.content}</p>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-3 text-[11px] text-slate-500">Belum ada catatan yang dikirim siswa. Catatan akan muncul otomatis setelah siswa menulis dan penyimpanan berhasil.</p>
            )}
          </div>
          <div className="border-t border-slate-100 pt-3">
            <h3 className="mb-2 text-xs font-black text-slate-700">Riwayat Pelanggaran Terbaru</h3>
            {proctorEvents.length > 0 ? (
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {proctorEvents.slice(0, 20).map((event) => {
                  const student = profiles.find((profile) => profile.id === event.user_id)
                  return (
                    <div key={event.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
                      <span className="font-bold text-slate-700">{student?.full_name || 'Siswa'} · {event.event_type === 'tab_hidden' ? 'Berpindah tab / aplikasi' : 'Keluar Full Screen'}</span>
                      <span className="text-slate-500">Pelanggaran {event.violation_number} · {new Date(event.occurred_at).toLocaleString('id-ID')}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Belum ada pelanggaran tercatat.</p>
            )}
          </div>
        </section>

        {/* 🟢 KARTU STATISTIK RINGKASAN */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
            <span className="text-[10px] font-bold text-teal-700 uppercase block">Ketuntasan KKM (≥70)</span>
            <span className="text-2xl font-black text-teal-600 mt-1 block">
              {passRate}% <span className="text-xs font-normal text-teal-500">({passCount})</span>
            </span>
          </div>
        </div>

        {/* TAB MODE & FILTER BAR */}
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-sm md:flex-row md:items-center md:justify-between md:p-4">
          <div className="flex w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1 font-bold md:w-auto">
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

          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto">
            <input
              type="text"
              placeholder="🔍 Cari nama / username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:w-48"
            />

            {viewMode === 'live' && (
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-bold text-slate-700 sm:w-auto"
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
              className="w-full rounded-lg border border-slate-300 bg-indigo-50 px-3 py-2 font-bold text-indigo-700 sm:w-auto"
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>

            {viewMode === 'live' && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-2">
                <span className="w-full text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:w-auto">
                  Kendali {filterClass === 'ALL' ? 'Semua Kelas' : `Kelas ${filterClass}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleBulkSessionAction('pause')}
                  disabled={bulkActionLoading !== null}
                  className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkActionLoading === 'pause' ? 'Memproses...' : '⏸ Pause All'}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkSessionAction('resume')}
                  disabled={bulkActionLoading !== null}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkActionLoading === 'resume' ? 'Memproses...' : '▶ Lanjutkan All'}
                </button>
              </div>
            )}
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

                      const timerInfo = calculateLiveTimer(s, exam?.duration_minutes)
                      const isOngoing = s.status === 'ongoing'
                      const isPaused = s.status === 'paused'
                      const correctCount = getDisplayCorrect(s)

                      return (
                        <tr id={'session-' + s.id} key={s.id} className={`transition-colors ${s.id===targetSessionId?'bg-amber-100 ring-2 ring-inset ring-amber-400':'hover:bg-slate-50/80'}`}>
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
                            {Number(s.proctor_violation_count) > 0 && (
                              <div className="mt-1 text-[10px] font-black text-rose-700">
                                ⚠ {s.proctor_violation_count} pelanggaran{s.proctor_auto_paused ? ' · Auto-pause' : ''}
                              </div>
                            )}
                            {s.proctor_pause_reason && s.status === 'paused' && (
                              <div className="mt-1 max-w-[180px] text-[9px] leading-tight text-amber-800">{s.proctor_pause_reason}</div>
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
                                  ({correctCount ?? '—'} Benar)
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
                                <button
                                  onClick={() => handleExtendTime(s.id)}
                                  disabled={maxExtraMinutes < 5 || extendMinutes > maxExtraMinutes}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition-colors disabled:opacity-40"
                                  title={`Tambah waktu ${extendMinutes} menit`}
                                >
                                  +{extendMinutes}m
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
                                <button
                                  onClick={() => handleExtendTime(s.id)}
                                  disabled={maxExtraMinutes < 5 || extendMinutes > maxExtraMinutes}
                                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-[10px] transition-colors disabled:opacity-40"
                                  title={`Tambah waktu ${extendMinutes} menit`}
                                >
                                  +{extendMinutes}m
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
                    <th className="p-3 text-center">Status KKM (≥70)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bestFilteredList.length > 0 ? (
                    bestFilteredList.map((item, idx) => {
                      const isPassed = item.bestScore !== null && item.bestScore >= 70
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
                                  ({item.firstCorrect ?? '—'} Benar)
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
                                  ({item.lastCorrect ?? '—'} Benar)
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
                                  ({item.bestCorrect ?? '—'} Benar)
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