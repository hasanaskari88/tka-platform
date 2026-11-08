'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Student = { id:string; full_name:string|null; username:string|null; class_code:string|null; xp:number; level:number; practiceXp:number; practiceAttempts:number; practiceBest:number; examCount:number; examAverage:number }
type ExamMeta = { id:string; title:string; subtest:string|null; target_mode:string|null; activity_type:string|null }

export default function AdminDashboardPage() {
  const [students,setStudents]=useState<Student[]>([])
  const [practiceRows,setPracticeRows]=useState<any[]>([])
  const [examRows,setExamRows]=useState<any[]>([])
  const [examMeta,setExamMeta]=useState<ExamMeta[]>([])
  const [stats,setStats]=useState({exams:0,questions:0,materials:0,announcements:0})
  const [loading,setLoading]=useState(true)
  const [warning,setWarning]=useState('')
  const [classFilter,setClassFilter]=useState('ALL')
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState('name')
  const [page,setPage]=useState(1)
  const [pageSize,setPageSize]=useState(20)
  const [rankScope,setRankScope]=useState<'global'|'exam'>('global')
  const [rankExamId,setRankExamId]=useState('ALL')
  const [rankClass,setRankClass]=useState('ALL')
  const [rankType,setRankType]=useState('ALL')

  useEffect(()=>{
    let active=true
    async function load(){
      const db=createClient()
      try{
        const [p,pr,ex,em,ec,qc,mc,ac]=await Promise.all([
          db.from('profiles').select('id,full_name,username,class_code,role,xp,level').eq('role','student').order('full_name'),
          // select * keeps the dashboard compatible before/after the staged credited_xp migration
          db.from('practice_attempts').select('*'),
          db.from('exam_sessions').select('*'),
          db.from('exams').select('id,title,subtest,target_mode,activity_type'),
          db.from('exams').select('id',{count:'exact',head:true}),
          db.from('questions').select('id',{count:'exact',head:true}),
          db.from('study_materials').select('id',{count:'exact',head:true}),
          db.from('announcements').select('id',{count:'exact',head:true}),
        ])
        if(!active)return
        if(p.error)throw p.error
        const problems:string[]=[]
        if(pr.error)problems.push('riwayat latihan: '+pr.error.message)
        if(ex.error)problems.push('riwayat ujian: '+ex.error.message)
        if(em.error)problems.push('metadata paket: '+em.error.message)
        if(problems.length)setWarning('Sebagian data belum dapat dibaca — '+problems.join(' | '))
        const practice=pr.data||[], exams=ex.data||[], meta=em.data||[]
        setPracticeRows(practice);setExamRows(exams);setExamMeta(meta as ExamMeta[])
        const metaMap=new Map(meta.map((x:any)=>[x.id,x]))
        const byPractice=new Map<string,{xp:number;count:number;best:number}>()
        practice.forEach((r:any)=>{
          const old=byPractice.get(r.user_id)||{xp:0,count:0,best:0}
          byPractice.set(r.user_id,{xp:old.xp+(r.status==='completed'?Number(r.total_xp||0):Number(r.credited_xp||0)),count:old.count+(r.status==='completed'?1:0),best:Math.max(old.best,Number(r.score||0))})
        })
        const bestByExamStudent=new Map<string,number>()
        exams.filter((r:any)=>r.status==='completed').forEach((r:any)=>{
          const key=r.user_id+'|'+r.exam_id
          const score=Number(r.score_override??r.score??0)
          bestByExamStudent.set(key,Math.max(bestByExamStudent.get(key)||0,score))
        })
        const byExam=new Map<string,{sum:number;count:number}>()
        bestByExamStudent.forEach((score,key)=>{
          const userId=key.split('|')[0],old=byExam.get(userId)||{sum:0,count:0}
          byExam.set(userId,{sum:old.sum+score,count:old.count+1})
        })
        setStudents((p.data||[]).map((r:any)=>{
          const a=byPractice.get(r.id)||{xp:0,count:0,best:0},b=byExam.get(r.id)||{sum:0,count:0}
          return {id:r.id,full_name:r.full_name,username:r.username,class_code:r.class_code,xp:Number(r.xp||0),level:Number(r.level||1),practiceXp:a.xp,practiceAttempts:a.count,practiceBest:a.best,examCount:b.count,examAverage:b.count?Math.round(b.sum/b.count):0}
        }))
        setStats({exams:ec.count||0,questions:qc.count||0,materials:mc.count||0,announcements:ac.count||0})
      }catch(e:any){if(active)setWarning(e?.message||'Gagal memuat dashboard.')}
      finally{if(active)setLoading(false)}
    }
    void load();return()=>{active=false}
  },[])

  const classes=useMemo(()=>[...new Set(students.map(s=>s.class_code).filter(Boolean) as string[])].sort(),[students])
  const scoped=useMemo(()=>students.filter(s=>classFilter==='ALL'||s.class_code===classFilter),[students,classFilter])
  const visible=useMemo(()=>scoped.filter(s=>{const q=search.toLowerCase().trim();return !q||String(s.full_name||'').toLowerCase().includes(q)||String(s.username||'').toLowerCase().includes(q)}).sort((a,b)=>sort==='xp'?b.xp-a.xp:sort==='practice'?b.practiceXp-a.practiceXp:sort==='exam'?b.examAverage-a.examAverage:String(a.full_name||'').localeCompare(String(b.full_name||''),'id')),[scoped,search,sort])
  const pageCount=Math.max(1,Math.ceil(visible.length/pageSize)),currentPage=Math.min(page,pageCount),pageRows=visible.slice((currentPage-1)*pageSize,currentPage*pageSize)
  const studentMap=new Map(students.map(s=>[s.id,s]))
  const metaMap=new Map(examMeta.map(e=>[e.id,e]))
  const rankExam=rankScope==='exam'&&rankExamId!=='ALL'?rankExamId:null
  const eligiblePractice=practiceRows.filter(r=>{
    const student=studentMap.get(r.user_id),meta=metaMap.get(r.exam_id)
    if(!student||(rankClass!=='ALL'&&student.class_code!==rankClass))return false
    if(rankExam&&r.exam_id!==rankExam)return false
    if(rankType==='EXAM')return false
    if(rankType==='PRACTICE'&&meta?.target_mode==='EXAM_ONLY')return false
    if(['QUIZ','FLASHCARD','MAZE_GAME'].includes(rankType)&&meta?.activity_type!==rankType)return false
    return true
  })
  const practiceTotals=new Map<string,number>()
  eligiblePractice.forEach(r=>practiceTotals.set(r.user_id,(practiceTotals.get(r.user_id)||0)+(r.status==='completed'?Number(r.total_xp||0):Number(r.credited_xp||0))))
  const practiceRanking=[...practiceTotals].map(([id,xp])=>({student:studentMap.get(id)!,value:xp})).filter((x): x is {student:Student;value:number}=>Boolean(x.student)).sort((a,b)=>b.value-a.value).slice(0,10)
  const eligibleExams=examRows.filter(r=>{
    const student=studentMap.get(r.user_id),meta=metaMap.get(r.exam_id)
    if(!student||r.status!=='completed'||(rankClass!=='ALL'&&student.class_code!==rankClass))return false
    if(rankExam&&r.exam_id!==rankExam)return false
    if(rankType==='QUIZ'||rankType==='FLASHCARD'||rankType==='MAZE_GAME')return false
    if(rankType==='EXAM'&&meta?.target_mode==='PRACTICE_ONLY')return false
    if(rankType==='PRACTICE'&&meta?.target_mode==='EXAM_ONLY')return false
    return true
  })
  const bestScores=new Map<string,number>()
  eligibleExams.forEach(r=>{const key=r.user_id+'|'+r.exam_id,score=Number(r.score_override??r.score??0);bestScores.set(key,Math.max(bestScores.get(key)??-1,score))})
  const examTotals=new Map<string,{sum:number;count:number}>()
  bestScores.forEach((score,key)=>{const userId=key.split('|')[0],old=examTotals.get(userId)||{sum:0,count:0};examTotals.set(userId,{sum:old.sum+score,count:old.count+1})})
  const examRanking=[...examTotals].map(([id,v])=>({student:studentMap.get(id)!,value:Math.round(v.sum/v.count),count:v.count})).filter((x): x is {student:Student;value:number;count:number}=>Boolean(x.student)).sort((a,b)=>b.value-a.value).slice(0,10)
  const completedPractice=practiceRows.filter(r=>r.status==='completed').length,completedExams=examRows.filter(r=>r.status==='completed').length
  const cards=[{label:'Peserta didik',value:students.length,icon:'👩‍🎓',color:'from-indigo-500 to-blue-600'},{label:'Paket ujian & latihan',value:stats.exams,icon:'📚',color:'from-violet-500 to-purple-600'},{label:'Bank soal',value:stats.questions,icon:'📝',color:'from-amber-500 to-orange-600'},{label:'Materi pembelajaran',value:stats.materials,icon:'📖',color:'from-emerald-500 to-teal-600'}]
  const summaryXp=scoped.reduce((sum,student)=>sum+student.xp,0)
  const summaryPractice=scoped.reduce((sum,student)=>sum+student.practiceAttempts,0)
  const summaryExam=scoped.filter(student=>student.examCount>0)
  const summaryExamAverage=summaryExam.length?Math.round(summaryExam.reduce((sum,student)=>sum+student.examAverage,0)/summaryExam.length):0
  const classSummary=classes.map(name=>({name,count:students.filter(student=>student.class_code===name).length})).filter(item=>classFilter==='ALL'||item.name===classFilter)
  const topPracticeStudents=[...scoped].sort((a,b)=>b.practiceXp-a.practiceXp).slice(0,5).map(student=>({student,value:student.practiceXp}))
  const ChartBars=({items,color,suffix}:{items:{student:Student;value:number}[];color:string;suffix:string})=>{
    const max=Math.max(1,...items.map(x=>x.value))
    return <div className="mt-3 space-y-3">{items.map((item,i)=><div key={item.student.id}><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate font-semibold text-slate-700">{i+1}. {item.student.full_name||item.student.username||'Siswa'} <span className="text-slate-400">({item.student.class_code||'—'})</span></span><b className="shrink-0">{item.value.toLocaleString('id-ID')} {suffix}</b></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:(item.value/max*100)+'%'}}/></div></div>)}{!items.length&&<p className="py-5 text-center text-xs text-slate-400">Belum ada data pada filter ini.</p>}</div>
  }

  return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8 md:py-8"><div className="mx-auto max-w-7xl space-y-7">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">TKA Platform · Admin Center</p><h1 className="mt-1 text-3xl font-black text-slate-900">Dashboard Pengelola</h1><p className="mt-1 text-sm text-slate-500">Ringkasan aktivitas, perkembangan peserta, dan pintasan pengelolaan website.</p></div><Link href="/" className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">← Lihat Website</Link></header>
    {warning&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</div>}
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(c=><div key={c.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className={`bg-gradient-to-r ${c.color} px-4 py-3 text-white`}><div className="flex items-center justify-between text-xs font-bold uppercase"><span>{c.label}</span><span className="text-2xl">{c.icon}</span></div><div className="mt-2 text-3xl font-black">{loading?'—':c.value.toLocaleString('id-ID')}</div></div></div>)}</section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{label:'Latihan selesai',value:completedPractice},{label:'Ujian selesai',value:completedExams},{label:'Pengumuman',value:stats.announcements},{label:'Kelas terdata',value:classes.length}].map((x,i)=><div key={x.label} className="rounded-xl border bg-white p-4"><p className="text-xs text-slate-500">{x.label}</p><p className="mt-1 text-2xl font-black">{loading?'—':x.value}</p></div>)}</section>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Link href="/admin/bank-soal" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">📝</span><h2 className="mt-2 font-black">Bank Soal & Ujian</h2><p className="mt-1 text-xs text-slate-500">Paket ujian, soal, token, dan subtes.</p></Link>
      <Link href="/admin/konten" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">📢</span><h2 className="mt-2 font-black">Konten Website</h2><p className="mt-1 text-xs text-slate-500">Pengumuman dan materi belajar.</p></Link>
      <Link href="/admin/users" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">👩‍🎓</span><h2 className="mt-2 font-black">Data Peserta</h2><p className="mt-1 text-xs text-slate-500">Kelola akun, kelas, dan profil siswa.</p></Link>
      <Link href="/admin/practice" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">🎮</span><h2 className="mt-2 font-black">Mode Latihan</h2><p className="mt-1 text-xs text-slate-500">Kuis, flashcard, dan game edukatif.</p></Link>
      <Link href="/admin/raport" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">📄</span><h2 className="mt-2 font-black">Raport & Sertifikat</h2><p className="mt-1 text-xs text-slate-500">Pilih hasil, tanda tangan, preview, cetak.</p></Link>
      <Link href="/admin/pengaturan-dokumen" className="rounded-2xl border-2 border-slate-900 bg-white p-4 shadow-[4px_4px_0_#0f172a]"><span className="text-2xl">⚙️</span><h2 className="mt-2 font-black">Pengaturan Dokumen</h2><p className="mt-1 text-xs text-slate-500">Identitas sekolah dan arsip penandatangan.</p></Link>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-lg font-black text-slate-900">Peserta Didik</h2><p className="text-xs text-slate-500">Pencarian, pengurutan, dan ringkasan per kelas.</p></div><div className="grid gap-2 sm:grid-cols-3"><select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="ALL">Semua kelas · Global</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cari nama / username" className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800"/><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="name">Nama A–Z</option><option value="xp">XP total tertinggi</option><option value="practice">XP latihan tertinggi</option><option value="exam">Rata-rata ujian tertinggi</option></select></div></div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_0.85fr]">
      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200">
        <div className="flex items-center justify-between border-b bg-slate-50 px-3 py-2"><span className="text-xs font-bold text-slate-600">Daftar peserta</span><span className="text-[10px] text-slate-400">Klik nama untuk membuka riwayat</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[390px] text-left text-xs"><thead className="bg-slate-100 text-slate-600"><tr><th className="p-3">Peserta didik</th><th className="p-3">Kelas</th><th className="p-3 text-right">Detail</th></tr></thead><tbody className="divide-y divide-slate-100">{pageRows.map(s=><tr key={s.id} className="hover:bg-indigo-50/50"><td className="p-3"><Link href={'/admin/peserta/'+s.id} className="font-bold text-indigo-700 hover:underline">{s.full_name||'Tanpa nama'}</Link><div className="text-[10px] text-slate-400">@{s.username||'-'} · Lv. {s.level} · {s.xp.toLocaleString('id-ID')} XP</div></td><td className="p-3 text-slate-600">{s.class_code||'-'}</td><td className="p-3 text-right"><Link href={'/admin/peserta/'+s.id} className="font-bold text-indigo-600">Riwayat →</Link></td></tr>)}{!loading&&!pageRows.length&&<tr><td colSpan={3} className="p-8 text-center text-slate-400">Belum ada peserta untuk filter ini.</td></tr>}</tbody></table></div>
      </div>
      <aside className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3"><p className="text-[10px] font-bold uppercase text-indigo-600">Total XP peserta</p><p className="mt-1 text-xl font-black text-indigo-900">{loading?'—':summaryXp.toLocaleString('id-ID')}</p></div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3"><p className="text-[10px] font-bold uppercase text-emerald-700">Latihan selesai</p><p className="mt-1 text-xl font-black text-emerald-900">{loading?'—':summaryPractice.toLocaleString('id-ID')}</p></div>
          <div className="rounded-xl border border-amber-100 bg-amber-50 p-3"><p className="text-[10px] font-bold uppercase text-amber-700">Rata-rata ujian terbaik</p><p className="mt-1 text-xl font-black text-amber-900">{loading?'—':summaryExamAverage||'—'}</p></div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Peserta terpilih</p><p className="mt-1 text-xl font-black text-slate-900">{loading?'—':scoped.length}</p></div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-slate-800">Sebaran peserta per kelas</h3><span className="text-[10px] text-slate-400">{classFilter==='ALL'?'Semua kelas':classFilter}</span></div><div className="mt-3 space-y-2">{classSummary.map(item=><div key={item.name}><div className="mb-1 flex justify-between text-[10px]"><span className="font-semibold text-slate-600">{item.name}</span><b className="text-slate-800">{item.count}</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-500" style={{width:(item.count/Math.max(1,...classSummary.map(x=>x.count))*100)+'%'}}/></div></div>)}{!classSummary.length&&<p className="py-3 text-center text-xs text-slate-400">Belum ada data kelas.</p>}</div></div>
        <div className="rounded-xl border border-slate-200 p-3"><h3 className="text-xs font-black text-slate-800">5 peserta dengan XP latihan tertinggi</h3><ChartBars items={topPracticeStudents} color="bg-emerald-500" suffix="XP"/></div>
      </aside>
    </div>
    <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center"><span>{visible.length} peserta · halaman {currentPage}/{pageCount}</span><div className="flex items-center gap-2"><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"><option value={10}>10 / halaman</option><option value={20}>20 / halaman</option><option value={50}>50 / halaman</option><option value={100}>100 / halaman</option></select><button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={currentPage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Berikutnya</button></div></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div><h2 className="text-lg font-black text-slate-900">Peringkat & Grafik Performa</h2><p className="text-xs text-slate-500">Peringkat latihan dihitung dari XP; peringkat ujian memakai nilai terbaik siswa pada setiap paket, bukan menjumlahkan percobaan ulang.</p></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Cakupan<select value={rankScope} onChange={e=>setRankScope(e.target.value as 'global'|'exam')} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="global">Umum / keseluruhan</option><option value="exam">Per sesi / paket soal</option></select></label><label className="text-xs font-semibold text-slate-600">Paket soal<select value={rankExamId} onChange={e=>setRankExamId(e.target.value)} disabled={rankScope!=='exam'} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"><option value="ALL">Pilih paket soal</option>{examMeta.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Kelas<select value={rankClass} onChange={e=>setRankClass(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="ALL">Semua kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Tipe tes<select value={rankType} onChange={e=>setRankType(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="ALL">Semua tipe</option><option value="EXAM">Ujian resmi</option><option value="PRACTICE">Latihan</option><option value="QUIZ">Kuis</option><option value="FLASHCARD">Flashcard</option><option value="MAZE_GAME">Game Labirin</option></select></label></div>
      {rankScope==='exam'&&rankExamId==='ALL'&&<p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pilih satu paket soal agar peringkat per sesi dapat dihitung.</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-xl border p-4"><h3 className="font-black text-emerald-800">🏆 Peringkat Latihan · Grafik XP</h3><ChartBars items={rankScope==='exam'&&rankExamId==='ALL'?[]:practiceRanking} color="bg-emerald-500" suffix="XP"/></div><div className="rounded-xl border p-4"><h3 className="font-black text-indigo-800">📊 Peringkat Ujian · Grafik Nilai</h3><ChartBars items={rankScope==='exam'&&rankExamId==='ALL'?[]:examRanking} color="bg-indigo-500" suffix="/100"/></div></div>
    </section>
  </div></main>
}
