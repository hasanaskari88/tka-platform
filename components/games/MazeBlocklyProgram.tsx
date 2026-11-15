'use client'

import type { Dispatch, SetStateAction } from 'react'

export type MazeBlockType = 'FORWARD' | 'LEFT' | 'RIGHT' | 'IF_PATH' | 'REPEAT'
export type MazeBlock = {
  id: string
  type: MazeBlockType
  count?: number
  children?: MazeBlock[]
}

type Props = {
  program: MazeBlock[]
  setProgram: Dispatch<SetStateAction<MazeBlock[]>>
  disabled?: boolean
  maxBlocks?: number
}

const palette: { type: MazeBlockType; label: string; icon: string; color: string }[] = [
  { type: 'FORWARD', label: 'Maju', icon: '⬆️', color: 'from-sky-500 to-blue-600' },
  { type: 'LEFT', label: 'Belok kiri', icon: '↶', color: 'from-sky-500 to-blue-600' },
  { type: 'RIGHT', label: 'Belok kanan', icon: '↷', color: 'from-sky-500 to-blue-600' },
  { type: 'IF_PATH', label: 'Jika jalan di depan terbuka', icon: '🔷', color: 'from-indigo-500 to-violet-700' },
  { type: 'REPEAT', label: 'Ulangi', icon: '🔁', color: 'from-amber-500 to-orange-600' },
]

const createBlock = (type: MazeBlockType): MazeBlock => ({
  id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  ...(type === 'REPEAT' ? { count: 3 } : {}),
  ...(['IF_PATH', 'REPEAT'].includes(type) ? { children: [] } : {}),
})

const countBlocks = (blocks: MazeBlock[]): number =>
  blocks.reduce((sum, block) => sum + 1 + countBlocks(block.children ?? []), 0)

function updateAtPath(
  blocks: MazeBlock[],
  path: number[],
  updater: (block: MazeBlock) => MazeBlock
): MazeBlock[] {
  if (path.length === 0) return blocks
  const [index, ...rest] = path
  return blocks.map((block, i) => {
    if (i !== index) return block
    if (rest.length === 0) return updater(block)
    return { ...block, children: updateAtPath(block.children ?? [], rest, updater) }
  })
}

function removeAtPath(blocks: MazeBlock[], path: number[]): MazeBlock[] {
  if (path.length === 0) return blocks
  const [index, ...rest] = path
  if (rest.length === 0) return blocks.filter((_, i) => i !== index)
  return blocks.map((block, i) => i === index
    ? { ...block, children: removeAtPath(block.children ?? [], rest) }
    : block)
}

function addAtPath(blocks: MazeBlock[], path: number[], type: MazeBlockType): MazeBlock[] {
  if (path.length === 0) return [...blocks, createBlock(type)]
  const [index, ...rest] = path
  return blocks.map((block, i) => i === index
    ? { ...block, children: addAtPath(block.children ?? [], rest, type) }
    : block)
}

function moveAtPath(blocks: MazeBlock[], path: number[], delta: number): MazeBlock[] {
  if (path.length === 0) return blocks
  const [index, ...rest] = path
  if (rest.length === 0) {
    const target = index + delta
    if (target < 0 || target >= blocks.length) return blocks
    const next = [...blocks]
    ;[next[index], next[target]] = [next[target], next[index]]
    return next
  }
  return blocks.map((block, i) => i === index
    ? { ...block, children: moveAtPath(block.children ?? [], rest, delta) }
    : block)
}

function BlockList({
  blocks, path, setProgram, disabled, canAdd,
}: {
  blocks: MazeBlock[]
  path: number[]
  setProgram: Props['setProgram']
  disabled: boolean
  canAdd: boolean
}) {
  return (
    <div className={path.length ? 'ml-3 space-y-2 border-l-4 border-white/30 pl-3 sm:ml-5 sm:pl-4' : 'space-y-2'}>
      {blocks.map((block, index) => {
        const currentPath = [...path, index]
        const isContainer = block.type === 'IF_PATH' || block.type === 'REPEAT'
        const info = palette.find(item => item.type === block.type)!
        return (
          <div key={block.id} className={`overflow-hidden rounded-xl bg-gradient-to-r ${info.color} shadow-md`}>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-white">
              <span className="text-xl">{info.icon}</span>
              <span className="min-w-0 flex-1 text-xs font-black sm:text-sm">
                {block.type === 'REPEAT' ? 'ULANGI' : block.type === 'IF_PATH' ? 'JIKA jalan di depan terbuka' : info.label.toUpperCase()}
              </span>
              {block.type === 'REPEAT' && (
                <select
                  aria-label="Jumlah pengulangan"
                  value={block.count ?? 3}
                  disabled={disabled}
                  onChange={event => setProgram(previous => updateAtPath(previous, currentPath, item => ({ ...item, count: Number(event.target.value) })))}
                  className="rounded-lg border border-white/40 bg-amber-950/30 px-2 py-1 text-xs font-black text-white"
                >
                  {[2, 3, 4, 5, 6, 8, 10].map(value => <option key={value} value={value} className="text-slate-900">{value} kali</option>)}
                </select>
              )}
              <button type="button" disabled={disabled || index === 0} onClick={() => setProgram(previous => updateParent(previous, currentPath, -1))} className="rounded bg-black/15 px-2 py-1 text-xs disabled:opacity-30" aria-label="Geser blok ke atas">↑</button>
              <button type="button" disabled={disabled || index === blocks.length - 1} onClick={() => setProgram(previous => updateParent(previous, currentPath, 1))} className="rounded bg-black/15 px-2 py-1 text-xs disabled:opacity-30" aria-label="Geser blok ke bawah">↓</button>
              <button type="button" disabled={disabled} onClick={() => setProgram(previous => removeAtPath(previous, currentPath))} className="rounded bg-rose-950/30 px-2 py-1 text-xs font-black" aria-label="Hapus blok">✕</button>
            </div>
            {isContainer && (
              <div className="space-y-2 bg-black/10 px-2 pb-2 pt-1 sm:px-3">
                <div className="text-[10px] font-black uppercase tracking-wide text-white/90">
                  {block.type === 'IF_PATH' ? 'MAKA lakukan perintah ini' : 'Jalankan isi blok berulang kali'}
                </div>
                <BlockList
                  blocks={block.children ?? []}
                  path={currentPath}
                  setProgram={setProgram}
                  disabled={disabled}
                  canAdd={canAdd}
                />
                <div className="flex flex-wrap gap-1.5">
                  {palette.slice(0, 3).map(item => (
                    <button key={item.type} type="button" disabled={disabled || !canAdd} onClick={() => setProgram(previous => addAtPath(previous, currentPath, item.type))} className="rounded-lg border border-white/30 bg-white/15 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">
                      + {item.icon} {item.label}
                    </button>
                  ))}
                  <button type="button" disabled={disabled || !canAdd} onClick={() => setProgram(previous => addAtPath(previous, currentPath, 'REPEAT'))} className="rounded-lg border border-white/30 bg-white/15 px-2 py-1.5 text-[10px] font-bold text-white disabled:opacity-40">+ 🔁 Ulangi</button>
                </div>
                {(block.children ?? []).length === 0 && <p className="rounded-lg border border-dashed border-white/40 px-2 py-3 text-center text-[10px] text-white/80">Tambahkan balok ke dalam bagian ini</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function updateParent(blocks: MazeBlock[], path: number[], delta: number): MazeBlock[] {
  if (path.length === 1) return moveAtPath(blocks, path, delta)
  const [index, ...rest] = path
  return blocks.map((block, i) => i === index
    ? { ...block, children: updateParent(block.children ?? [], rest, delta) }
    : block)
}

export default function MazeBlocklyProgram({ program, setProgram, disabled = false, maxBlocks = 30 }: Props) {
  const total = countBlocks(program)
  const canAdd = total < maxBlocks
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {palette.map(item => (
          <button
            key={item.type}
            type="button"
            disabled={disabled || !canAdd}
            onClick={() => setProgram(previous => [...previous, createBlock(item.type)])}
            className={`touch-manipulation rounded-xl bg-gradient-to-br ${item.color} px-2 py-3 text-center text-white shadow-md transition hover:brightness-110 active:scale-95 disabled:opacity-40`}
          >
            <span className="block text-xl">{item.icon}</span>
            <span className="mt-1 block text-[11px] font-black">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="min-h-40 rounded-2xl border-2 border-dashed border-slate-600 bg-slate-950/80 p-3">
        {program.length ? (
          <BlockList blocks={program} path={[]} setProgram={setProgram} disabled={disabled} canAdd={canAdd} />
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center text-center text-slate-500">
            <span className="text-4xl">🧩</span>
            <p className="mt-2 text-sm font-bold">Area susunan masih kosong</p>
            <p className="mt-1 text-xs">Pilih balok di atas untuk mulai</p>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
        <span>Balok tersusun: {total}/{maxBlocks}</span>
        <button type="button" disabled={disabled || program.length === 0} onClick={() => setProgram([])} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-rose-200 disabled:opacity-40">Kosongkan program</button>
      </div>
    </div>
  )
}
