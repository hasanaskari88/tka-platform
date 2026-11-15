'use client'

type Point = { x: number; y: number }
type Props = { width: number; height: number; start: Point; target: Point; obstacles: Point[]; robot: Point; direction: number; running?: boolean }

const CELL = 64
const PAD = 18

export default function MazeV1IsometricBoard({ width, height, start, target, obstacles, robot, direction, running = false }: Props) {
  const cols = Math.max(2, Math.min(14, width))
  const rows = Math.max(2, Math.min(14, height))
  const svgW = cols * CELL + PAD * 2
  const svgH = rows * CELL + PAD * 2 + 34
  const blocked = (x: number, y: number) => obstacles.some(p => p.x === x && p.y === y)
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) }))
  const robotX = PAD + robot.x * CELL + CELL / 2
  const robotY = PAD + robot.y * CELL + CELL / 2 + 17
  const arrows = ['↑', '→', '↓', '←']
  const arrow = arrows[((direction % 4) + 4) % 4]

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-300 via-cyan-200 to-indigo-300 p-3 shadow-2xl sm:p-4">
      <div className="pointer-events-none absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl" />
      <div className="relative z-10 flex items-center justify-between gap-2 px-1 pb-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-sky-950">Peta Labirin</p>
          <p className="text-[10px] font-bold text-sky-950/70">Petak lurus · jalur kotak</p>
        </div>
        <span className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[10px] font-black text-sky-950">{cols} × {rows}</span>
      </div>
      <div className="relative z-10 overflow-x-auto rounded-2xl border border-white/70 bg-white/35 p-2">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label={`Peta labirin kotak ${cols} kali ${rows}`} className="mx-auto block h-auto w-full min-w-[280px] max-w-[720px]">
          <defs>
            <linearGradient id="maze-v1-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bbf7d0"/><stop offset="1" stopColor="#4ade80"/></linearGradient>
            <linearGradient id="maze-v1-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#94a3b8"/><stop offset="1" stopColor="#475569"/></linearGradient>
            <filter id="maze-v1-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#0f172a" floodOpacity=".25"/></filter>
          </defs>
          <rect x={PAD-5} y={PAD-5} width={cols*CELL+10} height={rows*CELL+10} rx="16" fill="#166534" opacity=".3"/>
          {cells.map(({x,y}) => {
            const px = PAD + x*CELL
            const py = PAD + y*CELL + 17
            const isWall = blocked(x,y)
            const isStart = start.x===x && start.y===y
            const isGoal = target.x===x && target.y===y
            return <g key={`${x}-${y}`}>
              <rect x={px} y={py} width={CELL} height={CELL} fill={isWall ? "#64748b" : "url(#maze-v1-ground)"} stroke={isWall ? "#334155" : "#f0fdf4"} strokeWidth="2"/>
              {!isWall && <path d={`M${px+7} ${py+CELL-10} h12 m8 0 h7`} stroke="#15803d" strokeWidth="2" strokeLinecap="round" opacity=".35"/>}
              {isWall && <g filter="url(#maze-v1-shadow)">
                <rect x={px+7} y={py+7} width={CELL-14} height={CELL-14} rx="8" fill="url(#maze-v1-wall)" stroke="#334155" strokeWidth="2"/>
                <path d={`M${px+13} ${py+24} h15 m6 0 h10 M${px+13} ${py+39} h10 m7 0 h14`} stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" opacity=".8"/>
              </g>}
              {isStart && <g>
                <circle cx={px+CELL/2} cy={py+CELL/2} r="23" fill="#16a34a" stroke="#dcfce7" strokeWidth="3"/>
                <path d={`M${px+CELL/2-1} ${py+CELL/2+13} v-29`} stroke="#14532d" strokeWidth="3"/>
                <path d={`M${px+CELL/2+1} ${py+CELL/2-15} l17 6 -17 7Z`} fill="#fb7185" stroke="#9f1239" strokeWidth="1.5"/>
                <text x={px+CELL/2} y={py+CELL-3} fontSize="8" textAnchor="middle" fontWeight="900" fill="#14532d">MULAI</text>
              </g>}
              {isGoal && <g>
                <circle cx={px+CELL/2} cy={py+CELL/2} r="23" fill="#7c3aed" stroke="#f5d0fe" strokeWidth="4"/>
                <circle cx={px+CELL/2} cy={py+CELL/2} r="15" fill="#c4b5fd" stroke="#fff" strokeWidth="2"/>
                <path d={`M${px+CELL/2} ${py+CELL/2-10} l4 8 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1Z`} fill="#fef08a"/>
                <text x={px+CELL/2} y={py+CELL-3} fontSize="8" textAnchor="middle" fontWeight="900" fill="#581c87">TUJUAN</text>
              </g>}
            </g>
          })}
          <g transform={`translate(${robotX} ${robotY})`} filter="url(#maze-v1-shadow)">
            {running && <circle r="25" fill="#38bdf8" opacity=".25"/>}
            <ellipse cy="18" rx="15" ry="5" fill="#0f172a" opacity=".22"/>
            <rect x="-13" y="-17" width="26" height="31" rx="9" fill="#f8fafc" stroke="#334155" strokeWidth="2.5"/>
            <rect x="-9" y="-12" width="18" height="15" rx="5" fill="#0284c7"/>
            <circle cx="-4" cy="-6" r="2.4" fill="#e0f2fe"/><circle cx="4" cy="-6" r="2.4" fill="#e0f2fe"/>
            <path d="M-4 0 Q0 4 4 0" fill="none" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M-13 -8 L-19 -3 M13 -8 L19 -3" stroke="#334155" strokeWidth="4" strokeLinecap="round"/>
            <path d="M-7 13 L-9 18 M7 13 L9 18" stroke="#334155" strokeWidth="4" strokeLinecap="round"/>
            <path d="M0 -17 V-23" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cy="-25" r="4" fill="#facc15" stroke="#854d0e" strokeWidth="1"/>
            <g transform="translate(0 -39)">
              <circle r="10" fill="#0f172a" stroke="#fff" strokeWidth="1.5"/>
              <text y="4" textAnchor="middle" fontSize="12" fontWeight="900" fill="#facc15">{arrow}</text>
            </g>
          </g>
          <text x={PAD} y={svgH-7} fontSize="9" fontWeight="900" fill="#082f49">SUSUN BLOK • JALANKAN ROBOT • CAPAI TUJUAN</text>
        </svg>
      </div>
      <div className="relative z-10 mt-2 grid grid-cols-2 gap-2 rounded-xl border border-white/70 bg-white/75 p-2 text-[10px] font-extrabold text-slate-800 sm:grid-cols-4 sm:p-3 sm:text-xs">
        <span>🤖 Robot</span><span>🚩 Mulai</span><span>⭐ Tujuan</span><span>🧱 Penghalang</span>
      </div>
    </div>
  )
}
