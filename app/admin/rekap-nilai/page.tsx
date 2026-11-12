'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import {
  BarChart3, Download, RefreshCw, Search, Trash2, Users, Trophy,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Filter,
  ClipboardList, BookOpen, GraduationCap
} from 'lucide-react'

type Student = { id: string; full_name: string | null; username: string | null; class_code: string | null }
type Exam = { id: string; title: string; subtest: string | null; target_mode: string | null; activity_type: string | null }
type RawSession = { id: string; user_id: string; exam_id: string; status: string; score: number | null; score_override: number | null; bonus_points: number | null; start_time: string | null; end_time: string | null; submitted_at: string | null; completed_at: string | null }
type RawPractice = { id: string; user_id: string; exam_id: string; attempt_number: number; status: string; score: number | null; started_at: string | null; completed_at: string | null; created_at: string | null }
type Attempt = {
  id: string; kind: 'exam' | 'practice'; userId: string; examId: string
  title: string; subtest: string; classCode: string; studentName: string; username: string
  status: string; score: number | null; date: string | null; attemptNumber: number | null
}
type PackageSummary = { key: string; title: string; subtest: string; kind: string; attempts: Attempt[]; best: number | null; latest: Attempt | null }

const dateLabel = (value: string | null) => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const scoreLabel = (value: number | null) => value === null || !Number.isFinite(value) ? '—' : Number(value).toLocaleString('id-ID', { maximumFractionDigits: 1 })
const completed = (status: string, kind: string) => kind === 'exam' ? status === 'completed' : status === 'completed'

export default function RekapNilaiPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [examSessions, setExamSessions] = useState<RawSession[]>([])
  const [practiceAttempts, setPracticeAttempts] = useState<RawPractice[]>([])
  const [assignedClasses, setAssignedClasses] = useState<string[]>([])
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false)
  const [kkm, setKkm] = useState(70)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'student' | 'subtest' | 'package'>('student')
  const [packageFilter, setPackageFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')
  const classFilterInitializedRef = useRef(false)
  const [subtestFilter, setSubtestFilter] = useState('ALL')
  const [activityFilter, setActivityFilter] = useState<'ALL' | 'exam' | 'practice'>('ALL')
  const [scoreFilter, setScoreFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'class' | 'score' | 'date' | 'title'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [expanded, setExpanded] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)

  const loadData = async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/rekap-nilai', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Data rekap gagal dimuat.')
      setStudents(payload.students || [])
      setExams(payload.exams || [])
      setExamSessions(payload.examSessions || [])
      setPracticeAttempts(payload.practiceAttempts || [])
      setAssignedClasses(payload.assignedClassCodes || [])
      setIsGlobalAdmin(Boolean(payload.isGlobalAdmin))
      setKkm(Number(payload.kkm ?? 70))
      // Sama seperti halaman penilaian manual: kelas ampuan hanya menjadi
      // pilihan awal, bukan pembatasan data. Inisialisasi hanya sekali agar
      // pilihan filter pengguna tidak tertimpa saat memuat ulang.
      if (!classFilterInitializedRef.current) {
        if (payload.assignedClassCodes?.length === 1) setClassFilter(payload.assignedClassCodes[0])
        else if (payload.assignedClassCodes?.length > 1) setClassFilter('ASSIGNED')
        classFilterInitializedRef.current = true
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const attempts = useMemo<Attempt[]>(() => {
    const studentMap = new Map(students.map(student => [student.id, student]))
    const examMap = new Map(exams.map(exam => [exam.id, exam]))
    const rows: Attempt[] = []
    examSessions.forEach(session => {
      const student = studentMap.get(session.user_id)
      const exam = examMap.get(session.exam_id)
      if (!student || !exam) return
      rows.push({
        id: session.id, kind: 'exam', userId: session.user_id, examId: session.exam_id,
        title: exam.title, subtest: exam.subtest || 'Tanpa subtes',
        classCode: student.class_code || 'Tanpa kelas', studentName: student.full_name || student.username || 'Tanpa nama',
        username: student.username || '', status: session.status,
        score: completed(session.status, 'exam') ? Number(session.score_override ?? session.score ?? 0) : null,
        date: session.completed_at || session.submitted_at || session.end_time || session.start_time,
        attemptNumber: null,
      })
    })
    practiceAttempts.forEach(attempt => {
      const student = studentMap.get(attempt.user_id)
      const exam = examMap.get(attempt.exam_id)
      if (!student || !exam) return
      rows.push({
        id: attempt.id, kind: 'practice', userId: attempt.user_id, examId: attempt.exam_id,
        title: exam.title, subtest: exam.subtest || 'Tanpa subtes',
        classCode: student.class_code || 'Tanpa kelas', studentName: student.full_name || student.username || 'Tanpa nama',
        username: student.username || '', status: attempt.status,
        score: completed(attempt.status, 'practice') ? Number(attempt.score ?? 0) : null,
        date: attempt.completed_at || attempt.created_at || attempt.started_at,
        attemptNumber: attempt.attempt_number,
      })
    })
    return rows
  }, [students, exams, examSessions, practiceAttempts])

  const classes = useMemo(() => [...new Set(students.map(s => String(s.class_code || '').trim()).filter(Boolean))].sort(), [students])
  const subtests = useMemo(() => [...new Set(attempts.map(a => a.subtest).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'id')), [attempts])

  const visibleAttempts = useMemo(() => attempts.filter(attempt => {
    const classOk = classFilter === 'ALL' || (classFilter === 'ASSIGNED' ? assignedClasses.includes(attempt.classCode) : attempt.classCode === classFilter)
    const subtestOk = subtestFilter === 'ALL' || attempt.subtest === subtestFilter
    const activityOk = activityFilter === 'ALL' || attempt.kind === activityFilter
    const packageOk = packageFilter === 'ALL' || attempt.examId === packageFilter
    const scoreOk = scoreFilter === 'ALL' ||
      (scoreFilter === 'UNSCORED' ? attempt.score === null :
        attempt.score !== null && (scoreFilter === 'BELOW' ? attempt.score < kkm :
          scoreFilter === 'PASS' ? attempt.score >= kkm :
          scoreFilter === '80' ? attempt.score >= 80 && attempt.score < 90 :
          scoreFilter === '90' ? attempt.score >= 90 : attempt.score >= 70 && attempt.score < 80))
    const term = search.trim().toLocaleLowerCase('id')
    const searchOk = !term || attempt.studentName.toLocaleLowerCase('id').includes(term) ||
      attempt.username.toLocaleLowerCase('id').includes(term) || attempt.title.toLocaleLowerCase('id').includes(term)
    return classOk && subtestOk && activityOk && packageOk && scoreOk && searchOk
  }), [attempts, classFilter, assignedClasses, subtestFilter, activityFilter, packageFilter, scoreFilter, kkm, search])

  const packageRows = useMemo(() => {
    const grouped = new Map<string, Attempt[]>()
    visibleAttempts.forEach(attempt => {
      const key = attempt.kind + ':' + attempt.examId
      grouped.set(key, [...(grouped.get(key) || []), attempt])
    })
    return [...grouped.entries()].map(([key, history]) => {
      const scored = history.filter(item => item.score !== null)
      const scores = scored.map(item => Number(item.score))
      const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
      return {
        key, title: history[0].title, subtest: history[0].subtest, kind: history[0].kind,
        attempts: history.length, participants: new Set(history.map(item => item.userId)).size,
        completed: scored.length, average,
        highest: scores.length ? Math.max(...scores) : null,
        lowest: scores.length ? Math.min(...scores) : null,
        passed: scores.filter(score => score >= kkm).length,
        history: [...history].sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()),
      }
    }).sort((a,b) => a.title.localeCompare(b.title, 'id') || a.kind.localeCompare(b.kind))
  }, [visibleAttempts, kkm])

  const studentsInScope = useMemo(() => students.filter(student => {
    const cls = String(student.class_code || '').trim()
    return classFilter === 'ALL' || (classFilter === 'ASSIGNED' ? assignedClasses.includes(cls) : cls === classFilter)
  }), [students, classFilter, assignedClasses])

  const participantRows = useMemo(() => {
    const grouped = new Map<string, Attempt[]>()
    visibleAttempts.forEach(attempt => grouped.set(attempt.userId, [...(grouped.get(attempt.userId) || []), attempt]))
    const rows = studentsInScope.filter(student => {
      const term = search.trim().toLocaleLowerCase('id')
      return !term || String(student.full_name || '').toLocaleLowerCase('id').includes(term) || String(student.username || '').toLocaleLowerCase('id').includes(term) || (grouped.get(student.id) || []).length > 0
    }).map(student => {
      const history = grouped.get(student.id) || []
      const packages = new Map<string, PackageSummary>()
      history.forEach(attempt => {
        const key = attempt.kind + ':' + attempt.examId
        const item = packages.get(key) || { key, title: attempt.title, subtest: attempt.subtest, kind: attempt.kind, attempts: [], best: null, latest: null }
        item.attempts.push(attempt)
        packages.set(key, item)
      })
      const packageList = [...packages.values()].map(item => {
        const finished = item.attempts.filter(a => a.score !== null)
        item.best = finished.length ? Math.max(...finished.map(a => Number(a.score))) : null
        item.latest = [...item.attempts].sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0] || null
        item.attempts.sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
        return item
      })
      if (sortBy === 'title') packageList.sort((a, b) => a.title.localeCompare(b.title, 'id'))
      const bestScores = packageList.map(p => p.best).filter((v): v is number => v !== null)
      const average = bestScores.length ? bestScores.reduce((sum, v) => sum + v, 0) / bestScores.length : null
      const latestDate = history.map(a => a.date).filter(Boolean).sort().reverse()[0] || null
      return { student, packages: packageList, attempts: history, average, completedPackages: bestScores.length, totalPackages: packageList.length, latestDate }
    })
    return rows.sort((a,b) => {
      let result = 0
      if (sortBy === 'name') result = (a.student.full_name || a.student.username || '').localeCompare(b.student.full_name || b.student.username || '', 'id')
      if (sortBy === 'class') result = (a.student.class_code || '').localeCompare(b.student.class_code || '', 'id')
      if (sortBy === 'score') result = (a.average ?? -1) - (b.average ?? -1)
      if (sortBy === 'date') result = new Date(a.latestDate || 0).getTime() - new Date(b.latestDate || 0).getTime()
      if (sortBy === 'title') result = a.packages.map((p: PackageSummary) => p.title).sort((x: string, y: string) => x.localeCompare(y, 'id')).join(' ').localeCompare(b.packages.map((p: PackageSummary) => p.title).sort((x: string, y: string) => x.localeCompare(y, 'id')).join(' '), 'id')
      return sortOrder === 'asc' ? result : -result
    })
  }, [studentsInScope, visibleAttempts, search, sortBy, sortOrder])

  const subtestRows = useMemo(() => {
    const grouped = new Map<string, Attempt[]>()
    visibleAttempts.filter(a => subtestFilter === 'ALL' || a.subtest === subtestFilter).forEach(attempt =>
      grouped.set(attempt.userId, [...(grouped.get(attempt.userId) || []), attempt]))
    return [...grouped.entries()].map(([userId, history]) => {
      const finished = history.filter(a => a.score !== null)
      const best = finished.length ? Math.max(...finished.map(a => Number(a.score))) : null
      const latest = [...history].sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())[0]
      return { userId, studentName: history[0].studentName, username: history[0].username, classCode: history[0].classCode, history: history.sort((a,b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()), best, latest, average: best }
    }).sort((a,b) => {
      let result = sortBy === 'name' ? a.studentName.localeCompare(b.studentName, 'id') :
        sortBy === 'class' ? a.classCode.localeCompare(b.classCode, 'id') :
        sortBy === 'date' ? new Date(a.latest.date || 0).getTime() - new Date(b.latest.date || 0).getTime() :
        sortBy === 'title' ? a.history.map(item => item.title).sort((x,y) => x.localeCompare(y, 'id')).join(' ').localeCompare(b.history.map(item => item.title).sort((x,y) => x.localeCompare(y, 'id')).join(' '), 'id') :
        (a.best ?? -1) - (b.best ?? -1)
      return sortOrder === 'asc' ? result : -result
    })
  }, [visibleAttempts, subtestFilter, sortBy, sortOrder])

  const selectedItems = useMemo(() => attempts.filter(a => selected.includes(a.kind + ':' + a.id)), [attempts, selected])
  const totalCompleted = visibleAttempts.filter(a => a.score !== null).length
  const averageVisible = visibleAttempts.filter(a => a.score !== null).length
    ? visibleAttempts.filter(a => a.score !== null).reduce((sum,a) => sum + Number(a.score), 0) / totalCompleted : 0
  const metKkm = visibleAttempts.filter(a => a.score !== null && a.score >= kkm).length
  const toggleExpanded = (key: string) => setExpanded(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key])
  const toggleSelected = (attempt: Attempt) => {
    const key = attempt.kind + ':' + attempt.id
    setSelected(old => old.includes(key) ? old.filter(x => x !== key) : [...old, key])
  }
  const selectVisible = () => {
    const keys = visibleAttempts.map(a => a.kind + ':' + a.id)
    setSelected(old => keys.every(key => old.includes(key))
      ? old.filter(key => !keys.includes(key))
      : [...new Set([...old, ...keys])])
  }

  const exportExcel = () => {
    const workbook = XLSX.utils.book_new()
    const summary = (mode === 'student' ? participantRows : mode === 'package' ? packageRows : subtestRows).map((row: any, index: number) => ({
      No: index + 1,
      Nama: mode === 'student' ? row.student.full_name : mode === 'package' ? row.title : row.studentName,
      Username: mode === 'student' ? row.student.username : mode === 'package' ? '' : row.username,
      Kelas: mode === 'student' ? row.student.class_code : mode === 'package' ? '' : row.classCode,
      'Jumlah Riwayat': mode === 'student' ? row.attempts.length : mode === 'package' ? row.attempts : row.history.length,
      'Paket/Subtes Selesai': mode === 'student' ? row.completedPackages : mode === 'package' ? row.completed : row.history.filter((a: Attempt) => a.score !== null).length,
      'Rata-rata Nilai Terbaik': mode === 'student' ? (row.average === null ? '' : Number(row.average.toFixed(1))) : mode === 'package' ? (row.average === null ? '' : Number(row.average.toFixed(1))) : (row.best ?? ''),
      'Waktu Terakhir': dateLabel(mode === 'student' ? row.latestDate : mode === 'package' ? row.history[0]?.date || null : row.latest?.date || null),
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), mode === 'student' ? 'Per Peserta' : mode === 'package' ? 'Per Paket' : 'Per Subtes')
    const detail = visibleAttempts.map((a,index) => ({
      No:index+1, Nama:a.studentName, Kelas:a.classCode, Subtes:a.subtest, Kegiatan:a.kind === 'exam' ? 'Ujian' : 'Latihan',
      Paket:a.title, Status:a.status, Nilai:a.score ?? '', Waktu:dateLabel(a.date), ID_Riwayat:a.id
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detail), 'Detail Riwayat')
    XLSX.writeFile(workbook, 'Rekap_Nilai_Seluruh_Subtes.xlsx')
  }

  const deleteSelected = async () => {
    if (!selectedItems.length || deleting) return
    const examCount = selectedItems.filter(a => a.kind === 'exam').length
    const practiceCount = selectedItems.filter(a => a.kind === 'practice').length
    const confirmed = window.confirm(
      'HAPUS RIWAYAT TERPILIH?\n\n' +
      selectedItems.length + ' riwayat akan dihapus permanen (' + examCount + ' ujian, ' + practiceCount + ' latihan).\n' +
      'Detail jawaban yang terkait juga akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.'
    )
    if (!confirmed) return
    setDeleting(true); setError('')
    try {
      const response = await fetch('/api/admin/rekap-nilai', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: selectedItems.map(a => ({ id: a.id, kind: a.kind })) })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Penghapusan gagal.')
      setSelected([]); setExpanded([])
      await loadData(true)
      alert('Berhasil menghapus ' + (payload.deletedExam + payload.deletedPractice) + ' riwayat.')
    } catch (err: any) {
      setError(err.message || 'Riwayat gagal dihapus.')
    } finally { setDeleting(false) }
  }

  const currentClassLabel = classFilter === 'ASSIGNED' ? assignedClasses.join(', ') : classFilter === 'ALL' ? 'Semua kelas' : classFilter

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-5 lg:p-7">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600"><BarChart3 size={15}/> Pusat Pengelolaan Nilai</div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Rekap Nilai</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">Ringkasan nilai ujian dan latihan dari seluruh subtes dalam satu halaman.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void loadData(true)} disabled={refreshing || loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={15} className={refreshing ? 'animate-spin' : ''}/> Muat ulang</button>
            <button onClick={exportExcel} disabled={loading || (mode === 'student' ? participantRows.length === 0 : mode === 'package' ? packageRows.length === 0 : subtestRows.length === 0)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"><Download size={15}/> Ekspor Excel</button>
          </div>
        </div>

        {!loading && assignedClasses.length > 0 && <div className="flex items-start gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800"><GraduationCap size={18} className="mt-0.5 shrink-0"/><div><b>Filter awal mengikuti kelas ampuan</b><p className="mt-0.5">Kelas yang otomatis dipilih: {assignedClasses.join(', ')}. Anda tetap dapat mengganti pilihan ke kelas lain atau semua kelas.</p></div></div>}
        {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat icon={<Users size={18}/>} label="Peserta" value={studentsInScope.length} note={currentClassLabel}/>
          <Stat icon={<ClipboardList size={18}/>} label="Riwayat selesai" value={totalCompleted} note={'dari ' + visibleAttempts.length + ' riwayat'}/>
          <Stat icon={<BarChart3 size={18}/>} label="Rata-rata nilai" value={averageVisible.toFixed(1)} note="Nilai semua riwayat selesai"/>
          <Stat icon={<Trophy size={18}/>} label={'Memenuhi KKM ' + kkm} value={metKkm} note={totalCompleted ? Math.round(metKkm / totalCompleted * 100) + '% dari riwayat selesai' : 'Belum ada nilai'}/>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex rounded-xl bg-slate-100 p-1">
              <button onClick={() => {setMode('student');setSelected([]);setExpanded([])}} className={'rounded-lg px-3 py-2 text-sm font-bold ' + (mode === 'student' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500')}>Per Peserta</button>
              <button onClick={() => {setMode('subtest');setSelected([]);setExpanded([])}} className={'rounded-lg px-3 py-2 text-sm font-bold ' + (mode === 'subtest' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500')}>Per Subtes</button>
              <button onClick={() => {setMode('package');setSelected([]);setExpanded([])}} className={'rounded-lg px-3 py-2 text-sm font-bold ' + (mode === 'package' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500')}>Per Paket</button>
            </div>
            <div className="text-xs text-slate-500">KKM mengikuti Pengaturan Dokumen sekolah</div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-7">
            <label className="text-xs font-semibold text-slate-500">Kelas
              <select value={classFilter} onChange={e => {setClassFilter(e.target.value);setSelected([])}} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option value="ALL">Semua kelas</option>
                {assignedClasses.length > 1 && <option value="ASSIGNED">Semua kelas ampuan</option>}
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Subtes
              <select value={subtestFilter} onChange={e => setSubtestFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option value="ALL">Semua subtes</option>{subtests.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Jenis kegiatan
              <select value={activityFilter} onChange={e => setActivityFilter(e.target.value as any)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option value="ALL">Ujian & latihan</option><option value="exam">Ujian</option><option value="practice">Latihan</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Paket soal
              <select value={packageFilter} onChange={e => {setPackageFilter(e.target.value);setSelected([])}} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option value="ALL">Semua paket</option>{exams.map(exam => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">Filter nilai
              <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800">
                <option value="ALL">Semua nilai</option><option value="BELOW">Di bawah KKM</option><option value="PASS">Memenuhi KKM</option><option value="70">70–79</option><option value="80">80–89</option><option value="90">90–100</option><option value="UNSCORED">Belum dinilai / belum selesai</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500 sm:col-span-2">Cari peserta / paket
              <div className="relative mt-1"><Search size={15} className="absolute left-3 top-3 text-slate-400"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nama, username, atau judul paket..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-9 pr-3 text-sm text-slate-800"/></div>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <Filter size={14}/><span>Urutkan:</span>
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"><option value="name">Nama</option><option value="class">Kelas</option><option value="title">Judul tes/latihan</option><option value="score">Nilai</option><option value="date">Tanggal</option></select>
              <button onClick={() => setSortOrder(v => v === 'asc' ? 'desc' : 'asc')} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700">{sortOrder === 'asc' ? 'Naik ↑' : 'Turun ↓'}</button>
            </div>
            <div className="text-xs text-slate-500">{visibleAttempts.length} riwayat cocok dengan filter</div>
          </div>

          {selected.length > 0 && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5">
            <span className="text-sm font-bold text-rose-800">{selected.length} riwayat dipilih</span>
            <div className="flex gap-2">
              <button onClick={() => setSelected([])} className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">Batalkan pilihan</button>
              <button onClick={deleteSelected} disabled={deleting} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"><Trash2 size={14}/>{deleting ? 'Menghapus...' : 'Hapus riwayat terpilih'}</button>
            </div>
          </div>}

          <div className="mt-4 overflow-x-auto">
            {loading ? <div className="py-16 text-center text-sm text-slate-500">Memuat rekap nilai...</div> :
              mode === 'student' ? <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Peserta</th><th className="px-3 py-3">Kelas</th><th className="px-3 py-3 text-center">Paket selesai</th><th className="px-3 py-3 text-center">Riwayat</th><th className="px-3 py-3 text-right">Rata-rata terbaik</th><th className="px-3 py-3">Aktivitas terakhir</th><th className="px-3 py-3 text-center">Detail</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {participantRows.map(row => <ParticipantTableRows key={row.student.id} row={row} expanded={expanded.includes(row.student.id)} onToggle={() => toggleExpanded(row.student.id)} selected={selected} onSelect={toggleSelected} kkm={kkm} sortBy={sortBy} />)}
                  {participantRows.length === 0 && <tr><td colSpan={7} className="px-3 py-12 text-center text-slate-400">Tidak ada peserta yang sesuai dengan filter.</td></tr>}
                </tbody>
              </table> : mode === 'package' ? <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Paket soal</th><th className="px-3 py-3">Jenis</th><th className="px-3 py-3 text-center">Peserta</th><th className="px-3 py-3 text-center">Riwayat</th><th className="px-3 py-3 text-right">Rata-rata</th><th className="px-3 py-3 text-right">Tertinggi</th><th className="px-3 py-3 text-center">Tuntas KKM</th><th className="px-3 py-3 text-center">Detail</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {packageRows.map(row => <PackageTableRows key={row.key} row={row} expanded={expanded.includes(row.key)} onToggle={() => toggleExpanded(row.key)} selected={selected} onSelect={toggleSelected} kkm={kkm} sortBy={sortBy} />)}
                  {packageRows.length === 0 && <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">Belum ada riwayat untuk paket dan filter yang dipilih.</td></tr>}
                </tbody>
              </table> : <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Peserta</th><th className="px-3 py-3">Kelas</th><th className="px-3 py-3 text-center">Jumlah riwayat</th><th className="px-3 py-3 text-right">Nilai terbaik</th><th className="px-3 py-3 text-right">Nilai terbaru</th><th className="px-3 py-3">Aktivitas terakhir</th><th className="px-3 py-3 text-center">Detail</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {subtestRows.map(row => <SubtestTableRows key={row.userId} row={row} expanded={expanded.includes(row.userId)} onToggle={() => toggleExpanded(row.userId)} selected={selected} onSelect={toggleSelected} kkm={kkm} sortBy={sortBy} />)}
                  {subtestRows.length === 0 && <tr><td colSpan={7} className="px-3 py-12 text-center text-slate-400">Belum ada riwayat pada subtes ini.</td></tr>}
                </tbody>
              </table>}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={visibleAttempts.length > 0 && visibleAttempts.every(a => selected.includes(a.kind + ':' + a.id))} onChange={selectVisible} className="h-4 w-4 rounded border-slate-300"/> Pilih semua {visibleAttempts.length} riwayat sesuai filter</label>
            <span className="text-[11px] text-slate-400">Klik Detail untuk memilih riwayat tertentu yang akan dihapus.</span>
          </div>
        </section>
        <div className="text-center text-[11px] text-slate-400">Rekap Nilai • Data ujian dan latihan • Penghapusan riwayat bersifat permanen</div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string | number; note: string }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between text-slate-500"><span className="text-xs font-semibold">{label}</span><span className="text-indigo-600">{icon}</span></div><div className="mt-2 text-2xl font-black text-slate-900">{value}</div><div className="mt-1 truncate text-[11px] text-slate-400">{note}</div></div>
}

function PackageTableRows({ row, expanded, onToggle, selected, onSelect, kkm, sortBy }: any) {
  const passRate = row.completed ? Math.round(row.passed / row.completed * 100) : 0
  return <>
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-3"><div className="font-bold text-slate-800">{row.title}</div><div className="text-[11px] text-slate-400">{row.subtest}</div></td>
      <td className="px-3 py-3 text-slate-600">{row.kind === 'exam' ? 'Ujian' : 'Latihan'}</td>
      <td className="px-3 py-3 text-center text-slate-700">{row.participants}</td>
      <td className="px-3 py-3 text-center text-slate-700">{row.attempts}</td>
      <td className="px-3 py-3 text-right font-black text-slate-800">{scoreLabel(row.average)}</td>
      <td className="px-3 py-3 text-right font-bold text-emerald-700">{scoreLabel(row.highest)}</td>
      <td className="px-3 py-3 text-center"><span className="font-bold text-emerald-700">{row.passed}/{row.completed}</span><span className="block text-[10px] text-slate-400">{passRate}%</span></td>
      <td className="px-3 py-3 text-center"><button onClick={onToggle} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700">{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Detail</button></td>
    </tr>
    {expanded && <tr><td colSpan={8} className="px-3 pb-3"><HistoryRows history={row.history} selected={selected} onSelect={onSelect} kkm={kkm} sortBy={sortBy}/></td></tr>}
  </>
}

function HistoryRows({ history, selected, onSelect, kkm, sortBy }: { history: Attempt[]; selected: string[]; onSelect: (attempt: Attempt) => void; kkm: number; sortBy: string }) {
  const orderedHistory = [...history].sort((a, b) => sortBy === 'title'
    ? a.title.localeCompare(b.title, 'id')
    : new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
  return <div className="space-y-1.5 rounded-xl bg-slate-50 p-3">
    {orderedHistory.map(attempt => {
      const key = attempt.kind + ':' + attempt.id
      return <div key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <input type="checkbox" checked={selected.includes(key)} onChange={() => onSelect(attempt)} className="h-4 w-4 rounded border-slate-300"/>
        <div className="min-w-[180px] flex-1"><div className="text-xs font-bold text-slate-800">{attempt.title}</div><div className="text-[10px] text-slate-400">{attempt.kind === 'exam' ? 'Ujian' : 'Latihan'} • {dateLabel(attempt.date)} • {attempt.status}</div></div>
        <div className="text-right"><div className="text-sm font-black text-slate-800">{scoreLabel(attempt.score)}</div><div className="text-[10px] text-slate-400">Nilai</div></div>
        <span className={'rounded-full px-2 py-1 text-[10px] font-bold ' + (attempt.score !== null && attempt.score >= kkm ? 'bg-emerald-50 text-emerald-700' : attempt.score !== null ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-500')}>{attempt.score === null ? 'Belum selesai' : attempt.score >= kkm ? 'Tuntas' : 'Belum tuntas'}</span>
      </div>
    })}
    {history.length === 0 && <p className="py-2 text-center text-xs text-slate-400">Belum ada riwayat.</p>}
  </div>
}

function ParticipantTableRows({ row, expanded, onToggle, selected, onSelect, kkm, sortBy }: any) {
  return <>
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-3"><div className="font-bold text-slate-800">{row.student.full_name || 'Tanpa nama'}</div><div className="text-[11px] text-slate-400">{row.student.username || '—'}</div></td>
      <td className="px-3 py-3 text-slate-600">{row.student.class_code || '—'}</td>
      <td className="px-3 py-3 text-center"><span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{row.completedPackages}</span><span className="text-xs text-slate-400"> / {row.totalPackages}</span></td>
      <td className="px-3 py-3 text-center text-slate-600">{row.attempts.length}</td>
      <td className="px-3 py-3 text-right font-black text-slate-800">{row.average === null ? '—' : scoreLabel(row.average)}</td>
      <td className="px-3 py-3 text-xs text-slate-500">{dateLabel(row.latestDate)}</td>
      <td className="px-3 py-3 text-center"><button onClick={onToggle} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700">{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Detail</button></td>
    </tr>
    {expanded && <tr><td colSpan={7} className="px-3 pb-3"><div className="mb-2 flex flex-wrap gap-2">{row.packages.map((p: PackageSummary) => <span key={p.key} className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1.5 text-[11px] text-indigo-800">{p.subtest}: <b>{scoreLabel(p.best)}</b> <span className="text-indigo-500">({p.attempts.length}x)</span></span>)}</div><HistoryRows history={row.attempts} selected={selected} onSelect={onSelect} kkm={kkm} sortBy={sortBy}/></td></tr>}
  </>
}

function SubtestTableRows({ row, expanded, onToggle, selected, onSelect, kkm, sortBy }: any) {
  return <>
    <tr className="hover:bg-slate-50">
      <td className="px-3 py-3"><div className="font-bold text-slate-800">{row.studentName}</div><div className="text-[11px] text-slate-400">{row.username || '—'}</div></td>
      <td className="px-3 py-3 text-slate-600">{row.classCode}</td>
      <td className="px-3 py-3 text-center text-slate-700">{row.history.length}</td>
      <td className="px-3 py-3 text-right font-black text-emerald-700">{scoreLabel(row.best)}</td>
      <td className="px-3 py-3 text-right font-bold text-slate-800">{scoreLabel(row.latest?.score ?? null)}</td>
      <td className="px-3 py-3 text-xs text-slate-500">{dateLabel(row.latest?.date || null)}</td>
      <td className="px-3 py-3 text-center"><button onClick={onToggle} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700">{expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>} Detail</button></td>
    </tr>
    {expanded && <tr><td colSpan={7} className="px-3 pb-3"><HistoryRows history={row.history} selected={selected} onSelect={onSelect} kkm={kkm} sortBy={sortBy}/></td></tr>}
  </>
}
