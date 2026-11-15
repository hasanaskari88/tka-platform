'use client'

type Point = { x: number; y: number }
type Props = { width: number; height: number; start: Point; target: Point; obstacles: Point[]; robot: Point; direction: number; running?: boolean }

const W = 62
const H = 34
const DEPTH = 12

export default function MazeV1IsometricBoard({ width, height, start, target, obstacles, robot, direction, running = false }: Props) {
  const cols = Math.max(2, Math.min(12, width))
  const rows = Math.max(2, Math.min(12, height))
  const boardW = (cols + rows) * W / 2
  const boardH = (cols + rows) * H / 2
  const ox = 44 + rows * W / 2
  const oy = 64
  const svgW = boardW + 88
  const svgH = boardH + 116
  const at = (x: number, y: number) => ({ x: ox + (x - y) * W / 2, y: oy + (x + y) * H / 2 })
  const wall = (x: number, y: number) => obstacles.some(p => p.x === x && p.y === y)
  const cells = Array.from({ length: cols * rows }, (_, i) => ({ x: i % cols, y: Math.floor(i / cols) })).sort((a,b) => a.x + a.y - b.x - b.y)
  const robotAt = at(robot.x, robot.y)

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-cyan-100 bg-[linear-gradient(145deg,#7dd3fc,#818cf8_65%,#c4b5fd)] p-3 shadow-2xl sm:p-4">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-fuchsia-200/40 blur-2xl" />
      <div className="relative z-10 flex items-center justify-between px-2 pb-1">
        <div><p className="text-xs font-black uppercase tracking-wider text-sky-950">Pulau Petualangan</p><p className="text-[10px] font-bold text-sky-950/70">Arena labirin 3D isometrik</p></div>
        <span className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[10px] font-black text-sky-950">{cols} × {rows}</span>
      </div>
      <div className="relative z-10 overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} role="img" aria-label={`Labirin 3D ${cols} kali ${rows}`} className="mx-auto block h-auto w-full min-w-[300px] max-w-[760px]">
          <defs>
            <linearGradient id="v1-grass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bbf7d0"/><stop offset=".6" stopColor="#4ade80"/><stop offset="1" stopColor="#15803d"/></linearGradient>
            <linearGradient id="v1-path" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7cc"/><stop offset="1" stopColor="#fbbf24"/></linearGradient>
            <linearGradient id="v1-stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e2e8f0"/><stop offset="1" stopColor="#64748b"/></linearGradient>
            <linearGradient id="v1-portal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0abfc"/><stop offset=".5" stopColor="#8b5cf6"/><stop offset="1" stopColor="#2563eb"/></linearGradient>
          </defs>
          <g fill="#fff" opacity=".8"><path d="M15 38 Q10 25 25 22 Q30 8 46 17 Q61 8 69 27 Q84 27 80 38Z"/><path d={`M${svgW-94} 40 Q${svgW-102} 27 ${svgW-88} 23 Q${svgW-83} 10 ${svgW-67} 18 Q${svgW-53} 9 ${svgW-46} 27 Q${svgW-30} 27 ${svgW-35} 40Z`}/></g>
          <polygon points={`${ox},${oy-8} ${ox+boardW/2},${oy+boardH/2-8} ${ox},${oy+boardH-8} ${ox-boardW/2},${oy+boardH/2-8}`} fill="#14532d" opacity=".28"/>
          {cells.map(({x,y}) => {
            const p = at(x,y)
            const blocked = wall(x,y)
            const top = `${p.x},${p.y-H/2} ${p.x+W/2},${p.y} ${p.x},${p.y+H/2} ${p.x-W/2},${p.y}`
            const left = `${p.x-W/2},${p.y} ${p.x},${p.y+H/2} ${p.x},${p.y+H/2+DEPTH} ${p.x-W/2},${p.y+DEPTH}`
            const right = `${p.x+W/2},${p.y} ${p.x},${p.y+H/2} ${p.x},${p.y+H/2+DEPTH} ${p.x+W/2},${p.y+DEPTH}`
            const isStart = start.x===x && start.y===y
            const isGoal = target.x===x && target.y===y
            return <g key={`${x}-${y}`}>
              <polygon points={left} fill={blocked ? "#475569" : "#15803d"}/>
              <polygon points={right} fill={blocked ? "#334155" : "#166534"}/>
              {blocked ? <g>
                <polygon points={top} transform="translate(0 -12)" fill="#334155" opacity=".4"/>
                <polygon points={top} transform="translate(0 -15)" fill="url(#v1-stone)" stroke="#475569" strokeWidth="2"/>
                <path d={`M${p.x-16} ${p.y-17} h14 m7 0 h10 M${p.x-8} ${p.y-5} h14 m6 0 h7`} stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
              </g> : <g>
                <polygon points={top} fill="url(#v1-path)" stroke="#fff7ed" strokeWidth="2"/>
                <path d={`M${p.x-12} ${p.y} l12 ${H/2-7} l12 ${-H/2+7}`} fill="none" stroke="#d97706" strokeWidth="1.3" strokeDasharray="3 4" opacity=".45"/>
              </g>}
              {isStart && <g transform={`translate(${p.x} ${p.y-8})`}><path d="M-2 8 V-23" stroke="#78350f" strokeWidth="3.5"/><path d="M0 -22 Q14 -28 20 -18 L0 -12Z" fill="#fb7185" stroke="#9f1239" strokeWidth="1.5"/><rect x="-21" y="12" width="42" height="12" rx="6" fill="#166534"/><text x="0" y="20.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff">MULAI</text></g>}
              {isGoal && <g transform={`translate(${p.x} ${p.y-8})`}><circle r="22" fill="#f0abfc" opacity=".3"/><circle r="18" fill="none" stroke="#fef08a" strokeWidth="4"/><circle r="13" fill="url(#v1-portal)" stroke="#fff" strokeWidth="2"/><path d="M0 -7 L2 -2 L8 -2 L3 2 L5 8 L0 4 L-5 8 L-3 2 L-8 -2 L-2 -2Z" fill="#fde047"/><rect x="-19" y="21" width="38" height="12" rx="6" fill="#7e22ce"/><text x="0" y="29.5" textAnchor="middle" fontSize="8" fontWeight="900" fill="#fff">GOAL</text></g>}
            </g>
          })}
          <g transform={`translate(${robotAt.x} ${robotAt.y-9})`}>
            {running && <ellipse cy="8" rx="18" ry="8" fill="#0f172a" opacity=".2"/>}
            <ellipse cy="5" rx="15" ry="10" fill="#0f172a" opacity=".25"/>
            {/* Tubuh robot selalu tegak; hanya penunjuk arah yang berubah. */}
            <rect x="-13" y="-16" width="26" height="27" rx="8" fill="#f8fafc" stroke="#334155" strokeWidth="2.5"/>
            <rect x="-9" y="-11" width="18" height="14" rx="5" fill="#0284c7"/>
            <circle cx="-4" cy="-5" r="2.2" fill="#e0f2fe"/><circle cx="4" cy="-5" r="2.2" fill="#e0f2fe"/>
            <path d="M-4 1 Q0 5 4 1" fill="none" stroke="#e0f2fe" strokeWidth="1.5"/>
            <path d="M-7 -16 L-10 -22 M7 -16 L10 -22" stroke="#475569" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="-10" cy="-22" r="3" fill="#facc15"/><circle cx="10" cy="-22" r="3" fill="#facc15"/>
            <path d="M0 -25 L-5 -16 L5 -16Z" fill="#f97316"/>
            <g transform={`translate(0 -39)`}>
              <circle r="9" fill="#0f172a" stroke="#fff" strokeWidth="1.5"/>
              <path d={["M0 -5 L0 5 M-3 2 L0 5 L3 2","M-5 0 L5 0 M2 -3 L5 0 L2 3","M0 -5 L0 5 M-3 -2 L0 -5 L3 -2","M-5 0 L5 0 M-2 -3 L-5 0 L-2 3"][direction] || "M0 -5 L0 5"} fill="none" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </g>
          <text x="10" y={svgH-12} fontSize="9" fontWeight="900" fill="#082f49">RANGKAI BLOK • JALANKAN ROBOT • CAPAI PORTAL</text>
        </svg>
      </div>
      <div className="relative z-10 mt-1 grid grid-cols-2 gap-2 rounded-xl border border-white/70 bg-white/75 p-2 text-[10px] font-extrabold text-slate-800 sm:grid-cols-4 sm:p-3 sm:text-xs"><span>🤖 Robot</span><span>🚩 Mulai</span><span>🌀 Tujuan</span><span>🧱 Dinding</span></div>
    </div>
  )
}
