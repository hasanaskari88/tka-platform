'use client'

type Point = { x: number; y: number }
type Props = {
  width: number
  height: number
  start: Point
  target: Point
  obstacles: Point[]
  robot: Point
  direction: number
  running?: boolean
  level?: number
}

const CELL = 66
const PAD = 22
const SCENES = [
  { name: 'Padang Ceria', sky: '#bae6fd', grass: '#86efac', path: '#fde68a', edge: '#d97706', wall: '#a16207', top: '#fef3c7', deco: ['🌳', '🌼', '☁️', '🌷'] },
  { name: 'Pantai Tropis', sky: '#a5f3fc', grass: '#fcd34d', path: '#fff1b8', edge: '#d6a64b', wall: '#9a5b35', top: '#fed7aa', deco: ['🌴', '🐚', '☀️', '🦀'] },
  { name: 'Pegunungan Salju', sky: '#dbeafe', grass: '#bfdbfe', path: '#f8fafc', edge: '#94a3b8', wall: '#64748b', top: '#e2e8f0', deco: ['🏔️', '❄️', '🌲', '☁️'] },
  { name: 'Kebun Ajaib', sky: '#fbcfe8', grass: '#d9f99d', path: '#fef08a', edge: '#ca8a04', wall: '#a16207', top: '#fef08a', deco: ['🍄', '🦋', '🌻', '🌈'] },
  { name: 'Hutan Tropis', sky: '#bbf7d0', grass: '#4ade80', path: '#fcd34d', edge: '#b45309', wall: '#57534e', top: '#d6d3d1', deco: ['🦜', '🌴', '🍃', '🌺'] },
]

export default function MazeV1IsometricBoard({
  width, height, start, target, obstacles, robot, direction, running = false, level = 0,
}: Props) {
  const cols = Math.max(2, Math.min(12, width))
  const rows = Math.max(2, Math.min(12, height))
  const scene = SCENES[((level % SCENES.length) + SCENES.length) % SCENES.length]
  const svgW = cols * CELL + PAD * 2
  const svgH = rows * CELL + PAD * 2
  const isBlocked = (x: number, y: number) => obstacles.some(p => p.x === x && p.y === y)
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) }))
  const robotX = PAD + robot.x * CELL + CELL / 2
  const robotY = PAD + robot.y * CELL + CELL / 2
  const arrows = ['↑', '→', '↓', '←']
  const arrow = arrows[((direction % 4) + 4) % 4]
  const decorations = [
    { x: PAD - 5, y: PAD - 5, icon: scene.deco[0] },
    { x: PAD + cols * CELL + 5, y: PAD - 5, icon: scene.deco[1] },
    { x: PAD - 5, y: PAD + rows * CELL + 5, icon: scene.deco[2] },
    { x: PAD + cols * CELL + 5, y: PAD + rows * CELL + 5, icon: scene.deco[3] },
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-white/80 p-3 shadow-xl sm:p-4" style={{ background: scene.sky }}>
      <div className="flex items-center justify-between gap-2 px-1 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-800">🌍 {scene.name}</p>
          <p className="text-[10px] font-bold text-slate-700">Peta tampak atas · petak lurus · pembatas rendah</p>
        </div>
        <span className="rounded-full border border-white/90 bg-white/85 px-3 py-1 text-[10px] font-black text-slate-800">LEVEL {level + 1}</span>
      </div>
      <div className="overflow-x-auto rounded-2xl border-2 border-white/90 bg-white/35 p-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label={`Labirin ${scene.name}, ${cols} kali ${rows}`} className="mx-auto block h-auto w-full min-w-[280px] max-w-[720px]">
          <defs>
            <pattern id="maze-v1-grass-pattern" width="12" height="12" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1" fill="#ffffff" opacity=".4" />
              <circle cx="9" cy="8" r="1" fill="#166534" opacity=".12" />
            </pattern>
            <filter id="maze-v1-low-wall-shadow" x="-30%" y="-50%" width="160%" height="220%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.5" floodColor="#334155" floodOpacity=".3" />
            </filter>
          </defs>
          <rect x={PAD - 4} y={PAD - 4} width={cols * CELL + 8} height={rows * CELL + 8} rx="13" fill="#334155" opacity=".2" />
          {cells.map(({ x, y }) => {
            const px = PAD + x * CELL
            const py = PAD + y * CELL
            const blocked = isBlocked(x, y)
            const isStart = start.x === x && start.y === y
            const isGoal = target.x === x && target.y === y
            return (
              <g key={x + '-' + y}>
                <rect x={px} y={py} width={CELL} height={CELL} fill={scene.grass} stroke="#ffffff" strokeWidth="2" />
                <rect x={px} y={py} width={CELL} height={CELL} fill="url(#maze-v1-grass-pattern)" />
                {!blocked && <rect x={px + 5} y={py + 5} width={CELL - 10} height={CELL - 10} rx="8" fill={scene.path} stroke={scene.edge} strokeWidth="1.5" />}
                {blocked && (
                  <g filter="url(#maze-v1-low-wall-shadow)">
                    {/* Dinding dibuat rendah, sekitar seperempat tinggi karakter. */}
                    <rect x={px + 7} y={py + 32} width={CELL - 14} height="8" rx="4" fill={scene.wall} stroke="#475569" strokeWidth="1.2" />
                    <path d={`M${px + 12} ${py + 34} h${CELL - 24}`} stroke={scene.top} strokeWidth="2" strokeLinecap="round" />
                    <rect x={px + 11} y={py + 40} width={CELL - 22} height="2.5" rx="1" fill="#334155" opacity=".2" />
                  </g>
                )}
                {isStart && <g>
                  <circle cx={px + CELL / 2} cy={py + CELL / 2} r="18" fill="#22c55e" stroke="#ffffff" strokeWidth="3" />
                  <path d={`M${px + CELL / 2} ${py + CELL / 2 + 12} v-27`} stroke="#166534" strokeWidth="3" />
                  <path d={`M${px + CELL / 2 + 1} ${py + CELL / 2 - 14} l16 5 -16 6Z`} fill="#fb7185" stroke="#9f1239" strokeWidth="1" />
                </g>}
                {isGoal && <g>
                  <circle cx={px + CELL / 2} cy={py + CELL / 2} r="19" fill="#8b5cf6" stroke="#ffffff" strokeWidth="3" />
                  <circle cx={px + CELL / 2} cy={py + CELL / 2} r="12" fill="#c4b5fd" stroke="#ffffff" strokeWidth="2" />
                  <path d={`M${px + CELL / 2} ${py + CELL / 2 - 9} l3 7 8 1 -6 5 2 8 -7 -4 -7 4 2 -8 -6 -5 8 -1Z`} fill="#fef08a" />
                </g>}
              </g>
            )
          })}
          {decorations.map((item, index) => (
            <text key={index} x={item.x} y={item.y} textAnchor="middle" dominantBaseline="middle" fontSize="17" pointerEvents="none">{item.icon}</text>
          ))}
          <g transform={`translate(${robotX} ${robotY})`}>
            {running && <circle r="22" fill="#38bdf8" opacity=".3" />}
            <ellipse cy="15" rx="12" ry="4" fill="#0f172a" opacity=".2" />
            <rect x="-11" y="-14" width="22" height="28" rx="7" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
            <rect x="-8" y="-10" width="16" height="12" rx="4" fill="#0284c7" />
            <circle cx="-3.5" cy="-5" r="1.8" fill="#e0f2fe" />
            <circle cx="3.5" cy="-5" r="1.8" fill="#e0f2fe" />
            <path d="M-3 0 Q0 3 3 0" fill="none" stroke="#e0f2fe" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M-11 -7 L-15 -3 M11 -7 L15 -3" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <path d="M-6 13 L-7 17 M6 13 L7 17" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <g transform="translate(0 -22)">
              <circle r="8" fill="#0f172a" stroke="#ffffff" strokeWidth="1.5" />
              <text y="3.5" textAnchor="middle" fontSize="11" fontWeight="900" fill="#facc15">{arrow}</text>
            </g>
          </g>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-xl border border-white/80 bg-white/85 p-2 text-[10px] font-extrabold text-slate-800 sm:text-xs">
        <span>🤖 Robot</span><span>🚩 Mulai</span><span>⭐ Tujuan</span><span>🧱 Penghalang rendah</span>
      </div>
    </div>
  )
}
