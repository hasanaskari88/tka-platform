'use client'

type Point = { x: number; y: number }
type Props = {
  width: number
  height: number
  start: Point
  target: Point
  obstacles: Point[]
  robot?: Point
  direction?: number
  mode?: 'play' | 'edit'
  editMode?: 'start' | 'target' | 'obstacle'
  onCellClick?: (x: number, y: number) => void
  running?: boolean
  title?: string
}

const TILE_W = 72
const TILE_H = 38
const WALL_H = 22

function points(coords: number[][]) {
  return coords.map(([x, y]) => `${x},${y}`).join(' ')
}

function Robot({ x, y, direction = 1, animate = false, offsetX = 0, offsetY = 0 }: { x: number; y: number; direction?: number; animate?: boolean; offsetX?: number; offsetY?: number }) {
  const rotations = [0, 90, 180, 270]
  return (
    <g transform={`translate(${x} ${y})`} className={animate ? 'maze-robot-bob' : ''} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
      {animate && (offsetX !== 0 || offsetY !== 0) && <animateTransform attributeName="transform" type="translate" from={`${offsetX} ${offsetY}`} to="0 0" dur="260ms" fill="freeze" />}
      <ellipse cx="0" cy="8" rx="19" ry="8" fill="#071b2c" opacity=".35" />
      <g transform={`rotate(${rotations[direction] ?? 90})`}>
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
  width, height, start, target, obstacles, robot, direction = 1,
  mode = 'play', editMode, onCellClick, running = false, title = 'Labirin Petualangan',
}: Props) {
  const isWall = (x: number, y: number) => obstacles.some((p) => p.x === x && p.y === y)
  const activeRobot = robot ?? start
  const safeWidth = Math.max(2, Math.min(12, width))
  const safeHeight = Math.max(2, Math.min(12, height))
  const pad = 54
  const boardWidth = (safeWidth + safeHeight) * TILE_W / 2 + pad * 2
  const boardHeight = (safeWidth + safeHeight) * TILE_H / 2 + WALL_H + 100
  const originX = boardWidth / 2
  const originY = 48
  const center = (x: number, y: number) => ({
    x: originX + (x - y) * TILE_W / 2,
    y: originY + (x + y) * TILE_H / 2,
  })
  const tile = (x: number, y: number) => {
    const c = center(x, y)
    return {
      top: points([[c.x,c.y-TILE_H/2],[c.x+TILE_W/2,c.y],[c.x,c.y+TILE_H/2],[c.x-TILE_W/2,c.y]]),
      left: points([[c.x-TILE_W/2,c.y],[c.x,c.y+TILE_H/2],[c.x,c.y+TILE_H/2+8],[c.x-TILE_W/2,c.y+8]]),
      right: points([[c.x,c.y+TILE_H/2],[c.x+TILE_W/2,c.y],[c.x+TILE_W/2,c.y+8],[c.x,c.y+TILE_H/2+8]]),
      center: c,
    }
  }
  const cells = Array.from({ length: safeWidth * safeHeight }, (_, i) => ({ x: i % safeWidth, y: Math.floor(i / safeWidth) }))
    .sort((a, b) => a.x + a.y - (b.x + b.y))
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
            <linearGradient id="maze-grass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bbf7d0"/><stop offset=".48" stopColor="#4ade80"/><stop offset="1" stopColor="#15803d"/></linearGradient>
            <linearGradient id="maze-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#cbd5e1"/><stop offset="1" stopColor="#64748b"/></linearGradient>
            <linearGradient id="maze-wall-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#64748b"/><stop offset="1" stopColor="#334155"/></linearGradient>
            <filter id="maze-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
          </defs>

          <ellipse cx={originX} cy={originY + (safeWidth + safeHeight) * TILE_H / 4 + 25} rx={(safeWidth + safeHeight) * 17} ry="24" fill="#082f49" opacity=".22" filter="url(#maze-shadow)" />

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
                  <polygon points={t.left} fill="#334155" stroke="#1e293b" strokeWidth="1" />
                  <polygon points={t.right} fill="url(#maze-wall-side)" stroke="#1e293b" strokeWidth="1" />
                  <polygon points={t.top} fill="url(#maze-wall)" stroke="#475569" strokeWidth="2" />
                  <path d={`M${t.center.x-19} ${t.center.y-2} l9 -5 l8 4 l-7 5 Z`} fill="#e2e8f0" opacity=".7" />
                  <circle cx={t.center.x+13} cy={t.center.y-2} r="3" fill="#475569" opacity=".65" />
                </>}
                {!wall && <>
                  <polygon points={t.left} fill="#15803d" opacity=".85" />
                  <polygon points={t.right} fill="#166534" opacity=".9" />
                  <polygon points={t.top} fill="url(#maze-grass)" stroke="#dcfce7" strokeOpacity=".65" strokeWidth="1.5" />
                  <path d={`M${t.center.x-15} ${t.center.y} l5 -2 M${t.center.x+12} ${t.center.y+5} l4 -2`} stroke="#ecfccb" strokeWidth="2" strokeLinecap="round" opacity=".55" />
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
          <Robot x={robotCenter.x} y={robotCenter.y-7} direction={direction} animate={running} offsetX={robotOffsetX} offsetY={robotOffsetY} />
          <g transform={`translate(18 ${boardHeight-32})`}>
            <rect x="0" y="-14" width={Math.max(140, boardWidth-36)} height="27" rx="13" fill="#082f49" opacity=".22" />
            <text x="12" y="4" fontSize="11" fontWeight="800" fill="#f0f9ff">JELAJAHI • SUSUN PERINTAH • CAPAI BINTANG</text>
          </g>
        </svg>
      </div>

      <div className="relative z-10 mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-extrabold text-sky-950">
        <span className="inline-flex items-center gap-1"><span className="text-base">🤖</span> Robot</span>
        <span className="inline-flex items-center gap-1"><span className="text-base">🚩</span> Mulai</span>
        <span className="inline-flex items-center gap-1"><span className="text-base">⭐</span> Tujuan</span>
        <span className="inline-flex items-center gap-1"><span className="text-base">🧱</span> Rintangan</span>
      </div>
      {mode === 'edit' && <p className="relative z-10 mt-2 text-center text-[10px] font-semibold text-sky-950/75">Pilih petak untuk {editMode === 'start' ? 'memindahkan titik mulai' : editMode === 'target' ? 'memindahkan tujuan' : 'menambah atau menghapus rintangan'}.</p>}
    </div>
  )
}
