'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DocumentVisualSettingsPanel, { useDocumentVisualSettings } from '@/components/admin/DocumentVisualSettings'
import { getDocumentVisualStyle } from '@/components/admin/document-visual-system'

type Student={id:string;full_name:string|null;username:string|null;class_code:string|null}
type ResultRow={key:string;user_id:string;exam_id:string;title:string;subtest:string;kind:'Latihan'|'Ujian';score:number;date:string;xp:number;attempt:number}
type Signatory={id:string;full_name:string;position:'class_teacher'|'principal';class_code:string|null;nip:string}
type Settings={schoolName:string;schoolAddress:string;issuePlace:string;issueDate:string;kkm:number;academicYear:string;learningPeriod:'Semester Ganjil'|'Semester Genap'|'Akhir Jenjang SD';reportOrientation:'portrait'|'landscape';certificateOrientation:'portrait'|'landscape'}
const defaults:Settings={schoolName:'UPTD SPF SEKOLAH DASAR NEGERI GETASAN',schoolAddress:'JALAN P. DIPONEGORO KM 6 DESA GETASAN KEC. GETASAN 50774',issuePlace:'Getasan',issueDate:new Date().toISOString().slice(0,10),kkm:70,academicYear:'2026/2027',learningPeriod:'Semester Ganjil',reportOrientation:'portrait',certificateOrientation:'landscape'}

export default function AdminReportPage(){
 const [students,setStudents]=useState<Student[]>([])
 const [records,setRecords]=useState<ResultRow[]>([])
 const [signatories,setSignatories]=useState<Signatory[]>([])
 const [loading,setLoading]=useState(true)
 const [warning,setWarning]=useState('')
 const [mode,setMode]=useState<'single'|'bulk'>('single')
 const [docType,setDocType]=useState<'raport'|'certificate'>('raport')
 const visual=useDocumentVisualSettings(docType==='raport'?'report':'certificate')
 const [classFilter,setClassFilter]=useState('ALL')
 const [assignedClassCodes,setAssignedClassCodes]=useState<string[]>([])
 const [search,setSearch]=useState('')
 const [studentId,setStudentId]=useState('')
 const [bulkStudentIds,setBulkStudentIds]=useState<string[]>([])
 const [selectedRecordKeys,setSelectedRecordKeys]=useState<string[]>([])
 const [selectedBulkPackageIds,setSelectedBulkPackageIds]=useState<string[]>([])
 const [bulkSubtestFilter,setBulkSubtestFilter]=useState('ALL')
 const [bulkPackageSort,setBulkPackageSort]=useState<'title'|'subtest'|'count'>('subtest')
 const [customFeedback,setCustomFeedback]=useState(false)
 const [customAppreciation,setCustomAppreciation]=useState('')
 const [customNote,setCustomNote]=useState('')
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
    const [auth,p,e,pr,es,people,doc]=await Promise.all([
     db.auth.getUser(),
     db.from('profiles').select('id,full_name,username,class_code').eq('role','student').order('full_name'),
     db.from('exams').select('id,title,subtest,target_mode,activity_type'),
     db.from('practice_attempts').select('*').eq('status','completed').order('completed_at',{ascending:false}),
     db.from('exam_sessions').select('*').eq('status','completed').order('completed_at',{ascending:false}),
     db.from('teacher_signatories').select('id,full_name,position,class_code,nip').eq('is_active',true),
     db.rpc('get_school_document_settings')
    ])
    if(!active)return
    if(p.error)throw p.error
    // Kelas ampuan hanya menjadi filter awal. Coba baca penugasan yang
    // terhubung ke akun; jika kolom relasi belum tersedia, gunakan class_code profil.
    let initialAssignedClasses:string[]=[]
    const currentUser=auth.data?.user
    if(currentUser){
     const assignmentResult=await db.from('teacher_signatories').select('class_code').eq('user_id',currentUser.id).eq('position','class_teacher').eq('is_active',true)
     if(!assignmentResult.error){
      initialAssignedClasses=[...new Set((assignmentResult.data||[]).map((x:any)=>String(x.class_code||'').trim()).filter(Boolean))]
     }
     if(!initialAssignedClasses.length){
      const ownProfile=await db.from('profiles').select('class_code').eq('id',currentUser.id).maybeSingle()
      if(ownProfile.data?.class_code)initialAssignedClasses=[String(ownProfile.data.class_code).trim()]
     }
    }
    if(!active)return
    setAssignedClassCodes(initialAssignedClasses)
    if(initialAssignedClasses.length===1)setClassFilter(initialAssignedClasses[0])
    else if(initialAssignedClasses.length>1)setClassFilter('ASSIGNED')
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
    if(doc.data){const d=doc.data;setSettings(s=>({...s,schoolName:d.school_name||s.schoolName,schoolAddress:d.school_address||s.schoolAddress,issuePlace:d.issue_place||s.issuePlace,kkm:Number(d.kkm??s.kkm),academicYear:d.academic_year||s.academicYear,learningPeriod:d.learning_period||s.learningPeriod,reportOrientation:d.report_orientation||s.reportOrientation,certificateOrientation:d.certificate_orientation||s.certificateOrientation}))}
   }catch(err:any){if(active)setWarning(err?.message||'Gagal memuat data raport.')}
   finally{if(active)setLoading(false)}
  }
  void load();return()=>{active=false}
 },[])

 const classes=useMemo(()=>[...new Set(students.map(s=>s.class_code).filter(Boolean) as string[])].sort(),[students])
 const filteredStudents=useMemo(()=>students.filter(s=>(classFilter==='ALL'||(classFilter==='ASSIGNED'?assignedClassCodes.includes(String(s.class_code||'').trim()):s.class_code===classFilter))&&(!search.trim()||String(s.full_name||'').toLowerCase().includes(search.toLowerCase())||String(s.username||'').toLowerCase().includes(search.toLowerCase()))),[students,classFilter,assignedClassCodes,search])
 const bulkPackageOptions=Array.from(new Map(records.map(record=>[record.exam_id,{examId:record.exam_id,title:record.title,subtest:record.subtest,records:records.filter(item=>item.exam_id===record.exam_id)}])).values())
 const bulkSubtests=[...new Set(bulkPackageOptions.map(option=>option.subtest||'Umum'))].sort((a,b)=>a.localeCompare(b,'id'))
 const filteredBulkPackageOptions=bulkPackageOptions.filter(option=>bulkSubtestFilter==='ALL'||option.subtest===bulkSubtestFilter).sort((a,b)=>bulkPackageSort==='title'?a.title.localeCompare(b.title,'id'):bulkPackageSort==='count'?b.records.length-a.records.length:a.subtest.localeCompare(b.subtest,'id')||a.title.localeCompare(b.title,'id'))
 const filteredBulkStudents=filteredStudents.filter(student=>records.some(record=>record.user_id===student.id&&selectedBulkPackageIds.includes(record.exam_id)))
 const selectedStudents=useMemo(()=>mode==='single'?students.filter(s=>s.id===studentId):students.filter(s=>bulkStudentIds.includes(s.id)),[mode,students,studentId,bulkStudentIds])
 const selectedIds=selectedStudents.map(s=>s.id)
 const candidateRecords=records.filter(record=>selectedIds.includes(record.user_id))
 const selectedRecords=mode==='bulk'?candidateRecords.filter(record=>selectedBulkPackageIds.includes(record.exam_id)):candidateRecords.filter(record=>selectedRecordKeys.includes(record.key))
 const toggleBulkPackage=(examId:string,checked:boolean)=>setSelectedBulkPackageIds(old=>checked?[...old,examId]:old.filter(id=>id!==examId))
 const formatScore=(score:number)=>String(Math.round(Number(score)||0))
 const averageOf=(rows:ResultRow[])=>rows.length?Math.round(rows.reduce((sum,row)=>sum+Number(row.score||0),0)/rows.length):0
 const defaultAppreciation=(average:number)=>average>=90?'Luar biasa! Terus pertahankan semangat belajar dan rasa ingin tahu yang tinggi.':average>=settings.kkm?'Hebat! Usaha dan ketekunan dalam belajar sudah menunjukkan hasil yang baik.':'Terima kasih sudah berusaha. Terus berlatih sedikit demi sedikit; setiap kemajuan adalah hal yang membanggakan.'
 const defaultNote=(average:number)=>average>=90?'Ananda menunjukkan penguasaan materi yang sangat baik. Terus kembangkan kemampuan dan kebiasaan belajar mandiri.':average>=settings.kkm?'Ananda telah mencapai kriteria ketuntasan. Pertahankan konsistensi dan perdalam materi yang masih perlu dikuatkan.':'Ananda sedang dalam proses menguatkan pemahaman. Pendampingan dan latihan bertahap akan membantu kemajuan berikutnya.'
 const appreciationFor=(average:number)=>customFeedback&&customAppreciation.trim()?customAppreciation:defaultAppreciation(average)
 const noteFor=(average:number)=>customFeedback&&customNote.trim()?customNote:defaultNote(average)
 const reportFeedbackByStudent=useMemo(()=>{
  const result=new Map<string,{appreciation:string;note:string}>()
  const usedAppreciations=new Set<string>()
  const usedNotes=new Set<string>()
  const hash=(value:string)=>{let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
  const banks={
   excellent:[
    'Luar biasa! Usaha tekunmu terlihat dari hasil belajar yang sangat membanggakan.',
    'Hebat sekali! Kamu menunjukkan pemahaman yang kuat dan semangat belajar yang baik.',
    'Kerja bagus! Pertahankan rasa ingin tahu dan kebiasaan belajar yang sudah kamu bangun.',
    'Prestasi yang membanggakan! Teruslah mencoba, berlatih, dan mengembangkan kemampuanmu.',
    'Kamu telah menunjukkan hasil yang istimewa. Terus jaga semangat dan ketekunanmu!'
   ],
   achieved:[
    'Hebat! Usaha dan ketekunanmu sudah membuahkan hasil yang baik.',
    'Bagus sekali! Kamu telah menunjukkan kemajuan dan mampu mencapai target belajar.',
    'Terus pertahankan semangatmu. Hasil belajarmu menunjukkan usaha yang patut dihargai.',
    'Kamu sudah bekerja dengan baik. Tetap rajin berlatih agar kemampuanmu semakin berkembang.',
    'Selamat atas capaianmu! Kebiasaan belajar yang tekun akan membantumu terus maju.'
   ],
   developing:[
    'Terima kasih sudah berusaha dengan sungguh-sungguh. Setiap langkah kecil membawa kemajuan.',
    'Semangat belajarmu sangat berarti. Terus mencoba karena kemampuan tumbuh melalui latihan.',
    'Kamu sudah memulai dengan baik. Jangan menyerah, setiap latihan membuatmu semakin terampil.',
    'Usahamu tetap patut dihargai. Terus belajar sedikit demi sedikit dan rayakan setiap kemajuan.',
    'Tetap percaya diri! Kamu bisa berkembang dengan latihan teratur dan keberanian untuk mencoba.'
   ]
  }
  const noteBanks={
   excellent:[
    'Terus perdalam materi dan tantang dirimu dengan soal yang lebih beragam.',
    'Pertahankan kebiasaan belajar mandiri. Kamu juga bisa membantu teman belajar bersama.',
    'Jaga konsistensi dan terus kembangkan rasa ingin tahumu pada hal-hal baru.',
    'Cobalah tantangan baru agar pengetahuan dan keterampilanmu semakin luas.'
   ],
   achieved:[
    'Pertahankan hasil baik ini dan ulangi materi secara berkala agar semakin kuat.',
    'Terus berlatih dengan teliti. Kebiasaan membaca soal sampai tuntas akan membuatmu semakin mantap.',
    'Kamu dapat meningkatkan kemampuan dengan latihan rutin dan memeriksa kembali jawabanmu.',
    'Terus kembangkan pemahamanmu. Bertanya saat menemui kesulitan adalah kebiasaan yang baik.'
   ],
   developing:[
    'Buat jadwal latihan singkat dan teratur. Mulailah dari materi yang sudah dipelajari di kelas.',
    'Ulangi satu bagian materi setiap hari. Jika belum paham, jangan ragu bertanya kepada guru atau keluarga.',
    'Berlatihlah sedikit demi sedikit dengan teliti. Kemajuan tidak harus terjadi sekaligus.',
    'Tetap semangat dan minta bantuan saat menemui soal yang sulit. Kita belajar langkah demi langkah.'
   ]
  }
  const usedPick=(bank:string[],seed:number,used:Set<string>,suffix='')=>{
   let index=seed%bank.length
   for(let attempt=0;attempt<bank.length;attempt++){
    const value=bank[(index+attempt)%bank.length]+suffix
    if(!used.has(value)){used.add(value);return value}
   }
   const value=bank[index]+suffix
   used.add(value)
   return value
  }
  selectedStudents.filter(student=>selectedRecords.some(row=>row.user_id===student.id)).forEach(student=>{   const rows=selectedRecords.filter(row=>row.user_id===student.id).slice().sort((a,b)=>a.key.localeCompare(b.key))
   const average=averageOf(rows)
   const band=average>=90?'excellent':average>=settings.kkm?'achieved':'developing'
   const seed=hash(student.id+'|'+rows.map(row=>row.key+':'+row.score).join('|'))
   const highest=rows.reduce<ResultRow|undefined>((best,row)=>!best||row.score>best.score?row:best,undefined)
   const lowest=rows.reduce<ResultRow|undefined>((best,row)=>!best||row.score<best.score?row:best,undefined)
   const spread=highest&&lowest?highest.score-lowest.score:0
   const resultLabel=(row:ResultRow)=>'paket ujian “'+row.title+'”, Subtes “'+(row.subtest||'Umum')+'”'
   const highlight=rows.length>1&&highest&&spread>=8?' Capaian paling menonjol terlihat pada '+resultLabel(highest)+', dengan nilai '+formatScore(highest.score)+'.':''
   const appreciation=usedPick(banks[band],seed,usedAppreciations,highlight)
   let note=''
   if(rows.length>1&&lowest&&lowest.score<settings.kkm&&spread>=8){
    const focus=resultLabel(lowest)
    const focusedNotes=[
     'Pada '+focus+', kamu masih punya ruang untuk berkembang. Ulangi materi sedikit demi sedikit dan bertanyalah jika ada yang belum dipahami.',
     'Ayo tingkatkan hasil pada '+focus+'. Berlatihlah secara rutin, baca soal dengan teliti, lalu periksa kembali jawabanmu.',
     'Kita kuatkan pemahaman pada '+focus bersama-sama. Latihan singkat dan teratur akan membuatmu semakin percaya diri.',
     'Terus berlatih pada '+focus+', ya. Mintalah contoh tambahan kepada guru jika ada bagian yang terasa sulit.'
    ]
    note=usedPick(focusedNotes,seed>>>3,usedNotes)
   }else{
    note=usedPick(noteBanks[band],seed>>>3,usedNotes)
    if(rows.length>1&&lowest&&lowest.score<settings.kkm&&spread<8){
     note+=' Tetap berlatih pada materi yang masih terasa menantang; kemajuan kecil tetap berarti.'
    }
   }
   result.set(student.id,{appreciation,note})
  })
  return result
 },[selectedStudents,selectedRecords,settings.kkm])
 const teacherOptions=signatories.filter(s=>s.position==='class_teacher')
 const principalOptions=signatories.filter(s=>s.position==='principal')
 const singleStudent=mode==='single'?students.find(s=>s.id===studentId):undefined
 const classTeacherFor=(classCode:string|null)=>teacherOptions.find(t=>t.class_code===classCode)
 const principal=principalOptions.find(p=>p.id===principalId)||principalOptions[0]
 const chosenTeacher=teacherOptions.find(t=>t.id===teacherId)||(singleStudent?classTeacherFor(singleStudent.class_code):undefined)
 const dateLabel=new Date(settings.issueDate+'T00:00:00').toLocaleDateString('id-ID',{dateStyle:'long'})
 const activeOrientation=docType==='raport'?settings.reportOrientation:settings.certificateOrientation
 const pageWidth=activeOrientation==='portrait'?'190mm':'277mm'
 const pageHeight=activeOrientation==='portrait'?'277mm':'190mm'
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
  <style>{`@page{size:A4 ${activeOrientation};margin:10mm}
@media print{
  html,body{margin:0!important;background:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
  body *{visibility:hidden!important}
  #print-area,#print-area *{visibility:visible!important}
  #print-area{position:absolute!important;left:0!important;top:0!important;width:${pageWidth}!important;background:#fff!important;padding:0!important;margin:0!important}
  .no-print{display:none!important}
  .print-student{width:${pageWidth}!important;min-height:${pageHeight}!important;padding:0!important;margin:0!important;box-sizing:border-box!important;break-after:page;page-break-after:always}
  .print-student:last-child{break-after:auto;page-break-after:auto}
}
#print-area .print-student{position:relative;isolation:isolate}
#print-area .print-report:before{content:"";position:absolute;inset:2.5mm;border:2px solid #334155;pointer-events:none;z-index:0;box-shadow:inset 0 0 0 1px #cbd5e1}
#print-area .print-report:after{content:"";position:absolute;inset:5mm;border:1px solid #94a3b8;pointer-events:none;z-index:0}
#print-area .print-certificate{border:2px solid #b58b36!important;padding:8mm!important;background:#fffdf8!important;color:#172033!important;font-family:Arial,Helvetica,sans-serif!important}
#print-area .print-certificate:before{content:"";position:absolute;inset:3mm;border:1px solid #d9c18b;pointer-events:none;z-index:0}
#print-area .print-certificate:after{content:"";position:absolute;left:3mm;top:3mm;width:18mm;height:18mm;border-left:2px solid #b58b36;border-top:2px solid #b58b36;pointer-events:none;z-index:0}
#print-area .print-certificate header{position:relative;z-index:1;gap:5mm!important;padding:0 3mm 4mm!important;border-color:#b58b36!important;align-items:center!important}
#print-area .print-certificate header img{width:25mm!important;height:25mm!important}
#print-area .print-certificate header p{font-size:10.5px!important;line-height:1.5!important;letter-spacing:.015em!important;color:#344054!important}
#print-area .print-certificate header p:nth-child(1),#print-area .print-certificate header p:nth-child(2),#print-area .print-certificate header p:nth-child(3){font-weight:700!important}
#print-area .print-certificate header h2{font-family:Georgia,'Times New Roman',serif!important;font-size:18px!important;line-height:1.2!important;font-weight:700!important;letter-spacing:.035em!important;color:#14264b!important}
#print-area .print-certificate header p:last-child{font-size:9px!important}
#print-area .print-certificate header+div{position:relative;z-index:1;padding:5mm 0 4mm!important}
#print-area .print-certificate header+div>span{font-size:9px!important;letter-spacing:.16em!important;padding:2mm 4mm!important}
#print-area .print-certificate header+div h3{font-family:Georgia,'Times New Roman',serif!important;font-size:29px!important;line-height:1.15!important;font-weight:700!important;letter-spacing:.055em!important;color:#172b50!important}
#print-area .print-certificate header+div .h-1{height:1mm!important}
#print-area .print-certificate header+div>div:last-child{font-size:11px!important;line-height:1.5!important;color:#475467!important}
#print-area .print-certificate .certificate-panel{position:relative!important;z-index:1;border:1px solid #d8bd7a!important;border-radius:4mm!important;outline:none!important;background:#fffefa!important;padding:6mm 9mm!important}
#print-area .print-certificate .certificate-panel:before{content:"✦";position:absolute;left:5mm;top:4mm;color:#c49a45;font-size:19px}
#print-area .print-certificate .certificate-panel:after{content:"✦";position:absolute;right:5mm;bottom:4mm;color:#c49a45;font-size:19px}
#print-area .print-certificate .certificate-panel>p:first-child{font-size:10px!important;font-weight:700!important;letter-spacing:.18em!important;color:#8a641d!important}
#print-area .print-certificate .certificate-name{font-family:Georgia,'Times New Roman',serif!important;font-size:34px!important;line-height:1.2!important;font-weight:700!important;letter-spacing:.025em!important;color:#172b50!important;margin-top:4mm!important;margin-bottom:4mm!important}
#print-area .print-certificate .certificate-average{margin-top:3mm!important;border:1px solid #c49a45!important;background:#fff8e7!important;padding:2mm 5mm!important}
#print-area .print-certificate .certificate-average span{font-size:10px!important;font-weight:700!important;letter-spacing:.08em!important}
#print-area .print-certificate .certificate-average b{font-family:Georgia,'Times New Roman',serif!important;font-size:22px!important;font-weight:700!important;color:#172b50!important;font-variant-numeric:tabular-nums}
#print-area .print-certificate .certificate-score-grid{max-width:100%!important;margin-top:4mm!important;display:grid!important;grid-template-columns:1fr 1fr!important;gap:2.5mm!important}
#print-area .print-certificate .certificate-score-grid>div{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:3mm!important;min-height:10mm!important;border:1px solid #e7dfcc!important;border-radius:2mm!important;padding:2.5mm 3mm!important;background:#fff!important;font-size:11px!important;line-height:1.35!important}
#print-area .print-certificate .certificate-score-grid>div span{flex:1!important;text-align:left!important;font-weight:500!important;color:#344054!important}
#print-area .print-certificate .certificate-score-grid>div b{white-space:nowrap!important;color:#172b50!important;font-size:12px!important;font-weight:700!important;font-variant-numeric:tabular-nums}
#print-area .print-certificate .certificate-feedback{margin-top:4mm!important;border:1px solid #e7d5a5!important;border-radius:2.5mm!important;background:#fffaf0!important;padding:3mm 4mm!important}
#print-area .print-certificate .certificate-feedback p:first-child,#print-area .print-certificate .certificate-feedback p:nth-of-type(3){font-size:9px!important;font-weight:800!important;letter-spacing:.12em!important;color:#8a641d!important}
#print-area .print-certificate .certificate-feedback p:nth-of-type(2),#print-area .print-certificate .certificate-feedback p:nth-of-type(4){font-size:11px!important;line-height:1.45!important;color:#344054!important}
#print-area .print-certificate .certificate-signatures{position:relative;z-index:1;margin-top:6mm!important;font-size:10px!important;line-height:1.4!important;color:#344054!important}
#print-area .print-certificate .certificate-signatures .h-20{height:12mm!important}
#print-area .print-certificate .certificate-signatures .font-bold{color:#172b50!important;font-weight:700!important}
#print-area .print-certificate .certificate-signatures p{font-size:10px!important;line-height:1.4!important}
`}</style>
  <div className="no-print mx-auto max-w-7xl space-y-5">
   <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-indigo-600">Administrasi Sekolah</p><h1 className="mt-1 text-3xl font-black text-slate-900">Raport & Sertifikat</h1><p className="mt-1 text-sm text-slate-500">Cetak per siswa atau kolektif, menggunakan nilai terbaik setiap paket soal.</p></div><Link href="/admin" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700">← Kembali ke Dashboard Admin</Link></header>
   <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2 shadow-sm"><span className="rounded-xl bg-indigo-100 px-4 py-2 text-sm font-black text-indigo-800">Raport & Sertifikat</span><Link href="/admin/raport/penghargaan" className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-amber-50 hover:text-amber-800">🏆 Penghargaan & Leaderboard</Link></nav>
   {assignedClassCodes.length>0&&<div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800"><b>Filter awal mengikuti kelas ampuan.</b><p className="mt-1">Kelas otomatis dipilih: {assignedClassCodes.join(', ')}. Anda tetap dapat memilih kelas lain atau Semua kelas.</p></div>}
   {warning&&<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>}
   <DocumentVisualSettingsPanel title={docType==='raport'?'Raport':'Sertifikat'} settings={visual.settings} preset={visual.preset} useGlobal={visual.useGlobal} loading={visual.loading} saving={visual.saving} message={visual.message} updateDefaults={visual.updateDefaults} updateActivePreset={visual.updateActivePreset} setUseGlobal={visual.setUseGlobal} save={visual.save}/>
   <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">1. Pilih cara pencetakan</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><button onClick={()=>{setMode('single');setBulkStudentIds([]);setSelectedBulkPackageIds([]);setSelectedRecordKeys(studentId?records.filter(r=>r.user_id===studentId).map(r=>r.key):[])}} className={`rounded-xl border-2 p-4 text-left ${mode==='single'?'border-indigo-600 bg-indigo-50':'border-slate-200'}`}><b>👤 Per siswa</b><p className="mt-1 text-xs text-slate-500">Pilih satu siswa, lalu pilih nilai yang ingin dicetak.</p></button><button onClick={()=>{setMode('bulk');setStudentId('');setBulkStudentIds([]);setSelectedRecordKeys([]);setSelectedBulkPackageIds([])}} className={`rounded-xl border-2 p-4 text-left ${mode==='bulk'?'border-indigo-600 bg-indigo-50':'border-slate-200'}`}><b>👥 Cetak massal</b><p className="mt-1 text-xs text-slate-500">Pilih semua siswa atau siswa tertentu per kelas, lalu cetak beberapa dokumen sekaligus.</p></button></div></section>
   <section className="grid gap-5 lg:grid-cols-[340px_1fr]">
    <aside className={"space-y-4 rounded-2xl border bg-white p-4 shadow-sm " + (mode === "bulk" ? "order-2" : "order-1")}><h2 className="font-black text-slate-900">{mode === "bulk" ? "3. Pilih peserta" : "2. Pilih peserta"}</h2><label className="block text-xs font-semibold text-slate-600">Kelas<select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className={field}><option value="ALL">Semua kelas</option>{assignedClassCodes.length>1&&<option value="ASSIGNED">Semua kelas ampuan</option>}{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / username" className={field}/>
     {mode==='single'?<div className="max-h-[440px] space-y-1 overflow-y-auto">{filteredStudents.map(s=><button key={s.id} onClick={()=>selectSingle(s.id)} className={`w-full rounded-lg border p-3 text-left ${studentId===s.id?'border-indigo-500 bg-indigo-50':'border-transparent hover:bg-slate-50'}`}><b className="block text-sm text-slate-800">{s.full_name||s.username||'Tanpa nama'}</b><span className="text-xs text-slate-500">{s.class_code||'Tanpa kelas'}</span></button>)}</div>:<><div className="flex flex-wrap gap-2"><button disabled={!selectedBulkPackageIds.length} onClick={()=>setStudentsAndRecords(filteredBulkStudents.map(s=>s.id))} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-40">Pilih semua peserta tersedia</button><button onClick={()=>setStudentsAndRecords([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Kosongkan</button></div><div className="max-h-[440px] space-y-2 overflow-y-auto">{filteredBulkStudents.map(s=><label key={s.id} className="flex items-center gap-2 rounded-lg border border-slate-100 p-2 text-sm"><input type="checkbox" checked={bulkStudentIds.includes(s.id)} onChange={()=>{const next=bulkStudentIds.includes(s.id)?bulkStudentIds.filter(x=>x!==s.id):[...bulkStudentIds,s.id];setStudentsAndRecords(next)}}/><span><b>{s.full_name||s.username||'Tanpa nama'}</b><small className="ml-2 text-slate-500">{s.class_code||'—'}</small></span></label>)}{!selectedBulkPackageIds.length&&<p className="p-5 text-center text-xs text-amber-700">Pilih paket/subtes terlebih dahulu agar peserta yang memiliki nilai muncul.</p>}{selectedBulkPackageIds.length>0&&!filteredBulkStudents.length&&<p className="p-5 text-center text-xs text-slate-500">Tidak ada peserta dengan nilai untuk filter ini.</p>}</div><p className="text-xs text-slate-500">{bulkStudentIds.length} peserta dipilih · {selectedRecords.length} nilai akan dicetak</p></>}
    </aside>
    <div className={"space-y-4 rounded-2xl border bg-white p-4 shadow-sm " + (mode === "bulk" ? "order-1" : "order-2")}><h2 className="font-black text-slate-900">{mode === "bulk" ? "2. Pilih paket / subtes dan format" : "3. Pilih format dan nilai"}</h2><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Format dokumen<select value={docType} onChange={e=>setDocType(e.target.value as 'raport'|'certificate')} className={field}><option value="raport">Raport / Rekap capaian</option><option value="certificate">Sertifikat capaian</option></select></label><label className="text-xs font-semibold text-slate-600">Tanggal dokumen<input type="date" value={settings.issueDate} onChange={e=>updateIssueDate(e.target.value)} className={field}/></label></div>
     {mode==='bulk'?<><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-700">Pilih paket/subtes terlebih dahulu ({selectedBulkPackageIds.length} dipilih)</b><button onClick={()=>setSelectedBulkPackageIds([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan paket</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Filter kategori / subtes<select value={bulkSubtestFilter} onChange={e=>setBulkSubtestFilter(e.target.value)} className={field}><option value="ALL">Semua kategori / subtes</option>{bulkSubtests.map(subtest=><option key={subtest} value={subtest}>{subtest}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Urutkan paket<select value={bulkPackageSort} onChange={e=>setBulkPackageSort(e.target.value as 'title'|'subtest'|'count')} className={field}><option value="subtest">Kategori / subtes</option><option value="title">Nama paket (A–Z)</option><option value="count">Jumlah peserta terbanyak</option></select></label></div><div className="flex flex-wrap gap-2"><button onClick={()=>setSelectedBulkPackageIds(old=>[...new Set([...old,...filteredBulkPackageOptions.map(x=>x.examId)])])} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Pilih semua hasil filter</button><button onClick={()=>setSelectedBulkPackageIds(old=>old.filter(id=>!filteredBulkPackageOptions.some(x=>x.examId===id)))} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan hasil filter</button></div><div className="max-h-[390px] space-y-2 overflow-y-auto rounded-xl border p-3">{filteredBulkPackageOptions.map(option=><label key={option.examId} className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 hover:bg-indigo-50/50"><input type="checkbox" className="mt-1" checked={selectedBulkPackageIds.includes(option.examId)} onChange={event=>toggleBulkPackage(option.examId,event.target.checked)}/><span className="min-w-0 flex-1"><b className="block text-sm text-slate-800">{option.title}</b><span className="text-xs text-slate-500">Subtes: {option.subtest} · {option.records.length} peserta memiliki nilai</span></span></label>)}{!filteredBulkPackageOptions.length&&<p className="p-6 text-center text-xs text-slate-400">Tidak ada paket pada kategori / subtes ini.</p>}</div><div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800">Langkah 3 menampilkan peserta yang memiliki nilai pada minimal satu paket terpilih. Peserta dengan nilai tidak lengkap tetap dapat dipilih.</div></>:<><div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-700">Nilai terbaik yang akan dicetak ({selectedRecords.length})</b><div className="flex gap-2"><button onClick={()=>setSelectedRecordKeys(candidateRecords.map(r=>r.key))} className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700">Pilih semua nilai</button><button onClick={()=>setSelectedRecordKeys([])} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold">Kosongkan nilai</button></div></div><div className="max-h-[390px] overflow-y-auto rounded-xl border"><table className="w-full min-w-[650px] text-left text-xs"><thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-3">Pilih</th><th className="p-3">Siswa</th><th className="p-3">Paket / Subtes</th><th className="p-3">Jenis</th><th className="p-3 text-right">Nilai terbaik</th><th className="p-3">Tanggal</th></tr></thead><tbody className="divide-y">{candidateRecords.map(r=>{const s=students.find(x=>x.id===r.user_id);return <tr key={r.key}><td className="p-3"><input type="checkbox" checked={selectedRecordKeys.includes(r.key)} onChange={()=>toggleRecord(r.key)}/></td><td className="p-3">{s?.full_name||s?.username||'Siswa'}<div className="text-[10px] text-slate-400">{s?.class_code}</div></td><td className="p-3"><b>{r.title}</b><div className="text-[10px] text-slate-400">{r.subtest}</div></td><td className="p-3">{r.kind}</td><td className="p-3 text-right font-black text-indigo-700">{formatScore(r.score)}/100</td><td className="p-3">{r.date?new Date(r.date).toLocaleDateString('id-ID'):'—'}</td></tr>})}{!candidateRecords.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-400">{loading?'Memuat riwayat...':'Pilih siswa untuk menampilkan nilai terbaik.'}</td></tr>}</tbody></table></div></>}
     <div className="rounded-xl border p-3"><div className="flex items-center gap-2"><input id="custom-feedback" type="checkbox" checked={customFeedback} onChange={e=>setCustomFeedback(e.target.checked)}/><label htmlFor="custom-feedback" className="text-sm font-bold text-slate-800">Gunakan apresiasi dan catatan khusus (seragam untuk semua siswa terpilih)</label></div>{customFeedback&&<div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold text-slate-600">Kalimat apresiasi<textarea value={customAppreciation} onChange={e=>setCustomAppreciation(e.target.value)} placeholder="Contoh: Terus semangat, usaha baikmu patut diapresiasi." className={field} rows={3}/></label><label className="text-xs font-semibold text-slate-600">Catatan perkembangan<textarea value={customNote} onChange={e=>setCustomNote(e.target.value)} placeholder="Contoh: Terus berlatih membaca dan memahami soal secara bertahap." className={field} rows={3}/></label></div>}<p className="mt-2 text-[11px] text-slate-500">Jika tidak dicentang, setiap siswa mendapat apresiasi dan catatan yang dibuat otomatis dari rata-rata, capaian paling menonjol, serta materi yang masih perlu dilatih. Kalimat divariasikan dan dibuat konsisten saat dicetak ulang.</p></div>
    </div>
   </section>
   <section className="rounded-2xl border bg-white p-4 shadow-sm"><h2 className="font-black text-slate-900">4. Pengaturan penandatangan</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Tanda tangan<select value={signatoryType} onChange={e=>setSignatoryType(e.target.value as any)} className={field}><option value="both">Guru / Wali Kelas dan Kepala Sekolah</option><option value="principal_only">Hanya Kepala Sekolah</option><option value="teacher_only">Hanya Guru / Wali Kelas</option></select></label><label className="text-xs font-semibold text-slate-600">Kepala sekolah<select value={principalId} onChange={e=>setPrincipalId(e.target.value)} className={field}><option value="">Pilih kepala sekolah</option>{principalOptions.map(p=><option key={p.id} value={p.id}>{p.full_name} · {p.nip||'Tanpa NIP'}</option>)}</select></label>{mode==='single'&&<label className="text-xs font-semibold text-slate-600">Guru / Wali Kelas<select value={teacherId} onChange={e=>setTeacherId(e.target.value)} className={field}><option value="">Otomatis sesuai kelas</option>{teacherOptions.filter(t=>!singleStudent||t.class_code===singleStudent.class_code).map(t=><option key={t.id} value={t.id}>{t.full_name} · {t.class_code}</option>)}</select></label>}<label className="flex items-center gap-2 self-end rounded-lg border p-3 text-xs font-semibold text-slate-700"><input type="checkbox" checked={includeParentSign} onChange={e=>setIncludeParentSign(e.target.checked)}/> Sertakan kolom tanda tangan orang tua / wali</label></div><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-xs text-indigo-800 sm:col-span-2"><b>Kop surat tetap:</b> Pemerintah Kabupaten Semarang · Dinas Pendidikan Kebudayaan Kepemudaan dan Olah Raga · Korwil Biddik Kecamatan Getasan · UPTD SPF Sekolah Dasar Negeri Getasan.</div><label className="text-xs font-semibold text-slate-600">Tempat terbit<input value={settings.issuePlace} onChange={e=>setSettings(s=>({...s,issuePlace:e.target.value}))} className={field}/></label></div></section>
   <div className="flex flex-wrap justify-end gap-2"><button disabled={!selectedStudents.length||!selectedRecords.length} onClick={()=>setPreviewOpen(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">👁️ Pratinjau Dokumen</button><button disabled={!selectedStudents.length||!selectedRecords.length} onClick={printNow} className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-40">🖨️ Cetak / Simpan PDF</button></div>
  </div>
  {previewOpen&&<section className="mx-auto mt-6 max-w-5xl rounded-xl border bg-white p-5 shadow-sm"><div className="no-print mb-4 flex justify-end"><button onClick={()=>setPreviewOpen(false)} className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold">Tutup Pratinjau</button></div><div id="print-area" className="space-y-10 text-slate-900"><style>{`.document-watermark{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:auto;max-height:78%;object-fit:contain;z-index:1;pointer-events:none;filter:grayscale(.08);mix-blend-mode:multiply}
.print-student{isolation:isolate}
.document-pattern-layer{position:absolute;inset:4mm;pointer-events:none;z-index:0;opacity:var(--pattern-opacity,0);background-repeat:repeat;background-position:center;mix-blend-mode:multiply}
.print-student>*:not(.document-watermark):not(.print-top-band):not(.document-pattern-layer){position:relative;z-index:2}
.print-student>.document-pattern-layer{position:absolute;z-index:0}
.print-student>.document-watermark{position:absolute;z-index:1}
.print-student>.print-top-band{position:absolute;z-index:3}
#print-area .print-student .bg-indigo-50{background-color:var(--doc-accent-soft)!important}
#print-area .print-student .border-indigo-100{border-color:var(--doc-border)!important}
#print-area .print-student .text-indigo-700,#print-area .print-student .text-indigo-800,#print-area .print-student .text-indigo-900{color:var(--doc-accent)!important}
#print-area .print-student .certificate-panel{background:rgba(255,255,255,.62)!important;border-color:var(--doc-border)!important}
#print-area .print-student .certificate-average{border-color:var(--doc-gold)!important}
#print-area .print-student .certificate-average b{color:var(--doc-ink)!important}
.document-pattern-layer[data-pattern="cartoon3d-dot"]{background-image:url('/patterns/titik-ceria.svg');background-size:52px 52px}
.document-pattern-layer[data-pattern="cartoon3d-stars"]{background-image:url('/patterns/bintang-ceria.svg');background-size:76px 76px}
.document-pattern-layer[data-pattern="batik-kawung"]{background-image:url('/patterns/kawung.svg');background-size:60px 60px}
.document-pattern-layer[data-pattern="batik-mega-mendung"]{background-image:url('/patterns/mega-mendung.svg');background-size:90px 50px}
.document-pattern-layer[data-pattern="batik-parang"]{background-image:url('/patterns/parang.svg');background-size:72px 72px}
.document-pattern-layer[data-pattern="modern-geometric"]{background-image:url('/patterns/geometric.svg');background-size:56px 56px}
#print-area .print-student.document-theme-candy{border-color:#ec4899!important;background:radial-gradient(circle at 8% 8%,#fce7f3 0,transparent 24%),linear-gradient(135deg,#fff7fb,#fffbea 55%,#f0f9ff)!important}
#print-area .print-student.document-theme-rainbow{border-color:#8b5cf6!important;background:linear-gradient(120deg,#fff1f2,#fffbeb 34%,#ecfdf5 68%,#eff6ff)!important}
#print-area .print-student.document-theme-sunny{border-color:#f97316!important;background:radial-gradient(circle at 50% 0,#fef08a 0,transparent 35%),linear-gradient(135deg,#fff7ed,#fffbeb 55%,#eff6ff)!important}
#print-area .print-student.document-theme-mint{border-color:#10b981!important;background:radial-gradient(circle at 8% 10%,#d1fae5 0,transparent 30%),linear-gradient(135deg,#f0fdfa,#fff7ed 58%,#fffbeb)!important}
#print-area .print-student.document-theme-sky{border-color:#0ea5e9!important;background:radial-gradient(circle at 90% 8%,#cffafe 0,transparent 32%),linear-gradient(135deg,#eff6ff,#ecfeff 52%,#fff1f2)!important}
#print-area .print-student.document-theme-candy h3{color:#7e22ce!important}
#print-area .print-student.document-theme-rainbow h3{color:#6d28d9!important}
#print-area .print-student.document-theme-sunny h3{color:#c2410c!important}
#print-area .print-student.document-theme-mint h3{color:#047857!important}
#print-area .print-student.document-theme-sky h3{color:#0369a1!important}
@media print{.document-watermark{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.document-pattern-layer{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
#print-area .print-student{width:${pageWidth};min-height:${pageHeight};box-sizing:border-box;margin:0 auto 12mm;padding:8mm;background:#fff}`}</style>{selectedStudents.filter(student=>selectedRecords.some(r=>r.user_id===student.id)).map(student=>{const rows=selectedRecords.filter(r=>r.user_id===student.id);return <article key={student.id} data-pattern={visual.preset.patternEnabled ? visual.preset.pattern : undefined} style={getDocumentVisualStyle(visual.preset)} className={`print-student ${visual.preset.themeEnabled ? `document-theme-${visual.preset.theme}` : ''} relative overflow-hidden bg-white p-5 font-sans ${docType==='certificate'?'print-certificate':'print-report border border-slate-200'}`} style={{...getDocumentVisualStyle(visual.preset),fontFamily:docType==='raport'?'Arial, Helvetica, sans-serif':undefined}}>{visual.preset.patternEnabled && <div aria-hidden="true" className="document-pattern-layer" data-pattern={visual.preset.pattern}/>}<div className="print-top-band pointer-events-none absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-slate-800 via-blue-900 to-amber-500"/>{visual.preset.watermark.enabled&&<img src="/logo-sd-getasan.png" alt="" aria-hidden="true" className="document-watermark" style={{width:`${visual.preset.watermark.size}%`,opacity:visual.preset.watermark.opacity}}/>}<header className="relative z-10 grid grid-cols-[23mm_minmax(0,1fr)_23mm] items-center gap-3 border-b-[3px] border-double border-slate-900 pb-3"><div className="flex items-center justify-center">{visual.preset.leftLogo!=='none'&&<img src={visual.preset.leftLogo} alt="Logo kiri kop sekolah" className="h-[23mm] w-[23mm] shrink-0 object-contain"/>}</div><div className="min-w-0 flex-1 text-center leading-tight"><p className="text-[9px] font-bold uppercase tracking-wide">PEMERINTAH KABUPATEN SEMARANG</p><p className="mt-0.5 text-[9px] font-bold uppercase">DINAS PENDIDIKAN KEBUDAYAAN KEPEMUDAAN DAN OLAH RAGA</p><p className="mt-0.5 text-[9px] font-bold uppercase">KORWIL BIDDIK KECAMATAN GETASAN</p><h2 className="mt-1 text-[15px] font-black uppercase tracking-wide">UPTD SPF SEKOLAH DASAR NEGERI GETASAN</h2><p className="mt-1 text-[7.5px] font-medium uppercase tracking-wide">ALAMAT: JALAN P. DIPONEGORO KM 6 DESA GETASAN KEC. GETASAN 50774</p></div><div className="flex items-center justify-center">{visual.preset.rightLogo!=='none'&&<img src={visual.preset.rightLogo} alt="Logo kanan kop sekolah" className="h-[23mm] w-[23mm] shrink-0 object-contain"/>}</div></header><div className="py-6 text-center"><span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-800">Dokumen capaian peserta didik</span><h3 className="mt-3 text-2xl font-black uppercase tracking-wide text-slate-900">{docType==='raport'?'Laporan Capaian Belajar':'Sertifikat Capaian Akademik'}</h3><div className="mx-auto mt-2 h-1 w-24 rounded-full bg-amber-500"/><div className="mt-2 text-center text-[10px] text-slate-600"><p>Tahun Pelajaran {settings.academicYear}</p><p className="font-bold">{settings.learningPeriod}</p></div></div>{docType==='raport'?<div className="mb-5 grid grid-cols-2 gap-2 text-sm"><p>Nama: <b>{student.full_name||student.username||'—'}</b></p><p>Kelas: <b>{student.class_code||'—'}</b></p></div>:<div className="mb-5 text-right text-xs text-slate-500">Kelas: <b>{student.class_code||'—'}</b></div>}{docType==='raport'?<><table className="w-full border-collapse text-sm"><thead><tr className="bg-slate-100"><th className="border p-3">No.</th><th className="border p-3 text-left">Paket Ujian / Subtes</th><th className="border p-3">Jenis</th><th className="border p-3">Nilai Terbaik</th><th className="border p-3">Keterangan</th></tr></thead><tbody>{rows.map((r,i)=><tr key={r.key}><td className="border p-3 text-center">{i+1}</td><td className="border p-3"><b>{r.title}</b><div className="mt-1 text-xs text-slate-600">Subtes: {r.subtest||'Umum'}</div></td><td className="border p-3 text-center">{r.kind}</td><td className="border p-3 text-center font-bold">{formatScore(r.score)}</td><td className="border p-3 text-center">{r.score>=settings.kkm?'Tuntas':'Perlu bimbingan'}</td></tr>)}</tbody></table><section className="mt-5 rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Rata-rata capaian</p><div className="mt-1 flex items-end gap-2"><b className="text-3xl leading-none text-slate-900">{formatScore(averageOf(rows))}</b><span className="pb-0.5 text-sm text-slate-500">/ 100</span></div></section><section className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50 p-4"><h4 className="text-sm font-bold text-indigo-900">Apresiasi</h4><p className="mt-2 text-sm leading-relaxed text-slate-800">{customFeedback&&customAppreciation.trim()?customAppreciation:reportFeedbackByStudent.get(student.id)?.appreciation||defaultAppreciation(averageOf(rows))}</p><h4 className="mt-4 text-sm font-bold text-indigo-900">Catatan perkembangan</h4><p className="mt-2 text-sm leading-relaxed text-slate-700">{customFeedback&&customNote.trim()?customNote:reportFeedbackByStudent.get(student.id)?.note||defaultNote(averageOf(rows))}</p></section></>:<div className="certificate-panel rounded-2xl border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/70 to-white px-6 py-10 text-center"><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Diberikan dengan bangga kepada</p><h4 className="certificate-name my-5 text-3xl font-black text-slate-900">{student.full_name||student.username}</h4><div className="mx-auto mb-5 h-1 w-20 rounded-full bg-amber-400"/><p className="text-sm text-slate-600">Atas capaian akademik pada paket pembelajaran berikut:</p><div className="certificate-average mx-auto mt-4 inline-flex items-center gap-3 rounded-full border border-amber-300 bg-amber-50 px-5 py-2"><span className="text-xs font-bold uppercase tracking-wide text-slate-600">Rata-rata</span><b className="text-2xl text-indigo-900">{formatScore(averageOf(rows))}/100</b></div><div className="certificate-score-grid mx-auto mt-5 max-w-3xl">{rows.map(r=><div key={r.key} className="flex justify-between border-b py-2 text-sm"><span>{r.title} · {r.subtest}</span><b>{formatScore(r.score)}/100</b></div>)}</div><div className="certificate-feedback mt-5 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-left"><p className="text-xs font-black uppercase tracking-widest text-amber-800">Apresiasi</p><p className="mt-1 text-sm font-semibold text-slate-800">{appreciationFor(averageOf(rows))}</p><p className="mt-3 text-xs font-black uppercase tracking-widest text-amber-800">Catatan perkembangan</p><p className="mt-1 text-sm text-slate-700">{noteFor(averageOf(rows))}</p></div></div>}{signatureBlock(student)}</article>})}</div></section>}
 </main>
}