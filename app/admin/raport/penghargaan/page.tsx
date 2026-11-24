'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Student = { id: string; full_name: string | null; username: string | null; class_code: string | null }
type Exam = { id: string; title: string; subtest: string | null; target_mode: string | null; activity_type: string | null }
type Signatory = { id: string; full_name: string; position: 'class_teacher' | 'principal'; class_code: string | null; nip: string | null }
type Score = { user_id: string; exam_id: string; score: number; date: string }
type RankedStudent = Student & { average: number; displayAverage: number; globalRank: number; classRank: number; packageCount: number }

const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800'
const rankLabel = (rank: number) => rank === 1 ? 'Juara 1' : rank === 2 ? 'Juara 2' : rank === 3 ? 'Juara 3' : `Peringkat ${rank}`

export default function AwardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [scores, setScores] = useState<Score[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [classChoice, setClassChoice] = useState('ALL')
  const [search, setSearch] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [schoolYear, setSchoolYear] = useState('2026/2027')
  const [period, setPeriod] = useState('Semester Ganjil')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [activityFilter, setActivityFilter] = useState('ALL')
  const [subtestFilter, setSubtestFilter] = useState('ALL')
  const [packageSearch, setPackageSearch] = useState('')
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [signatoryType, setSignatoryType] = useState<'both' | 'principal_only' | 'teacher_only'>('both')
  const [principalId, setPrincipalId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [customFeedback, setCustomFeedback] = useState(false)
  const [customAppreciation, setCustomAppreciation] = useState('')
  const [customNote, setCustomNote] = useState('')
  const [issuePlace, setIssuePlace] = useState('Getasan')

  useEffect(() => {
    let alive = true
    async function load() {
      const db = createClient()
      try {
        const { data: { user } } = await db.auth.getUser()
        const [p, e, s, doc, people, currentProfile] = await Promise.all([
          db.from('profiles').select('id,full_name,username,class_code').eq('role', 'student').order('full_name'),
          db.from('exams').select('id,title,subtest,target_mode,activity_type'),
          db.from('exam_sessions').select('id,user_id,exam_id,score,score_override,completed_at,submitted_at,created_at').eq('status', 'completed').not('user_id', 'is', null).order('completed_at', { ascending: false }),
          db.rpc('get_school_document_settings'),
          db.from('teacher_signatories').select('id,full_name,position,class_code,nip').eq('is_active', true),
          user ? db.from('profiles').select('class_code').eq('id', user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
        ])
        if (p.error) throw p.error
        if (e.error) throw e.error
        if (s.error) throw s.error
        if (!alive) return
        setStudents((p.data || []) as Student[])
        setExams((e.data || []) as Exam[])
        // Filter kelas hanya sebagai preferensi tampilan awal, bukan pembatas data/akses.
        const assignedClass = currentProfile.data?.class_code
        if (assignedClass) setClassChoice(assignedClass)
        if (people.error) setError('Data penandatangan belum dapat dimuat. Periksa tabel teacher_signatories di Supabase.')
        setSignatories((people.data || []) as Signatory[])
        setPrincipalId((people.data || []).find((x: any) => x.position === 'principal')?.id || '')
        if (doc.data?.issue_place) setIssuePlace(doc.data.issue_place)
        const best = new Map<string, Score>()
        for (const row of s.data || []) {
          if (row.score_override == null && row.score == null) continue
          const score = Number(row.score_override ?? row.score)
          if (!Number.isFinite(score)) continue
          const key = `${row.user_id}:${row.exam_id}`
          const date = row.completed_at || row.submitted_at || row.created_at || ''
          const previous = best.get(key)
          if (!previous || score > previous.score || (score === previous.score && new Date(date).getTime() > new Date(previous.date).getTime())) {
            best.set(key, { user_id: row.user_id, exam_id: row.exam_id, score, date })
          }
        }
        setScores([...best.values()])
        if (doc.data) {
          setSchoolYear(doc.data.academic_year || '2026/2027')
          setPeriod(doc.data.learning_period || 'Semester Ganjil')
        }
      } catch (e: any) {
        if (alive) setError(e?.message || 'Data penghargaan gagal dimuat.')
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const classes = useMemo(() => [...new Set(students.map(s => s.class_code).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'id')), [students])
  const examMap = useMemo(() => new Map(exams.map(e => [e.id, e])), [exams])
  const availableExams = useMemo(() => {
    const ids = new Set(scores.map(s => s.exam_id))
    return exams.filter(e => ids.has(e.id)).sort((a, b) => (a.subtest || 'Umum').localeCompare(b.subtest || 'Umum', 'id') || a.title.localeCompare(b.title, 'id'))
  }, [exams, scores])
  const subtests = useMemo(() => [...new Set(availableExams.map(e => e.subtest || 'Umum'))].sort((a, b) => a.localeCompare(b, 'id')), [availableExams])
  const activityTypes = useMemo(() => [...new Set(availableExams.map(e => e.activity_type || 'QUIZ'))].sort(), [availableExams])
  const filteredExams = availableExams.filter(e => (categoryFilter === 'ALL' || (e.target_mode || 'BOTH') === categoryFilter) && (activityFilter === 'ALL' || (e.activity_type || 'QUIZ') === activityFilter) && (subtestFilter === 'ALL' || (e.subtest || 'Umum') === subtestFilter) && (!packageSearch.trim() || e.title.toLowerCase().includes(packageSearch.trim().toLowerCase())))

  const ranked = useMemo(() => {
    if (!selectedExamIds.length) return [] as RankedStudent[]
    const scoreMap = new Map(scores.map(s => [`${s.user_id}:${s.exam_id}`, s.score]))
    const eligible = students.flatMap(student => {
      const numericValues: number[] = []

      for (const examId of selectedExamIds) {
        const value = scoreMap.get(`${student.id}:${examId}`)
        if (typeof value !== 'number' || !Number.isFinite(value)) return []
        numericValues.push(value)
      }

      if (!numericValues.length) return []

      const rawAverage =
        numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length
      const average = Math.round(rawAverage * 1000000) / 1000000

      return [{
        ...student,
        average,
        displayAverage: Math.round(average),
        globalRank: 0,
        classRank: 0,
        packageCount: numericValues.length,
      }]
    })
    const globalSorted = [...eligible].sort((a, b) => b.average - a.average || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
    const globalRanks = new Map<string, number>()
    globalSorted.forEach((student, index) => {
      if (index === 0 || student.average !== globalSorted[index - 1].average) globalRanks.set(student.id, index + 1)
      else globalRanks.set(student.id, globalRanks.get(globalSorted[index - 1].id) || index + 1)
    })
    const classRanks = new Map<string, number>()
    const byClass = new Map<string, typeof eligible>()
    eligible.forEach(student => {
      const key = student.class_code || 'Tanpa kelas'
      byClass.set(key, [...(byClass.get(key) || []), student])
    })
    for (const group of byClass.values()) {
      const sorted = [...group].sort((a, b) => b.average - a.average || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
      sorted.forEach((student, index) => {
        const rank = index === 0 || student.average !== sorted[index - 1].average ? index + 1 : (classRanks.get(sorted[index - 1].id) || index + 1)
        classRanks.set(student.id, rank)
      })
    }
    return eligible.map(student => ({ ...student, globalRank: globalRanks.get(student.id) || 0, classRank: classRanks.get(student.id) || 0 }))
  }, [students, scores, selectedExamIds])

  const chosenClass = classChoice === 'ALL' ? (classes[0] || '') : classChoice
  const globalTop = ranked.filter(s => s.globalRank <= 3).sort((a, b) => a.globalRank - b.globalRank || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
  const classTop = ranked.filter(s => s.class_code === chosenClass && s.classRank <= 3).sort((a, b) => a.classRank - b.classRank || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
  const filteredRanked = ranked.filter(s => (classChoice === 'ALL' || s.class_code === classChoice) && (!search || (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || (s.username || '').toLowerCase().includes(search.toLowerCase())))
  const selectedStudents = ranked.filter(s => selectedStudentIds.includes(s.id))
  const selectedPackages = selectedExamIds.map(id => examMap.get(id)).filter(Boolean) as Exam[]
  const dateText = new Date(issueDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' })
  const principalOptions = signatories.filter(s => s.position === 'principal')
  const teacherOptions = signatories.filter(s => s.position === 'class_teacher')
  const principal = principalOptions.find(p => p.id === principalId) || principalOptions[0]
  const appreciationFor = (average: number) => customFeedback && customAppreciation.trim() ? customAppreciation : average >= 90 ? 'Luar biasa! Terus pertahankan semangat belajar dan rasa ingin tahu yang tinggi.' : average >= 70 ? 'Hebat! Usaha dan ketekunan dalam belajar sudah menunjukkan hasil yang baik.' : 'Terima kasih sudah berusaha. Terus berlatih sedikit demi sedikit; setiap kemajuan patut dibanggakan.'
  const noteFor = (average: number) => customFeedback && customNote.trim() ? customNote : average >= 90 ? 'Ananda menunjukkan penguasaan materi yang sangat baik. Terus kembangkan kemampuan dan kebiasaan belajar mandiri.' : average >= 70 ? 'Pertahankan konsistensi dan perdalam materi yang masih perlu dikuatkan.' : 'Ananda sedang dalam proses menguatkan pemahaman. Pendampingan dan latihan bertahap akan membantu kemajuan berikutnya.'
  const signatureBlock = (student: RankedStudent) => {
    const teacher = teacherOptions.find(t => t.id === teacherId) || teacherOptions.find(t => t.class_code === student.class_code)
    const showTeacher = signatoryType === 'both' || signatoryType === 'teacher_only'
    const showPrincipal = signatoryType === 'both' || signatoryType === 'principal_only'
    return <div className={`relative mt-5 grid gap-5 text-center text-xs ${showPrincipal && showTeacher ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {showPrincipal && <div><p>Mengetahui,</p><p>Kepala Sekolah</p><div className="h-14"/><p className="font-bold underline">{principal?.full_name || '....................................'}</p><p>NIP. {principal?.nip || '-'}</p></div>}
      {showTeacher && <div><p>{issuePlace}, {dateText}</p><p>Guru / Wali Kelas {student.class_code || ''}</p><div className="h-14"/><p className="font-bold underline">{teacher?.full_name || '....................................'}</p><p>NIP. {teacher?.nip || '-'}</p></div>}
    </div>
  }
  const toggleExam = (id: string) => {
    setSelectedExamIds(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
    setSelectedStudentIds([])
  }
  const printAwards = () => {
    setPreviewOpen(true)
    window.setTimeout(() => window.print(), 350)
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
    <style>{`@page{size:A4 landscape;margin:9mm}
@media print{
 html,body{margin:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body *{visibility:hidden!important}
 #award-print-area,#award-print-area *{visibility:visible!important}
 #award-print-area{position:absolute!important;left:0!important;top:0!important;width:277mm!important}
 .no-print{display:none!important}
 .award-page{width:277mm!important;height:190mm!important;min-height:190mm!important;break-after:page;page-break-after:always;margin:0!important;box-sizing:border-box!important}
 .award-page:last-child{break-after:auto;page-break-after:auto}
}
`}</style>
    <div className="no-print mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-widest text-amber-700">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Penghargaan Prestasi</h1><p className="mt-1 text-sm text-slate-500">Sertifikat penghargaan dan leaderboard tiga besar berdasarkan nilai ujian.</p></div>
        <Link href="/admin/raport" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Kembali ke Raport & Sertifikat</Link>
      </header>
      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2 shadow-sm">
        <Link href="/admin/raport" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100">Raport & Sertifikat</Link>
        <span className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-black text-amber-900">Penghargaan</span>
      </nav>
      <section className="rounded-2xl border border-amber-200 bg-gradient-to-r from-slate-900 via-indigo-950 to-amber-900 p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-200">SD Negeri Getasan · Apresiasi Prestasi</p><h2 className="mt-1 text-2xl font-black">Setiap usaha layak diapresiasi</h2><p className="mt-1 text-sm text-slate-200">Peringkat dihitung dari nilai ujian terbaik setiap siswa pada seluruh paket yang dipilih.</p></div><div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right"><p className="text-xs text-amber-100">Peserta memenuhi syarat</p><b className="text-3xl">{ranked.length}</b></div></div>
      </section>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="font-black text-slate-900">1. Pilih paket / subtes</h2>
          <p className="mt-1 text-xs text-slate-500">Hanya sesi ujian berstatus selesai yang digunakan. Pilih satu atau beberapa paket.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Kategori paket<select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className={field}><option value="ALL">Semua kategori</option><option value="BOTH">Ujian & Latihan</option><option value="EXAM_ONLY">Ujian saja</option><option value="PRACTICE_ONLY">Latihan saja</option></select></label><label className="text-xs font-semibold text-slate-600">Jenis aktivitas<select value={activityFilter} onChange={e => setActivityFilter(e.target.value)} className={field}><option value="ALL">Semua aktivitas</option>{activityTypes.map(type => <option key={type} value={type}>{type === 'QUIZ' ? 'Kuis' : type === 'FLASHCARD' ? 'Flashcard' : type === 'MAZE_GAME' ? 'Maze Game' : type}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Subtes<select value={subtestFilter} onChange={e => setSubtestFilter(e.target.value)} className={field}><option value="ALL">Semua subtes</option>{subtests.map(subtest => <option key={subtest} value={subtest}>{subtest}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Cari nama paket<input value={packageSearch} onChange={e => setPackageSearch(e.target.value)} placeholder="Ketik nama paket..." className={field}/></label></div>
          <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => { setSelectedExamIds(old => [...new Set([...old, ...filteredExams.map(e => e.id)])]); setSelectedStudentIds([]) }} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Pilih semua paket</button><button onClick={() => { setSelectedExamIds([]); setSelectedStudentIds([]) }} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Kosongkan</button></div>
          <div className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">{filteredExams.map(exam => <label key={exam.id} className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-100 p-3 hover:bg-amber-50"><input type="checkbox" className="mt-1" checked={selectedExamIds.includes(exam.id)} onChange={() => toggleExam(exam.id)}/><span><b className="block text-sm text-slate-800">{exam.title}</b><span className="text-xs text-slate-500">{exam.subtest || 'Umum'} · {(exam.target_mode || 'BOTH') === 'EXAM_ONLY' ? 'Ujian saja' : (exam.target_mode || 'BOTH') === 'PRACTICE_ONLY' ? 'Latihan saja' : 'Ujian & Latihan'} · {exam.activity_type || 'QUIZ'}</span></span></label>)}{!filteredExams.length && <p className="p-6 text-center text-sm text-slate-400">{loading ? 'Memuat data ujian...' : 'Tidak ada paket pada filter ini.'}</p>}</div>
          <p className="mt-3 text-xs text-slate-500">{selectedExamIds.length} paket dipilih · {selectedPackages.map(e => e.title).join(', ') || 'Belum dipilih'}</p>
        </div>
        <div className="space-y-4">
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-slate-900">2. Leaderboard Top 3</h2><select value={classChoice} onChange={e => setClassChoice(e.target.value)} className={field + ' max-w-[190px]'}><option value="ALL">Semua kelas (pilih kelas podium)</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            {!selectedExamIds.length ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Pilih paket terlebih dahulu untuk menghitung peringkat.</p> : <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Podium title="Peringkat Global" rankType="global" students={globalTop}/>
              <Podium title={`Peringkat Kelas ${chosenClass || '—'}`} rankType="class" students={classTop}/>
            </div>}
            <p className="mt-3 text-[11px] text-slate-500">Peringkat seri menggunakan sistem kompetisi (1, 1, 3). Siswa dengan nilai tidak lengkap tidak masuk peringkat.</p>
          </section>
          <section className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-slate-900">3. Pilih penerima sertifikat</h2><span className="text-xs text-slate-500">{selectedStudentIds.length} dipilih dari {ranked.length} siswa memenuhi syarat</span></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2"><select value={classChoice} onChange={e => setClassChoice(e.target.value)} className={field}><option value="ALL">Semua kelas</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama siswa" className={field}/></div>
            <div className="mt-3 flex flex-wrap gap-2"><button disabled={!ranked.length} onClick={() => setSelectedStudentIds(filteredRanked.map(s => s.id))} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-40">Pilih semua hasil filter</button><button onClick={() => setSelectedStudentIds([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan</button></div>
            <div className="mt-3 max-h-[300px] overflow-auto rounded-xl border"><table className="w-full min-w-[520px] text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-3">Pilih</th><th className="p-3">Nama</th><th className="p-3">Kelas</th><th className="p-3 text-right">Rata-rata</th><th className="p-3 text-right">Global</th><th className="p-3 text-right">Kelas</th></tr></thead><tbody className="divide-y">{filteredRanked.map(s => <tr key={s.id}><td className="p-3"><input type="checkbox" checked={selectedStudentIds.includes(s.id)} onChange={() => setSelectedStudentIds(old => old.includes(s.id) ? old.filter(id => id !== s.id) : [...old, s.id])}/></td><td className="p-3 font-semibold">{s.full_name || s.username || 'Siswa'}</td><td className="p-3">{s.class_code || '—'}</td><td className="p-3 text-right font-black">{s.displayAverage}</td><td className="p-3 text-right">{s.globalRank}</td><td className="p-3 text-right">{s.classRank}</td></tr>)}{!filteredRanked.length && <tr><td colSpan={6} className="p-6 text-center text-slate-400">Belum ada siswa yang memenuhi syarat.</td></tr>}</tbody></table></div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Tanggal sertifikat<input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className={field}/></label><div className="text-xs text-slate-500"><b>Tahun pelajaran:</b> {schoolYear}<br/><b>Periode:</b> {period}<br/><b>Syarat:</b> wajib memiliki nilai semua paket terpilih.</div></div>
          </section>
        </div>
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-4"><div><h2 className="font-black text-slate-900">4. Pengaturan sertifikat penghargaan</h2><p className="mt-1 text-xs text-slate-500">Pengaturan ini akan tampil pada pratinjau dan hasil cetak.</p></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={issuePlace} onChange={e => setIssuePlace(e.target.value)} className={field}/></label><label className="text-xs font-semibold text-slate-600">Tanda tangan<select value={signatoryType} onChange={e => setSignatoryType(e.target.value as any)} className={field}><option value="both">Guru / Wali Kelas dan Kepala Sekolah</option><option value="principal_only">Hanya Kepala Sekolah</option><option value="teacher_only">Hanya Guru / Wali Kelas</option></select></label>{(signatoryType === 'both' || signatoryType === 'principal_only') && <label className="text-xs font-semibold text-slate-600">Kepala sekolah<select value={principalId} onChange={e => setPrincipalId(e.target.value)} className={field}><option value="">Pilih kepala sekolah</option>{principalOptions.map(p => <option key={p.id} value={p.id}>{p.full_name} · {p.nip || 'Tanpa NIP'}</option>)}</select></label>}{(signatoryType === 'both' || signatoryType === 'teacher_only') && <label className="text-xs font-semibold text-slate-600">Guru / Wali Kelas<select value={teacherId} onChange={e => setTeacherId(e.target.value)} className={field}><option value="">Otomatis sesuai kelas siswa</option>{teacherOptions.map(t => <option key={t.id} value={t.id}>{t.full_name} · {t.class_code || 'Semua kelas'}</option>)}</select></label>}</div><div className="rounded-xl border p-3"><label className="flex items-center gap-2 text-sm font-bold text-slate-800"><input type="checkbox" checked={customFeedback} onChange={e => setCustomFeedback(e.target.checked)}/> Gunakan apresiasi dan catatan khusus untuk semua penerima</label>{customFeedback && <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Kalimat apresiasi<textarea value={customAppreciation} onChange={e => setCustomAppreciation(e.target.value)} placeholder="Contoh: Selamat atas prestasi dan kerja kerasmu!" className={field} rows={3}/></label><label className="text-xs font-semibold text-slate-600">Catatan khusus<textarea value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="Contoh: Terus kembangkan kemampuan dan semangat belajarmu." className={field} rows={3}/></label></div>}<p className="mt-2 text-[11px] text-slate-500">Jika tidak diaktifkan, kalimat apresiasi dan catatan dibuat otomatis berdasarkan rata-rata nilai.</p></div><div className="flex flex-wrap justify-end gap-2"><button disabled={!selectedStudents.length || !selectedExamIds.length} onClick={() => setPreviewOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">👁️ Pratinjau Sertifikat ({selectedStudents.length})</button><button disabled={!selectedStudents.length || !selectedExamIds.length} onClick={printAwards} className="rounded-xl bg-amber-600 px-5 py-3 text-sm font-black text-white disabled:opacity-40">🖨️ Cetak / Simpan PDF</button></div></section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">Aturan perhitungan</h2><div className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><b className="text-slate-800">Sumber nilai</b><p className="mt-1">Ujian selesai, memakai nilai_override jika tersedia; jika tidak, nilai ujian.</p></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-slate-800">Kelengkapan</b><p className="mt-1">Peserta harus mempunyai nilai untuk setiap paket yang dipilih.</p></div><div className="rounded-xl bg-slate-50 p-3"><b className="text-slate-800">Nilai seri</b><p className="mt-1">Nilai asli dipakai menentukan seri; tampilan rata-rata dibulatkan ke bilangan bulat.</p></div></div></section>
    </div>
    {previewOpen && <section className="mx-auto mt-6 max-w-6xl rounded-2xl border bg-white p-4 shadow-sm"><div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-slate-900">Pratinjau sertifikat penghargaan</h2><p className="text-xs text-slate-500">Periksa nama, peringkat, apresiasi, dan penandatangan sebelum mencetak.</p></div><button onClick={() => setPreviewOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold">Tutup pratinjau</button></div><div id="award-print-area" className="space-y-8">{selectedStudents.map(student => <article key={student.id} className="award-page relative mx-auto overflow-hidden border-[3px] border-amber-700 bg-[#fffdf7] p-8 text-slate-900"><div className="pointer-events-none absolute inset-2 border border-amber-300"/><div className="pointer-events-none absolute inset-4 border border-amber-100"/><div className="relative flex items-center justify-center gap-4 border-b-2 border-double border-amber-700 pb-4"><img src="/logo-sd-getasan.png" className="h-20 w-20 object-contain" alt="Logo sekolah"/><div className="text-center"><p className="text-xs font-bold uppercase tracking-widest">Pemerintah Kabupaten Semarang · Dinas Pendidikan</p><h2 className="mt-1 text-xl font-black uppercase text-indigo-950">SD Negeri Getasan</h2><p className="text-xs">Tahun Pelajaran {schoolYear} · {period}</p></div></div><div className="relative py-5 text-center"><p className="text-xs font-black uppercase tracking-[.3em] text-amber-800">Penghargaan Prestasi Akademik</p><h1 className="mt-2 font-serif text-4xl font-bold tracking-wide text-indigo-950">SERTIFIKAT PENGHARGAAN</h1><p className="mt-3 text-sm text-slate-600">Diberikan dengan bangga kepada</p><h3 className="mt-2 text-3xl font-black text-indigo-950">{student.full_name || student.username}</h3><p className="mt-1 text-sm text-slate-600">Kelas {student.class_code || '—'}</p></div><div className="relative mx-auto grid max-w-3xl grid-cols-3 gap-4"><div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center"><p className="text-xs font-bold uppercase text-amber-900">Rata-rata</p><p className="mt-1 text-3xl font-black text-indigo-950">{student.displayAverage}</p></div><div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center"><p className="text-xs font-bold uppercase text-amber-900">Peringkat Global</p><p className="mt-1 text-3xl font-black text-indigo-950">{student.globalRank}</p></div><div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-center"><p className="text-xs font-bold uppercase text-amber-900">Peringkat Kelas</p><p className="mt-1 text-3xl font-black text-indigo-950">{student.classRank}</p></div></div><div className="relative mx-auto mt-4 max-w-4xl rounded-xl border border-amber-200 bg-white/80 p-3 text-center"><p className="text-xs font-bold uppercase tracking-wider text-amber-800">Paket / Subtes yang dinilai</p><p className="mt-1 text-xs">{selectedPackages.map(e => `${e.title} · ${e.subtest || 'Umum'}`).join(' | ')}</p></div><div className="relative mx-auto mt-4 max-w-4xl rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-center"><p className="text-xs font-black uppercase tracking-widest text-indigo-800">Apresiasi</p><p className="mt-1 text-sm font-semibold">{appreciationFor(student.average)}</p><p className="mt-3 text-xs font-black uppercase tracking-widest text-indigo-800">Catatan khusus</p><p className="mt-1 text-sm">{noteFor(student.average)}</p></div><p className="relative mt-4 text-center font-serif text-lg italic text-indigo-900">“Terus belajar, bertumbuh, dan menjadi inspirasi bagi sesama.”</p>{signatureBlock(student)}</article>)}</div></section>}
  </main>
}

function Podium({ title, rankType, students }: { title: string; rankType: 'global' | 'class'; students: RankedStudent[] }) {
  const colors = ['border-amber-300 bg-amber-50', 'border-slate-300 bg-slate-50', 'border-orange-300 bg-orange-50']
  return <div className="rounded-xl border border-slate-100 p-3"><h3 className="text-sm font-black text-slate-800">{title}</h3><div className="mt-3 space-y-2">{students.map(s => {
    const rank = rankType === 'class' ? s.classRank : s.globalRank
    const color = colors[Math.min(Math.max(rank, 1), 3) - 1]
    return <div key={s.id} className={`flex items-center gap-3 rounded-xl border p-3 ${color}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-amber-800 shadow-sm">#{rank}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{s.full_name || s.username || 'Siswa'}</p><p className="text-[11px] text-slate-500">Kelas {s.class_code || '—'}</p></div><b className="text-lg text-slate-900">{s.displayAverage}</b></div>
  })}{!students.length && <p className="rounded-lg bg-slate-50 p-4 text-center text-xs text-slate-400">Belum ada peserta yang memenuhi syarat.</p>}</div></div>
}
