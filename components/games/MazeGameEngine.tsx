
'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
type Command = 'FORWARD' | 'LEFT' | 'RIGHT'

const DIRECTIONS = [
  { x: 0, y: -1, label: 'Utara' },
  { x: 1, y: 0, label: 'Timur' },
  { x: 0, y: 1, label: 'Selatan' },
  { x: -1, y: 0, label: 'Barat' },
]

const COMMANDS: {
  id: Command
  label: string
  icon: string
}[] = [
  { id: 'FORWARD', label: 'Maju', icon: '⬆️' },
  { id: 'LEFT', label: 'Belok Kiri', icon: '↶' },
  { id: 'RIGHT', label: 'Belok Kanan', icon: '↷' },
]

export default function MazeGameEngine({
  exam,
  questions = [],
}: MazeGameProps) {
  const router = useRouter()

  const missions = useMemo(() => questions, [questions])

  const [missionIndex, setMissionIndex] = useState(0)
  const currentMission = missions[missionIndex]

  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptLoading, setAttemptLoading] = useState(true)
  const [attemptError, setAttemptError] = useState('')

  const [completedCount, setCompletedCount] = useState(0)
  const completedMissionIdsRef = useRef<Set<string>>(new Set())
  const finishingRef = useRef(false)

  const [finishSummary, setFinishSummary] = useState<any>(null)
  const [isFinishing, setIsFinishing] = useState(false)

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

  const [commands, setCommands] = useState<Command[]>([])
  const [robot, setRobot] = useState<Position>(start)
  const [direction, setDirection] = useState<Direction>(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState(
    'Susun blok perintah, lalu jalankan program!'
  )

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

      const supabase = createClient()

      const { data, error } = await supabase.rpc(
        'start_practice_attempt',
        { p_exam_id: exam.id }
      )

      if (error || !data?.attempt_id) {
        console.error('Gagal memulai Maze attempt:', error)
        if (active) {
          setAttemptError('Gagal memulai sesi Maze. Silakan coba lagi.')
          setAttemptLoading(false)
        }
        return
      }

      if (active) {
        setAttemptId(data.attempt_id)
        setAttemptLoading(false)
      }
    }

    startAttempt()

    return () => {
      active = false
    }
  }, [exam.id, questions.length])

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

  const difficultyLabel = (() => {
    const value = String(
      currentMission?.difficulty ?? 'medium'
    ).toLowerCase()

    if (value === 'easy' || value === 'mudah') return 'Mudah'
    if (value === 'hard' || value === 'sulit') return 'Sulit'
    return 'Sedang'
  })()

  const addCommand = (command: Command) => {
    if (isRunning || isComplete) return

    setCommands((previous) => [...previous, command])
    setFeedback('Perintah ditambahkan.')
  }

  const resetRobot = () => {
    setRobot({ ...start })
    setDirection(1)
    setIsRunning(false)
    setIsComplete(false)
    setFeedback('Robot kembali ke titik awal. Coba lagi!')
  }

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

    if (error) {
      console.error('Gagal menyimpan hasil Maze:', error)
      finishingRef.current = false
      setIsFinishing(false)
      setFeedback(
        'Semua misi selesai, tetapi hasil belum tersimpan. Coba lagi.'
      )
      return
    }

    setFinishSummary(data)
    setIsFinishing(false)
  }

  const runProgram = async () => {
    if (isRunning || isComplete || !attemptId) return

    if (commands.length === 0) {
      setFeedback('Tambahkan setidaknya satu blok perintah.')
      return
    }

    if (
      start.x < 0 ||
      start.x >= width ||
      start.y < 0 ||
      start.y >= height ||
      target.x < 0 ||
      target.x >= width ||
      target.y < 0 ||
      target.y >= height ||
      isWall(start) ||
      isWall(target)
    ) {
      setFeedback(
        'Konfigurasi misi tidak valid. Periksa posisi awal, target, dan rintangan.'
      )
      return
    }

    setIsRunning(true)

    let nextRobot: Position = { ...start }
    let nextDirection: Direction = 1
    let reachedGoal =
      nextRobot.x === target.x && nextRobot.y === target.y
    let crashed = false

    for (const command of commands) {
      if (reachedGoal) break

      if (command === 'LEFT') {
        nextDirection = ((nextDirection + 3) % 4) as Direction
      } else if (command === 'RIGHT') {
        nextDirection = ((nextDirection + 1) % 4) as Direction
      } else {
        const movement = DIRECTIONS[nextDirection]

        const nextPosition = {
          x: nextRobot.x + movement.x,
          y: nextRobot.y + movement.y,
        }

        if (
          nextPosition.x < 0 ||
          nextPosition.x >= width ||
          nextPosition.y < 0 ||
          nextPosition.y >= height ||
          isWall(nextPosition)
        ) {
          crashed = true
          break
        }

        nextRobot = nextPosition
      }

      setRobot({ ...nextRobot })
      setDirection(nextDirection)

      if (
        nextRobot.x === target.x &&
        nextRobot.y === target.y
      ) {
        reachedGoal = true
      }
    }

    setIsRunning(false)

    if (reachedGoal) {
      setIsComplete(true)

      const missionId = String(
        currentMission?.id ?? `mission-${missionIndex}`
      )

      if (!completedMissionIdsRef.current.has(missionId)) {
        completedMissionIdsRef.current.add(missionId)

        const newCount = completedMissionIdsRef.current.size
        setCompletedCount(newCount)

        setFeedback('🎉 Hebat! Robot berhasil mencapai bintang!')

        if (newCount === missions.length) {
          await finishMaze(newCount)
        }
      }
    } else if (crashed) {
      setFeedback(
        '💥 Robot menabrak penghalang atau keluar papan. Coba lagi!'
      )
    } else {
      setFeedback('Robot belum mencapai bintang. Perbaiki algoritmamu!')
    }
  }

  const nextMission = () => {
    if (
      missionIndex >= missions.length - 1 ||
      !isComplete
    ) {
      return
    }

    setMissionIndex((previous) => previous + 1)
  }

  if (attemptLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Memulai sesi Maze...
      </div>
    )
  }

  if (attemptError) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p>{attemptError}</p>
          <button
            onClick={() => router.push('/practice')}
            className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-bold"
          >
            Kembali
          </button>
        </div>
      </div>
    )
  }

  if (!currentMission) return null

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <Link
              href="/practice"
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              ← Keluar
            </Link>

            <h1 className="mt-2 text-lg font-extrabold">
              🤖 {exam?.title || 'Misi Labirin Robot'}
            </h1>

            <p className="text-xs text-slate-400">
              Misi {missionIndex + 1} dari {missions.length}
              {' · '}
              Berhasil {completedCount}
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-bold text-amber-300">
            ⭐ {completedCount * 10} XP
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 p-4 md:grid-cols-2 md:p-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 font-extrabold">🗺️ Papan Labirin</h2>

          <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>Arah: {DIRECTIONS[direction].label}</span>
            <span>·</span>
            <span>Kesulitan: {difficultyLabel}</span>
            <span>·</span>
            <span>{width} × {height}</span>
          </div>

          <div
            className="grid aspect-square gap-1"
            style={{
              gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            }}
            role="img"
            aria-label={`Papan labirin ${width} kali ${height}`}
          >
            {Array.from({ length: width * height }, (_, index) => {
              const x = index % width
              const y = Math.floor(index / width)
              const position = { x, y }

              const wall = isWall(position)
              const isRobot = robot.x === x && robot.y === y
              const isTarget = target.x === x && target.y === y
              const isStart = start.x === x && start.y === y

              return (
                <div
                  key={`${x}-${y}`}
                  className={`flex aspect-square items-center justify-center rounded-md border text-base sm:text-2xl ${
                    wall
                      ? 'border-slate-700 bg-slate-700'
                      : 'border-slate-700 bg-slate-800'
                  }`}
                >
                  {isRobot
                    ? ['⬆️', '➡️', '⬇️', '⬅️'][direction]
                    : isTarget
                      ? '⭐'
                      : wall
                        ? '🧱'
                        : isStart
                          ? '🏁'
                          : ''}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>🤖 Robot</span>
            <span>🏁 Awal</span>
            <span>⭐ Tujuan</span>
            <span>🧱 Penghalang</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-extrabold">🎯 Misi</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {currentMission.question_text ||
                'Arahkan robot menuju bintang.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 font-extrabold">🧩 Blok Perintah</h2>

            <div className="grid grid-cols-3 gap-2">
              {COMMANDS.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  disabled={isRunning || isComplete}
                  onClick={() => addCommand(command.id)}
                  className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-2 py-3 text-xs font-bold text-indigo-200 disabled:opacity-40"
                >
                  <span className="mb-1 block text-xl">
                    {command.icon}
                  </span>
                  {command.label}
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-slate-400">
              ALGORITMA KAMU
            </h3>

            <div className="min-h-24 space-y-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3">
              {commands.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Blok perintah akan muncul di sini.
                </p>
              ) : (
                commands.map((command, index) => {
                  const item = COMMANDS.find(
                    (entry) => entry.id === command
                  )

                  return (
                    <div
                      key={`${command}-${index}`}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold"
                    >
                      {index + 1}. {item?.icon} {item?.label}
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  isRunning ||
                  isComplete ||
                  commands.length === 0
                }
                onClick={() => {
                  setCommands((previous) => previous.slice(0, -1))
                  setFeedback('Blok terakhir dihapus.')
                }}
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold disabled:opacity-40"
              >
                ⌫ Hapus Blok
              </button>

              <button
                type="button"
                disabled={isRunning || isComplete}
                onClick={() => {
                  setCommands([])
                  resetRobot()
                }}
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold disabled:opacity-40"
              >
                ↺ Ulangi
              </button>
            </div>

            <button
              type="button"
              disabled={isRunning || isComplete}
              onClick={runProgram}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 font-extrabold disabled:opacity-40"
            >
              ▶ Jalankan Program
            </button>
          </div>

          <div
            aria-live="polite"
            className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm text-indigo-100"
          >
            {feedback}
          </div>

          {isComplete && missionIndex < missions.length - 1 && (
            <button
              type="button"
              onClick={nextMission}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950"
            >
              Misi Berikutnya →
            </button>
          )}

          {isComplete &&
            missionIndex === missions.length - 1 &&
            finishSummary && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <h2 className="text-lg font-extrabold text-emerald-300">
                  🏆 Semua Misi Selesai!
                </h2>
                <p className="mt-2 text-sm">
                  Nilai: {finishSummary.score ?? 0}
                </p>
                <p className="text-sm">
                  Total XP: +{finishSummary.total_xp ?? 0}
                </p>
                <button
                  onClick={() => router.push('/practice')}
                  className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold"
                >
                  Kembali ke Latihan
                </button>
              </div>
            )}

          {isFinishing && (
            <p className="text-center text-xs text-amber-300">
              Menyimpan hasil latihan...
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
