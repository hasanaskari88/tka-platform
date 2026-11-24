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

const awardThemes = [
  { id: 'candy', name: 'Candy Celebration', description: 'Pink, kuning, biru, dan ungu pastel', swatches: ['#f9a8d4', '#fde68a', '#93c5fd', '#c4b5fd'] },
  { id: 'rainbow', name: 'Rainbow Achievement', description: 'Pelangi cerah penuh semangat', swatches: ['#fb7185', '#fbbf24', '#34d399', '#60a5fa'] },
  { id: 'sunny', name: 'Sunny Smile', description: 'Kuning hangat, oranye, dan biru langit', swatches: ['#facc15', '#fb923c', '#7dd3fc', '#fed7aa'] },
  { id: 'mint', name: 'Mint & Peach', description: 'Mint segar, peach, dan krem', swatches: ['#6ee7b7', '#fdba9a', '#fef3c7', '#a7f3d0'] },
  { id: 'sky', name: 'Blue Sky Dream', description: 'Biru langit, turquoise, dan coral', swatches: ['#7dd3fc', '#5eead4', '#fb7185', '#fde68a'] },
] as const
const rankLabel = (rank: number) => rank === 1 ? 'Juara 1' : rank === 2 ? 'Juara 2' : rank === 3 ? 'Juara 3' : `Peringkat ${rank}`

const feedbackTemplates: { band: 'high' | 'middle' | 'developing'; appreciation: string; note: string }[] = [
  { band: 'high', appreciation: 'Prestasi yang sangat membanggakan! Ketekunan dan semangat belajarmu terlihat dari hasil yang diraih.', note: 'Pertahankan rasa ingin tahu dan terus tantang dirimu untuk mempelajari hal-hal baru.' },
  { band: 'high', appreciation: 'Hebat sekali! Kerja kerasmu membuahkan hasil yang istimewa.', note: 'Terus kembangkan kemampuanmu dan jadikan keberhasilan ini sebagai motivasi untuk tumbuh.' },
  { band: 'high', appreciation: 'Selamat atas pencapaian luar biasa ini. Kamu telah menunjukkan kesungguhan dalam belajar.', note: 'Jaga kebiasaan belajar yang baik dan tetap rendah hati saat meraih prestasi.' },
  { band: 'high', appreciation: 'Hasil belajarmu sangat mengesankan. Teruslah menjadi pembelajar yang tekun dan berani mencoba.', note: 'Perluas pengetahuan, pertahankan disiplin, dan gunakan kemampuanmu untuk hal-hal positif.' },
  { band: 'high', appreciation: 'Usaha terbaikmu terlihat nyata dalam prestasi ini. Kami bangga dengan pencapaianmu.', note: 'Jangan cepat puas; terus asah potensi dan pertahankan semangat berbagi dengan teman.' },
  { band: 'high', appreciation: 'Luar biasa! Kamu telah memperlihatkan penguasaan materi dan tanggung jawab belajar yang kuat.', note: 'Terus pelihara konsistensi dan beranilah menghadapi tantangan pembelajaran berikutnya.' },
  { band: 'high', appreciation: 'Selamat, pencapaianmu patut diapresiasi. Semangat dan ketekunanmu menjadi contoh yang baik.', note: 'Pertahankan prestasi dengan belajar teratur, teliti, dan tetap menikmati prosesnya.' },
  { band: 'middle', appreciation: 'Kerja bagus! Usaha belajarmu mulai terlihat melalui hasil yang membanggakan.', note: 'Pertahankan kebiasaan positif dan berikan perhatian lebih pada materi yang belum dikuasai.' },
  { band: 'middle', appreciation: 'Selamat atas perkembangan belajarmu. Teruslah berusaha karena kemampuan tumbuh melalui latihan.', note: 'Biasakan mengulang pelajaran dan bertanya ketika menemukan hal yang belum dipahami.' },
  { band: 'middle', appreciation: 'Kamu sudah menunjukkan usaha yang baik. Terus tingkatkan semangat dan rasa percaya dirimu.', note: 'Latihan yang teratur dan ketelitian saat mengerjakan soal akan membantumu meraih hasil lebih baik.' },
  { band: 'middle', appreciation: 'Pencapaian ini layak dirayakan. Terima kasih sudah belajar dengan sungguh-sungguh.', note: 'Terus perkuat materi yang sudah dipelajari dan jangan ragu mencoba soal yang lebih menantang.' },
  { band: 'middle', appreciation: 'Bagus! Ada kemajuan yang patut disyukuri dari proses belajarmu.', note: 'Buat jadwal belajar sederhana dan gunakan waktu latihan untuk memperbaiki bagian yang masih sulit.' },
  { band: 'middle', appreciation: 'Usahamu membawa hasil yang positif. Terus tumbuhkan semangat untuk menjadi lebih baik.', note: 'Jaga konsistensi, tingkatkan ketelitian, dan manfaatkan masukan guru sebagai bekal belajar.' },
  { band: 'middle', appreciation: 'Selamat atas hasil yang telah kamu capai. Setiap langkah belajar memiliki arti.', note: 'Terus berlatih secara bertahap agar pemahamanmu semakin kuat dan merata.' },
  { band: 'developing', appreciation: 'Terima kasih sudah terus berusaha. Keberanian untuk belajar dan mencoba adalah hal yang berharga.', note: 'Fokuslah pada satu materi dalam satu waktu, berlatih sedikit demi sedikit, dan jangan takut bertanya.' },
  { band: 'developing', appreciation: 'Kamu tetap hebat karena mau belajar dan berproses. Terus semangat, ya!', note: 'Ulangi kembali materi dasar bersama guru atau keluarga agar pemahamanmu semakin kuat.' },
  { band: 'developing', appreciation: 'Setiap usaha adalah langkah maju. Kami menghargai semangatmu untuk terus mencoba.', note: 'Mulailah dengan latihan singkat secara rutin dan rayakan setiap kemajuan kecil yang kamu capai.' },
  { band: 'developing', appreciation: 'Jangan menyerah! Kesungguhan untuk memperbaiki diri jauh lebih penting daripada hasil sesaat.', note: 'Kenali soal yang masih terasa sulit, lalu pelajari kembali secara perlahan dengan pendampingan.' },
  { band: 'developing', appreciation: 'Terus bertumbuh dan percaya pada kemampuan diri. Kamu selalu punya kesempatan untuk berkembang.', note: 'Tingkatkan latihan secara bertahap, perhatikan penjelasan guru, dan coba kembali dengan lebih teliti.' },
  { band: 'developing', appreciation: 'Kami bangga atas keberanianmu menyelesaikan proses belajar. Teruslah melangkah dengan optimis.', note: 'Bangun kebiasaan belajar yang teratur; sedikit kemajuan setiap hari akan membawa perubahan baik.' },
]

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
  const [leaderboardLimit, setLeaderboardLimit] = useState<'3' | '5'>('3')
  const [leaderboardScope, setLeaderboardScope] = useState<'both' | 'class' | 'global'>('both')
  const [awardTheme, setAwardTheme] = useState<(typeof awardThemes)[number]['id']>('candy')

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
  const globalTop = ranked.filter(s => s.globalRank <= Number(leaderboardLimit)).sort((a, b) => a.globalRank - b.globalRank || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
  const classTop = ranked.filter(s => s.class_code === chosenClass && s.classRank <= Number(leaderboardLimit)).sort((a, b) => a.classRank - b.classRank || (a.full_name || '').localeCompare(b.full_name || '', 'id'))
  const filteredRanked = ranked.filter(s => (classChoice === 'ALL' || s.class_code === classChoice) && (!search || (s.full_name || '').toLowerCase().includes(search.toLowerCase()) || (s.username || '').toLowerCase().includes(search.toLowerCase())))
  const selectedStudents = ranked.filter(s => selectedStudentIds.includes(s.id))
  const selectedPackages = selectedExamIds.map(id => examMap.get(id)).filter(Boolean) as Exam[]
  const dateText = new Date(issueDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' })
  const principalOptions = signatories.filter(s => s.position === 'principal')
  const teacherOptions = signatories.filter(s => s.position === 'class_teacher')
  const principal = principalOptions.find(p => p.id === principalId) || principalOptions[0]
  const feedbackByStudent = useMemo(() => {
    const counters = { high: 0, middle: 0, developing: 0 }
    const result = new Map<string, { appreciation: string; note: string }>()
    for (const student of selectedStudents) {
      const band = student.average >= 90 ? 'high' : student.average >= 70 ? 'middle' : 'developing'
      const options = feedbackTemplates.filter(item => item.band === band)
      const item = options[counters[band] % options.length]
      counters[band] += 1
      result.set(student.id, item)
    }
    return result
  }, [selectedStudents])
  const appreciationFor = (student: RankedStudent) => customFeedback && customAppreciation.trim() ? customAppreciation : feedbackByStudent.get(student.id)?.appreciation || ''
  const noteFor = (student: RankedStudent) => customFeedback && customNote.trim() ? customNote : feedbackByStudent.get(student.id)?.note || ''
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
    document.body.classList.remove('print-leaderboard')
    setPreviewOpen(true)
    window.setTimeout(() => window.print(), 350)
  }
  const printLeaderboard = () => {
    const cleanup = () => document.body.classList.remove('print-leaderboard')
    document.body.classList.add('print-leaderboard')
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    window.setTimeout(cleanup, 1500)
  }

  return <main className={`award-theme-${awardTheme} min-h-screen bg-slate-50 px-4 py-6 md:px-8`}>
    <style>{`@page{size:A4 landscape;margin:9mm}

.award-theme-candy .award-page,.award-theme-candy .leaderboard-sheet{background:radial-gradient(circle at 8% 8%,#fce7f3 0,transparent 24%),radial-gradient(circle at 92% 90%,#dbeafe 0,transparent 25%),linear-gradient(135deg,#fff7fb,#fffbea 55%,#f0f9ff)!important;border-color:#ec4899!important}
.award-theme-candy .award-page h1,.award-theme-candy .award-page h2,.award-theme-candy .award-page h3,.award-theme-candy .leaderboard-sheet h1{color:#7e22ce!important}
.award-theme-candy .award-page .rounded-xl{border-color:#f9a8d4!important}
.award-theme-rainbow .award-page,.award-theme-rainbow .leaderboard-sheet{background:linear-gradient(120deg,#fff1f2,#fffbeb 34%,#ecfdf5 68%,#eff6ff)!important;border-color:#8b5cf6!important}
.award-theme-rainbow .award-page h1,.award-theme-rainbow .award-page h2,.award-theme-rainbow .award-page h3,.award-theme-rainbow .leaderboard-sheet h1{color:#6d28d9!important}
.award-theme-rainbow .award-page .rounded-xl{border-color:#a78bfa!important}
.award-theme-sunny .award-page,.award-theme-sunny .leaderboard-sheet{background:radial-gradient(circle at 50% 0,#fef08a 0,transparent 35%),linear-gradient(135deg,#fff7ed,#fffbeb 55%,#eff6ff)!important;border-color:#f97316!important}
.award-theme-sunny .award-page h1,.award-theme-sunny .award-page h2,.award-theme-sunny .award-page h3,.award-theme-sunny .leaderboard-sheet h1{color:#c2410c!important}
.award-theme-sunny .award-page .rounded-xl{border-color:#fdba74!important}
.award-theme-mint .award-page,.award-theme-mint .leaderboard-sheet{background:radial-gradient(circle at 8% 10%,#d1fae5 0,transparent 30%),linear-gradient(135deg,#f0fdfa,#fff7ed 58%,#fffbeb)!important;border-color:#10b981!important}
.award-theme-mint .award-page h1,.award-theme-mint .award-page h2,.award-theme-mint .award-page h3,.award-theme-mint .leaderboard-sheet h1{color:#047857!important}
.award-theme-mint .award-page .rounded-xl{border-color:#6ee7b7!important}
.award-theme-sky .award-page,.award-theme-sky .leaderboard-sheet{background:radial-gradient(circle at 90% 8%,#cffafe 0,transparent 32%),linear-gradient(135deg,#eff6ff,#ecfeff 52%,#fff1f2)!important;border-color:#0ea5e9!important}
.award-theme-sky .award-page h1,.award-theme-sky .award-page h2,.award-theme-sky .award-page h3,.award-theme-sky .leaderboard-sheet h1{color:#0369a1!important}
.award-theme-sky .award-page .rounded-xl{border-color:#7dd3fc!important}
.award-theme-candy .leaderboard-sheet thead tr{background:#fce7f3!important}
.award-theme-rainbow .leaderboard-sheet thead tr{background:#ede9fe!important}
.award-theme-sunny .leaderboard-sheet thead tr{background:#fef3c7!important}
.award-theme-mint .leaderboard-sheet thead tr{background:#d1fae5!important}
.award-theme-sky .leaderboard-sheet thead tr{background:#cffafe!important}

.award-page{isolation:isolate;min-height:190mm;box-shadow:0 12px 35px rgba(30,41,59,.12)}
.award-page .certificate-inner{position:relative;z-index:1;min-height:100%;border:2px solid rgba(217,119,6,.5);border-radius:12px;padding:18px;background:rgba(255,255,255,.48)}
.award-page .certificate-corner{position:absolute;z-index:2;font-size:26px;line-height:1;filter:drop-shadow(0 2px 2px rgba(0,0,0,.08))}
.award-page .certificate-medal{display:flex;height:76px;width:76px;align-items:center;justify-content:center;border:5px double #f59e0b;border-radius:9999px;background:linear-gradient(145deg,#fff7ad,#fbbf24,#fff0a6);font-size:38px;box-shadow:0 5px 14px rgba(180,83,9,.18)}
.award-page .certificate-ribbon{display:inline-flex;align-items:center;gap:8px;border-radius:9999px;background:linear-gradient(90deg,#fb7185,#f97316);padding:7px 18px;color:white;font-size:11px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;box-shadow:0 4px 10px rgba(249,115,22,.18)}
.award-page .certificate-student{display:inline-block;border-bottom:3px dotted #f59e0b;padding:0 24px 7px;color:#312e81}
.award-page .certificate-stat{border:1.5px solid #f5c66a;border-radius:16px;background:linear-gradient(145deg,rgba(255,255,255,.92),rgba(255,247,214,.88));padding:10px 18px;box-shadow:0 3px 9px rgba(146,64,14,.07)}
.award-page .certificate-footer{border-top:1px dashed rgba(180,83,9,.35);padding-top:10px}
.award-theme-candy .award-page .certificate-inner{border-color:#f9a8d4}
.award-theme-rainbow .award-page .certificate-inner{border-color:#a78bfa}
.award-theme-sunny .award-page .certificate-inner{border-color:#fdba74}
.award-theme-mint .award-page .certificate-inner{border-color:#6ee7b7}
.award-theme-sky .award-page .certificate-inner{border-color:#7dd3fc}
@media print{
 .award-page{box-shadow:none!important}
 .award-page .certificate-inner{padding:12px!important}
 .award-page .certificate-medal{height:66px;width:66px}
 .award-page .certificate-corner{font-size:22px}
}

@media print{
 html,body{margin:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
 body *{visibility:hidden!important}
 body:not(.print-leaderboard) #award-print-area,body:not(.print-leaderboard) #award-print-area *{visibility:visible!important}
 body.print-leaderboard #leaderboard-print-area,body.print-leaderboard #leaderboard-print-area *{visibility:visible!important}
 body:not(.print-leaderboard) #award-print-area{position:absolute!important;left:0!important;top:0!important;width:277mm!important}
 body.print-leaderboard #leaderboard-print-area{position:absolute!important;left:0!important;top:0!important;width:277mm!important}
 .no-print{display:none!important}
 .award-page{width:277mm!important;height:190mm!important;min-height:190mm!important;break-after:page;page-break-after:always;margin:0!important;box-sizing:border-box!important}
 .award-page:last-child{break-after:auto;page-break-after:auto}
 .leaderboard-sheet{width:277mm!important;min-height:190mm!important;break-after:page;page-break-after:always;margin:0!important;box-sizing:border-box!important;padding:12mm!important}
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

      <section className="rounded-2xl border border-pink-200 bg-gradient-to-r from-pink-50 via-yellow-50 to-sky-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="font-black text-slate-900">🎨 Pilih tema warna apresiasi</h2><p className="mt-1 text-xs text-slate-600">Tema akan diterapkan pada sertifikat dan leaderboard, termasuk hasil cetaknya.</p></div>
          <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-pink-700">Pratinjau warna langsung</span>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {awardThemes.map(theme => <button key={theme.id} type="button" onClick={() => setAwardTheme(theme.id)} aria-pressed={awardTheme === theme.id} className={`rounded-xl border-2 p-3 text-left transition ${awardTheme === theme.id ? 'border-pink-500 bg-white shadow-md ring-2 ring-pink-200' : 'border-white bg-white/70 hover:border-pink-200'}`}>
            <span className="mb-2 flex h-7 overflow-hidden rounded-lg">{theme.swatches.map((color, index) => <span key={index} className="flex-1" style={{ backgroundColor: color }}/>)}</span>
            <span className="block text-xs font-black text-slate-800">{theme.name}</span><span className="mt-1 block text-[10px] leading-4 text-slate-500">{theme.description}</span>
            <span className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${awardTheme === theme.id ? 'bg-pink-100 text-pink-700' : 'bg-slate-100 text-slate-500'}`}>{awardTheme === theme.id ? '✓ Dipilih' : 'Pilih tema'}</span>
          </button>)}
        </div>
      </section>
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
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-black text-slate-900">2. Pengaturan Leaderboard</h2><div className="flex flex-wrap gap-2"><select aria-label="Jumlah peringkat leaderboard" value={leaderboardLimit} onChange={e => setLeaderboardLimit(e.target.value as '3' | '5')} className={field + ' max-w-[130px]'}><option value="3">3 Besar</option><option value="5">5 Besar</option></select><select aria-label="Jenis peringkat leaderboard" value={leaderboardScope} onChange={e => setLeaderboardScope(e.target.value as 'both' | 'class' | 'global')} className={field + ' max-w-[190px]'}><option value="both">Global & kelas</option><option value="class">Peringkat kelas saja</option><option value="global">Peringkat global saja</option></select>{(leaderboardScope === 'both' || leaderboardScope === 'class') && <select aria-label="Pilih kelas leaderboard" value={classChoice} onChange={e => setClassChoice(e.target.value)} className={field + ' max-w-[190px]'}><option value="ALL">Semua kelas (pilih kelas)</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>}</div></div>
            {!selectedExamIds.length ? <p className="mt-4 rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Pilih paket terlebih dahulu untuk menghitung peringkat.</p> : <div className={leaderboardScope === 'both' ? "mt-4 grid gap-4 md:grid-cols-2" : "mt-4 grid gap-4"}>
              {(leaderboardScope === 'both' || leaderboardScope === 'global') && <Podium title={`Peringkat Global · Top ${leaderboardLimit}`} rankType="global" students={globalTop}/>}
              {(leaderboardScope === 'both' || leaderboardScope === 'class') && <Podium title={`Peringkat Kelas ${chosenClass || '—'} · Top ${leaderboardLimit}`} rankType="class" students={classTop}/>}
            </div>}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-slate-500">Peringkat seri menggunakan sistem kompetisi (1, 1, 3). Siswa dengan nilai tidak lengkap tidak masuk peringkat.</p><button disabled={!selectedExamIds.length || (leaderboardScope === 'class' && !chosenClass)} onClick={printLeaderboard} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">🖨️ Cetak Leaderboard</button></div>
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
    <section id="leaderboard-print-area" className="pointer-events-none fixed left-[-10000px] top-0 w-[277mm] bg-white text-slate-900">
      <div className="leaderboard-sheet border-4 border-amber-700 bg-[#fffdf7]">
        <div className="border-b-2 border-double border-amber-700 pb-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest">SD Negeri Getasan · Tahun Pelajaran {schoolYear}</p>
          <h1 className="mt-2 text-3xl font-black text-indigo-950">LEADERBOARD PRESTASI</h1>
          <p className="mt-1 text-sm">{period} · {selectedPackages.map(e => e.title).join(' · ')}</p>
          <p className="mt-1 text-sm font-bold">Tampilan: {leaderboardLimit} Besar · {leaderboardScope === 'both' ? 'Global & Kelas' : leaderboardScope === 'global' ? 'Peringkat Global' : 'Peringkat Kelas'}</p>
        </div>
        <div className={leaderboardScope === 'both' ? "mt-6 grid grid-cols-2 gap-6" : "mt-6 grid grid-cols-1 gap-6"}>
          {(leaderboardScope === 'both' || leaderboardScope === 'global') && <div><h2 className="mb-3 text-center text-xl font-black">Peringkat Global · Top {leaderboardLimit}</h2><PrintRankList students={globalTop} rankType="global"/></div>}
          {(leaderboardScope === 'both' || leaderboardScope === 'class') && <div><h2 className="mb-3 text-center text-xl font-black">Peringkat Kelas {chosenClass || '—'} · Top {leaderboardLimit}</h2><PrintRankList students={classTop} rankType="class"/></div>}
        </div>
        <p className="mt-8 text-center text-xs italic text-slate-600">Terus belajar, bertumbuh, dan saling menginspirasi.</p>
      </div>
    </section>
    {previewOpen && <section className="mx-auto mt-6 max-w-6xl rounded-2xl border bg-white p-4 shadow-sm"><div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-black text-slate-900">Pratinjau sertifikat penghargaan</h2><p className="text-xs text-slate-500">Periksa nama, peringkat, apresiasi, dan penandatangan sebelum mencetak.</p></div><button onClick={() => setPreviewOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold">Tutup pratinjau</button></div><div id="award-print-area" className="space-y-8">{selectedStudents.map(student => <article key={student.id} className="award-page relative mx-auto overflow-hidden rounded-[24px] border-[5px] border-double border-amber-500 bg-[#fffdf7] p-3 text-slate-900 md:p-5">
  <div className="pointer-events-none absolute inset-1 rounded-[20px] border-2 border-amber-200"/>
  <div className="pointer-events-none absolute inset-3 rounded-[16px] border border-dashed border-amber-300"/>
  <span className="certificate-corner left-5 top-5">🌟</span><span className="certificate-corner right-5 top-5">🌟</span>
  <span className="certificate-corner bottom-5 left-5">✨</span><span className="certificate-corner bottom-5 right-5">✨</span>
  <div className="certificate-inner">
    <div className="relative flex items-center justify-center gap-4 border-b-2 border-double border-amber-400 pb-3">
      <div className="rounded-2xl border-2 border-white bg-white/90 p-2 shadow-sm"><img src="/logo-sd-getasan.png" className="h-16 w-16 object-contain" alt="Logo sekolah"/></div>
      <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[.18em] text-amber-800">Pemerintah Kabupaten Semarang · Dinas Pendidikan</p><h2 className="mt-1 text-xl font-black uppercase text-indigo-950">SD Negeri Getasan</h2><p className="text-[10px] font-semibold text-slate-600">Tahun Pelajaran {schoolYear} · {period}</p></div>
      <div className="absolute right-1 top-1 hidden sm:block"><span className="text-3xl">🎈</span></div>
    </div>
    <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 py-4 text-center">
      <div className="justify-self-center"><div className="certificate-medal">🏆</div><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-800">Prestasi</p></div>
      <div className="min-w-0"><span className="certificate-ribbon">✦ Penghargaan Prestasi Akademik ✦</span><h1 className="mt-3 font-serif text-3xl font-black tracking-wide text-indigo-950 md:text-4xl">SERTIFIKAT</h1><p className="text-sm font-black tracking-[.22em] text-amber-700">PENGHARGAAN</p><p className="mt-2 text-xs text-slate-600">Dengan bangga diberikan kepada</p><h3 className="certificate-student mt-2 text-2xl font-black md:text-3xl">{student.full_name || student.username}</h3><p className="mt-1 text-xs font-semibold text-slate-600">Siswa Kelas {student.class_code || '—'}</p></div>
      <div className="justify-self-center"><div className="certificate-medal">🥇</div><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-amber-800">Hebat!</p></div>
    </div>
    <div className={`relative mx-auto grid max-w-3xl gap-3 ${leaderboardScope === 'both' ? 'grid-cols-3' : 'grid-cols-2'}`}>
      <div className="certificate-stat text-center"><p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Rata-rata nilai</p><p className="mt-1 text-2xl font-black text-indigo-950">{student.displayAverage}</p></div>
      {(leaderboardScope === 'both' || leaderboardScope === 'global') && <div className="certificate-stat text-center"><p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Peringkat global</p><p className="mt-1 text-2xl font-black text-indigo-950">#{student.globalRank}</p></div>}
      {(leaderboardScope === 'both' || leaderboardScope === 'class') && <div className="certificate-stat text-center"><p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Peringkat kelas</p><p className="mt-1 text-2xl font-black text-indigo-950">#{student.classRank}</p></div>}
    </div>
    <div className="relative mx-auto mt-3 max-w-4xl rounded-xl border border-amber-200 bg-white/75 px-3 py-2 text-center"><p className="text-[9px] font-black uppercase tracking-widest text-amber-800">Paket / Subtes yang dinilai</p><p className="mt-1 text-[10px] font-medium">{selectedPackages.map(e => `${e.title} · ${e.subtest || 'Umum'}`).join(' | ')}</p></div>
    <div className="relative mx-auto mt-3 max-w-4xl rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 via-amber-50 to-sky-50 px-4 py-3 text-center"><p className="text-[10px] font-black uppercase tracking-[.16em] text-indigo-800">💖 Apresiasi untukmu 💖</p><p className="mt-1 text-xs font-bold text-slate-800">{appreciationFor(student)}</p><p className="mt-2 text-[9px] font-black uppercase tracking-widest text-indigo-800">Catatan penyemangat</p><p className="mt-1 text-[10px] text-slate-700">{noteFor(student)}</p></div>
    <div className="certificate-footer relative mt-3 grid grid-cols-[1fr_auto] items-end gap-4"><p className="text-left font-serif text-xs italic text-indigo-900">“Terus belajar, bertumbuh, dan bersinar!” 🌈</p><div className="min-w-[48%]">{signatureBlock(student)}</div></div>
  </div>
</article>)}</div></section>}
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

function PrintRankList({ students, rankType }: { students: RankedStudent[]; rankType: 'global' | 'class' }) {
  return <table className="w-full border-collapse text-sm">
    <thead><tr className="bg-amber-100"><th className="border border-amber-300 p-3">Peringkat</th><th className="border border-amber-300 p-3 text-left">Nama siswa</th><th className="border border-amber-300 p-3">Kelas</th><th className="border border-amber-300 p-3">Rata-rata</th></tr></thead>
    <tbody>{students.map(student => <tr key={student.id}><td className="border border-amber-200 p-3 text-center font-black">#{rankType === 'global' ? student.globalRank : student.classRank}</td><td className="border border-amber-200 p-3 font-semibold">{student.full_name || student.username || 'Siswa'}</td><td className="border border-amber-200 p-3 text-center">{student.class_code || '—'}</td><td className="border border-amber-200 p-3 text-center font-black">{student.displayAverage}</td></tr>)}</tbody>
  </table>
}
