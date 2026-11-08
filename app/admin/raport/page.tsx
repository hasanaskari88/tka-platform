'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type DocConfig = {
  schoolName: string
  schoolAddress: string
  teacherName: string
  teacherNip: string
  principalName: string
  principalNip: string
  issuePlace: string
  issueDate: string
  kkm: number
}

export default function AdminReportPage() {
  const [students, setStudents] = useState<any[]>([])
  const [adminProfiles, setAdminProfiles] = useState<any[]>([])
  const [signatories, setSignatories] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [practice, setPractice] = useState<any[]>([])
  const [examSessions, setExamSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [warning, setWarning] = useState('')
  const [classFilter, setClassFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [selectedPracticeIds, setSelectedPracticeIds] = useState<string[]>([])
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>([])
  const [mode, setMode] = useState<'report' | 'certificate'>('report')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [certificateSessionId, setCertificateSessionId] = useState('')
  const [config, setConfig] = useState<DocConfig>({
    schoolName: 'SD NEGERI GETASAN',
    schoolAddress: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang',
    teacherName: '',
    teacherNip: '',
    principalName: 'GIYANTO, S.Pd.',
    principalNip: '19670715 199903 1 006',
    issuePlace: 'Getasan',
    issueDate: new Date().toISOString().slice(0, 10),
    kkm: 70,
  })

  useEffect(() => {
    let active = true
    async function load() {
      const db = createClient()
      try {
        const [p, e, pr, es] = await Promise.all([
          db.from('profiles').select('id,full_name,username,class_code,role').eq('role', 'student').order('full_name'),
          db.from('exams').select('id,title,subtest,activity_type'),
          db.from('practice_attempts').select('*').eq('status', 'completed').order('completed_at', { ascending: false }),
          db.from('exam_sessions').select('*').eq('status', 'completed').order('completed_at', { ascending: false }),
        ])
        if (!active) return
        if (p.error) throw p.error
        if (pr.error || es.error) setWarning('Sebagian riwayat tidak dapat dimuat. Periksa izin baca data admin di Supabase.')
        setStudents(p.data || [])
        setExams(e.data || [])
        setPractice(pr.data || [])
        setExamSessions(es.data || [])
        const [admin, savedSettings, people] = await Promise.all([
          db.from('profiles').select('full_name').eq('role', 'admin').order('full_name'),
          db.rpc('get_school_document_settings'),
          db.from('teacher_signatories').select('id,full_name,position,class_code,nip').eq('is_active', true),
        ])
        setAdminProfiles(admin.data || [])
        setSignatories(people.data || [])
        if (savedSettings.data) {
          const s = savedSettings.data
          setConfig(current => ({ ...current, schoolName: s.school_name || current.schoolName, schoolAddress: s.school_address || current.schoolAddress, teacherName: s.teacher_name || admin.data?.[0]?.full_name || current.teacherName, teacherNip: s.teacher_nip || current.teacherNip, principalName: s.principal_name || current.principalName, principalNip: s.principal_nip || current.principalNip, issuePlace: s.issue_place || current.issuePlace, kkm: Number(s.kkm ?? current.kkm) }))
        } else if (admin.data?.[0]?.full_name) {
          setConfig(current => ({ ...current, teacherName: admin.data[0].full_name }))
        }
      } catch (error: any) {
        if (active) setWarning(error?.message || 'Gagal memuat data raport.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const selectedStudent = students.find(s => s.id === selectedStudentId)
  const examMap = useMemo(() => new Map(exams.map(e => [e.id, e])), [exams])
  const classes = [...new Set(students.map(s => s.class_code).filter(Boolean) as string[])].sort()
  const filteredStudents = students.filter(s => {
    const classMatch = classFilter === 'ALL' || s.class_code === classFilter
    const q = search.trim().toLowerCase()
    return classMatch && (!q || String(s.full_name || '').toLowerCase().includes(q) || String(s.username || '').toLowerCase().includes(q))
  })
  const studentPractice = practice.filter(a => a.user_id === selectedStudentId)
  const studentExams = examSessions.filter(s => s.user_id === selectedStudentId)
  const chosenPractice = studentPractice.filter(a => selectedPracticeIds.includes(a.id))
  const chosenExams = studentExams.filter(s => selectedExamIds.includes(s.id))
  const certificateSession = studentExams.find(s => s.id === certificateSessionId)
  const dateLabel = new Date(config.issueDate + 'T00:00:00').toLocaleDateString('id-ID', { dateStyle: 'long' })

  const updateConfig = (key: keyof DocConfig, value: string | number) => setConfig(old => ({ ...old, [key]: value }))
  const togglePractice = (id: string) => setSelectedPracticeIds(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])
  const toggleExam = (id: string) => setSelectedExamIds(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id])

  const printDocument = () => {
    if (!selectedStudent) return
    setPreviewOpen(true)
    window.setTimeout(() => window.print(), 250)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <style>{`@media print { body * { visibility: hidden !important; } #document-preview, #document-preview * { visibility: visible !important; } #document-preview { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; background: white !important; padding: 24px !important; } .no-print { display: none !important; } }`}</style>
      <div className="no-print mx-auto max-w-7xl space-y-6">
        <header><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Raport & Sertifikat Peserta</h1><p className="mt-1 text-sm text-slate-500">Pilih peserta dan riwayat nilai yang akan dimasukkan ke dokumen, lalu periksa pratinjau sebelum mencetak.</p></header>
        {warning && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>}

        <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-slate-900">1. Pilih Peserta</h2>
            <div className="mt-3 space-y-2">
              <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="ALL">Semua kelas</option>{classes.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama peserta..." className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800" />
            </div>
            <div className="mt-3 max-h-[560px] space-y-1 overflow-y-auto">
              {filteredStudents.map(s => <button key={s.id} type="button" onClick={() => {
                setSelectedStudentId(s.id); setSelectedPracticeIds([]); setSelectedExamIds([]); setCertificateSessionId('')
                const teacher = signatories.find(item => item.position === 'class_teacher' && item.class_code === s.class_code)
                const principal = signatories.find(item => item.position === 'principal')
                if (teacher) setConfig(old => ({ ...old, teacherName: teacher.full_name, teacherNip: teacher.nip || '' }))
                if (principal) setConfig(old => ({ ...old, principalName: principal.full_name, principalNip: principal.nip || '' }))
              }} className={`w-full rounded-xl border p-3 text-left ${selectedStudentId === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:bg-slate-50'}`}><div className="text-xs font-bold text-slate-900">{s.full_name || 'Tanpa nama'}</div><div className="mt-0.5 text-[10px] text-slate-500">Kelas {s.class_code || '-'} · @{s.username || '-'}</div></button>)}
              {!loading && filteredStudents.length === 0 && <p className="py-6 text-center text-xs text-slate-400">Peserta tidak ditemukan.</p>}
            </div>
          </aside>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-black text-slate-900">2. Pilih Isi Dokumen</h2>
              {!selectedStudent ? <p className="mt-3 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">Pilih seorang peserta dari daftar di sebelah kiri.</p> : <>
                <div className="mt-3 rounded-xl bg-indigo-50 p-3"><div className="font-bold text-indigo-950">{selectedStudent.full_name}</div><div className="text-xs text-indigo-700">Kelas {selectedStudent.class_code || '-'} · @{selectedStudent.username || '-'}</div></div>
                <div className="mt-4 grid gap-4 xl:grid-cols-2">
                  <div><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Riwayat latihan ({studentPractice.length})</h3><button type="button" onClick={() => setSelectedPracticeIds(studentPractice.map(a => a.id))} className="text-[11px] font-bold text-indigo-600">Pilih semua</button></div><div className="mt-2 max-h-72 space-y-2 overflow-y-auto">{studentPractice.map(a => <label key={a.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50"><input type="checkbox" checked={selectedPracticeIds.includes(a.id)} onChange={() => togglePractice(a.id)} className="mt-0.5"/><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{examMap.get(a.exam_id)?.title || 'Latihan'}</span><span className="block text-[10px] text-slate-500">Percobaan ke-{a.attempt_number} · {new Date(a.completed_at || a.created_at).toLocaleDateString('id-ID')}</span><span className="block text-[10px] text-emerald-700">Nilai {Number(a.score || 0)} · XP {a.total_xp || 0} · Bonus pertama {a.completion_bonus_xp || 0} · Peningkatan {a.improvement_xp || 0}</span></span></label>)}{!studentPractice.length && <p className="text-xs text-slate-400">Belum ada latihan selesai.</p>}</div></div>
                  <div><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold text-slate-800">Riwayat ujian ({studentExams.length})</h3><button type="button" onClick={() => setSelectedExamIds(studentExams.map(s => s.id))} className="text-[11px] font-bold text-indigo-600">Pilih semua</button></div><div className="mt-2 max-h-72 space-y-2 overflow-y-auto">{studentExams.map(s => <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50"><input type="checkbox" checked={selectedExamIds.includes(s.id)} onChange={() => toggleExam(s.id)} className="mt-0.5"/><span className="min-w-0 flex-1"><span className="block text-xs font-bold text-slate-800">{examMap.get(s.exam_id)?.title || 'Ujian'}</span><span className="block text-[10px] text-slate-500">{examMap.get(s.exam_id)?.subtest || 'UMUM'} · {new Date(s.completed_at || s.created_at).toLocaleDateString('id-ID')}</span><span className="block text-[10px] font-bold text-indigo-700">Nilai {Number(s.score_override ?? s.score ?? 0)} / 100</span></span></label>)}{!studentExams.length && <p className="text-xs text-slate-400">Belum ada ujian selesai.</p>}</div></div>
                </div>
              </>}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2"><h2 className="font-black text-slate-900">3. Pengaturan Identitas Dokumen</h2><Link href="/admin/pengaturan-dokumen" className="text-xs font-bold text-indigo-600 hover:underline">Pengaturan terpusat →</Link></div>
              <p className="mt-1 text-xs text-slate-500">Pilih atau sesuaikan nama penandatangan untuk pratinjau dokumen.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-slate-600">Nama sekolah<input value={config.schoolName} onChange={e => updateConfig('schoolName', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
                <label className="text-xs font-semibold text-slate-600">Alamat sekolah<input value={config.schoolAddress} onChange={e => updateConfig('schoolAddress', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
                <label className="text-xs font-semibold text-slate-600">Guru pengampu kelas {selectedStudent?.class_code || ''}<select value={signatories.find(item => item.position === 'class_teacher' && item.class_code === selectedStudent?.class_code && item.full_name === config.teacherName)?.id || ''} onChange={e => { const item = signatories.find(x => x.id === e.target.value); if (item) setConfig(old => ({ ...old, teacherName: item.full_name, teacherNip: item.nip || '' })) }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"><option value="">Pilih guru kelas</option>{signatories.filter(item => item.position === 'class_teacher' && item.class_code === selectedStudent?.class_code).map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">NIP: {config.teacherNip || '—'}</span></label>
                <label className="text-xs font-semibold text-slate-600">Kepala Sekolah<select value={signatories.find(item => item.position === 'principal' && item.full_name === config.principalName)?.id || ''} onChange={e => { const item = signatories.find(x => x.id === e.target.value); if (item) setConfig(old => ({ ...old, principalName: item.full_name, principalNip: item.nip || '' })) }} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"><option value="">Pilih kepala sekolah</option>{signatories.filter(item => item.position === 'principal').map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><span className="mt-1 block text-[10px] text-slate-500">NIP: {config.principalNip || '—'}</span></label>
                <label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={config.issuePlace} onChange={e => updateConfig('issuePlace', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
                <label className="text-xs font-semibold text-slate-600">Tanggal dokumen<input type="date" value={config.issueDate} onChange={e => updateConfig('issueDate', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
                <label className="text-xs font-semibold text-slate-600">KKM / batas ketuntasan<input type="number" min="0" max="100" value={config.kkm} onChange={e => updateConfig('kkm', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"/></label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-black text-slate-900">4. Pratinjau & Cetak</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => setMode('report')} className={`rounded-lg px-4 py-2 text-xs font-bold ${mode === 'report' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Raport</button>
                <button type="button" onClick={() => setMode('certificate')} className={`rounded-lg px-4 py-2 text-xs font-bold ${mode === 'certificate' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>Sertifikat</button>
                {mode === 'certificate' && <select value={certificateSessionId} onChange={e => setCertificateSessionId(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="">Pilih hasil ujian untuk sertifikat</option>{studentExams.map(s => <option key={s.id} value={s.id}>{examMap.get(s.exam_id)?.title || 'Ujian'} · {s.score}</option>)}</select>}
                <button type="button" disabled={!selectedStudent || (mode === 'report' ? selectedPracticeIds.length + selectedExamIds.length === 0 : !certificateSessionId)} onClick={printDocument} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Pratinjau & Cetak</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Mode raport mencetak hanya riwayat yang dicentang. Mode sertifikat menggunakan satu hasil ujian yang dipilih.</p>
            </section>
          </div>
        </section>
      </div>

      {previewOpen && selectedStudent && (
        <section id="document-preview" className="mx-auto mt-6 max-w-4xl bg-white p-8 text-slate-900">
          <div className="border-b-2 border-slate-800 pb-4 text-center"><h1 className="text-xl font-black">{config.schoolName}</h1><p className="text-xs">{config.schoolAddress}</p><h2 className="mt-4 text-lg font-black uppercase">{mode === 'report' ? 'RAPOR HASIL BELAJAR & LATIHAN' : 'SERTIFIKAT CAPAIAN AKADEMIK'}</h2></div>
          <div className="my-5 grid grid-cols-2 gap-3 text-sm"><div><span className="text-xs text-slate-500">Nama Peserta</span><p className="font-bold">{selectedStudent.full_name}</p></div><div><span className="text-xs text-slate-500">Kelas</span><p className="font-bold">{selectedStudent.class_code || '-'}</p></div><div><span className="text-xs text-slate-500">Username</span><p className="font-bold">{selectedStudent.username || '-'}</p></div><div><span className="text-xs text-slate-500">Tanggal Cetak</span><p className="font-bold">{dateLabel}</p></div></div>
          {mode === 'report' ? <>
            <h3 className="mb-2 font-bold">Rekap Latihan</h3><table className="mb-5 w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">Latihan</th><th className="border p-2">Percobaan</th><th className="border p-2">Nilai</th><th className="border p-2">XP</th><th className="border p-2">Bonus</th></tr></thead><tbody>{chosenPractice.map(a => <tr key={a.id}><td className="border p-2">{examMap.get(a.exam_id)?.title || 'Latihan'}</td><td className="border p-2 text-center">{a.attempt_number}</td><td className="border p-2 text-center">{Number(a.score || 0)}</td><td className="border p-2 text-center">{a.total_xp || 0}</td><td className="border p-2 text-center">{Number(a.completion_bonus_xp || 0) + Number(a.improvement_xp || 0)}</td></tr>)}</tbody></table>
            <h3 className="mb-2 font-bold">Rekap Ujian</h3><table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">Ujian</th><th className="border p-2">Subtes</th><th className="border p-2">Nilai</th><th className="border p-2">Ketuntasan</th></tr></thead><tbody>{chosenExams.map(s => <tr key={s.id}><td className="border p-2">{examMap.get(s.exam_id)?.title || 'Ujian'}</td><td className="border p-2 text-center">{examMap.get(s.exam_id)?.subtest || 'UMUM'}</td><td className="border p-2 text-center">{Number(s.score || 0)}</td><td className="border p-2 text-center">{Number(s.score || 0) >= config.kkm ? 'Tuntas' : 'Belum tuntas'}</td></tr>)}</tbody></table>
          </> : <div className="py-14 text-center"><p className="text-sm">Diberikan kepada</p><h2 className="my-4 text-3xl font-black uppercase">{selectedStudent.full_name}</h2><p className="mx-auto max-w-xl text-sm">Telah menyelesaikan ujian <strong>{examMap.get(certificateSession?.exam_id)?.title || 'Ujian'}</strong> dengan nilai</p><p className="my-5 text-5xl font-black text-indigo-800">{certificateSession?.score_override ?? certificateSession?.score ?? 0}<span className="text-lg"> / 100</span></p></div>}
          <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs"><div><p>Guru / Admin,</p><div className="h-16"/><p className="font-bold underline">{config.teacherName || '................................'}</p><p>NIP. {config.teacherNip || '-'}</p></div><div><p>{config.issuePlace}, {dateLabel}</p><p>Kepala Sekolah,</p><div className="h-16"/><p className="font-bold underline">{config.principalName}</p><p>NIP. {config.principalNip}</p></div></div>
          <div className="no-print mt-6 flex justify-end gap-2"><button type="button" onClick={() => setPreviewOpen(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700">Tutup Pratinjau</button><button type="button" onClick={() => window.print()} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Cetak / Simpan PDF</button></div>
        </section>
      )}
    </main>
  )
}
