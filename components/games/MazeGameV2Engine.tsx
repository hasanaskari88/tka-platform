'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getMazeV2LevelNumber } from '@/lib/games/maze-v2-levels'
import MazeV2IsometricBoard from '@/components/games/MazeV2IsometricBoard'

type Point = { x: number; y: number }
type Direction = 0 | 1 | 2 | 3
type BlockType = 'FORWARD' | 'LEFT' | 'RIGHT' | 'REPEAT' | 'IF_CLEAR'
type Block = { id: string; type: BlockType; count?: number }
type Mission = {
  id?: string | number; question_text?: string; difficulty?: string
  start_x?: number; start_y?: number; target_x?: number; target_y?: number
  maze_width?: number; maze_height?: number; obstacles?: Point[] | null
}
const VECTORS: Point[] = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
const BLOCKS: {type:BlockType;label:string;icon:string;className:string}[] = [
  {type:'FORWARD',label:'Maju 1 langkah',icon:'⬆️',className:'bg-sky-600'},
  {type:'LEFT',label:'Belok kiri',icon:'↶',className:'bg-violet-600'},
  {type:'RIGHT',label:'Belok kanan',icon:'↷',className:'bg-violet-600'},
  {type:'REPEAT',label:'Ulangi',icon:'🔁',className:'bg-amber-600'},
  {type:'IF_CLEAR',label:'Jika jalan terbuka',icon:'🔀',className:'bg-emerald-600'},
]
const wait = (ms:number) => new Promise(resolve => setTimeout(resolve,ms))
const createBlock = (type:BlockType):Block => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  type, ...(type === 'REPEAT' ? {count:2} : {}),
})

export default function MazeGameV2Engine({exam,questions=[]}:{exam:any;questions:Mission[]}) {
  const router = useRouter()
  const missions = useMemo(() => [...questions].sort((a,b) => getMazeV2LevelNumber(a)-getMazeV2LevelNumber(b)),[questions])
  const [missionIndex,setMissionIndex] = useState(0)
  const mission = missions[missionIndex]
  const missionId = String(mission?.id ?? `maze-v2-${missionIndex}`)
  const level = mission ? getMazeV2LevelNumber(mission,missionIndex) : missionIndex+1
  const levelCounts = [1, 2, 3, 4, 5].map(number => missions.filter((item, index) => getMazeV2LevelNumber(item, index) === number).length)
  const hasFiveLevels = missions.length === 5 && levelCounts.every(count => count === 1)
  const width = Math.max(2,Math.min(12,Number(mission?.maze_width ?? 7)))
  const height = Math.max(2,Math.min(12,Number(mission?.maze_height ?? 7)))
  const start = {x:Number(mission?.start_x ?? 0),y:Number(mission?.start_y ?? 0)}
  const goal = {x:Number(mission?.target_x ?? 5),y:Number(mission?.target_y ?? 5)}
  const walls = useMemo<Point[]>(() => Array.isArray(mission?.obstacles)
    ? mission.obstacles.filter(p => Number.isInteger(Number(p?.x)) && Number.isInteger(Number(p?.y))).map(p => ({x:Number(p.x),y:Number(p.y)}))
    : [],[mission])
  const isWall = (p:Point) => walls.some(w => w.x===p.x && w.y===p.y)
  const wallKeys = walls.map(p => `${p.x},${p.y}`)
  const validWalls = walls.every(p =>
    p.x >= 0 && p.x < width && p.y >= 0 && p.y < height
  ) && new Set(wallKeys).size === walls.length
  const validBoard = [start.x,start.y,goal.x,goal.y].every(Number.isInteger) &&
    start.x>=0 && start.x<width && start.y>=0 && start.y<height &&
    goal.x>=0 && goal.x<width && goal.y>=0 && goal.y<height &&
    !(start.x===goal.x && start.y===goal.y) &&
    validWalls && !isWall(start) && !isWall(goal)

  const [program,setProgram] = useState<Block[]>([])
  const [draggedBlockId,setDraggedBlockId] = useState<string|null>(null)
  const [robot,setRobot] = useState<Point>(start)
  const [direction,setDirection] = useState<Direction>(1)
  const [running,setRunning] = useState(false)
  const [complete,setComplete] = useState(false)
  const [feedback,setFeedback] = useState('Pilih blok, susun perintah, lalu jalankan robot!')
  const [attemptId,setAttemptId] = useState<string|null>(null)
  const [attemptLoading,setAttemptLoading] = useState(true)
  const [attemptError,setAttemptError] = useState('')
  const [retryKey,setRetryKey] = useState(0)
  const [completedIds,setCompletedIds] = useState<string[]>([])
  const [finishing,setFinishing] = useState(false)
  const [finishSummary,setFinishSummary] = useState<any>(null)
  const attemptPromise = useRef<Promise<{id:string|null;completedIds:string[];finishSummary:any|null}>|null>(null)
  const storageKeyRef = useRef<string|null>(null)
  const autoFinishAttemptRef = useRef<string|null>(null)
  const completedRef = useRef<Set<string>>(new Set())
  const finishLock = useRef(false)

  useEffect(() => {
    let active = true
    const startAttempt = async () => {
      if (!exam?.id || !missions.length) {
        setAttemptError(!missions.length ? 'Level Maze V2 belum tersedia. Minta guru membuat Level 1–5.' : 'ID kegiatan tidak ditemukan.')
        setAttemptLoading(false)
        return
      }
      try {
        if (!attemptPromise.current) {
          attemptPromise.current = (async () => {
            const supabase = createClient()
            const { data: authData, error: authError } = await supabase.auth.getUser()
            if (authError) throw new Error(`Gagal memeriksa login: ${authError.message}`)
            if (!authData.user) throw new Error('Sesi login tidak ditemukan. Silakan keluar lalu login kembali.')

            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', authData.user.id)
              .maybeSingle()
            if (profileError) throw new Error(`Profil pengguna tidak dapat dibaca: ${profileError.message}`)
            if (!profile || !['student', 'admin'].includes(String(profile.role))) {
              throw new Error('Akun ini belum memiliki role siswa atau admin. Hubungi administrator.')
            }

            const storageKey = `maze-v2-progress:${authData.user.id}:${exam.id}`
            storageKeyRef.current = storageKey
            let saved: any = null
            try { saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null') } catch { saved = null }
            const validMissionIds = new Set(missions.map((item, index) => String(item.id ?? `maze-v2-${index}`)))
            const savedIds = Array.isArray(saved?.completedIds)
              ? saved.completedIds.map((value: unknown) => String(value)).filter((value: string) => validMissionIds.has(value))
              : []

            if (saved?.status === 'completed' && saved?.finishSummary) {
              return { id: null, completedIds: savedIds, finishSummary: saved.finishSummary }
            }
            if (saved?.attemptId) {
              return { id: String(saved.attemptId), completedIds: savedIds, finishSummary: null }
            }

            const {data,error} = await supabase.rpc('start_practice_attempt',{p_exam_id:exam.id})
            if (error) throw error
            const id = typeof data==='string' ? data : data?.attempt_id ?? data?.id
            if (!id) throw new Error('ID sesi latihan tidak ditemukan.')
            try {
              window.localStorage.setItem(storageKey, JSON.stringify({attemptId:String(id),completedIds:[],status:'in_progress'}))
            } catch {}
            return { id: String(id), completedIds: [], finishSummary: null }
          })()
        }
        const result = await attemptPromise.current
        if (active) {
          completedRef.current = new Set(result.completedIds)
          setCompletedIds(result.completedIds)
          setComplete(result.completedIds.includes(missionId))
          setAttemptId(result.id)
          setFinishSummary(result.finishSummary)
          setAttemptError('')
          setAttemptLoading(false)
        }
      } catch (error: any) {
        console.error('Gagal memulai Maze V2:', error)
        attemptPromise.current = null
        const detail = String(error?.message || error?.details || '').trim()
        if (active) {
          setAttemptError(
            detail
              ? `Sesi latihan gagal dimulai: ${detail}`
              : 'Sesi latihan gagal dimulai. Periksa koneksi lalu coba lagi.'
          )
          setAttemptLoading(false)
        }
      }
    }
    startAttempt()
    return () => { active=false }
  },[exam?.id,missions.length,retryKey])

  useEffect(() => {
    setProgram([])
    setRobot({...start})
    setDirection(1)
    setRunning(false)
    const done = completedRef.current.has(missionId)
    setComplete(done)
    setFeedback(done ? 'Level ini sudah selesai. Pilih level lain untuk melanjutkan.' : 'Susun blok perintah untuk mencapai bintang!')
  },[missionId])

  const persistProgress = (ids: string[], status: 'in_progress'|'completed', summary?: any) => {
    const key = storageKeyRef.current
    if (!key) return
    try {
      window.localStorage.setItem(key, JSON.stringify({
        attemptId,
        completedIds: ids,
        status,
        ...(summary ? { finishSummary: summary } : {}),
      }))
    } catch {}
  }

  const finishMaze = async (count:number) => {
    if (!attemptId || finishLock.current || !hasFiveLevels || count !== 5) return
    finishLock.current=true
    setFinishing(true)
    try {
      const supabase=createClient()
      const {data,error}=await supabase.rpc('finish_practice_attempt',{
        p_attempt_id:attemptId,p_answered_count:count,p_correct_count:count,p_streak_xp:0,
      })
      if(error) throw error
      persistProgress([...completedRef.current], 'completed', data)
      setFinishSummary(data)
      setFeedback('🏆 Semua level selesai! Hasil latihan tersimpan.')
    } catch(error) {
      console.error('Gagal menyimpan hasil Maze V2:',error)
      finishLock.current=false
      setFeedback('Semua level selesai, tetapi hasil belum tersimpan. Tekan Coba Simpan Hasil Lagi.')
    } finally { setFinishing(false) }
  }

  const addBlock = (type:BlockType) => {
    if(running||complete||finishing||program.length>=30) return
    setProgram(old=>[...old,createBlock(type)])
  }
  const removeBlock = (id:string) => {
    if(running||complete||finishing) return
    setProgram(old=>old.filter(b=>b.id!==id))
  }
  const moveBlock = (index:number,offset:-1|1) => {
    if(running||complete||finishing) return
    setProgram(old=>{
      const nextIndex=index+offset
      if(nextIndex<0||nextIndex>=old.length) return old
      const next=[...old]; [next[index],next[nextIndex]]=[next[nextIndex],next[index]]
      return next
    })
  }
  const reorderBlock = (sourceId:string,targetId:string) => {
    if (running || complete || finishing || sourceId === targetId) return
    setProgram(previous => {
      const from = previous.findIndex(block => block.id === sourceId)
      const to = previous.findIndex(block => block.id === targetId)
      if (from < 0 || to < 0) return previous
      const next = [...previous]
      const [moving] = next.splice(from, 1)
      next.splice(to, 0, moving)
      return next
    })
    setDraggedBlockId(null)
  }

  const setRepeat = (id:string,count:number) => {
    if(running||complete||finishing) return
    setProgram(old=>old.map(b=>b.id===id?{...b,count:Math.max(2,Math.min(5,count))}:b))
  }
  const resetLevel = () => {
    if(running||complete||finishing) return
    setProgram([]); setRobot({...start}); setDirection(1)
    setFeedback('Robot kembali ke titik awal. Susun program baru!')
  }

  const runProgram = async () => {
    if(running||complete||finishing||!attemptId) return
    if(!validBoard) { setFeedback('Papan level tidak valid. Hubungi guru untuk memperbaikinya.'); return }
    if(!program.length) { setFeedback('Tambahkan setidaknya satu blok perintah.'); return }
    setRunning(true); setFeedback('🤖 Robot sedang menjalankan program...')
    let pos={...start}; let facing:Direction=1
    let reached=pos.x===goal.x&&pos.y===goal.y
    let crashed=false; let steps=0
    const canMove=()=>{
      const v=VECTORS[facing], next={x:pos.x+v.x,y:pos.y+v.y}
      return next.x>=0&&next.x<width&&next.y>=0&&next.y<height&&!isWall(next)
    }
    const forward=async()=>{
      steps+=1
      if(steps>100||!canMove()){crashed=true;return}
      const v=VECTORS[facing];pos={x:pos.x+v.x,y:pos.y+v.y}
      setRobot({...pos});setDirection(facing);await wait(260)
      if(pos.x===goal.x&&pos.y===goal.y) reached=true
    }
    for(const block of program) {
      if(reached||crashed) break
      if(block.type==='LEFT'){facing=((facing+3)%4) as Direction;setDirection(facing);await wait(120)}
      else if(block.type==='RIGHT'){facing=((facing+1)%4) as Direction;setDirection(facing);await wait(120)}
      else if(block.type==='FORWARD') await forward()
      else if(block.type==='REPEAT') {
        for(let i=0;i<Math.max(2,Math.min(5,Number(block.count??2)));i++){if(reached||crashed)break;await forward()}
      } else if(block.type==='IF_CLEAR'&&canMove()) await forward()
      await wait(60)
    }
    setRunning(false)
    if(reached) {
      setComplete(true)
      if(!completedRef.current.has(missionId)) {
        completedRef.current.add(missionId)
        const next=[...completedRef.current];setCompletedIds(next)
        persistProgress(next, 'in_progress')
        setFeedback('🎉 Hebat! Robot mencapai bintang. Level selesai!')
        if(next.length===5 && hasFiveLevels) await finishMaze(next.length)
      }
    } else if(crashed) setFeedback('💥 Robot menabrak dinding atau keluar jalur. Tekan Ulangi dan perbaiki program.')
    else setFeedback('Robot belum mencapai bintang. Periksa kembali urutan perintahmu!')
  }

  useEffect(() => {
    if (attemptId && hasFiveLevels && completedRef.current.size === 5 && !finishSummary && !finishing && autoFinishAttemptRef.current !== attemptId) {
      autoFinishAttemptRef.current = attemptId
      void finishMaze(completedRef.current.size)
    }
  }, [attemptId, hasFiveLevels, finishSummary, finishing])

  const retryFinish = async () => {
    if(hasFiveLevels && completedRef.current.size===5&&!finishSummary&&!finishing) await finishMaze(completedRef.current.size)
  }
  const exitGame = async () => {
    if(running||finishing) return
    if(finishSummary||!attemptId){router.push('/practice');return}
    if(!window.confirm('Keluar dari latihan Maze V2? Progres sesi ini akan ditandai sebagai ditinggalkan.')) return
    try {
      const supabase=createClient()
      const {error}=await supabase.rpc('abandon_practice_attempt',{p_attempt_id:attemptId})
      if(error) throw error
      if (storageKeyRef.current) {
        try { window.localStorage.removeItem(storageKeyRef.current) } catch {}
      }
      router.push('/practice')
    } catch(error) { console.error(error);alert('Sesi belum berhasil ditutup. Periksa koneksi lalu coba lagi.') }
  }
  const chooseLevel = (index:number) => { if(!running&&!finishing&&missions[index]) setMissionIndex(index) }

  if(attemptLoading) return <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">Menyiapkan Coding Maze V2...</div>
  if(attemptError) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
        <p>{attemptError}</p>
        <button type="button" onClick={()=>{attemptPromise.current=null;setAttemptLoading(true);setAttemptError('');setRetryKey(v=>v+1)}} className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-bold">Coba Lagi</button>
        <button type="button" onClick={()=>router.push('/practice')} className="ml-2 mt-4 rounded-xl bg-slate-700 px-5 py-3 font-bold">Kembali</button>
      </div>
    </div>
  )
  if(!mission) return <div className="p-8 text-white">Level Maze V2 belum tersedia.</div>

  const blockName = (block:Block) =>
    block.type === 'REPEAT'
      ? `Ulangi ${block.count ?? 2} kali`
      : BLOCKS.find(item => item.type === block.type)?.label ?? block.type

  const progressPercent = missions.length
    ? Math.round((completedIds.length / missions.length) * 100)
    : 0

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_top,#1e3a8a_0%,#0f172a_48%,#020617_100%)] font-sans text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/80 px-3 py-3 shadow-xl backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="min-w-0">
            <button type="button" onClick={exitGame} disabled={running || finishing} className="inline-flex items-center gap-1 text-xs font-bold text-slate-300 transition hover:text-white disabled:opacity-40">
              <span aria-hidden="true">←</span> Keluar
            </button>
            <h1 className="mt-1 truncate text-base font-black tracking-tight sm:text-xl">🧩 {exam?.title || 'Coding Maze V2'}</h1>
            <p className="text-[11px] text-sky-200/75">Petualangan logika · Level {level} dari 5</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/20 to-orange-500/10 px-3 py-2 text-right shadow-lg">
            <p className="text-[9px] font-bold uppercase tracking-wider text-amber-100/75">Progres</p>
            <p className="text-sm font-black text-amber-200">{completedIds.length}/5 level</p>
            {finishSummary && <p className="text-[10px] font-bold text-emerald-200">+{finishSummary.total_xp ?? 0} XP</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 p-3 pb-8 sm:p-5">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl backdrop-blur sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black sm:text-base">Peta Petualangan</h2>
              <p className="text-[11px] text-slate-400">Selesaikan lima tantangan untuk menuntaskan misi</p>
            </div>
            <span className="rounded-full bg-sky-400/10 px-3 py-1 text-[10px] font-black text-sky-200">{progressPercent}%</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map(number => {
              const matches = missions.map((item, i) => ({ item, index: i })).filter(entry => getMazeV2LevelNumber(entry.item, entry.index) === number)
              const index = matches.length === 1 ? matches[0].index : -1
              const available = index >= 0
              const id = available ? String(missions[index].id ?? `maze-v2-${index}`) : ''
              const done = available && completedIds.includes(id)
              const active = available && missionIndex === index
              return (
                <button
                  key={number}
                  type="button"
                  disabled={!available || running || finishing}
                  onClick={() => chooseLevel(index)}
                  className={`group relative min-w-0 rounded-2xl border px-1 py-3 text-center transition duration-200 disabled:cursor-not-allowed disabled:opacity-35 ${active ? 'border-cyan-200 bg-gradient-to-br from-cyan-300 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/20' : done ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200' : 'border-white/10 bg-slate-800/80 text-slate-200 hover:border-sky-300/50 hover:bg-slate-700'}`}
                >
                  <span className="mx-auto flex h-7 w-7 items-center justify-center rounded-xl bg-black/10 text-xs font-black">{done ? '✓' : number}</span>
                  <span className="mt-1 block text-[9px] font-extrabold sm:text-[10px]">{done ? 'Selesai' : available ? 'Mainkan' : 'Kosong'}</span>
                </button>
              )
            })}
          </div>
          {!hasFiveLevels && (
            <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] text-amber-100">
              Susunan level belum valid. Pastikan tersedia tepat satu misi untuk setiap Level 1–5 (saat ini: {missions.length} misi). Hadiah akhir baru dihitung setelah kelima level lengkap.
            </p>
          )}
        </section>

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <section className="min-w-0 rounded-3xl border border-white/10 bg-slate-900/75 p-3 shadow-2xl backdrop-blur sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-black">🗺️ Arena Labirin</h2>
                <p className="text-[11px] text-slate-400">{width} × {height} petak · Menghadap {['Utara', 'Timur', 'Selatan', 'Barat'][direction]}</p>
              </div>
              <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-200">LEVEL {level}</span>
            </div>
            <MazeV2IsometricBoard
              width={width}
              height={height}
              start={start}
              target={goal}
              obstacles={walls}
              robot={robot}
              direction={direction}
              running={running}
              level={level}
              title={`Dunia Petualangan · Level ${level}`}
            />
            <div className="mt-4 rounded-2xl border border-sky-300/15 bg-gradient-to-r from-sky-400/10 to-indigo-400/10 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-sky-200">🎯 Misi kamu</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-100">{(mission.question_text || 'Bantu robot mencapai bintang.').replace(/^Level\s+\d+\s*[·:.-]\s*/i, '')}</p>
            </div>
            {!validBoard && (
              <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-200">
                Konfigurasi level tidak valid. Minta guru memeriksa titik mulai, tujuan, dan rintangan.
              </p>
            )}
          </section>

          <section className="min-w-0 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-black">🧱 Gudang Perintah</h2>
                  <p className="text-[11px] text-slate-400">Ketuk balok untuk memasukkannya ke program</p>
                </div>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-black text-slate-300">{program.length}/30</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {BLOCKS.map(block => (
                  <button
                    key={block.type}
                    type="button"
                    disabled={running || complete || finishing || program.length >= 30}
                    onClick={() => addBlock(block.type)}
                    className={`group relative overflow-hidden rounded-2xl border border-white/10 px-3 py-3 text-left text-xs font-black shadow-lg transition duration-200 hover:-translate-y-0.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35 ${block.className} ${block.type === 'IF_CLEAR' ? 'col-span-2' : ''}`}
                  >
                    <span className="absolute -right-2 -top-3 text-4xl opacity-15 transition group-hover:scale-110">{block.icon}</span>
                    <span className="relative flex items-center gap-2"><span className="text-xl">{block.icon}</span><span>{block.label}</span></span>
                    <span className="relative mt-1 block text-[9px] font-semibold text-white/70">+ Tambahkan blok</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-black">🧩 Program Robot</h2>
                  <p className="text-[11px] text-slate-400">Atur urutan langkah sebelum dijalankan</p>
                </div>
                <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[10px] font-black text-violet-200">{program.length} blok</span>
              </div>
              <div className="max-h-[390px] min-h-32 space-y-2 overflow-y-auto rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/80 p-2">
                {!program.length ? (
                  <div className="flex min-h-28 flex-col items-center justify-center text-center">
                    <span className="text-3xl">🧩</span>
                    <p className="mt-2 text-xs font-bold text-slate-300">Program masih kosong</p>
                    <p className="mt-1 text-[10px] text-slate-500">Pilih balok dari Gudang Perintah</p>
                  </div>
                ) : program.map((block, index) => (
                  <div
                    key={block.id}
                    draggable={!running && !complete && !finishing}
                    onDragStart={() => setDraggedBlockId(block.id)}
                    onDragEnd={() => setDraggedBlockId(null)}
                    onDragOver={event => event.preventDefault()}
                    onDrop={event => {
                      event.preventDefault()
                      if (draggedBlockId) reorderBlock(draggedBlockId, block.id)
                    }}
                    className={`flex items-center gap-2 rounded-2xl border border-white/10 p-2.5 shadow-lg transition ${block.type === 'FORWARD' ? 'bg-gradient-to-r from-sky-600 to-blue-700' : block.type === 'LEFT' || block.type === 'RIGHT' ? 'bg-gradient-to-r from-violet-600 to-indigo-700' : block.type === 'REPEAT' ? 'bg-gradient-to-r from-amber-500 to-orange-600' : 'bg-gradient-to-r from-emerald-600 to-teal-700'} ${draggedBlockId === block.id ? 'opacity-40' : ''}`}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-black/15 text-[10px] font-black">{index + 1}</span>
                    <span className="min-w-0 flex-1 text-xs font-black">{BLOCKS.find(item => item.type === block.type)?.icon} {blockName(block)}</span>
                    {block.type === 'REPEAT' && (
                      <select
                        aria-label="Jumlah pengulangan"
                        value={block.count ?? 2}
                        disabled={running || complete || finishing}
                        onChange={event => setRepeat(block.id, Number(event.target.value))}
                        className="rounded-lg border border-white/25 bg-slate-950/25 px-1.5 py-2 text-xs font-bold text-white"
                      >
                        {[2, 3, 4, 5].map(number => <option key={number} value={number} className="text-slate-900">{number}×</option>)}
                      </select>
                    )}
                    <button type="button" disabled={running || complete || finishing || index === 0} onClick={() => moveBlock(index, -1)} aria-label="Pindah ke atas" className="rounded-lg bg-black/15 px-2 py-2 text-xs font-black disabled:opacity-25">↑</button>
                    <button type="button" disabled={running || complete || finishing || index === program.length - 1} onClick={() => moveBlock(index, 1)} aria-label="Pindah ke bawah" className="rounded-lg bg-black/15 px-2 py-2 text-xs font-black disabled:opacity-25">↓</button>
                    <button type="button" disabled={running || complete || finishing} onClick={() => removeBlock(block.id)} aria-label="Hapus blok" className="rounded-lg bg-rose-950/35 px-2 py-2 text-xs font-black disabled:opacity-25">✕</button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Di komputer, balok dapat diseret untuk mengubah urutan. Tombol panah tetap tersedia di semua perangkat.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={running || complete || finishing || !program.length} onClick={() => setProgram([])} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-3 text-xs font-bold transition hover:bg-slate-700 disabled:opacity-35">Hapus Semua</button>
                <button type="button" disabled={running || complete || finishing} onClick={resetLevel} className="rounded-xl border border-white/10 bg-slate-800 px-3 py-3 text-xs font-bold transition hover:bg-slate-700 disabled:opacity-35">↺ Reset Robot</button>
              </div>
              <button type="button" disabled={running || complete || finishing || !attemptId || !program.length || !validBoard} onClick={runProgram} className="mt-3 w-full rounded-2xl bg-gradient-to-r from-lime-300 via-emerald-400 to-teal-400 px-4 py-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-35">
                {running ? '🤖 Robot sedang berpetualang…' : '▶ JALANKAN PROGRAM'}
              </button>
            </div>

            <div aria-live="polite" className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm font-semibold leading-relaxed text-cyan-50">{feedback}</div>
            {complete && completedIds.length < 5 && (
              <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">
                ✓ Level {level} selesai! Pilih tantangan berikutnya di peta petualangan.
              </div>
            )}
            {completedIds.length === 5 && !finishSummary && !finishing && (
              <button type="button" onClick={retryFinish} className="w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-400 px-4 py-3 font-black text-amber-950 shadow-lg">
                Coba Simpan Hasil Lagi
              </button>
            )}
            {finishing && <p className="text-center text-xs font-bold text-amber-200">Menyimpan hasil latihan…</p>}
            {finishSummary && (
              <div className="rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-5 shadow-xl">
                <h2 className="text-lg font-black text-emerald-100">🏆 Semua Level Selesai!</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-black/15 p-3"><p className="text-[10px] text-emerald-100/70">Nilai</p><p className="text-xl font-black">{finishSummary.score ?? 0}</p></div>
                  <div className="rounded-xl bg-black/15 p-3"><p className="text-[10px] text-emerald-100/70">Total XP</p><p className="text-xl font-black">+{finishSummary.total_xp ?? 0}</p></div>
                </div>
                <button type="button" onClick={() => router.push('/practice')} className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-black text-emerald-950 transition hover:bg-emerald-400">Kembali ke Latihan</button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
