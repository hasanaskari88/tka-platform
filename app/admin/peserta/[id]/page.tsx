'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Student = { id:string; full_name:string|null; username:string|null; class_code:string|null; xp:number; level:number }
type Exam = { id:string; title:string; subtest:string|null; activity_type:string|null; target_mode:string|null }

export default function AdminStudentHistoryPage() {
  const params = useParams<{id:string}>()
  const studentId = params.id
  const [student,setStudent] = useState<Student|null>(null)
  const [exams,setExams] = useState<Exam[]>([])
  const [practice,setPractice] = useState<any[]>([])
  const [sessions,setSessions] = useState<any[]>([])
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')

  useEffect(()=>{
    let active=true
    async function load(){
      setLoading(true); setError('')
      const db=createClient()
      const [profile,examList,practiceList,examSessions]=await Promise.all([
        db.from('profiles').select('id,full_name,username,class_code,xp,level').eq('id',studentId).eq('role','student').maybeSingle(),
        db.from('exams').select('id,title,subtest,activity_type,target_mode'),
        db.from('practice_attempts').select('*').eq('user_id',studentId).order('created_at',{ascending:false}),
        db.from('exam_sessions').select('*').eq('user_id',studentId).order('created_at',{ascending:false}),
      ])
      if(!active)return
      if(profile.error) setError(profile.error.message)
      else if(!profile.data) setError('Peserta didik tidak ditemukan atau akun bukan siswa.')
      else setStudent(profile.data as Student)
      if(examList.error) setError(old=>old?old+' | Paket soal: '+examList.error.message:'Paket soal: '+examList.error.message)
      else setExams((examList.data||[]) as Exam[])
      if(practiceList.error) setError(old=>old?old+' | Riwayat latihan: '+practiceList.error.message:'Riwayat latihan: '+practiceList.error.message)
      else setPractice(practiceList.data||[])
      if(examSessions.error) setError(old=>old?old+' | Riwayat ujian: '+examSessions.error.message:'Riwayat ujian: '+examSessions.error.message)
      else setSessions(examSessions.data||[])
      setLoading(false)
    }
    if(studentId) void load()
    return ()=>{active=false}
  },[studentId])

  const examMap=useMemo(()=>new Map(exams.map(exam=>[exam.id,exam])),[exams])
  const completedPractice=practice.filter(row=>row.status==='completed')
  const completedSessions=sessions.filter(row=>row.status==='completed')
  const bestPractice=completedPractice.length?Math.max(...completedPractice.map(row=>Number(row.score||0))):0
  const bestExam=completedSessions.length?Math.max(...completedSessions.map(row=>Number(row.score_override??row.score??0))):0
  const date=(value:string|null|undefined)=>value?new Date(value).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'—'
  const xpFor=(row:any)=>Number(row.credited_xp??row.total_xp??0)

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Dashboard Admin · Detail Peserta</p><h1 className="mt-1 text-2xl font-black text-slate-900">{student?.full_name||'Riwayat Peserta Didik'}</h1><p className="text-sm text-slate-500">@{student?.username||'—'} · Kelas {student?.class_code||'—'}</p></div>
        <Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Kembali ke Dashboard</Link>
      </header>
      {error&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div>}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Level / XP</p><p className="mt-1 text-2xl font-black text-amber-700">{student? 'Lv. '+student.level:'—'}</p><p className="text-xs text-slate-500">{student?.xp.toLocaleString('id-ID')||'—'} XP</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Latihan selesai</p><p className="mt-1 text-2xl font-black text-emerald-700">{loading?'—':completedPractice.length}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Nilai terbaik latihan</p><p className="mt-1 text-2xl font-black text-emerald-700">{loading?'—':bestPractice||'—'}</p></div>
        <div className="rounded-2xl border bg-white p-4"><p className="text-xs text-slate-500">Nilai terbaik ujian</p><p className="mt-1 text-2xl font-black text-indigo-700">{loading?'—':bestExam||'—'}</p></div>
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black text-slate-900">Riwayat latihan</h2><p className="text-xs text-slate-500">Seluruh percobaan, termasuk sesi yang belum selesai.</p></div><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{practice.length} sesi</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Paket / Subtes</th><th className="p-3">Status</th><th className="p-3 text-right">Nilai</th><th className="p-3 text-right">XP</th><th className="p-3">Waktu</th></tr></thead><tbody className="divide-y">{practice.map((row:any)=>{const exam=examMap.get(row.exam_id);return <tr key={row.id}><td className="p-3"><b className="text-slate-800">{exam?.title||'Paket latihan'}</b><div className="text-[10px] text-slate-400">{exam?.subtest||'Umum'} · {exam?.activity_type||'Latihan'} · Percobaan {row.attempt_number||1}</div></td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1">{row.status==='completed'?'Selesai':row.status==='in_progress'?'Berlangsung':'Ditinggalkan'}</span></td><td className="p-3 text-right font-bold">{row.status==='completed'?Number(row.score||0):'—'}</td><td className="p-3 text-right font-bold text-amber-700">{xpFor(row).toLocaleString('id-ID')}</td><td className="p-3 text-slate-500">{date(row.completed_at||row.created_at)}</td></tr>})}{!loading&&!practice.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-400">Belum ada riwayat latihan.</td></tr>}</tbody></table></div>
      </section>
      <section className="rounded-2xl border bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black text-slate-900">Riwayat ujian</h2><p className="text-xs text-slate-500">Nilai koreksi guru (jika tersedia) ditampilkan sebagai nilai akhir.</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{sessions.length} sesi</span></div>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Paket / Subtes</th><th className="p-3">Status</th><th className="p-3 text-right">Nilai akhir</th><th className="p-3">Waktu</th></tr></thead><tbody className="divide-y">{sessions.map((row:any)=>{const exam=examMap.get(row.exam_id);return <tr key={row.id}><td className="p-3"><b className="text-slate-800">{exam?.title||'Paket ujian'}</b><div className="text-[10px] text-slate-400">{exam?.subtest||'Umum'}</div></td><td className="p-3"><span className="rounded-full bg-slate-100 px-2 py-1">{row.status==='completed'?'Selesai':row.status==='ongoing'?'Berlangsung':row.status==='paused'?'Dijeda':'Kedaluwarsa'}</span></td><td className="p-3 text-right font-black text-indigo-700">{row.status==='completed'?Number(row.score_override??row.score??0):'—'}</td><td className="p-3 text-slate-500">{date(row.completed_at||row.submitted_at||row.created_at)}</td></tr>})}{!loading&&!sessions.length&&<tr><td colSpan={4} className="p-8 text-center text-slate-400">Belum ada riwayat ujian.</td></tr>}</tbody></table></div>
      </section>
    </div>
  </main>
}
