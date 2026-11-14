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
const ARROWS = ['⬆️','➡️','⬇️','⬅️']
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
  const attemptPromise = useRef<Promise<string>|null>(null)
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

            const {data,error} = await supabase.rpc('start_practice_attempt',{p_exam_id:exam.id})
            if (error) throw error
            const id = typeof data==='string' ? data : data?.attempt_id ?? data?.id
            if (!id) throw new Error('ID sesi latihan tidak ditemukan.')
            return String(id)
          })()
        }
        const id = await attemptPromise.current
        if (active) { setAttemptId(id); setAttemptError(''); setAttemptLoading(false) }
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

  const finishMaze = async (count:number) => {
    if (!attemptId || finishLock.current || count!==missions.length) return
    finishLock.current=true
    setFinishing(true)
    try {
      const supabase=createClient()
      const {data,error}=await supabase.rpc('finish_practice_attempt',{
        p_attempt_id:attemptId,p_answered_count:count,p_correct_count:count,p_streak_xp:0,
      })
      if(error) throw error
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
        setFeedback('🎉 Hebat! Robot mencapai bintang. Level selesai!')
        if(next.length===missions.length) await finishMaze(next.length)
      }
    } else if(crashed) setFeedback('💥 Robot menabrak dinding atau keluar jalur. Tekan Ulangi dan perbaiki program.')
    else setFeedback('Robot belum mencapai bintang. Periksa kembali urutan perintahmu!')
  }

  const retryFinish = async () => {
    if(completedRef.current.size===missions.length&&!finishSummary&&!finishing) await finishMaze(completedRef.current.size)
  }
  const exitGame = async () => {
    if(running||finishing) return
    if(finishSummary||!attemptId){router.push('/practice');return}
    if(!window.confirm('Keluar dari latihan Maze V2? Progres sesi ini akan ditandai sebagai ditinggalkan.')) return
    try {
      const supabase=createClient()
      const {error}=await supabase.rpc('abandon_practice_attempt',{p_attempt_id:attemptId})
      if(error) throw error
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

  const blockName=(b:Block)=>b.type==='REPEAT'?`Ulangi ${b.count??2} kali`:BLOCKS.find(x=>x.type===b.type)?.label??b.type
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#172554_0%,#020617_58%)] font-sans text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/90 px-3 py-3 shadow-lg backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <button type="button" onClick={exitGame} disabled={running||finishing} className="text-xs font-bold text-slate-400 hover:text-white">← Keluar</button>
            <h1 className="mt-1 truncate text-lg font-black sm:text-xl">🧩 {exam?.title||'Coding Maze V2'}</h1>
            <p className="text-[11px] text-slate-400">Level {level} dari 5 · {completedIds.length} level selesai</p>
          </div>
          <div className="shrink-0 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-black text-amber-200">{finishSummary ? `⭐ +${finishSummary.total_xp ?? 0} XP` : `✓ ${completedIds.length}/${missions.length} level`}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-4 p-3 sm:p-5">
        <section className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="font-extrabold">Pilih Level</h2><p className="text-xs text-slate-400">Kamu boleh memilih Level 1 sampai 5.</p></div>
            <span className="text-xs text-slate-400">{completedIds.length} dari {missions.length} selesai</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1,2,3,4,5].map(n=>{
              const index=missions.findIndex((m,i)=>getMazeV2LevelNumber(m,i)===n)
              const available=index>=0
              const done=available&&completedIds.includes(String(missions[index].id??`maze-v2-${index}`))
              return <button key={n} type="button" disabled={!available||running||finishing} onClick={()=>chooseLevel(index)}
                className={`rounded-xl border px-1 py-3 text-center text-xs font-black transition disabled:opacity-30 ${missionIndex===index?'border-cyan-300 bg-cyan-400 text-slate-950':done?'border-emerald-400/60 bg-emerald-500/15 text-emerald-200':'border-slate-700 bg-slate-800 text-slate-200'}`}>
                <span className="block">Level {n}</span><span className="mt-1 block text-[10px]">{done?'✓ Selesai':available?'Mainkan':'Belum ada'}</span>
              </button>
            })}
          </div>
        </section>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="rounded-2xl border border-white/10 bg-slate-900/85 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-extrabold">🗺️ Papan Labirin</h2><p className="text-xs text-slate-400">{width} × {height} · Arah: {['Utara','Timur','Selatan','Barat'][direction]}</p></div>
              <span className="rounded-lg bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-200">Level {level}</span>
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
              title={`Dunia Labirin · Level ${level}`}
            />
            <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3"><h3 className="text-sm font-bold text-cyan-200">🎯 Misi Level {level}</h3><p className="mt-1 text-sm leading-relaxed text-slate-200">{mission.question_text||'Bantu robot mencapai bintang.'}</p></div>
            {!validBoard&&<p className="mt-3 rounded-lg bg-rose-500/15 p-2 text-xs text-rose-200">Konfigurasi level tidak valid. Hubungi guru.</p>}
          </section>
          <section className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-3 sm:p-4">
              <h2 className="mb-3 font-extrabold">🧱 Pilih Blok Perintah</h2>
              <div className="grid grid-cols-2 gap-2">
                {BLOCKS.map(b=><button key={b.type} type="button" disabled={running||complete||finishing||program.length>=30} onClick={()=>addBlock(b.type)} className={`rounded-xl px-3 py-3 text-left text-xs font-extrabold shadow disabled:opacity-40 ${b.className} ${b.type==='IF_CLEAR'?'col-span-2':''}`}><span className="mr-2 text-lg">{b.icon}</span>{b.label}</button>)}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Ketuk blok untuk menambahkannya. Maksimal 30 blok.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/85 p-3 sm:p-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="font-extrabold">🧩 Program Kamu</h2><span className="text-xs text-slate-400">{program.length}/30 blok</span></div>
              <div className="max-h-[360px] min-h-24 space-y-2 overflow-y-auto rounded-xl border-2 border-dashed border-slate-700 bg-slate-950 p-2">
                {!program.length?<p className="py-8 text-center text-xs text-slate-500">Blok yang dipilih akan tersusun di sini.</p>:program.map((b,i)=><div key={b.id} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 p-2">
                  <span className="w-4 shrink-0 text-center text-xs text-slate-400">{i+1}</span><span className="min-w-0 flex-1 text-xs font-bold">{BLOCKS.find(x=>x.type===b.type)?.icon} {blockName(b)}</span>
                  {b.type==='REPEAT'&&<select aria-label="Jumlah pengulangan" value={b.count??2} disabled={running||complete||finishing} onChange={e=>setRepeat(b.id,Number(e.target.value))} className="rounded-lg border border-slate-600 bg-slate-950 px-1 py-2 text-xs">{[2,3,4,5].map(n=><option key={n} value={n}>{n}x</option>)}</select>}
                  <button type="button" disabled={running||complete||finishing||i===0} onClick={()=>moveBlock(i,-1)} aria-label="Pindah ke atas" className="rounded-md bg-slate-700 px-2 py-2 text-xs disabled:opacity-30">↑</button>
                  <button type="button" disabled={running||complete||finishing||i===program.length-1} onClick={()=>moveBlock(i,1)} aria-label="Pindah ke bawah" className="rounded-md bg-slate-700 px-2 py-2 text-xs disabled:opacity-30">↓</button>
                  <button type="button" disabled={running||complete||finishing} onClick={()=>removeBlock(b.id)} aria-label="Hapus blok" className="rounded-md bg-rose-700 px-2 py-2 text-xs disabled:opacity-30">✕</button>
                </div>)}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" disabled={running||complete||finishing||!program.length} onClick={()=>setProgram([])} className="rounded-xl bg-slate-700 px-3 py-3 text-xs font-bold disabled:opacity-40">Hapus Semua</button>
                <button type="button" disabled={running||complete||finishing} onClick={resetLevel} className="rounded-xl bg-slate-700 px-3 py-3 text-xs font-bold disabled:opacity-40">↺ Ulangi</button>
              </div>
              <button type="button" disabled={running||complete||finishing||!attemptId||!program.length||!validBoard} onClick={runProgram} className="mt-2 w-full rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-slate-950 disabled:opacity-40">{running?'🤖 Robot Berjalan...':'▶ Jalankan Program'}</button>
            </div>
            <div aria-live="polite" className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">{feedback}</div>
            {complete&&completedIds.length<missions.length&&<p className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm font-bold text-emerald-200">✓ Level {level} selesai! Pilih level berikutnya di bagian atas.</p>}
            {completedIds.length===missions.length&&!finishSummary&&!finishing&&<button type="button" onClick={retryFinish} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950">Coba Simpan Hasil Lagi</button>}
            {finishing&&<p className="text-center text-xs text-amber-200">Menyimpan hasil latihan...</p>}
            {finishSummary&&<div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><h2 className="text-lg font-black text-emerald-200">🏆 Semua Level Selesai!</h2><p className="mt-2 text-sm">Nilai: {finishSummary.score??0}</p><p className="text-sm">Total XP: +{finishSummary.total_xp??0}</p><button type="button" onClick={()=>router.push('/practice')} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold">Kembali ke Latihan</button></div>}
          </section>
        </div>
      </main>
    </div>
  )
}
