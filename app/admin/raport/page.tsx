'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Student={id:string;full_name:string|null;username:string|null;class_code:string|null}
type ResultRow={key:string;user_id:string;exam_id:string;title:string;subtest:string;kind:'Latihan'|'Ujian';score:number;date:string;xp:number;attempt:number}
type Signatory={id:string;full_name:string;position:'class_teacher'|'principal';class_code:string|null;nip:string}
type Settings={schoolName:string;schoolAddress:string;issuePlace:string;issueDate:string;kkm:number}
const defaults:Settings={schoolName:'UPTD SPF SEKOLAH DASAR NEGERI GETASAN',schoolAddress:'JALAN P. DIPONEGORO KM 6 DESA GETASAN KEC. GETASAN 50774',issuePlace:'Getasan',issueDate:new Date().toISOString().slice(0,10),kkm:70}

export default function AdminReportPage(){
 const [students,setStudents]=useState<Student[]>([])
 const [records,setRecords]=useState<ResultRow[]>([])
 const [signatories,setSignatories]=useState<Signatory[]>([])
 const [loading,setLoading]=useState(true)
 const [warning,setWarning]=useState('')
 const [mode,setMode]=useState<'single'|'bulk'>('single')
 const [docType,setDocType]=useState<'raport'|'certificate'>('raport')
 const [classFilter,setClassFilter]=useState('ALL')
 const [search,setSearch]=useState('')
 const [studentId,setStudentId]=useState('')
 const [bulkStudentIds,setBulkStudentIds]=useState<string[]>([])
 const [selectedRecordKeys,setSelectedRecordKeys]=useState<string[]>([])
 const [selectedBulkPackageIds,setSelectedBulkPackageIds]=useState<string[]>([])
 const [signatoryType,setSignatoryType]=useState<'both'|'principal_only'|'teacher_only'>('both')
 const [includeParentSign,setIncludeParentSign]=useState(true)
 const [teacherId,setTeacherId]=useState('')
 const [principalId,setPrincipalId]=useState('')
 const [settings,setSettings]=useState<Settings>(defaults)
 const [previewOpen,setPreviewOpen]=useState(false)

 useEffect(()=>{
  let active=true
  async function load(){
   const db=createClient()
   try{
    const [p,e,pr,es,people,doc]=await Promise.all([
     db.from('profiles').select('id,full_name,username,class_code').eq('role','student').order('full_name'),
     db.from('exams').select('id,title,subtest,target_mode,activity_type'),
     db.from('practice_attempts').select('*').eq('status','completed').order('completed_at',{ascending:false}),
     db.from('exam_sessions').select('*').eq('status','completed').order('completed_at',{ascending:false}),
     db.from('teacher_signatories').select('id,full_name,position,class_code,nip').eq('is_active',true),
     db.rpc('get_school_document_settings')
    ])
    if(!active)return
    if(p.error)throw p.error
    if(pr.error||es.error)setWarning('Sebagian riwayat belum dapat dimuat. Periksa detail akses dan kolom tabel di Supabase.')
    if(people.error)setWarning(old=>old?old+' Daftar penandatangan menunggu migration Supabase.':'Daftar penandatangan belum tersedia. Migration tabel guru/kepala sekolah perlu diterapkan.')
    const studentRows=(p.data||[]) as Student[]
    const examMap=new Map((e.data||[]).map((x:any)=>[x.id,x]))
    const best=new Map<string,ResultRow>()
    const add=(row:ResultRow)=>{
     const old=best.get(row.key)
     if(!old||row.score>old.score||(row.score===old.score&&new Date(row.date).getTime()>new Date(old.date).getTime()))best.set(row.key,row)
    }
    ;(pr.data||[]).forEach((r:any)=>{
     const exam=examMap.get(r.exam_id) as any
     add({key:'practice:'+r.user_id+':'+r.exam_id,user_id:r.user_id,exam_id:r.exam_id,title:exam?.title||'Paket latihan',subtest:exam?.subtest||'Umum',kind:'Latihan',score:Number(r.score||0),date:r.completed_at||r.created_at||'',xp:Number(r.total_xp||0),attempt:Number(r.attempt_number||1)})
    })
    ;(es.data||[]).forEach((r:any)=>{
     const exam=examMap.get(r.exam_id) as any
     add({key:'exam:'+r.user_id+':'+r.exam_id,user_id:r.user_id,exam_id:r.exam_id,title:exam?.title||'Paket ujian',subtest:exam?.subtest||'Umum',kind:'Ujian',score:Number(r.score_override??r.score??0),date:r.completed_at||r.submitted_at||r.created_at||'',xp:0,attempt:0})
    })
    setStudents(studentRows)
    setRecords([...best.values()].sort((a,b)=>a.subtest.localeCompare(b.subtest,'id')||a.title.localeCompare(b.title,'id')))
    setSignatories((people.data||[]) as Signatory[])
    setPrincipalId((people.data||[]).find((x:any)=>x.position==='principal')?.id||'')
    if(doc.data){const d=doc.data;setSettings(s=>({...s,schoolName:d.school_name||s.schoolName,schoolAddress:d.school_address||s.schoolAddress,issuePlace:d.issue_place||s.issuePlace,kkm:Number(d.kkm??s.kkm)}))}
   }catch(err:any){if(active)setWarning(err?.message||'Gagal memuat data raport.')}
   finally{if(active)setLoading(false)}
  }
  void load();return()=>{active=false}
 },[])

 const classes=useMemo(()=>[...new Set(students.map(s=>s.class_code).filter(Boolean) as string[])].sort(),[students])
 const filteredStudents=useMemo(()=>students.filter(s=>(classFilter==='ALL'||s.class_code===classFilter)&&(!search.trim()||String(s.full_name||'').toLowerCase().includes(search.toLowerCase())||String(s.username||'').toLowerCase().includes(search.toLowerCase()))),[students,classFilter,search])
 const bulkPackageOptions=Array.from(new Map(records.map(record=>[record.exam_id,{examId:record.exam_id,title:record.title,subtest:record.subtest,records:records.filter(item=>item.exam_id===record.exam_id)}])).values())
 const filteredBulkStudents=filteredStudents.filter(student=>records.some(record=>record.user_id===student.id&&selectedBulkPackageIds.includes(record.exam_id)))
 const selectedStudents=useMemo(()=>mode==='single'?students.filter(s=>s.id===studentId):students.filter(s=>bulkStudentIds.includes(s.id)),[mode,students,studentId,bulkStudentIds])
 const selectedIds=selectedStudents.map(s=>s.id)
 const candidateRecords=records.filter(record=>selectedIds.includes(record.user_id))
 const selectedRecords=mode==='bulk'?candidateRecords.filter(record=>selectedBulkPackageIds.includes(record.exam_id)):candidateRecords.filter(record=>selectedRecordKeys.includes(record.key))
 const toggleBulkPackage=(examId:string,checked:boolean)=>setSelectedBulkPackageIds(old=>checked?[...old,examId]:old.filter(id=>id!==examId))
 const teacherOptions=signatories.filter(s=>s.position==='class_teacher')
 const principalOptions=signatories.filter(s=>s.position==='principal')
 const singleStudent=mode==='single'?students.find(s=>s.id===studentId):undefined
 const classTeacherFor=(classCode:string|null)=>teacherOptions.find(t=>t.class_code===classCode)
 const principal=principalOptions.find(p=>p.id===principalId)||principalOptions[0]
 const chosenTeacher=teacherOptions.find(t=>t.id===teacherId)||(singleStudent?classTeacherFor(singleStudent.class_code):undefined)
 const dateLabel=new Date(settings.issueDate+'T00:00:00').toLocaleDateString('id-ID',{dateStyle:'long'})
 const toggleStudent=(id:string)=>setBulkStudentIds(old=>old.includes(id)?old.filter(x=>x!==id):[...old,id])
 const setStudentsAndRecords=(ids:string[])=>setBulkStudentIds(ids)
 const selectSingle=(id:string)=>{setStudentId(id);setSelectedRecordKeys(records.filter(r=>r.user_id===id).map(r=>r.key));const s=students.find(x=>x.id===id);setTeacherId(signatories.find(t=>t.position==='class_teacher'&&t.class_code===s?.class_code)?.id||'')}
 const toggleRecord=(key:string)=>setSelectedRecordKeys(old=>old.includes(key)?old.filter(x=>x!==key):[...old,key])
 const updateIssueDate=(value:string)=>setSettings(old=>({...old,issueDate:value}))
 const printNow=()=>{setPreviewOpen(true);window.setTimeout(()=>window.print(),300)}
 const signatureBlock=(student:Student)=>{
  const teacher=mode==='single'&&student.id===studentId?chosenTeacher:classTeacherFor(student.class_code)
  const showTeacher=signatoryType==='both'||signatoryType==='teacher_only'
  const showPrincipal=signatoryType==='both'||signatoryType==='principal_only'
  const parent=<div key="parent" className="text-center"><p>Orang Tua / Wali Murid,</p><div className="h-20"/><p className="font-semibold">( .................................... )</p></div>
  const principalSign=<div key="principal" className="text-center"><p className="font-semibold">Mengetahui,</p><p>Kepala Sekolah,</p><div className="h-20"/><p className="font-bold underline">{principal?.full_name||'....................................'}</p><p>NIP. {principal?.nip||'-'}</p></div>
  const teacherSign=<div key="teacher" className="text-center"><p>{settings.issuePlace}, {dateLabel}</p><p>Guru / Wali Kelas {student.class_code||''},</p><div className="h-20"/><p className="font-bold underline">{teacher?.full_name||'....................................'}</p><p>NIP. {teacher?.nip||'-'}</p></div>
  const officials=[...(showPrincipal?[principalSign]:[]),...(showTeacher?[teacherSign]:[])]
  if(officials.length===1)return <div className="mt-10 grid grid-cols-3 gap-4 text-[11px]">{includeParentSign?parent:<div/>}<div className="col-start-2">{officials[0]}</div></div>
  if(includeParentSign)return <div className="mt-10 grid grid-cols-3 gap-4 text-center text-[11px]">{parent}{principalSign}{teacherSign}</div>
  return <div className="mt-10 grid grid-cols-2 gap-5 text-center text-xs">{principalSign}{teacherSign}</div>
 }
 const field='mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800'
 return <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
  <style>{`@page{size:A4 portrait;margin:12mm}@media print{html,body{width:210mm!important;margin:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}body *{visibility:hidden!important}#print-area,#print-area *{visibility:visible!important}#print-area{position:absolute!important;left:0!important;top:0!important;width:186mm!important;background:#fff!important;padding:0!important;margin:0!important}.no-print{display:none!important}.print-student{width:186mm!important;min-height:273mm!important;padding:4mm 2mm!important;margin:0!important;box-sizing:border-box!important;break-after:page;page-break-after:always}.print-student:last-child{break-after:auto;page-break-after:auto}}`}</style>
  <div className="no-print mx-auto max-w-7xl space-y-5">
   <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Raport & Sertifikat</h1><p className="mt-1 text-sm text-slate-500">Cetak per siswa atau kolektif, menggunakan nilai terbaik setiap paket soal.</p></div><Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Kembali ke Dashboard Admin</Link></header>
   {warning&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>}
   <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">1. Pilih cara pencetakan</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><button onClick={()=>{setMode('single');setBulkStudentIds([]);setSelectedBulkPackageIds([]);setSelectedRecordKeys(studentId?records.filter(r=>r.user_id===studentId).map(r=>r.key):[])}} className={`rounded-xl border-2 p-4 text-left ${mode==='single'?'border-indigo-600 bg-indigo-50':'border-slate-200'}`}><b>👤 Per siswa</b><p className="mt-1 text-xs text-slate-500">Pilih satu siswa, lalu pilih nilai yang ingin dicetak.</p></button><button onClick={()=>{setMode('bulk');setStudentId('');setBulkStudentIds([]);setSelectedRecordKeys([]);setSelectedBulkPackageIds([])}} className={`rounded-xl border-2 p-4 text-left ${mode==='bulk'?'border-indigo-600 bg-indigo-50':'border-slate-200'}`}><b>👥 Cetak massal</b><p className="mt-1 text-xs text-slate-500">Pilih semua siswa atau siswa tertentu per kelas, lalu cetak beberapa dokumen sekaligus.</p></button></div></section>
   <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
    <aside className={"space-y-4 rounded-2xl border bg-white p-4 shadow-sm " + (mode === "bulk" ? "order-2" : "order-1")}><h2 className="font-black text-slate-900">{mode === "bulk" ? "3. Pilih peserta" : "2. Pilih peserta"}</h2><label className="block text-xs font-semibold text-slate-600">Kelas<select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className={field}><option value="ALL">Semua kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / username" className={field}/>
     {mode==='single'?<div className="max-h-[440px] space-y-1 overflow-y-auto">{filteredStudents.map(s=><button key={s.id} onClick={()=>selectSingle(s.id)} className={`w-full rounded-lg border p-3 text-left ${studentId===s.id?'border-indigo-500 bg-indigo-50':'border-transparent hover:bg-slate-50'}`}><b className="block text-sm text-slate-800">{s.full_name||s.username||'Tanpa nama'}</b><span className="text-xs text-slate-500">{s.class_code||'Tanpa kelas'}</span></button>)}</div>:<><div className="flex flex-wrap gap-2"><button disabled={!selectedBulkPackageIds.length} onClick={()=>setStudentsAndRecords(filteredBulkStudents.map(s=>s.id))} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-40">Pilih semua peserta tersedia</button><button onClick={()=>setStudentsAndRecords([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Kosongkan</button></div><div className="max-h-[440px] space-y-2 overflow-y-auto">{filteredBulkStudents.map(s=><label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm"><input type="checkbox" checked={bulkStudentIds.includes(s.id)} onChange={()=>{const next=bulkStudentIds.includes(s.id)?bulkStudentIds.filter(x=>x!==s.id):[...bulkStudentIds,s.id];setStudentsAndRecords(next)}}/><span><b>{s.full_name||s.username||'Tanpa nama'}</b><small className="ml-2 text-slate-500">{s.class_code||'—'}</small></span></label>)}{!selectedBulkPackageIds.length&&<p className="p-5 text-center text-xs text-amber-700">Pilih paket/subtes terlebih dahulu agar peserta yang memiliki nilai muncul.</p>}{selectedBulkPackageIds.length>0&&!filteredBulkStudents.length&&<p className="p-5 text-center text-xs text-slate-500">Tidak ada peserta dengan nilai untuk filter ini.</p>}</div><p className="text-xs text-slate-500">{bulkStudentIds.length} peserta dipilih · {selectedRecords.length} nilai akan dicetak</p></>}
    </aside>
    <div className={"space-y-4 rounded-2xl border bg-white p-4 shadow-sm " + (mode === "bulk" ? "order-1" : "order-2")}><h2 className="font-black text-slate-900">{mode === "bulk" ? "2. Pilih paket / subtes dan format" : "3. Pilih format dan nilai"}</h2><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Format dokumen<select value={docType} onChange={e=>setDocType(e.target.value as 'raport'|'certificate')} className={field}><option value="raport">Raport / Rekap capaian</option><option value="certificate">Sertifikat capaian</option></select></label><label className="text-xs font-semibold text-slate-600">Tanggal dokumen<input type="date" value={settings.issueDate} onChange={e=>updateIssueDate(e.target.value)} className={field}/></label></div>
     {mode==='bulk'?<><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-700">Pilih paket/subtes terlebih dahulu ({selectedBulkPackageIds.length} dipilih)</b><button onClick={()=>setSelectedBulkPackageIds([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan paket</button></div><div className="max-h-[390px] space-y-2 overflow-y-auto rounded-xl border p-3">{bulkPackageOptions.map(option=><label key={option.examId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-indigo-50/50"><input type="checkbox" className="mt-1" checked={selectedBulkPackageIds.includes(option.examId)} onChange={event=>toggleBulkPackage(option.examId,event.target.checked)}/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-800">{option.title}</b><span className="text-xs text-slate-500">Subtes: {option.subtest} · {option.records.length} peserta memiliki nilai</span></span></label>)}{!bulkPackageOptions.length&&<p className="p-6 text-center text-xs text-slate-400">Belum ada paket dengan nilai selesai.</p>}</div><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">Langkah 3 menampilkan peserta yang memiliki nilai pada minimal satu paket terpilih. Peserta dengan nilai tidak lengkap tetap dapat dipilih.</div></>:<><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-700">Nilai terbaik yang akan dicetak ({selectedRecords.length})</b><div className="flex gap-2"><button onClick={()=>setSelectedRecordKeys(candidateRecords.map(r=>r.key))} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Pilih semua nilai</button><button onClick={()=>setSelectedRecordKeys([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan nilai</button></div></div><div className="max-h-[390px] overflow-y-auto rounded-xl border"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-3">Pilih</th><th className="p-3">Siswa</th><th className="p-3">Paket / Subtes</th><th className="p-3">Jenis</th><th className="p-3 text-right">Nilai terbaik</th><th className="p-3">Tanggal</th></tr></thead><tbody className="divide-y">{candidateRecords.map(r=>{const s=students.find(x=>x.id===r.user_id);return <tr key={r.key}><td className="p-3"><input type="checkbox" checked={selectedRecordKeys.includes(r.key)} onChange={()=>toggleRecord(r.key)}/></td><td className="p-3">{s?.full_name||s?.username||'Siswa'}<div className="text-[10px] text-slate-400">{s?.class_code}</div></td><td className="p-3"><b>{r.title}</b><div className="text-[10px] text-slate-400">{r.subtest}</div></td><td className="p-3">{r.kind}</td><td className="p-3 text-right font-black text-indigo-700">{r.score}/100</td><td className="p-3">{r.date?new Date(r.date).toLocaleDateString('id-ID'):'—'}</td></tr>})}{!candidateRecords.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">{loading?'Memuat riwayat...':'Pilih siswa untuk menampilkan nilai terbaik.'}</td></tr>}</tbody></table></div></>}
    </div>
   </section>
   <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">4. Pengaturan penandatangan</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Tanda tangan<select value={signatoryType} onChange={e=>setSignatoryType(e.target.value as any)} className={field}><option value="both">Guru / Wali Kelas dan Kepala Sekolah</option><option value="principal_only">Hanya Kepala Sekolah</option><option value="teacher_only">Hanya Guru / Wali Kelas</option></select></label><label className="text-xs font-semibold text-slate-600">Kepala sekolah<select value={principalId} onChange={e=>setPrincipalId(e.target.value)} className={field}><option value="">Pilih kepala sekolah</option>{principalOptions.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.nip||'Tanpa NIP'}</option>)}</select></label>{mode==='single'&&<label className="text-xs font-semibold text-slate-600">Guru / Wali Kelas<select value={teacherId} onChange={e=>setTeacherId(e.target.value)} className={field}><option value="">Otomatis sesuai kelas</option>{teacherOptions.filter(t=>!singleStudent||t.class_code===singleStudent.class_code).map(t=><option key={t.id} value={t.id}>{t.full_name} · {t.class_code}</option>)}</select></label>}<label className="flex items-center gap-2 self-end rounded-lg border p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={includeParentSign} onChange={e=>setIncludeParentSign(e.target.checked)}/> Sertakan kolom tanda tangan orang tua / wali</label></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800 sm:col-span-2"><b>Kop surat tetap:</b> Pemerintah Kabupaten Semarang · Dinas Pendidikan Kebudayaan Kepemudaan dan Olah Raga · Korwil Biddik Kecamatan Getasan · UPTD SPF Sekolah Dasar Negeri Getasan.</div><label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={settings.issuePlace} onChange={e=>setSettings(s=>({...s,issuePlace:e.target.value}))} className={field}/></label></div></section>
   <div className="flex flex-wrap justify-end gap-2"><button disabled={!selectedStudents.length||!selectedRecords.length} onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">👁️ Pratinjau Dokumen</button><button disabled={!selectedStudents.length||!selectedRecords.length} onClick={printNow} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">🖨️ Cetak / Simpan PDF</button></div>
  </div>
  {previewOpen&&<section className="mx-auto mt-6 max-w-5xl rounded-xl border bg-white p-5 shadow-sm"><div className="no-print mb-4 flex justify-end"><button onClick={()=>setPreviewOpen(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold">Tutup Pratinjau</button></div><div id="print-area" className="space-y-10 text-slate-900"><style>{`#print-area .print-student{width:186mm;min-height:273mm;box-sizing:border-box;margin:0 auto 12mm;padding:8mm;background:#fff}`}</style>{selectedStudents.filter(student=>selectedRecords.some(r=>r.user_id===student.id)).map(student=>{const rows=selectedRecords.filter(r=>r.user_id===student.id);return <article key={student.id} className="print-student relative min-h-[273mm] overflow-hidden border border-slate-200 bg-white p-5 font-sans"><div className="pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-indigo-800 via-sky-500 to-amber-400"/><header className="flex items-center gap-3 border-b-[3px] border-double border-slate-900 pb-3"><img src="/logo-sd-getasan.png" alt="Logo SD Negeri Getasan" className="h-[23mm] w-[23mm] shrink-0 object-contain"/><div className="min-w-0 flex-1 text-center leading-tight"><p className="text-[9px] font-bold uppercase tracking-wide">PEMERINTAH KABUPATEN SEMARANG</p><p className="mt-0.5 text-[9px] font-bold uppercase">DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAH RAGA</p><p className="mt-0.5 text-[9px] font-bold uppercase">KORWIL BIDDIK KECAMATAN GETASAN</p><h2 className="mt-1 text-[15px] font-black uppercase tracking-wide">UPTD SPF SEKOLAH DASAR NEGERI GETASAN</h2><p className="mt-1 text-[7.5px] font-medium uppercase tracking-wide">ALAMAT: JALAN P. DIPONEGORO KM 6 DESA GETASAN KEC. GETASAN 50774</p></div></header><div className="py-6 text-center"><span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-800">Dokumen capaian peserta didik</span><h3 className="mt-3 text-2xl font-black uppercase tracking-wide text-slate-900">{docType==='raport'?'Laporan Capaian Belajar':'Sertifikat Capaian Akademik'}</h3><div className="mx-auto mt-2 h-1 w-24 rounded-full bg-amber-500"/><p className="mt-2 text-[10px] text-slate-500">Tahun pelajaran / periode pembelajaran</p></div>{docType==='raport'?<div className="mb-5 grid grid-cols-2 gap-2 text-sm"><p>Nama: <b>{student.full_name||student.username||'—'}</b></p><p>Kelas: <b>{student.class_code||'—'}</b></p></div>:<div className="mb-5 text-right text-xs text-slate-500">Kelas: <b>{student.class_code||'—'}</b></div>}{docType==='raport'?<table className="w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2">No.</th><th className="border p-2 text-left">Paket / Mata Pelajaran</th><th className="border p-2">Jenis</th><th className="border p-2">Nilai Terbaik</th><th className="border p-2">Keterangan</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.key}><td className="border p-2 text-center">{i+1}</td><td className="border p-2">{r.title}<div className="text-[10px] text-slate-500">{r.subtest}</div></td><td className="border p-2 text-center">{r.kind}</td><td className="border p-2 text-center font-bold">{r.score}</td><td className="border p-2 text-center">{r.score>=settings.kkm?'Tuntas':'Perlu bimbingan'}</td></tr>)}</tbody></table>:<div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white px-6 py-10 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Diberikan dengan bangga kepada</p><h4 className="my-5 text-3xl font-black text-slate-900">{student.full_name||student.username}</h4><div className="mx-auto mb-5 h-1 w-20 rounded-full bg-amber-400"/><p className="text-sm text-slate-600">Atas capaian akademik pada paket pembelajaran berikut:</p><div className="mx-auto mt-5 max-w-xl space-y-2">{rows.map(r=><div key={r.key} className="flex justify-between border-b py-2 text-sm"><span>{r.title} · {r.subtest}</span><b>{r.score}/100</b></div>)}</div></div>}{signatureBlock(student)}</article>})}</div></section>}
 </main>
}
