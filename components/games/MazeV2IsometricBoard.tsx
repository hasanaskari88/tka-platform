'use client'

import { useRef } from 'react'

type Point = { x: number; y: number }
type Props = {
  width: number
  height: number
  start: Point
  target: Point
  obstacles: Point[]
  robot?: Point
  direction?: number
  rotation?: 0 | 90 | 180 | 270
  mode?: 'play' | 'edit'
  editMode?: 'start' | 'target' | 'obstacle'
  onCellClick?: (x: number, y: number) => void
  running?: boolean
  title?: string
}

const TILE_W = 76
const TILE_H = 42
const WALL_H = 48

function points(coords: number[][]) {
  return coords.map(([x, y]) => `${x},${y}`).join(' ')
}

function Robot({ x, y, direction = 1, animate = false, offsetX = 0, offsetY = 0 }: { x: number; y: number; direction?: number; animate?: boolean; offsetX?: number; offsetY?: number }) {
  const rotations = [0, 90, 180, 270]
  return (
    <g transform={`translate(${x} ${y})`} className={animate ? 'maze-robot-bob' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {animate && (offsetX !== 0 || offsetY !== 0) && <animateTransform attributeName="transform" type="translate" from={`${offsetX} ${offsetY}`} to="0 0" dur="260ms" fill="freeze" />}
      <ellipse cx="0" cy="8" rx="19" ry="8" fill="#071b2c" opacity=".35" />
      <path d="M0 15 L-5 24 L5 24 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.5" transform={`rotate(${rotations[direction] ?? 90} 0 19)`} />
      <g>
        <path d="M-12 4 L-16 12 L-7 12 L-4 4 M7 4 L4 12 L15 12 L12 4" fill="#334155" stroke="#0f172a" strokeWidth="2" strokeLinejoin="round" />
        <rect x="-14" y="-17" width="28" height="25" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2.5" />
        <rect x="-11" y="-13" width="22" height="14" rx="5" fill="#0e7490" />
        <circle cx="-5" cy="-7" r="2.6" fill="#a5f3fc" />
        <circle cx="5" cy="-7" r="2.6" fill="#a5f3fc" />
        <path d="M-4 -2 Q0 1 4 -2" fill="none" stroke="#a5f3fc" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M-8 -17 L-10 -23 M8 -17 L10 -23" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
        <circle cx="-10" cy="-24" r="3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
        <circle cx="10" cy="-24" r="3" fill="#fbbf24" stroke="#92400e" strokeWidth="1" />
        <path d="M-14 -7 L-19 -2 M14 -7 L19 -2" stroke="#cbd5e1" strokeWidth="4" strokeLinecap="round" />
        <path d="M-7 8 L-9 13 M7 8 L9 13" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
      </g>
    </g>
  )
}

export default function MazeV2IsometricBoard({
  width, height, start, target, obstacles, robot, direction = 1, rotation = 0,
  mode = 'play', editMode, onCellClick, running = false, title = 'Labirin Petualangan',
}: Props) {
  const isWall = (x: number, y: number) => obstacles.some((p) => p.x === x && p.y === y)
  const activeRobot = robot ?? start
  const safeWidth = Math.max(2, Math.min(12, width))
  const safeHeight = Math.max(2, Math.min(12, height))
  const pad = 54
  const rotatedWidth = rotation % 180 === 0 ? safeWidth : safeHeight
  const rotatedHeight = rotation % 180 === 0 ? safeHeight : safeWidth
  const boardWidth = (rotatedWidth + rotatedHeight) * TILE_W / 2 + pad * 2
  const boardHeight = (rotatedWidth + rotatedHeight) * TILE_H / 2 + WALL_H + 100
  const originX = boardWidth / 2
  const originY = 48
  const rotateCell = (x: number, y: number) => {
    if (rotation === 90) return { x: safeHeight - 1 - y, y: x }
    if (rotation === 180) return { x: safeWidth - 1 - x, y: safeHeight - 1 - y }
    if (rotation === 270) return { x: y, y: safeWidth - 1 - x }
    return { x, y }
  }
  const center = (x: number, y: number) => {
    const point = rotateCell(x, y)
    return {
      x: originX + (point.x - point.y) * TILE_W / 2,
      y: originY + (point.x + point.y) * TILE_H / 2,
    }
  }
  const tile = (x: number, y: number) => {
    const c = center(x, y)
    return {
      top: points([[c.x,c.y-TILE_H/2],[c.x+TILE_W/2,c.y],[c.x,c.y+TILE_H/2],[c.x-TILE_W/2,c.y]]),
      left: points([[c.x-TILE_W/2,c.y],[c.x,c.y+TILE_H/2],[c.x,c.y+TILE_H/2+8],[c.x-TILE_W/2,c.y+8]]),
      right: points([[c.x,c.y+TILE_H/2],[c.x+TILE_W/2,c.y],[c.x+TILE_W/2,c.y+8],[c.x,c.y+TILE_H/2+8]]),
      wallTop: points([[c.x-TILE_W/2,c.y-WALL_H],[c.x,c.y-TILE_H/2-WALL_H],[c.x+TILE_W/2,c.y-WALL_H],[c.x,c.y+TILE_H/2-WALL_H]]),
      wallLeft: points([[c.x-TILE_W/2,c.y-WALL_H],[c.x,c.y+TILE_H/2-WALL_H],[c.x,c.y+TILE_H/2],[c.x-TILE_W/2,c.y]]),
      wallRight: points([[c.x,c.y+TILE_H/2-WALL_H],[c.x+TILE_W/2,c.y-WALL_H],[c.x+TILE_W/2,c.y],[c.x,c.y+TILE_H/2]]),
      center: c,
    }
  }
  const cells = Array.from({ length: safeWidth * safeHeight }, (_, i) => ({ x: i % safeWidth, y: Math.floor(i / safeWidth) }))
    .sort((a, b) => a.x + a.y - (b.x + b.y))
  const baseA = center(0, 0)
  const baseB = center(safeWidth - 1, 0)
  const baseC = center(safeWidth - 1, safeHeight - 1)
  const baseD = center(0, safeHeight - 1)
  const baseTop = points([
    [baseA.x, baseA.y - TILE_H / 2 - 8],
    [baseB.x + TILE_W / 2 + 8, baseB.y],
    [baseC.x, baseC.y + TILE_H / 2 + 8],
    [baseD.x - TILE_W / 2 - 8, baseD.y],
  ])
  const baseFront = points([
    [baseC.x, baseC.y + TILE_H / 2 + 8],
    [baseD.x - TILE_W / 2 - 8, baseD.y],
    [baseD.x - TILE_W / 2 - 8, baseD.y + 22],
    [baseC.x, baseC.y + TILE_H / 2 + 30],
  ])
  const baseRight = points([
    [baseB.x + TILE_W / 2 + 8, baseB.y],
    [baseC.x, baseC.y + TILE_H / 2 + 8],
    [baseC.x, baseC.y + TILE_H / 2 + 30],
    [baseB.x + TILE_W / 2 + 8, baseB.y + 22],
  ])
  const robotCenter = center(activeRobot.x, activeRobot.y)
  const previousRobotRef = useRef<Point>(activeRobot)
  const previousRobotCenter = center(previousRobotRef.current.x, previousRobotRef.current.y)
  const robotOffsetX = previousRobotCenter.x - robotCenter.x
  const robotOffsetY = previousRobotCenter.y - robotCenter.y
  previousRobotRef.current = activeRobot

  return (
    <div className="relative isolate overflow-hidden rounded-[1.6rem] border border-sky-200/20 bg-[linear-gradient(160deg,#7dd3fc_0%,#38bdf8_28%,#0c4a6e_100%)] p-3 shadow-2xl sm:p-5">
      <style jsx>{`
        @keyframes robotBob { 0%,100% { translate: 0 0 } 50% { translate: 0 -5px } }
        @keyframes starPulse { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 3px #fde68a) } 50% { transform: scale(1.12); filter: drop-shadow(0 0 10px #fef08a) } }
        .maze-robot-bob { animation: robotBob .7s ease-in-out infinite; }
        .maze-goal-star { transform-box: fill-box; transform-origin: center; animation: starPulse 1.6s ease-in-out infinite; }
      `}</style>
      <div className="pointer-events-none absolute inset-0 opacity-35" style={{ backgroundImage: 'radial-gradient(#e0f2fe 1px,transparent 1px)', backgroundSize: '24px 24px' }} />
      <div className="relative z-10 mb-1 flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-black tracking-wide text-sky-950">{title}</span>
          <p className="text-[10px] font-semibold text-sky-950/65">Dunia petualangan robot</p>
        </div>
        <span className="rounded-full border border-white/50 bg-white/55 px-3 py-1 text-[10px] font-black text-sky-950 shadow-sm">{safeWidth} × {safeHeight}</span>
      </div>

      <div className="relative z-10 mx-auto w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${boardWidth} ${boardHeight}`}
          role="img"
          aria-label={`Papan labirin isometrik ${safeWidth} kali ${safeHeight}`}
          className="mx-auto block h-auto w-full min-w-[300px] max-w-[760px] overflow-visible"
        >
          <defs>
            <linearGradient id="maze-path" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fffde7"/><stop offset=".52" stopColor="#fde68a"/><stop offset="1" stopColor="#f59e0b"/></linearGradient>
            <linearGradient id="maze-grass-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#86efac"/><stop offset=".55" stopColor="#22c55e"/><stop offset="1" stopColor="#15803d"/></linearGradient>
            <linearGradient id="maze-grass-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15803d"/><stop offset="1" stopColor="#064e3b"/></linearGradient>
            <linearGradient id="maze-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e2e8f0"/><stop offset=".45" stopColor="#94a3b8"/><stop offset="1" stopColor="#475569"/></linearGradient>
            <linearGradient id="maze-wall-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64748b"/><stop offset="1" stopColor="#1e293b"/></linearGradient>
            <filter id="maze-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
          </defs>

          <ellipse cx={originX} cy={originY + (safeWidth + safeHeight) * TILE_H / 4 + 38} rx={(safeWidth + safeHeight) * 19} ry="28" fill="#082f49" opacity=".28" filter="url(#maze-shadow)" />
          <polygon points={baseFront} fill="#14532d" stroke="#064e3b" strokeWidth="2" />
          <polygon points={baseRight} fill="url(#maze-grass-side)" stroke="#064e3b" strokeWidth="2" />
          <polygon points={baseTop} fill="url(#maze-grass-top)" stroke="#dcfce7" strokeWidth="3" />
          <polygon points={baseTop} fill="none" stroke="#f0fdf4" strokeWidth="1.5" strokeDasharray="7 5" opacity=".65" />

          {/* Soft clouds and distant hills make the board feel like a small game world. */}
          <g opacity=".5" fill="#f0f9ff">
            <path d={`M${pad} 34 q-8 -12 5 -18 q7 -17 23 -5 q14 -8 22 8 q15 0 12 15 Z`} />
            <path d={`M${boardWidth-115} 58 q-8 -12 5 -18 q7 -17 23 -5 q14 -8 22 8 q15 0 12 15 Z`} />
          </g>

          {cells.map(({ x, y }) => {
            const t = tile(x, y)
            const wall = isWall(x, y)
            const isStart = start.x === x && start.y === y
            const isGoal = target.x === x && target.y === y
            const isRobot = activeRobot.x === x && activeRobot.y === y
            const clickable = mode === 'edit' && !!onCellClick
            return (
              <g key={`${x}-${y}`}>
                {wall && <>
                  <polygon points={t.wallLeft} fill="#64748b" stroke="#334155" strokeWidth="2" />
                  <polygon points={t.wallRight} fill="url(#maze-wall-side)" stroke="#1e293b" strokeWidth="2" />
                  <polygon points={t.wallTop} fill="url(#maze-wall)" stroke="#334155" strokeWidth="2.5" />
                  <path d={`M${t.center.x-20} ${t.center.y-WALL_H/2-2} l40 0 M${t.center.x-13} ${t.center.y-WALL_H+4} l26 0`} stroke="#334155" strokeWidth="2" opacity=".55" />
                  <path d={`M${t.center.x-19} ${t.center.y-WALL_H-2} l9 -5 l8 4 l-7 5 Z`} fill="#f1f5f9" opacity=".85" />
                  <circle cx={t.center.x+13} cy={t.center.y-WALL_H-2} r="3.5" fill="#334155" opacity=".75" />
                </>}
                {!wall && <>
                  <polygon points={t.left} fill="#b45309" stroke="#92400e" strokeWidth="1.2" />
                  <polygon points={t.right} fill="#92400e" stroke="#78350f" strokeWidth="1.2" />
                  <polygon points={t.top} fill="url(#maze-path)" stroke="#fff" strokeWidth="3" />
                  <polygon points={points([[t.center.x,t.center.y-TILE_H/2+6],[t.center.x+TILE_W/2-9,t.center.y],[t.center.x,t.center.y+TILE_H/2-6],[t.center.x-TILE_W/2+9,t.center.y]])} fill="none" stroke="#b45309" strokeWidth="2" strokeDasharray="5 4" opacity=".9" />
                  <circle cx={t.center.x} cy={t.center.y} r="2.5" fill="#fff7ed" opacity=".9" />
                </>}
                {isStart && <g transform={`translate(${t.center.x-9} ${t.center.y-24})`}>
                  <path d="M9 25 V-9" stroke="#854d0e" strokeWidth="3" strokeLinecap="round" />
                  <path d="M10 -9 Q24 -14 29 -5 L10 1 Z" fill="#fef08a" stroke="#a16207" strokeWidth="1.5" />
                  <path d="M13 -6 L24 -7" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
                </g>}
                {isGoal && <g className="maze-goal-star" transform={`translate(${t.center.x} ${t.center.y-23})`}>
                  <path d="M0 -15 L4 -5 L15 -5 L6 2 L10 13 L0 6 L-10 13 L-6 2 L-15 -5 L-4 -5 Z" fill="#facc15" stroke="#a16207" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="-4" cy="-2" r="1.5" fill="#fff7ed" />
                </g>}
                {clickable && <polygon
                  points={t.top}
                  fill={editMode === 'obstacle' && wall ? '#fca5a5' : 'transparent'}
                  fillOpacity={editMode === 'obstacle' && wall ? '.24' : '0'}
                  stroke="#fff" strokeOpacity=".5" strokeWidth="1.5" strokeDasharray="4 3"
                  className="cursor-pointer transition-all hover:fill-white hover:fill-opacity-30"
                  role="button" tabIndex={0}
                  aria-label={`Pilih petak ${x}, ${y}`}
                  onClick={() => !running && onCellClick?.(x, y)}
                  onKeyDown={(event) => { if (!running && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onCellClick?.(x, y) } }}
                />}
              </g>
            )
          })}
          <Robot x={robotCenter.x} y={robotCenter.y-7} direction={((direction + rotation / 90) % 4) as 0|1|2|3} animate={running} offsetX={robotOffsetX} offsetY={robotOffsetY} />
          <g transform={`translate(18 ${boardHeight-32})`}>
            <rect x="0" y="-14" width={Math.max(140, boardWidth-36)} height="27" rx="13" fill="#082f49" opacity=".22" />
            <text x="12" y="4" fontSize="11" fontWeight="800" fill="#f0f9ff">JELAJAHI • SUSUN PERINTAH • CAPAI BINTANG</text>
          </g>
        </svg>
      </div>

      <div className="relative z-10 mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/55 bg-white/65 p-3 text-xs font-extrabold text-slate-800 sm:grid-cols-4">
        <span className="inline-flex items-center gap-2"><span className="text-xl">🤖</span> Robot</span>
        <span className="inline-flex items-center gap-2"><span className="text-xl">🚩</span> Titik mulai</span>
        <span className="inline-flex items-center gap-2"><span className="text-xl">⭐</span> Tujuan</span>
        <span className="inline-flex items-center gap-2"><span className="inline-block h-4 w-4 rounded bg-gradient-to-br from-amber-100 to-amber-400 ring-2 ring-amber-700/30" /> Jalan yang bisa dilalui</span>
        <span className="inline-flex items-center gap-2 sm:col-span-4"><span className="text-xl">🧱</span> Dinding tinggi = tidak boleh dilewati</span>
      </div>
      {mode === 'edit' && <p className="relative z-10 mt-2 text-center text-[10px] font-semibold text-sky-950/75">Pilih petak untuk {editMode === 'start' ? 'memindahkan titik mulai' : editMode === 'target' ? 'memindahkan tujuan' : 'menambah atau menghapus rintangan'}.</p>}
    </div>
  )
}
