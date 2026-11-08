'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Student = {
  id: string
  full_name: string | null
  username: string | null
  class_code: string | null
  xp: number
  level: number
  practiceXp: number
  practiceAttempts: number
  practiceBest: number
  examCount: number
  examAverage: number
}

export default function AdminDashboardPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [practiceRows, setPracticeRows] = useState<any[]>([])
  const [examRows, setExamRows] = useState<any[]>([])
  const [stats, setStats] = useState({ exams: 0, questions: 0, materials: 0, announcements: 0 })
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  useEffect(() => {
    let active = true
    async function load() {
      const db = createClient()
      try {
        const [p, pr, ex, ec, qc, mc, ac] = await Promise.all([
          db.from('profiles').select('id,full_name,username,class_code,role,xp,level').eq('role', 'student').order('full_name'),
          db.from('practice_attempts').select('id,user_id,status,score,total_xp,credited_xp'),
          db.from('exam_sessions').select('id,user_id,status,score,score_override'),
          db.from('exams').select('id', { count: 'exact', head: true }),
          db.from('questions').select('id', { count: 'exact', head: true }),
          db.from('study_materials').select('id', { count: 'exact', head: true }),
          db.from('announcements').select('id', { count: 'exact', head: true }),
        ])
        if (!active) return
        if (p.error) throw p.error
        if (pr.error || ex.error) setWarning('Sebagian data riwayat belum dapat dibaca. Periksa izin baca data admin di Supabase.')

        const practice = pr.data || []
        const exams = ex.data || []
        setPracticeRows(practice)
        setExamRows(exams)
        const byPractice = new Map<string, { xp: number; count: number; best: number }>()
        practice.forEach((r: any) => {
          const old = byPractice.get(r.user_id) || { xp: 0, count: 0, best: 0 }
          byPractice.set(r.user_id, {
            xp: old.xp + (r.status === 'completed' ? Number(r.total_xp || 0) : Number(r.credited_xp || 0)),
            count: old.count + (r.status === 'completed' ? 1 : 0),
            best: Math.max(old.best, Number(r.score || 0)),
          })
        })
        const byExam = new Map<string, { sum: number; count: number }>()
        exams.filter((r: any) => r.status === 'completed').forEach((r: any) => {
          const old = byExam.get(r.user_id) || { sum: 0, count: 0 }
          byExam.set(r.user_id, { sum: old.sum + Number(r.score_override ?? r.score ?? 0), count: old.count + 1 })
        })
        setStudents((p.data || []).map((r: any) => {
          const a = byPractice.get(r.id) || { xp: 0, count: 0, best: 0 }
          const b = byExam.get(r.id) || { sum: 0, count: 0 }
          return {
            id: r.id, full_name: r.full_name, username: r.username, class_code: r.class_code,
            xp: Number(r.xp || 0), level: Number(r.level || 1),
            practiceXp: a.xp, practiceAttempts: a.count, practiceBest: a.best,
            examCount: b.count, examAverage: b.count ? Math.round(b.sum / b.count) : 0,
          }
        }))
        setStats({ exams: ec.count || 0, questions: qc.count || 0, materials: mc.count || 0, announcements: ac.count || 0 })
      } catch (e: any) {
        if (active) setWarning(e?.message || 'Gagal memuat dashboard.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const classes = useMemo(() => [...new Set(students.map(s => s.class_code).filter(Boolean) as string[])].sort(), [students])
  const scoped = useMemo(() => students.filter(s => classFilter === 'ALL' || s.class_code === classFilter), [students, classFilter])
  const visible = useMemo(() => scoped.filter(s => {
    const q = search.toLowerCase().trim()
    return !q || String(s.full_name || '').toLowerCase().includes(q) || String(s.username || '').toLowerCase().includes(q)
  }).sort((a, b) => sort === 'xp' ? b.xp - a.xp : sort === 'practice' ? b.practiceXp - a.practiceXp : sort === 'exam' ? b.examAverage - a.examAverage : String(a.full_name || '').localeCompare(String(b.full_name || ''), 'id')), [scoped, search, sort])
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = visible.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const practiceRanking = [...scoped].sort((a, b) => b.practiceXp - a.practiceXp).slice(0, 10)
  const examRanking = [...scoped].filter(s => s.examCount > 0).sort((a, b) => b.examAverage - a.examAverage).slice(0, 10)
  const completedPractice = practiceRows.filter(r => r.status === 'completed').length
  const completedExams = examRows.filter(r => r.status === 'completed').length

  const cards = [
    { label: 'Peserta didik', value: students.length, icon: '👩‍🎓', color: 'from-indigo-500 to-blue-600' },
    { label: 'Paket ujian & latihan', value: stats.exams, icon: '📚', color: 'from-violet-500 to-purple-600' },
    { label: 'Bank soal', value: stats.questions, icon: '📝', color: 'from-amber-500 to-orange-600' },
    { label: 'Materi pembelajaran', value: stats.materials, icon: '📖', color: 'from-emerald-500 to-teal-600' },
  ]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">TKA Platform · Admin Center</p><h1 className="mt-1 text-3xl font-black text-slate-900">Dashboard Pengelola</h1><p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas, perkembangan peserta, dan pintasan pengelolaan website.</p></div>
          <Link href="/" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">← Lihat Website</Link>
        </header>
        {warning && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</div>}

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(c => <div key={c.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className={`bg-gradient-to-r ${c.color} px-4 py-3 text-white`}><div className="flex items-center justify-between text-xs font-bold uppercase"><span>{c.label}</span><span className="text-2xl">{c.icon}</span></div><div className="mt-2 text-3xl font-black">{loading ? '—' : c.value.toLocaleString('id-ID')}</div></div></div>)}
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Latihan selesai</p><p className="mt-1 text-2xl font-black text-emerald-700">{loading ? '—' : completedPractice}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Ujian selesai</p><p className="mt-1 text-2xl font-black text-indigo-700">{loading ? '—' : completedExams}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Pengumuman</p><p className="mt-1 text-2xl font-black text-amber-700">{loading ? '—' : stats.announcements}</p></div>
          <div className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">Kelas terdata</p><p className="mt-1 text-2xl font-black text-violet-700">{classes.length}</p></div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Link href="/admin/bank-soal" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">📝</span><h2 className="mt-2 font-black text-slate-900">Bank Soal & Ujian</h2><p className="mt-1 text-xs text-slate-500">Kelola paket, soal, token, materi, dan pengumuman.</p></Link>
          <Link href="/admin/users" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">👩‍🎓</span><h2 className="mt-2 font-black text-slate-900">Data Peserta</h2><p className="mt-1 text-xs text-slate-500">Kelola akun, kelas, dan profil siswa.</p></Link>
          <Link href="/admin/practice" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">🎮</span><h2 className="mt-2 font-black text-slate-900">Pengelolaan Practice</h2><p className="mt-1 text-xs text-slate-500">Kelola kuis, flashcard, dan game edukatif.</p></Link>
          <Link href="/admin/raport" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">📄</span><h2 className="mt-2 font-black text-slate-900">Raport & Sertifikat</h2><p className="mt-1 text-xs text-slate-500">Pilih peserta dan riwayat nilai, atur penandatangan, preview, lalu cetak.</p></Link>
          <Link href="/admin/pengaturan-dokumen" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">⚙️</span><h2 className="mt-2 font-black text-slate-900">Pengaturan Dokumen</h2><p className="mt-1 text-xs text-slate-500">Atur identitas sekolah, guru/admin, kepala sekolah, dan KKM.</p></Link>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div><h2 className="text-lg font-black text-slate-900">Peserta Didik</h2><p className="text-xs text-slate-500">Cakupan global atau kelas tertentu, dengan pencarian dan pengurutan.</p></div>
            <div className="grid gap-2 sm:grid-cols-3">
              <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="ALL">Semua kelas · Global</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Cari nama / username" className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800" />
              <select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="name">Nama A–Z</option><option value="xp">XP total tertinggi</option><option value="practice">XP latihan tertinggi</option><option value="exam">Rata-rata ujian tertinggi</option></select>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Peserta</th><th className="p-3">Kelas</th><th className="p-3 text-right">Level / XP</th><th className="p-3 text-right">Latihan selesai</th><th className="p-3 text-right">Nilai terbaik latihan</th><th className="p-3 text-right">Rata-rata ujian</th></tr></thead><tbody className="divide-y divide-slate-100">
            {pageRows.map(s => <tr key={s.id} className="hover:bg-slate-50"><td className="p-3"><div className="font-bold text-slate-900">{s.full_name || 'Tanpa nama'}</div><div className="text-[10px] text-slate-400">@{s.username || '-'}</div></td><td className="p-3">{s.class_code || '-'}</td><td className="p-3 text-right font-bold text-amber-700">Lv. {s.level} · {s.xp} XP</td><td className="p-3 text-right">{s.practiceAttempts}</td><td className="p-3 text-right font-bold text-emerald-700">{s.practiceBest}</td><td className="p-3 text-right font-bold text-indigo-700">{s.examCount ? s.examAverage : '—'}</td></tr>)}
            {!loading && pageRows.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">Belum ada peserta untuk filter ini.</td></tr>}
          </tbody></table></div>
          <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center"><span>{visible.length} peserta · halaman {currentPage}/{pageCount}</span><div className="flex items-center gap-2"><select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"><option value={10}>10 / halaman</option><option value={20}>20 / halaman</option><option value={50}>50 / halaman</option><option value={100}>100 / halaman</option></select><button type="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Berikutnya</button></div></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">🏆 Peringkat Latihan</h2><p className="text-xs text-slate-500">Akumulasi XP dari riwayat Practice · {classFilter === 'ALL' ? 'Global' : classFilter}</p><div className="mt-3 space-y-2">{practiceRanking.map((s, i) => <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div className="flex items-center gap-2"><span className="w-7 text-center font-black text-amber-600">#{i + 1}</span><div><div className="text-xs font-bold text-slate-800">{s.full_name || 'Tanpa nama'}</div><div className="text-[10px] text-slate-400">{s.class_code || 'Tanpa kelas'}</div></div></div><span className="text-xs font-black text-amber-700">{s.practiceXp} XP</span></div>)}{!practiceRanking.length && <p className="py-5 text-center text-xs text-slate-400">Belum ada XP latihan.</p>}</div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">📊 Peringkat Ujian</h2><p className="text-xs text-slate-500">Rata-rata nilai ujian selesai · {classFilter === 'ALL' ? 'Global' : classFilter}</p><div className="mt-3 space-y-2">{examRanking.map((s, i) => <div key={s.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><div className="flex items-center gap-2"><span className="w-7 text-center font-black text-indigo-600">#{i + 1}</span><div><div className="text-xs font-bold text-slate-800">{s.full_name || 'Tanpa nama'}</div><div className="text-[10px] text-slate-400">{s.class_code || 'Tanpa kelas'} · {s.examCount} ujian</div></div></div><span className="text-xs font-black text-indigo-700">{s.examAverage}/100</span></div>)}{!examRanking.length && <p className="py-5 text-center text-xs text-slate-400">Belum ada nilai ujian.</p>}</div></div>
        </section>
      </div>
    </main>
  )
}
