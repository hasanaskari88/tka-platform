'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users, ClipboardList, BookOpen, Megaphone, FileText, BarChart3, GraduationCap, Dumbbell, Trophy, ClipboardCheck, ArrowUpRight, Layers3, Newspaper } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Student = { id:string; full_name:string|null; username:string|null; class_code:string|null; xp:number; level:number; practiceXp:number; practiceAttempts:number; practiceBest:number; examCount:number; examAverage:number }
type ExamMeta = { id:string; title:string; subtest:string|null; target_mode:string|null; activity_type:string|null; duration_minutes:number|null }

export default function AdminDashboardPage() {
  const [students,setStudents]=useState<Student[]>([])
  const [practiceRows,setPracticeRows]=useState<any[]>([])
  const [examRows,setExamRows]=useState<any[]>([])
  const [examMeta,setExamMeta]=useState<ExamMeta[]>([])
  const [stats,setStats]=useState({exams:0,questions:0,materials:0,announcements:0})
  const [loading,setLoading]=useState(true)
  const [warning,setWarning]=useState('')
  const [pendingWork,setPendingWork]=useState<any[]>([])
  const [pendingFilter,setPendingFilter]=useState<'ALL'|'UNFINISHED'|'UNGRADED'>('ALL')
  const [pendingOpen,setPendingOpen]=useState(false)
  const [pendingSort,setPendingSort]=useState<'priority'|'student'|'class'|'title'>('priority')
  const [liveOpen,setLiveOpen]=useState(false)
  const [classFilter,setClassFilter]=useState('ALL')
  const [search,setSearch]=useState('')
  const [sort,setSort]=useState('name')
  const [page,setPage]=useState(1)
  const [pageSize,setPageSize]=useState(20)
  const [rankScope,setRankScope]=useState<'global'|'exam'>('global')
  const [rankExamId,setRankExamId]=useState('ALL')
  const [rankClass,setRankClass]=useState('ALL')
  const [rankType,setRankType]=useState('ALL')
  const [dashboardPeriod,setDashboardPeriod]=useState<'all'|'7'|'30'|'custom'>('all')
  const [periodFrom,setPeriodFrom]=useState('')
  const [periodTo,setPeriodTo]=useState('')
  const [analyticsClass,setAnalyticsClass]=useState('ALL')
  const [subtestSort,setSubtestSort]=useState('sessions')
  const [examPackageSort,setExamPackageSort]=useState('started')
  const [practicePackageSort,setPracticePackageSort]=useState('started')
  const [practiceRankSort,setPracticeRankSort]=useState('xp')
  const [examRankSort,setExamRankSort]=useState('average')
  const [studentPracticeGraphSort,setStudentPracticeGraphSort]=useState('xp')
  const [studentExamGraphSort,setStudentExamGraphSort]=useState('average')

  useEffect(()=>{
    let active=true
    async function load(){
      const db=createClient()
      try{
        const [p,pr,ex,em,ec,qc,qmeta,mc,ac]=await Promise.all([
          db.from('profiles').select('id,full_name,username,class_code,role,xp,level').eq('role','student').order('full_name'),
          // select * keeps the dashboard compatible before/after the staged credited_xp migration
          db.from('practice_attempts').select('*'),
          db.from('exam_sessions').select('*'),
          db.from('exams').select('id,title,subtest,target_mode,activity_type,duration_minutes'),
          db.from('exams').select('id',{count:'exact',head:true}),
          db.from('questions').select('id',{count:'exact',head:true}),
          db.from('questions').select('id,exam_id,question_type'),
          db.from('study_materials').select('id',{count:'exact',head:true}),
          db.from('announcements').select('id',{count:'exact',head:true}),
        ])
        if(!active)return
        if(p.error)throw p.error
        const problems:string[]=[]
        if(pr.error)problems.push('riwayat latihan: '+pr.error.message)
        if(ex.error)problems.push('riwayat ujian: '+ex.error.message)
        if(em.error)problems.push('metadata paket: '+em.error.message)
        if(qmeta.error)problems.push('metadata soal: '+qmeta.error.message)
        const practice=pr.data||[], exams=ex.data||[], meta=em.data||[]
        const essayQuestionIds=(qmeta.data||[])
          .filter((question:any)=>['essay','uraian'].includes(String(question.question_type||'').toLowerCase()))
          .map((question:any)=>question.id)
        // Ambil jawaban essay saja. Mengambil semua jawaban dari seluruh sesi dapat
        // melewati batas 1.000 baris PostgREST dan membuat jawaban essay terbaru terpotong.
        const answerResult=essayQuestionIds.length
          ? await db.from('answers').select('session_id,question_id,user_answer,selected_answers,selected_option,teacher_score').in('question_id',essayQuestionIds)
          : {data:[],error:null}
        if(answerResult.error)problems.push('jawaban ujian: '+answerResult.error.message)
        if(problems.length)setWarning('Sebagian data belum dapat dibaca — '+problems.join(' | '))
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
        const profileMap=new Map((p.data||[]).map((profile:any)=>[profile.id,profile]))
        const questionRows=qmeta.data||[]
        const essayQuestionsByExam=new Map<string,any[]>()
        questionRows.filter((question:any)=>['essay','uraian'].includes(String(question.question_type||'').toLowerCase())).forEach((question:any)=>{
          const list=essayQuestionsByExam.get(question.exam_id)||[]
          list.push(question);essayQuestionsByExam.set(question.exam_id,list)
        })
        const answerMap=new Map<string,any>()
        ;(answerResult.data||[]).forEach((answer:any)=>answerMap.set(answer.session_id+'|'+answer.question_id,answer))
        const pending=exams.flatMap((session:any)=>{
          const examInfo=meta.find((item:any)=>item.id===session.exam_id)
          const durationSeconds=(Number(examInfo?.duration_minutes)||15)*60
          const startMs=session.start_time?new Date(session.start_time).getTime():0
          const pausedTotal=Number(session.paused_duration_seconds)||0
          const pausedAtMs=session.paused_at?new Date(session.paused_at).getTime():null
          const currentPause=pausedAtMs?Math.max(0,Math.floor((Date.now()-pausedAtMs)/1000)):0
          const elapsed=startMs?Math.max(0,Math.floor((Date.now()-startMs)/1000)-pausedTotal-currentPause):0
          const isExpired=session.status==='ongoing'&&(!startMs||durationSeconds+Number(session.extra_time_seconds||0)-elapsed<=0)
          const unfinished=session.status!=='completed'
          const essayQuestions=essayQuestionsByExam.get(session.exam_id)||[]
          const ungraded=essayQuestions.filter((question:any)=>{
            const answer=answerMap.get(session.id+'|'+question.id)
            if(!answer)return false
            const raw=answer.user_answer??answer.selected_answers??answer.selected_option
            const hasResponse=Array.isArray(raw)?raw.length>0:typeof raw==='string'?raw.trim().length>0:raw!==null&&raw!==undefined
            return hasResponse&&(answer.teacher_score===null||answer.teacher_score===undefined||answer.teacher_score==='')
          })
          if(!unfinished&&!ungraded.length)return []
          const profile:any=profileMap.get(session.user_id)
          return [{id:session.id,examId:session.exam_id,userId:session.user_id,studentName:profile?.full_name||profile?.username||'Peserta',classCode:profile?.class_code||'—',examTitle:examInfo?.title||'Paket ujian',status:session.status,unfinished,isExpired,ungradedEssayCount:ungraded.length,startTime:session.start_time||''}]
        }).sort((a:any,b:any)=>Number(b.ungradedEssayCount>0)-Number(a.ungradedEssayCount>0))
        setPendingWork(pending)
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
  const activityDate=(row:any)=>{const raw=row.start_time??row.created_at??row.started_at??row.createdAt;const time=raw?new Date(raw).getTime():NaN;return Number.isFinite(time)?time:null}
  const inSelectedPeriod=(row:any)=>{if(dashboardPeriod==='all')return true;const time=activityDate(row);if(time===null)return false;if(dashboardPeriod==='7')return time>=Date.now()-7*86400000;if(dashboardPeriod==='30')return time>=Date.now()-30*86400000;const from=periodFrom?new Date(periodFrom+'T00:00:00').getTime():null;const to=periodTo?new Date(periodTo+'T23:59:59.999').getTime():null;return (from===null||time>=from)&&(to===null||time<=to)}
  const analyticsExamRows=examRows.filter(row=>inSelectedPeriod(row)&&(analyticsClass==='ALL'||studentMap.get(row.user_id)?.class_code===analyticsClass))
  const analyticsPracticeRows=practiceRows.filter(row=>inSelectedPeriod(row)&&(analyticsClass==='ALL'||studentMap.get(row.user_id)?.class_code===analyticsClass))
  const rankingExamRows=examRows.filter(row=>inSelectedPeriod(row))
  const rankingPracticeRows=practiceRows.filter(row=>inSelectedPeriod(row))
  const metaMap=new Map(examMeta.map(e=>[e.id,e]))
  const rankExam=rankScope==='exam'&&rankExamId!=='ALL'?rankExamId:null
  const eligiblePractice=rankingPracticeRows.filter(r=>{
    const student=studentMap.get(r.user_id),meta=metaMap.get(r.exam_id)
    if(!student||(rankClass!=='ALL'&&student.class_code!==rankClass))return false
    if(rankExam&&r.exam_id!==rankExam)return false
    if(rankType==='EXAM')return false
    if(rankType==='PRACTICE'&&meta?.target_mode==='EXAM_ONLY')return false
    if(['QUIZ','FLASHCARD','MAZE_GAME'].includes(rankType)&&meta?.activity_type!==rankType)return false
    return true
  })
  const practiceTotals=new Map<string,{xp:number;attempts:number;completed:number}>()
  eligiblePractice.forEach(r=>{const old=practiceTotals.get(r.user_id)||{xp:0,attempts:0,completed:0};practiceTotals.set(r.user_id,{xp:old.xp+(r.status==='completed'?Number(r.total_xp||0):Number(r.credited_xp||0)),attempts:old.attempts+1,completed:old.completed+(r.status==='completed'?1:0)})})
  const practiceRanking=[...practiceTotals].map(([id,v])=>({student:studentMap.get(id)!,value:practiceRankSort==='attempts'?v.attempts:practiceRankSort==='completed'?v.completed:v.xp,xp:v.xp,attempts:v.attempts,completed:v.completed})).filter((x): x is {student:Student;value:number;xp:number;attempts:number;completed:number}=>Boolean(x.student)).sort((a,b)=>b.value-a.value).slice(0,10)
  const eligibleExams=rankingExamRows.filter(r=>{
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
  const examTotals=new Map<string,{sum:number;count:number;best:number}>()
  bestScores.forEach((score,key)=>{const userId=key.split('|')[0],old=examTotals.get(userId)||{sum:0,count:0,best:0};examTotals.set(userId,{sum:old.sum+score,count:old.count+1,best:Math.max(old.best,score)})})
  const examRanking=[...examTotals].map(([id,v])=>({student:studentMap.get(id)!,value:examRankSort==='count'?v.count:examRankSort==='best'?v.best:Math.round(v.sum/v.count),average:Math.round(v.sum/v.count),best:v.best,count:v.count})).filter((x): x is {student:Student;value:number;average:number;best:number;count:number}=>Boolean(x.student)).sort((a,b)=>b.value-a.value).slice(0,10)
  const completedPractice=practiceRows.filter(r=>r.status==='completed').length,completedExams=examRows.filter(r=>r.status==='completed').length

  const filteredPendingWork=pendingWork.filter(item=>pendingFilter==='ALL'||(pendingFilter==='UNFINISHED'?item.unfinished:item.ungradedEssayCount>0)).sort((a,b)=>pendingSort==='student'?a.studentName.localeCompare(b.studentName,'id'):pendingSort==='class'?a.classCode.localeCompare(b.classCode,'id'):pendingSort==='title'?a.examTitle.localeCompare(b.examTitle,'id'):(Number(b.ungradedEssayCount>0)-Number(a.ungradedEssayCount>0))||String(b.startTime).localeCompare(String(a.startTime)))
  const liveMonitorSummaries=examRows.reduce((groups:any[],session:any)=>{
    if(!['ongoing','paused'].includes(session.status))return groups
    let group=groups.find(item=>item.examId===session.exam_id)
    if(!group){const exam=examMeta.find(item=>item.id===session.exam_id);group={examId:session.exam_id,title:exam?.title||'Paket ujian',ongoing:0,paused:0};groups.push(group)}
    if(session.status==='ongoing')group.ongoing+=1
    if(session.status==='paused')group.paused+=1
    return groups
  },[]).sort((a:any,b:any)=>(b.ongoing+b.paused)-(a.ongoing+a.paused))
  const cards=[{label:'Peserta didik',value:students.length,icon:Users,color:'from-indigo-500 to-blue-600'},{label:'Paket ujian & latihan',value:stats.exams,icon:Layers3,color:'from-violet-500 to-purple-600'},{label:'Bank soal',value:stats.questions,icon:ClipboardList,color:'from-amber-500 to-orange-600'},{label:'Materi pembelajaran',value:stats.materials,icon:BookOpen,color:'from-emerald-500 to-teal-600'}]

  // Ringkasan aktivitas paket memakai catatan sesi yang sudah tersedia.
  // "Dimulai" berarti ada baris sesi/attempt, bukan sekadar halaman dibuka.
  const packageAnalytics=examMeta.map(meta=>{
    const examSessions=analyticsExamRows.filter(row=>row.exam_id===meta.id&&meta.target_mode!=='PRACTICE_ONLY')
    const practiceAttempts=analyticsPracticeRows.filter(row=>row.exam_id===meta.id&&meta.target_mode!=='EXAM_ONLY')
    const completedExam=examSessions.filter(row=>row.status==='completed')
    const completedPractice=practiceAttempts.filter(row=>row.status==='completed')
    const examStudents=new Set(examSessions.map(row=>row.user_id).filter(Boolean))
    const practiceStudents=new Set(practiceAttempts.map(row=>row.user_id).filter(Boolean))
    const scoreRows=completedExam.filter(row=>row.score_override!==null&&row.score_override!==undefined||row.score!==null&&row.score!==undefined)
    const average=scoreRows.length?Math.round(scoreRows.reduce((sum,row)=>sum+Number(row.score_override??row.score??0),0)/scoreRows.length):null
    return {id:meta.id,title:meta.title||'Paket tanpa judul',subtest:meta.subtest||'Tanpa subtes',examStarted:examSessions.length,examCompleted:completedExam.length,examStudents:examStudents.size,average,averageLabel:average===null?'—':String(average)+'/100',practiceStarted:practiceAttempts.length,practiceCompleted:completedPractice.length,practiceStudents:practiceStudents.size}
  })
  const subtestAnalytics=[...packageAnalytics.reduce((map,item)=>{
    const old=map.get(item.subtest)||{name:item.subtest,examStarted:0,examCompleted:0,practiceStarted:0,practiceCompleted:0,packages:0}
    old.examStarted+=item.examStarted;old.examCompleted+=item.examCompleted
    old.practiceStarted+=item.practiceStarted;old.practiceCompleted+=item.practiceCompleted;old.packages+=1
    map.set(item.subtest,old);return map
  },new Map<string,{name:string;examStarted:number;examCompleted:number;practiceStarted:number;practiceCompleted:number;packages:number}>()).values()].sort((a,b)=>{const value=(x:any)=>subtestSort==='exam'?x.examStarted:subtestSort==='practice'?x.practiceStarted:subtestSort==='packages'?x.packages:x.examStarted+x.practiceStarted;return value(b)-value(a)})
  const examPackageAnalytics=packageAnalytics.filter(item=>item.examStarted>0||item.examCompleted>0).sort((a,b)=>examPackageSort==='completed'?b.examCompleted-a.examCompleted:examPackageSort==='students'?b.examStudents-a.examStudents:examPackageSort==='average'?(b.average??-1)-(a.average??-1):b.examStarted-a.examStarted)
  const practicePackageAnalytics=packageAnalytics.filter(item=>item.practiceStarted>0||item.practiceCompleted>0).sort((a,b)=>practicePackageSort==='completed'?b.practiceCompleted-a.practiceCompleted:practicePackageSort==='students'?b.practiceStudents-a.practiceStudents:b.practiceStarted-a.practiceStarted)
  const MetricBar=({value,max,color}:{value:number;max:number;color:string})=><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:(value/Math.max(1,max)*100)+'%'}}/></div>

  const summaryXp=scoped.reduce((sum,student)=>sum+student.xp,0)
  const summaryPractice=scoped.reduce((sum,student)=>sum+student.practiceAttempts,0)
  const summaryExam=scoped.filter(student=>student.examCount>0)
  const summaryExamAverage=summaryExam.length?Math.round(summaryExam.reduce((sum,student)=>sum+student.examAverage,0)/summaryExam.length):0
  const classSummary=classes.map(name=>({name,count:students.filter(student=>student.class_code===name).length})).filter(item=>classFilter==='ALL'||item.name===classFilter)
  const topPracticeStudents=[...scoped].sort((a,b)=>studentPracticeGraphSort==='attempts'?b.practiceAttempts-a.practiceAttempts:studentPracticeGraphSort==='total'?b.xp-a.xp:b.practiceXp-a.practiceXp).slice(0,5).map(student=>({student,value:studentPracticeGraphSort==='attempts'?student.practiceAttempts:studentPracticeGraphSort==='total'?student.xp:student.practiceXp}))
  const topExamStudents=[...scoped].filter(student=>student.examCount>0).sort((a,b)=>studentExamGraphSort==='count'?b.examCount-a.examCount:b.examAverage-a.examAverage).slice(0,5).map(student=>({student,value:studentExamGraphSort==='count'?student.examCount:student.examAverage}))
  const ChartBars=({items,color,suffix}:{items:{student:Student;value:number}[];color:string;suffix:string})=>{
    const max=Math.max(1,...items.map(x=>x.value))
    return <div className="mt-3 space-y-3">{items.map((item,i)=><div key={item.student.id}><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span className="min-w-0 truncate font-semibold text-slate-700">{i+1}. {item.student.full_name||item.student.username||'Siswa'} <span className="text-slate-400">({item.student.class_code||'—'})</span></span><b className="shrink-0">{item.value.toLocaleString('id-ID')} {suffix}</b></div><div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{width:(item.value/max*100)+'%'}}/></div></div>)}{!items.length&&<p className="py-5 text-center text-xs text-slate-400">Belum ada data pada filter ini.</p>}</div>
  }

  return <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 md:px-7 md:py-7">
    <header className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 px-5 py-6 text-white md:px-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-white/40 md:h-16 md:w-16"><img src="/logo-sd-getasan.png" alt="Logo SD Negeri Getasan" className="h-full w-full object-contain" /></div>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100 md:text-[11px]">SD Negeri Getasan · Admin Center</p><h1 className="mt-0.5 text-xl font-black md:text-3xl">Dashboard Pengelola</h1><p className="mt-1 max-w-2xl text-xs text-indigo-100 md:text-sm">Selamat bekerja. Kelola soal, dampingi peserta, dan tuntaskan penilaian dari satu tempat.</p></div>
          </div>
          <span className="hidden rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold sm:inline-flex">Ruang kerja guru</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 md:p-4">
        <Link href="/admin/bank-soal" className="group flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-3 text-xs font-bold text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100"><span className="rounded-lg bg-white p-2 text-indigo-600 shadow-sm"><ClipboardList size={18}/></span><span>Bank Soal & Ujian<span className="block pt-1 text-[10px] font-medium text-indigo-600">Buat dan kelola soal</span></span><ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
        <Link href="/admin/raport" className="group flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"><span className="rounded-lg bg-white p-2 text-emerald-600 shadow-sm"><FileText size={18}/></span><span>Olah Nilai & Raport<span className="block pt-1 text-[10px] font-medium text-emerald-600">Raport & sertifikat</span></span><ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
        <Link href="/admin/rekap-nilai" className="group flex items-center gap-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-3 text-xs font-bold text-cyan-800 transition hover:border-cyan-300 hover:bg-cyan-100"><span className="rounded-lg bg-white p-2 text-cyan-600 shadow-sm"><BarChart3 size={18}/></span><span>Rekap Nilai<span className="block pt-1 text-[10px] font-medium text-cyan-700">Ujian & latihan per paket</span></span><ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
        <Link href="/admin/users" className="group flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-3 text-xs font-bold text-amber-800 transition hover:bg-amber-100"><span className="rounded-lg bg-white p-2 text-amber-600 shadow-sm"><Users size={18}/></span><span>Data Peserta<span className="block pt-1 text-[10px] font-medium text-amber-700">Kelola siswa</span></span><ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
        <Link href="/admin/konten" className="group flex items-center gap-3 rounded-xl border border-pink-100 bg-pink-50 px-3 py-3 text-xs font-bold text-pink-800 transition hover:bg-pink-100"><span className="rounded-lg bg-white p-2 text-pink-600 shadow-sm"><Newspaper size={18}/></span><span>Konten & Informasi<span className="block pt-1 text-[10px] font-medium text-pink-700">Materi, pengumuman</span></span><ArrowUpRight size={14} className="ml-auto opacity-50 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"/></Link>
      </div>
    </header>
    {warning&&<div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{warning}</div>}
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm md:p-5">
      <button type="button" onClick={()=>setPendingOpen(v=>!v)} aria-expanded={pendingOpen} className="flex w-full items-center justify-between gap-3 text-left">
        <span><span className="block text-lg font-black text-slate-900">Perlu Ditindaklanjuti</span><span className="block text-xs text-slate-600">Sesi macet/waktu habis dan essay yang menunggu penilaian.</span></span>
        <span className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">{pendingWork.length} item</span><span className="text-lg text-slate-500">{pendingOpen?'▲':'▼'}</span></span>
      </button>
      {pendingOpen&&<div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2">
        {([{value:'ALL',label:'Semua',count:pendingWork.length},{value:'UNFINISHED',label:'Sesi belum selesai',count:pendingWork.filter(item=>item.unfinished).length},{value:'UNGRADED',label:'Essay belum dinilai',count:pendingWork.filter(item=>item.ungradedEssayCount>0).length}] as const).map(option=><button key={option.value} type="button" onClick={()=>setPendingFilter(option.value)} className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${pendingFilter===option.value?'border-indigo-600 bg-indigo-600 text-white':'border-slate-200 bg-white text-slate-700 hover:border-indigo-300'}`}>{option.label} <span className={pendingFilter===option.value?'text-indigo-100':'text-slate-400'}>({option.count})</span></button>)}
      </div><label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">Urutkan <select value={pendingSort} onChange={e=>setPendingSort(e.target.value as any)} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"><option value="priority">Prioritas tindakan</option><option value="student">Nama siswa A–Z</option><option value="class">Kelas</option><option value="title">Nama paket</option></select></label></div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {filteredPendingWork.slice(0,8).map(item=><article key={item.id} className="rounded-xl border border-amber-100 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-sm text-slate-800">{item.studentName}</b><span className="text-[10px] font-bold text-slate-500">{item.classCode}</span></div>
          <p className="mt-1 text-xs text-slate-600">{item.examTitle}</p>
          <div className="mt-2 flex flex-wrap gap-2">{item.unfinished&&<span className={`rounded-md px-2 py-1 text-[10px] font-bold ${item.isExpired?'bg-rose-100 text-rose-800':'bg-orange-100 text-orange-800'}`}>{item.isExpired?'Waktu Habis — perlu submit manual':`Sesi ${item.status}`}</span>}{item.ungradedEssayCount>0&&<span className="rounded-md bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800">{item.ungradedEssayCount} essay belum dinilai</span>}</div>
          <div className="mt-3 flex flex-wrap gap-2">{item.unfinished&&<Link href={'/admin/exam/'+item.examId+'/monitor?sessionId='+item.id} className="rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-bold text-white hover:bg-indigo-700">{item.isExpired?'Buka untuk Submit Manual →':'Pantau Sesi →'}</Link>}{item.ungradedEssayCount>0&&<Link href={'/admin/exam/'+item.examId+'/results?sessionId='+item.id+'&tab=grading'} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-700 hover:bg-rose-100">Nilai Essay Peserta Ini →</Link>}</div>
        </article>)}
        {!loading&&!filteredPendingWork.length&&<p className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-5 text-center text-xs text-slate-500 md:col-span-2">{pendingWork.length?'Tidak ada item pada kategori ini.':'Tidak ada sesi tertunda atau essay yang menunggu penilaian.'}</p>}
      </div>
      {filteredPendingWork.length>8&&<p className="mt-2 text-right text-[10px] text-slate-500">Menampilkan 8 dari {filteredPendingWork.length} item pada kategori ini.</p>}
      </div>}
    </section>
    <section className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm md:p-5">
      <button type="button" onClick={()=>setLiveOpen(v=>!v)} aria-expanded={liveOpen} className="flex w-full items-center justify-between gap-3 text-left"><span><span className="block text-lg font-black text-slate-900">Live Monitor</span><span className="block text-xs text-slate-500">Paket dengan peserta yang sedang mengerjakan atau dijeda.</span></span><span className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{liveMonitorSummaries.length} paket aktif</span><span className="text-lg text-slate-500">{liveOpen?'▲':'▼'}</span></span></button>
      {liveOpen&&<div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {liveMonitorSummaries.map((item:any)=><article key={item.examId} className="rounded-xl border border-slate-200 p-3"><h3 className="text-sm font-black text-slate-800">{item.title}</h3><div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{item.ongoing} mengerjakan</span><span className="rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-700">{item.paused} dipause</span></div><Link href={'/admin/exam/'+item.examId+'/monitor'} className="mt-3 inline-flex rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white hover:bg-slate-700">Buka Live Monitor →</Link></article>)}
        {!loading&&!liveMonitorSummaries.length&&<p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500 md:col-span-2 xl:col-span-3">Belum ada paket dengan sesi yang sedang berjalan atau dipause.</p>}
      </div>}
    </section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map((c,i)=><div key={c.label} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`bg-gradient-to-r ${c.color} px-4 py-3 text-white`}><div className="flex items-center justify-between text-xs font-bold uppercase"><span>{c.label}</span><c.icon size={19} strokeWidth={2.2}/></div><div className="mt-2 text-3xl font-black">{loading?'—':c.value.toLocaleString('id-ID')}</div><Link href={i===0?'/admin/users':i===1?'/admin/bank-soal':i===2?'/admin/bank-soal':'/admin/konten'} className="mt-2 inline-flex text-[10px] font-bold text-white/90 hover:text-white hover:underline">Buka pengelolaan →</Link></div></div>)}</section>
    <section className="grid grid-cols-2 gap-3 md:grid-cols-4">{[{label:'Latihan selesai',value:completedPractice},{label:'Ujian selesai',value:completedExams},{label:'Pengumuman',value:stats.announcements},{label:'Kelas terdata',value:classes.length}].map((x,i)=><div key={x.label} className={`rounded-xl border p-4 shadow-sm ${['border-emerald-200 bg-emerald-50','border-blue-200 bg-blue-50','border-pink-200 bg-pink-50','border-violet-200 bg-violet-50'][i]}`}><p className="text-xs font-semibold text-slate-600">{x.label}</p><p className="mt-1 text-2xl font-black text-slate-900">{loading?'—':x.value}</p></div>)}</section>
    <section className="rounded-2xl border border-sky-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-sky-50 p-2.5 text-sky-700"><BarChart3 size={20}/></span><div><h2 className="text-lg font-black text-slate-900">Statistik Aktivitas Pembelajaran</h2><p className="text-xs text-slate-500">Ringkasan sesi yang benar-benar dimulai dan diselesaikan, bukan sekadar halaman yang dibuka.</p></div></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><label className="text-[11px] font-semibold text-slate-600">Periode data<select value={dashboardPeriod} onChange={e=>setDashboardPeriod(e.target.value as any)} className="mt-1 w-full rounded-lg border px-2.5 py-2"><option value="all">Semua waktu</option><option value="7">7 hari terakhir</option><option value="30">30 hari terakhir</option><option value="custom">Rentang tanggal</option></select></label><label className="text-[11px] font-semibold text-slate-600">Kelas<select value={analyticsClass} onChange={e=>setAnalyticsClass(e.target.value)} className="mt-1 w-full rounded-lg border px-2.5 py-2"><option value="ALL">Semua kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label>{dashboardPeriod==='custom'&&<><label className="text-[11px] font-semibold text-slate-600">Dari tanggal<input type="date" value={periodFrom} onChange={e=>setPeriodFrom(e.target.value)} className="mt-1 w-full rounded-lg border px-2.5 py-2"/></label><label className="text-[11px] font-semibold text-slate-600">Sampai tanggal<input type="date" value={periodTo} onChange={e=>setPeriodTo(e.target.value)} className="mt-1 w-full rounded-lg border px-2.5 py-2"/></label></>}</div>
      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-sky-50 p-2 text-sky-700"><GraduationCap size={17}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-800">Aktivitas per Subtes</h3><p className="text-[10px] text-slate-500">Gabungan sesi ujian dan latihan</p></div><select aria-label="Urutkan aktivitas subtes" value={subtestSort} onChange={e=>setSubtestSort(e.target.value)} className="max-w-28 rounded-lg border px-2 py-1.5 text-[10px]"><option value="sessions">Total sesi</option><option value="exam">Sesi ujian</option><option value="practice">Sesi latihan</option><option value="packages">Jumlah paket</option></select></div>
          <div className="space-y-3">{subtestAnalytics.slice(0,8).map(item=>{const total=item.examStarted+item.practiceStarted;const max=Math.max(1,...subtestAnalytics.map(x=>x.examStarted+x.practiceStarted));return <div key={item.name}><div className="mb-1 flex items-center justify-between gap-2 text-[11px]"><span className="min-w-0 truncate font-semibold text-slate-700">{item.name}</span><b className="shrink-0 text-slate-800">{total} sesi</b></div><MetricBar value={total} max={max} color="bg-sky-500"/><p className="mt-1 text-[10px] text-slate-400">Ujian {item.examStarted} · Latihan {item.practiceStarted} · {item.packages} paket</p></div>})}{!subtestAnalytics.length&&<p className="py-6 text-center text-xs text-slate-400">Belum ada data subtes.</p>}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-indigo-50 p-2 text-indigo-700"><ClipboardCheck size={17}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-800">Statistik Paket Ujian</h3><p className="text-[10px] text-slate-500">Sesi, peserta, dan nilai</p></div><select aria-label="Urutkan paket ujian" value={examPackageSort} onChange={e=>setExamPackageSort(e.target.value)} className="max-w-28 rounded-lg border px-2 py-1.5 text-[10px]"><option value="started">Mulai terbanyak</option><option value="completed">Selesai terbanyak</option><option value="students">Peserta terbanyak</option><option value="average">Rata-rata nilai</option></select></div>
          <div className="space-y-3">{examPackageAnalytics.slice(0,8).map(item=><div key={item.id}><div className="flex items-start justify-between gap-2"><p className="min-w-0 text-[11px] font-semibold text-slate-700">{item.title}</p><b className="shrink-0 text-[11px] text-slate-800">{item.examStarted} mulai</b></div><div className="mt-1.5 flex items-center gap-2"><div className="flex-1"><MetricBar value={item.examCompleted} max={Math.max(1,item.examStarted)} color="bg-indigo-500"/></div><span className="w-16 text-right text-[10px] text-slate-500">{item.examCompleted} selesai</span></div><p className="mt-1 text-[10px] text-slate-400">{item.examStudents} peserta unik · Rata-rata {item.averageLabel}</p></div>)}{!examPackageAnalytics.length&&<p className="py-6 text-center text-xs text-slate-400">Belum ada sesi ujian.</p>}</div>
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <div className="mb-3 flex items-center gap-2"><span className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Dumbbell size={17}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-800">Statistik Paket Latihan</h3><p className="text-[10px] text-slate-500">Latihan dimulai dan diselesaikan</p></div><select aria-label="Urutkan paket latihan" value={practicePackageSort} onChange={e=>setPracticePackageSort(e.target.value)} className="max-w-28 rounded-lg border px-2 py-1.5 text-[10px]"><option value="started">Mulai terbanyak</option><option value="completed">Selesai terbanyak</option><option value="students">Peserta terbanyak</option></select></div>
          <div className="space-y-3">{practicePackageAnalytics.slice(0,8).map(item=><div key={item.id}><div className="flex items-start justify-between gap-2"><p className="min-w-0 text-[11px] font-semibold text-slate-700">{item.title}</p><b className="shrink-0 text-[11px] text-slate-800">{item.practiceStarted} mulai</b></div><div className="mt-1.5 flex items-center gap-2"><div className="flex-1"><MetricBar value={item.practiceCompleted} max={Math.max(1,item.practiceStarted)} color="bg-emerald-500"/></div><span className="w-16 text-right text-[10px] text-slate-500">{item.practiceCompleted} selesai</span></div><p className="mt-1 text-[10px] text-slate-400">{item.practiceStudents} peserta unik</p></div>)}{!practicePackageAnalytics.length&&<p className="py-6 text-center text-xs text-slate-400">Belum ada sesi latihan.</p>}</div>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-slate-400">Catatan: satu sesi/attempt dihitung satu aktivitas. Jumlah peserta unik dihitung berdasarkan ID siswa. Data kunjungan halaman sebelum memulai belum tersedia.</p>
    </section>
    <section className="rounded-2xl border border-amber-200 bg-white p-4 shadow-md shadow-amber-100/70 md:p-5"><div><h2 className="text-lg font-black text-slate-900">Peringkat & Grafik Performa</h2><p className="text-xs text-slate-500">Peringkat latihan dihitung dari XP; peringkat ujian memakai nilai terbaik siswa pada setiap paket, bukan menjumlahkan percobaan ulang.</p></div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-slate-600">Cakupan<select value={rankScope} onChange={e=>setRankScope(e.target.value as 'global'|'exam')} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="global">Umum / keseluruhan</option><option value="exam">Per sesi / paket soal</option></select></label><label className="text-xs font-semibold text-slate-600">Paket soal<select value={rankExamId} onChange={e=>setRankExamId(e.target.value)} disabled={rankScope!=='exam'} className="mt-1 w-full rounded-lg border px-3 py-2 disabled:bg-slate-100"><option value="ALL">Pilih paket soal</option>{examMeta.map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Kelas<select value={rankClass} onChange={e=>setRankClass(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="ALL">Semua kelas</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select></label><label className="text-xs font-semibold text-slate-600">Tipe tes<select value={rankType} onChange={e=>setRankType(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2"><option value="ALL">Semua tipe</option><option value="EXAM">Ujian resmi</option><option value="PRACTICE">Latihan</option><option value="QUIZ">Kuis</option><option value="FLASHCARD">Flashcard</option><option value="MAZE_GAME">Game Labirin</option></select></label></div>
      {rankScope==='exam'&&rankExamId==='ALL'&&<p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">Pilih satu paket soal agar peringkat per sesi dapat dihitung.</p>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2"><div className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-black text-emerald-800"><Trophy size={16}/> Peringkat Latihan</h3><select aria-label="Urutkan peringkat latihan" value={practiceRankSort} onChange={e=>setPracticeRankSort(e.target.value)} className="rounded-lg border px-2 py-1.5 text-[10px]"><option value="xp">XP tertinggi</option><option value="completed">Latihan selesai</option><option value="attempts">Jumlah aktivitas</option></select></div><ChartBars items={rankScope==='exam'&&rankExamId==='ALL'?[]:practiceRanking} color="bg-emerald-500" suffix={practiceRankSort==='xp'?'XP':'aktivitas'}/></div><div className="rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-black text-indigo-800"><BarChart3 size={16}/> Peringkat Ujian</h3><select aria-label="Urutkan peringkat ujian" value={examRankSort} onChange={e=>setExamRankSort(e.target.value)} className="rounded-lg border px-2 py-1.5 text-[10px]"><option value="average">Rata-rata tertinggi</option><option value="best">Nilai terbaik</option><option value="count">Paket selesai</option></select></div><ChartBars items={rankScope==='exam'&&rankExamId==='ALL'?[]:examRanking} color="bg-indigo-500" suffix={examRankSort==='count'?'paket':'/100'}/></div></div>
    </section>
    <section className="rounded-2xl border border-indigo-200 bg-white p-4 shadow-md shadow-indigo-100/70 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><h2 className="text-lg font-black text-slate-900">Peserta Didik</h2><p className="text-xs text-slate-500">Pencarian, pengurutan, dan ringkasan per kelas.</p></div><div className="grid gap-2 sm:grid-cols-3"><select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="ALL">Semua kelas · Global</option>{classes.map(c=><option key={c} value={c}>{c}</option>)}</select><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cari nama / username" className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800"/><select value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800"><option value="name">Nama A–Z</option><option value="xp">XP total tertinggi</option><option value="practice">XP latihan tertinggi</option><option value="exam">Rata-rata ujian tertinggi</option></select></div></div>

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
        <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-slate-800">5 peserta · Grafik latihan</h3><select aria-label="Urutkan grafik latihan peserta" value={studentPracticeGraphSort} onChange={e=>setStudentPracticeGraphSort(e.target.value)} className="max-w-32 rounded-lg border px-2 py-1.5 text-[10px]"><option value="xp">XP latihan</option><option value="attempts">Latihan selesai</option><option value="total">XP total</option></select></div><ChartBars items={topPracticeStudents} color="bg-emerald-500" suffix={studentPracticeGraphSort==='total'||studentPracticeGraphSort==='xp'?'XP':'kali'}/></div>
        <div className="rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-slate-800">5 peserta · Grafik ujian</h3><select aria-label="Urutkan grafik ujian peserta" value={studentExamGraphSort} onChange={e=>setStudentExamGraphSort(e.target.value)} className="max-w-32 rounded-lg border px-2 py-1.5 text-[10px]"><option value="average">Rata-rata nilai</option><option value="count">Ujian selesai</option></select></div><ChartBars items={topExamStudents} color="bg-indigo-500" suffix={studentExamGraphSort==='count'?'paket':'/100'}/></div>
      </aside>
    </div>
    <div className="mt-3 flex flex-col justify-between gap-2 text-xs text-slate-500 sm:flex-row sm:items-center"><span>{visible.length} peserta · halaman {currentPage}/{pageCount}</span><div className="flex items-center gap-2"><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5"><option value={10}>10 / halaman</option><option value={20}>20 / halaman</option><option value={50}>50 / halaman</option><option value={100}>100 / halaman</option></select><button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Sebelumnya</button><button type="button" disabled={currentPage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Berikutnya</button></div></div></section>
    </div>
  </div>
}
