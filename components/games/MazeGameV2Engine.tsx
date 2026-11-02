'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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

interface MazeGameV2Props {
  exam: any
  questions: MazeQuestion[]
}

type Direction = 0 | 1 | 2 | 3

type BlockType =
  | 'FORWARD'
  | 'LEFT'
  | 'RIGHT'
  | 'REPEAT'
  | 'IF_CLEAR'

interface ProgramBlock {
  id: string
  type: BlockType
  count?: number
}

const DIRECTIONS = [
  { x: 0, y: -1, label: 'Utara' },
  { x: 1, y: 0, label: 'Timur' },
  { x: 0, y: 1, label: 'Selatan' },
  { x: -1, y: 0, label: 'Barat' },
]

const BLOCKS: {
  type: BlockType
  label: string
  icon: string
  color: string
}[] = [
  {
    type: 'FORWARD',
    label: 'Maju',
    icon: '⬆️',
    color: 'bg-blue-600',
  },
  {
    type: 'LEFT',
    label: 'Belok Kiri',
    icon: '↶',
    color: 'bg-purple-600',
  },
  {
    type: 'RIGHT',
    label: 'Belok Kanan',
    icon: '↷',
    color: 'bg-purple-600',
  },
  {
    type: 'REPEAT',
    label: 'Ulangi 2 Kali',
    icon: '🔁',
    color: 'bg-amber-600',
  },
  {
    type: 'IF_CLEAR',
    label: 'Jika Jalan Terbuka',
    icon: '🔀',
    color: 'bg-emerald-600',
  },
]

export default function MazeGameV2Engine({
  exam,
  questions = [],
}: MazeGameV2Props) {
  const router = useRouter()

  // State dasar permainan akan ditambahkan bertahap.
  const [missionIndex, setMissionIndex] = useState(0)
  const currentMission = questions[missionIndex]

  const [program, setProgram] = useState<ProgramBlock[]>([])
  const [draggedType, setDraggedType] = useState<BlockType | null>(null)

  const createBlock = (type: BlockType): ProgramBlock => ({
    id: `${type}-${Date.now()}-${Math.random()}`,
    type,
    ...(type === 'REPEAT' ? { count: 2 } : {}),
  })
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
  if (!Array.isArray(currentMission?.obstacles)) return []

  return currentMission.obstacles.map((item: any) => ({
    x: Number(item.x),
    y: Number(item.y),
  }))
}, [currentMission])

const [robot, setRobot] = useState<Position>(start)
const [direction, setDirection] = useState<Direction>(1)

const isWall = (position: Position) =>
  obstacles.some(
    (wall) => wall.x === position.x && wall.y === position.y
  )
  const [isRunning, setIsRunning] = useState(false)
const [feedback, setFeedback] = useState(
  'Susun blok, lalu jalankan program!'
)
const [isComplete, setIsComplete] = useState(false)

const runProgram = async () => {
  if (isRunning || isComplete || program.length === 0) return

  setIsRunning(true)
  setFeedback('🤖 Robot sedang menjalankan program...')

  let currentPosition = { ...start }
  let currentDirection: Direction = 1
  let reachedGoal = false
  let crashed = false

  const moveRobot = async () => {
    const movement = DIRECTIONS[currentDirection]

    const nextPosition = {
      x: currentPosition.x + movement.x,
      y: currentPosition.y + movement.y,
    }

    if (
      nextPosition.x < 0 ||
      nextPosition.x >= width ||
      nextPosition.y < 0 ||
      nextPosition.y >= height ||
      isWall(nextPosition)
    ) {
      crashed = true
      return
    }

    currentPosition = nextPosition

    setRobot({ ...currentPosition })
    setDirection(currentDirection)

    await new Promise((resolve) => setTimeout(resolve, 400))

    if (
      currentPosition.x === target.x &&
      currentPosition.y === target.y
    ) {
      reachedGoal = true
    }
  }

  for (const block of program) {
    if (reachedGoal || crashed) break

    if (block.type === 'LEFT') {
      currentDirection = ((currentDirection + 3) % 4) as Direction
      setDirection(currentDirection)
    }

    if (block.type === 'RIGHT') {
      currentDirection = ((currentDirection + 1) % 4) as Direction
      setDirection(currentDirection)
    }

    if (block.type === 'FORWARD') {
      await moveRobot()
    }

    if (block.type === 'REPEAT') {
      for (let i = 0; i < (block.count ?? 2); i++) {
        if (reachedGoal || crashed) break
        await moveRobot()
      }
    }

    if (block.type === 'IF_CLEAR') {
      const movement = DIRECTIONS[currentDirection]

      const nextPosition = {
        x: currentPosition.x + movement.x,
        y: currentPosition.y + movement.y,
      }

      const blocked =
        nextPosition.x < 0 ||
        nextPosition.x >= width ||
        nextPosition.y < 0 ||
        nextPosition.y >= height ||
        isWall(nextPosition)

      if (!blocked) {
        await moveRobot()
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  setIsRunning(false)

  if (reachedGoal) {
    setIsComplete(true)
    setFeedback('🎉 Hebat! Robot berhasil mencapai bintang!')
  } else if (crashed) {
    setFeedback('💥 Robot menabrak penghalang atau keluar papan!')
  } else {
    setFeedback('Robot belum mencapai bintang. Perbaiki programmu!')
  }
}

const resetGame = () => {
  if (isRunning) return

  setRobot({ ...start })
  setDirection(1)
  setProgram([])
  setIsComplete(false)
  setFeedback('Robot kembali ke titik awal. Coba lagi!')
}
  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-extrabold">
          🧩 Coding Maze V2
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Susun blok dengan cara menariknya ke area program.
        </p>
<section className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
  <h2 className="mb-3 font-bold">🗺️ Papan Labirin</h2>

  <div className="mb-3 text-xs text-slate-400">
    Misi {missionIndex + 1} dari {questions.length}
    {' · '}
    Ukuran {width} × {height}
  </div>

  <div
    className="mx-auto grid aspect-square max-w-md gap-1"
    style={{
      gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
    }}
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
          className={`flex aspect-square items-center justify-center rounded-md border text-lg sm:text-2xl ${
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

  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
    <span>🤖 Robot</span>
    <span>🏁 Awal</span>
    <span>⭐ Tujuan</span>
    <span>🧱 Penghalang</span>
  </div>
</section>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 font-bold">🧱 Panel Blok</h2>

            <div className="space-y-2">
              {BLOCKS.map((block) => (
                <div
                  key={block.type}
                  draggable
                  onDragStart={() => setDraggedType(block.type)}
                  onDragEnd={() => setDraggedType(null)}
                  className={`cursor-grab rounded-xl ${block.color} p-3 font-bold active:cursor-grabbing`}
                >
                  {block.icon} {block.label}
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 font-bold">🧩 Area Program</h2>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()

                if (!draggedType) return

                setProgram((previous) => [
                  ...previous,
                  createBlock(draggedType),
                ])

                setDraggedType(null)
              }}
              className="min-h-64 space-y-2 rounded-xl border-2 border-dashed border-slate-600 bg-slate-950 p-3"
            >
              {program.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">
                  Tarik blok ke area ini.
                </p>
              ) : (
                program.map((block, index) => {
                  const item = BLOCKS.find(
                    (entry) => entry.type === block.type
                  )

                  return (
                    <div
                      key={block.id}
                      className="rounded-lg bg-slate-800 p-3 font-bold"
                    >
                      {index + 1}. {item?.icon} {item?.label}
                    </div>
                  )
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => setProgram([])}
              className="mt-3 w-full rounded-xl bg-slate-700 px-4 py-3 font-bold"
            >
              Hapus Semua Blok
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
  <button
    type="button"
    onClick={resetGame}
    disabled={isRunning}
    className="rounded-xl bg-slate-700 px-3 py-3 font-bold disabled:opacity-40"
  >
    ↺ Ulangi
  </button>

  <button
    type="button"
    onClick={runProgram}
    disabled={isRunning || isComplete || program.length === 0}
    className="rounded-xl bg-emerald-600 px-3 py-3 font-extrabold disabled:opacity-40"
  >
    ▶ Jalankan
  </button>
</div>

<div
  aria-live="polite"
  className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm text-indigo-100"
>
  {feedback}
</div>
          </section>
        </div>
      </div>
    </div>
  )
}
