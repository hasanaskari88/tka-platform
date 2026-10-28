
'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
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

const COMMANDS: { id: Command; label: string; icon: string }[] = [
  { id: 'FORWARD', label: 'Maju', icon: '⬆️' },
  { id: 'LEFT', label: 'Belok Kiri', icon: '↶' },
  { id: 'RIGHT', label: 'Belok Kanan', icon: '↷' },
]

const SAMPLE_MISSIONS: MazeQuestion[] = [
  {
    question_text: 'Bantu robot mencapai bintang!',
    start_x: 0,
    start_y: 0,
    target_x: 3,
    target_y: 3,
    maze_width: 6,
    maze_height: 6,
    obstacles: [],
    difficulty: 'medium',
    explanation: 'Susun perintah agar robot mencapai bintang.',
  },
]

export default function MazeGameEngine({
  exam,
  questions = [],
}: MazeGameProps) {
  const missions = useMemo(
    () => (questions.length > 0 ? questions : SAMPLE_MISSIONS),
    [questions]
  )

  const [missionIndex, setMissionIndex] = useState(0)
  const currentMission = missions[missionIndex]

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
  const [xpEarned, setXpEarned] = useState(0)
  const [feedback, setFeedback] = useState(
    'Susun blok perintah, lalu jalankan program!'
  )

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
    const value = String(currentMission?.difficulty ?? 'medium').toLowerCase()

    if (value === 'easy' || value === 'mudah') return 'Mudah'
    if (value === 'hard' || value === 'sulit') return 'Sulit'
    return 'Sedang'
  })()

  const addCommand = (command: Command) => {
    if (isRunning || isComplete) return

    setCommands((previous) => [...previous, command])
    setFeedback('Perintah ditambahkan. Kamu bisa menambah perintah lain.')
  }

  const resetRobot = () => {
    setRobot({ ...start })
    setDirection(1)
    setIsRunning(false)
    setIsComplete(false)
    setFeedback('Robot kembali ke titik awal. Coba lagi!')
  }

  const runProgram = async () => {
    if (isRunning || isComplete) return

    if (commands.length === 0) {
      setFeedback('Tambahkan setidaknya satu blok perintah terlebih dahulu.')
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
        'Konfigurasi misi tidak valid. Periksa posisi awal, target, dan rintangan di Admin.'
      )
      return
    }

    setIsRunning(true)

    let nextRobot: Position = { ...start }
    let nextDirection: Direction = 1
    let reachedGoal = nextRobot.x === target.x && nextRobot.y === target.y
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

      if (nextRobot.x === target.x && nextRobot.y === target.y) {
        reachedGoal = true
      }
    }

    setIsRunning(false)

    if (reachedGoal) {
      setIsComplete(true)
      setXpEarned((previous) => previous + 10)
      setFeedback('🎉 Hebat! Robot berhasil mencapai bintang! +10 XP')

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { error } = await supabase.rpc('add_user_xp', {
            user_id_input: user.id,
            xp_to_add: 10,
          })

          if (error) {
            setFeedback('Misi berhasil, tetapi XP belum tersimpan ke akun.')
          }
        }
      } catch {
        setFeedback('Misi berhasil, tetapi koneksi XP perlu diperiksa.')
      }
    } else if (crashed) {
      setFeedback('💥 Robot menabrak penghalang atau keluar papan. Coba lagi!')
    } else {
      setFeedback('Robot belum mencapai bintang. Perbaiki algoritmamu!')
    }
  }

  const nextMission = () => {
    if (missionIndex >= missions.length - 1) return
    setMissionIndex((previous) => previous + 1)
  }

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
            </p>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-bold text-amber-300">
            ⭐ {xpEarned} XP
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 p-4 md:grid-cols-2 md:p-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 font-extrabold">🗺️ Papan Labirin</h2>
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>Arah robot: {DIRECTIONS[direction].label}</span>
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
                  className={`flex aspect-square items-center justify-center rounded-md border text-base sm:rounded-lg sm:text-2xl ${
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
            <span>🏁 Titik awal</span>
            <span>⭐ Tujuan</span>
            <span>🧱 Penghalang</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-extrabold">🎯 Misi</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {currentMission?.question_text ||
                'Arahkan robot menuju bintang dengan perintah yang tepat.'}
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
                  className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-2 py-3 text-xs font-bold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-40"
                >
                  <span className="mb-1 block text-xl">{command.icon}</span>
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
                  Blok perintah yang kamu pilih akan muncul di sini.
                </p>
              ) : (
                commands.map((command, index) => {
                  const item = COMMANDS.find((entry) => entry.id === command)
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
                disabled={isRunning || isComplete || commands.length === 0}
                onClick={() => {
                  setCommands((previous) => previous.slice(0, -1))
                  setFeedback('Blok perintah terakhir dihapus.')
                }}
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
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
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold hover:bg-slate-700 disabled:opacity-40"
              >
                ↺ Ulangi
              </button>
            </div>

            <button
              type="button"
              disabled={isRunning || isComplete}
              onClick={runProgram}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 font-extrabold hover:bg-emerald-500 disabled:opacity-40"
            >
              ▶ Jalankan Program
            </button>
          </div>

          <div
            aria-live="polite"
            className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-relaxed text-indigo-100"
          >
            {feedback}
          </div>

          {isComplete && missionIndex < missions.length - 1 && (
            <button
              type="button"
              onClick={nextMission}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950 hover:bg-amber-400"
            >
              Misi Berikutnya →
            </button>
          )}

          {isComplete && missionIndex === missions.length - 1 && (
            <Link
              href="/practice"
              className="block w-full rounded-xl bg-emerald-600 px-4 py-3 text-center font-extrabold hover:bg-emerald-500"
            >
              🏆 Semua Misi Selesai
            </Link>
          )}
        </section>
      </main>
    </div>
  )
}
