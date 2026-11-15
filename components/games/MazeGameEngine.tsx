
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MazeV1IsometricBoard from '@/components/games/MazeV1IsometricBoard'
import MazeBlocklyProgram, { type MazeBlock } from '@/components/games/MazeBlocklyProgram'

interface Position {
  x: number
  y: number
}

interface MazeQuestion {
  id?: string
  question_text?: string
  explanation?: string
  pembahasan?: string
  target_x?: number
  target_y?: number
  start_x?: number
  start_y?: number
  maze_width?: number
  maze_height?: number
  obstacles?: Position[] | null
  difficulty?: string
  [key: string]: any
}

interface MazeGameProps {
  exam: any
  questions: MazeQuestion[]
}

type Direction = 0 | 1 | 2 | 3

const DIRECTIONS = [
  { x: 0, y: -1, label: 'Utara' },
  { x: 1, y: 0, label: 'Timur' },
  { x: 0, y: 1, label: 'Selatan' },
  { x: -1, y: 0, label: 'Barat' },
]

export default function MazeGameEngine({
  exam,
  questions = [],
}: MazeGameProps) {
  const router = useRouter()

  const missions = useMemo(() => questions, [questions])

  const [missionIndex, setMissionIndex] = useState(0)
  const currentMission = missions[missionIndex]

  // Attempt
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptLoading, setAttemptLoading] = useState(true)
  const [attemptError, setAttemptError] = useState('')
  const [attemptRetryKey, setAttemptRetryKey] = useState(0)

  // Satu Promise untuk mencegah pembuatan attempt ganda
  // ketika React Strict Mode menjalankan effect dua kali.
  const startAttemptPromiseRef = useRef<Promise<string> | null>(null)

  // Progress misi
  const [completedCount, setCompletedCount] = useState(0)
  const completedMissionIdsRef = useRef<Set<string>>(new Set())

  // Finalisasi
  const finishingRef = useRef(false)
  const [finishSummary, setFinishSummary] = useState<any>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  // Ukuran papan
  const width = Math.max(
    2,
    Math.min(12, Number(currentMission?.maze_width ?? 6))
  )

  const height = Math.max(
    2,
    Math.min(12, Number(currentMission?.maze_height ?? 6))
  )

  const start = {
    x: Number(currentMission?.start_x ?? 0),
    y: Number(currentMission?.start_y ?? 0),
  }

  const target = {
    x: Number(currentMission?.target_x ?? 3),
    y: Number(currentMission?.target_y ?? 3),
  }

  const obstacles = useMemo<Position[]>(() => {
    const value = currentMission?.obstacles

    if (!Array.isArray(value)) return []

    return value
      .filter(
        (item: any) =>
          Number.isInteger(Number(item?.x)) &&
          Number.isInteger(Number(item?.y))
      )
      .map((item: any) => ({
        x: Number(item.x),
        y: Number(item.y),
      }))
  }, [currentMission])

  const isWall = (position: Position) =>
    obstacles.some(
      (wall) => wall.x === position.x && wall.y === position.y
    )

  // Kondisi permainan
  const [commands, setCommands] = useState<MazeBlock[]>([])
  const [robot, setRobot] = useState<Position>(start)
  const [direction, setDirection] = useState<Direction>(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState(
    'Susun blok perintah, lalu jalankan program!'
  )

  // ==========================================
  // 1. MEMULAI ATTEMPT
  // ==========================================

  useEffect(() => {
    let active = true

    async function startAttempt() {
      if (questions.length === 0) {
        setAttemptError(
          'Modul Maze belum memiliki misi. Silakan hubungi guru atau admin.'
        )
        setAttemptLoading(false)
        return
      }

      if (!exam?.id) {
        setAttemptError('ID modul tidak ditemukan.')
        setAttemptLoading(false)
        return
      }

      try {
        if (!startAttemptPromiseRef.current) {
          startAttemptPromiseRef.current = (async () => {
            const supabase = createClient()

            const { data, error } = await supabase.rpc(
              'start_practice_attempt',
              {
                p_exam_id: exam.id,
              }
            )

            if (error) throw error

            // Mendukung respons UUID langsung maupun objek.
            const newAttemptId =
              typeof data === 'string'
                ? data
                : data?.attempt_id ?? data?.id

            if (!newAttemptId) {
              throw new Error('ID attempt tidak ditemukan dari RPC.')
            }

            return String(newAttemptId)
          })()
        }

        const newAttemptId = await startAttemptPromiseRef.current

        if (active) {
          setAttemptId(newAttemptId)
          setAttemptError('')
          setAttemptLoading(false)
        }
      } catch (error) {
        console.error('Gagal memulai Maze attempt:', error)

        // Izinkan percobaan ulang setelah kegagalan.
        startAttemptPromiseRef.current = null

        if (active) {
          setAttemptError('Gagal memulai sesi Maze. Silakan coba lagi.')
          setAttemptLoading(false)
        }
      }
    }

    startAttempt()

    return () => {
      active = false
    }
  }, [exam?.id, questions.length, attemptRetryKey])

  const retryStartAttempt = () => {
    startAttemptPromiseRef.current = null
    setAttemptId(null)
    setAttemptError('')
    setAttemptLoading(true)
    setAttemptRetryKey((previous) => previous + 1)
  }

  // ==========================================
  // 2. RESET SAAT PINDAH MISI
  // ==========================================

  useEffect(() => {
    setCommands([])

    setRobot({
      x: Number(currentMission?.start_x ?? 0),
      y: Number(currentMission?.start_y ?? 0),
    })

    setDirection(1)
    setIsRunning(false)
    setIsComplete(false)
    setFeedback('Misi siap! Susun algoritmamu.')
  }, [missionIndex, currentMission])

  // ==========================================
  // 3. INFORMASI KESULITAN
  // ==========================================

  const difficultyLabel = (() => {
    const value = String(
      currentMission?.difficulty ?? 'medium'
    ).toLowerCase()

    if (value === 'easy' || value === 'mudah') return 'Mudah'
    if (value === 'hard' || value === 'sulit') return 'Sulit'

    return 'Sedang'
  })()

  // ==========================================
  // 4. BLOK PERINTAH
  // ==========================================

  const resetRobot = () => {
  if (isRunning || isFinishing) return

  setCommands([])
  setRobot({ ...start })
  setDirection(1)
  setIsRunning(false)
  setIsComplete(false)
  setFeedback('Robot kembali ke titik awal. Susun ulang perintah dan coba lagi!')
}

  // ==========================================
  // 5. FINALISASI ATTEMPT
  // ==========================================

  const finishMaze = async (newCompletedCount: number) => {
    if (
      !attemptId ||
      finishingRef.current ||
      newCompletedCount !== missions.length
    ) {
      return
    }

    finishingRef.current = true
    setIsFinishing(true)

    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc(
        'finish_practice_attempt',
        {
          p_attempt_id: attemptId,
          p_answered_count: newCompletedCount,
          p_correct_count: newCompletedCount,
          p_streak_xp: 0,
        }
      )

      if (error) throw error

      setFinishSummary(data)
      setFeedback('🏆 Semua misi berhasil diselesaikan!')
    } catch (error) {
      console.error('Gagal menyimpan hasil Maze:', error)

      // Reset guard supaya finalisasi bisa dicoba lagi.
      finishingRef.current = false

      setFeedback(
        'Semua misi selesai, tetapi hasil belum tersimpan. Tekan tombol coba simpan lagi.'
      )
    } finally {
      setIsFinishing(false)
    }
  }

  // ==========================================
  // 6. MENJALANKAN PROGRAM ROBOT
  // ==========================================

  const runProgram = async () => {
    if (isRunning || isComplete || !attemptId || isFinishing) return
    if (commands.length === 0) { setFeedback('Tambahkan setidaknya satu balok perintah.'); return }
    if (start.x < 0 || start.x >= width || start.y < 0 || start.y >= height || target.x < 0 || target.x >= width || target.y < 0 || target.y >= height || isWall(start) || isWall(target)) {
      setFeedback('Konfigurasi misi tidak valid. Periksa posisi awal, target, dan rintangan.'); return
    }
    setIsRunning(true)
    let nextRobot: Position = { ...start }
    let nextDirection: Direction = 1
    let reachedGoal = nextRobot.x === target.x && nextRobot.y === target.y
    let crashed = false
    let steps = 0
    const MAX_STEPS = 120
    const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))
    const isPathOpen = () => {
      const vector = DIRECTIONS[nextDirection]
      const ahead = { x: nextRobot.x + vector.x, y: nextRobot.y + vector.y }
      return ahead.x >= 0 && ahead.x < width && ahead.y >= 0 && ahead.y < height && !isWall(ahead)
    }
    const execute = async (blocks: MazeBlock[]): Promise<void> => {
      for (const block of blocks) {
        if (reachedGoal || crashed || steps >= MAX_STEPS) return
        if (block.type === 'IF_PATH') { if (isPathOpen()) await execute(block.children ?? []); continue }
        if (block.type === 'REPEAT') {
          const repeatCount = Math.max(2, Math.min(10, Number(block.count ?? 3)))
          for (let i = 0; i < repeatCount; i += 1) { await execute(block.children ?? []); if (reachedGoal || crashed || steps >= MAX_STEPS) break }
          continue
        }
        steps += 1
        if (block.type === 'LEFT') nextDirection = ((nextDirection + 3) % 4) as Direction
        else if (block.type === 'RIGHT') nextDirection = ((nextDirection + 1) % 4) as Direction
        else {
          if (!isPathOpen()) { crashed = true; return }
          const vector = DIRECTIONS[nextDirection]
          nextRobot = { x: nextRobot.x + vector.x, y: nextRobot.y + vector.y }
        }
        setRobot({ ...nextRobot }); setDirection(nextDirection)
        await wait(260)
        if (nextRobot.x === target.x && nextRobot.y === target.y) reachedGoal = true
      }
    }
    await execute(commands)
    setIsRunning(false)
    if (reachedGoal) {
      setIsComplete(true)
      const missionId = String(currentMission?.id ?? ('mission-' + missionIndex))
      if (!completedMissionIdsRef.current.has(missionId)) {
        completedMissionIdsRef.current.add(missionId)
        const newCount = completedMissionIdsRef.current.size
        setCompletedCount(newCount); setFeedback('🎉 Hebat! Robot berhasil mencapai bintang!')
        if (newCount === missions.length) await finishMaze(newCount)
      }
    } else if (crashed) setFeedback('💥 Robot menabrak dinding atau keluar jalur. Periksa kondisi dan susunan balokmu!')
    else if (steps >= MAX_STEPS) setFeedback('Program dihentikan karena melewati batas 120 langkah. Coba perbaiki pengulangannya.')
    else setFeedback('Robot belum mencapai bintang. Perbaiki algoritmamu!')
  }
  // ==========================================
  // 7. COBA FINALISASI LAGI
  // ==========================================

  const retryFinishMaze = async () => {
    if (
      completedMissionIdsRef.current.size !== missions.length ||
      finishSummary ||
      isFinishing
    ) {
      return
    }

    await finishMaze(completedMissionIdsRef.current.size)
  }

  // ==========================================
  // 8. PINDAH MISI
  // ==========================================

  const nextMission = () => {
    if (
      missionIndex >= missions.length - 1 ||
      !isComplete ||
      isFinishing
    ) {
      return
    }

    setMissionIndex((previous) => previous + 1)
  }

  // ==========================================
  // 9. KELUAR DAN ABANDON ATTEMPT
  // ==========================================

  const handleExit = async () => {
    if (isRunning || isFinishing) return

    // Jika hasil sudah selesai disimpan, cukup kembali.
    if (finishSummary || !attemptId) {
      router.push('/practice')
      return
    }

    const confirmed = window.confirm(
      'Keluar dari latihan Maze? Progres sesi ini akan ditandai sebagai ditinggalkan.'
    )

    if (!confirmed) return

    try {
      const supabase = createClient()

      const { error } = await supabase.rpc(
        'abandon_practice_attempt',
        {
          p_attempt_id: attemptId,
        }
      )

      if (error) throw error

      router.push('/practice')
    } catch (error) {
      console.error('Gagal menandai attempt sebagai abandoned:', error)

      alert(
        'Sesi belum berhasil ditutup. Periksa koneksi lalu coba lagi.'
      )
    }
  }

  // ==========================================
  // 10. TAMPILAN LOADING
  // ==========================================

  if (attemptLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Memulai sesi Maze...
      </div>
    )
  }

  // ==========================================
  // 11. TAMPILAN ERROR
  // ==========================================

  if (attemptError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md text-center">
          <p>{attemptError}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retryStartAttempt}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-bold"
            >
              Coba Lagi
            </button>

            <button
              type="button"
              onClick={() => router.push('/practice')}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentMission) return null

  // ==========================================
  // 12. TAMPILAN UTAMA
  // ==========================================

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,rgba(56,189,248,.18),transparent_36%),linear-gradient(145deg,#0f172a,#172554_55%,#312e81)] font-sans text-white">
      <header className="border-b border-white/10 bg-slate-950/60 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div><button type="button" onClick={handleExit} disabled={isRunning || isFinishing} className="text-xs font-bold text-slate-300 hover:text-white disabled:opacity-40">← Keluar</button><h1 className="mt-2 text-lg font-black sm:text-xl">🤖 {exam?.title || 'Misi Labirin Robot'}</h1><p className="text-xs text-slate-300">Maze Blockly V1 · Misi {missionIndex + 1} dari {missions.length} · Berhasil {completedCount}</p></div>
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-sm font-black text-amber-200">⭐ {completedCount * 10} XP</div>
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-4 p-3 sm:gap-5 sm:p-5 lg:grid-cols-[1.08fr_.92fr]">
        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1"><div><h2 className="font-black text-white">🌈 Dunia Labirin</h2><p className="text-xs text-slate-300">Arah robot: {DIRECTIONS[direction].label} · Kesulitan: {difficultyLabel}</p></div><span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">{width} × {height}</span></div>
          <MazeV1IsometricBoard width={width} height={height} start={start} target={target} obstacles={obstacles} robot={robot} direction={direction} running={isRunning} level={missionIndex} />
          <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4"><h3 className="font-black text-cyan-200">🎯 Misi Kamu</h3><p className="mt-2 text-sm leading-relaxed text-slate-200">{currentMission.question_text || 'Susun balok perintah agar robot mencapai portal tujuan.'}</p></div>
        </section>
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-2"><div><h2 className="font-black">🧩 Gudang Balok Blockly</h2><p className="text-xs text-slate-400">Pilih balok, lalu susun menjadi algoritma</p></div><span className="rounded-full bg-cyan-400/10 px-3 py-1 text-[10px] font-black text-cyan-200">MAKS. 30</span></div>
            <MazeBlocklyProgram program={commands} setProgram={setCommands} disabled={isRunning || isComplete || isFinishing} maxBlocks={30} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" disabled={isRunning || isComplete || isFinishing || commands.length === 0} onClick={() => { setCommands(previous => previous.slice(0, -1)); setFeedback("Balok terakhir dihapus.") }} className="rounded-xl bg-slate-700 px-3 py-3 text-xs font-bold disabled:opacity-40">⌫ Hapus Balok Terakhir</button>
              <button type="button" disabled={isRunning || isFinishing} onClick={resetRobot} className="rounded-xl bg-slate-700 px-3 py-3 text-xs font-bold disabled:opacity-40">↺ Reset Robot</button>
            </div>
            <button type="button" disabled={isRunning || isComplete || isFinishing || !attemptId || commands.length === 0} onClick={runProgram} className="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-400 to-lime-400 px-4 py-4 text-sm font-black text-emerald-950 shadow-lg disabled:opacity-40">{isRunning ? "🤖 Robot Sedang Berjalan…" : "▶ JALANKAN PROGRAM"}</button>
          </div>
          <div aria-live="polite" className="rounded-2xl border border-indigo-300/20 bg-indigo-400/10 p-4 text-sm font-semibold text-indigo-100">{feedback}</div>
          {isComplete && missionIndex < missions.length - 1 && <button type="button" onClick={nextMission} disabled={isFinishing} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 disabled:opacity-40">Misi Berikutnya →</button>}
          {completedCount === missions.length && !finishSummary && !isFinishing && <button type="button" onClick={retryFinishMaze} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950">Coba Simpan Hasil Lagi</button>}
          {finishSummary && <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4"><h2 className="text-lg font-black text-emerald-200">🏆 Semua Misi Selesai!</h2><p className="mt-2 text-sm">Nilai: {finishSummary.score ?? 0}</p><p className="text-sm">Total XP: +{finishSummary.total_xp ?? 0}</p><button type="button" onClick={() => router.push('/practice')} className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold">Kembali ke Latihan</button></div>}
          {isFinishing && <p className="text-center text-xs text-amber-200">Menyimpan hasil latihan...</p>}
        </section>
      </main>
    </div>
  )
}
