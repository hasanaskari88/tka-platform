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

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-xl font-extrabold">
          🧩 Coding Maze V2
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Susun blok dengan cara menariknya ke area program.
        </p>

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
          </section>
        </div>
      </div>
    </div>
  )
}
