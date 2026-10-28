
'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface MazeQuestion {
  id?: string
  question_text?: string
  explanation?: string
  pembahasan?: string
  target_x?: number
  target_y?: number
  [key: string]: any
}

interface MazeGameProps {
  exam: any
  questions: MazeQuestion[]
}

type Direction = 0 | 1 | 2 | 3
type Command = 'FORWARD' | 'LEFT' | 'RIGHT'

interface Position {
  x: number
  y: number
}

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

const SAMPLE_MISSIONS: MazeQuestion[] = [
  {
    question_text: 'Bantu robot mencapai bintang!',
    target_x: 3,
    target_y: 3,
    explanation: 'Susun perintah yang tepat agar robot mencapai bintang.',
  },
]

const WALLS: Position[] = [
  { x: 1, y: 1 },
  { x: 1, y: 2 },
  { x: 3, y: 1 },
  { x: 3, y: 2 },
  { x: 4, y: 3 },
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
  const [commands, setCommands] = useState<Command[]>([])
  const [robot, setRobot] = useState<Position>({ x: 0, y: 0 })
  const [direction, setDirection] = useState<Direction>(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [feedback, setFeedback] = useState(
    'Susun blok perintah, lalu jalankan program!'
  )

  const currentMission = missions[missionIndex]

  const target = {
    x: Number(currentMission?.target_x ?? 3),
    y: Number(currentMission?.target_y ?? 3),
  }

  const isWall = (position: Position) =>
    WALLS.some(
      (wall) => wall.x === position.x && wall.y === position.y
    )

  const addCommand = (command: Command) => {
    if (isRunning || isComplete) return

    setCommands((previous) => [...previous, command])
    setFeedback('Perintah ditambahkan. Kamu bisa menambah perintah lain.')
  }

  const resetRobot = () => {
    setRobot({ x: 0, y: 0 })
    setDirection(1)
    setIsRunning(false)
    setIsComplete(false)
    setFeedback('Robot kembali ke titik awal. Coba susun algoritma lagi.')
  }

  const runProgram = async () => {
    if (isRunning || isComplete) return

    if (commands.length === 0) {
      setFeedback('Tambahkan setidaknya satu blok perintah terlebih dahulu.')
      return
    }

    setIsRunning(true)

    let nextRobot: Position = { x: 0, y: 0 }
    let nextDirection: Direction = 1
    let reachedGoal = false
    let crashed = false

    for (const command of commands) {
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
          nextPosition.x > 5 ||
          nextPosition.y < 0 ||
          nextPosition.y > 5 ||
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
        break
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
            setFeedback(
              'Misi berhasil, tetapi XP belum tersimpan ke akun.'
            )
          }
        }
      } catch {
        setFeedback(
          'Misi berhasil, tetapi koneksi XP perlu diperiksa.'
        )
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
    setCommands([])
    setRobot({ x: 0, y: 0 })
    setDirection(1)
    setIsComplete(false)
    setFeedback('Misi baru dimulai. Susun algoritmamu!')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans">
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
          <p className="mb-4 text-sm text-slate-400">
            Arah robot saat ini: {DIRECTIONS[direction].label}
          </p>

          <div
            className="grid aspect-square grid-cols-6 gap-1"
            role="img"
            aria-label="Papan labirin robot enam kali enam"
          >
            {Array.from({ length: 36 }, (_, index) => {
              const x = index % 6
              const y = Math.floor(index / 6)
              const position = { x, y }
              const wall = isWall(position)
              const isRobot = robot.x === x && robot.y === y
              const isTarget = target.x === x && target.y === y

              return (
                <div
                  key={`${x}-${y}`}
                  className={`flex aspect-square items-center justify-center rounded-lg border text-xl sm:text-2xl ${
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
                        : ''}
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>🤖 Robot</span>
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
                  Blok perintah yang kamu pilih akan muncul di sini.
                </p>
              ) : (
                commands.map((command, index) => (
                  <div
                    key={`${command}-${index}`}
                    className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold"
                  >
                    {index + 1}. {COMMANDS.find((item) => item.id === command)?.icon}{' '}
                    {COMMANDS.find((item) => item.id === command)?.label}
                  </div>
                ))
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
