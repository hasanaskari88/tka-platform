'use client'

type Point = { x: number; y: number }
type Props = {
  width: number; height: number; start: Point; target: Point; obstacles: Point[]
  robot?: Point; direction?: number; rotation?: 0 | 90 | 180 | 270
  mode?: 'play' | 'edit'; editMode?: 'start' | 'target' | 'obstacle'
  onCellClick?: (x: number, y: number) => void; running?: boolean; title?: string
}
const TILE = 66
const GAP = 5
const STEP = TILE + GAP

function Robot({ x, y, direction = 1, animate = false }: { x: number; y: number; direction?: number; animate?: boolean }) {
  return <g transform={'translate(' + x + ' ' + y + ') rotate(' + (direction * 90) + ')'}>
    {animate && <animateTransform attributeName="transform" type="translate" values={x + ' ' + y + ';' + x + ' ' + (y-3) + ';' + x + ' ' + y} dur="650ms" repeatCount="indefinite" />}
    <ellipse cx="0" cy="4" rx="21" ry="17" fill="#082f49" opacity=".28"/>
    <rect x="-18" y="-18" width="36" height="36" rx="12" fill="#f8fafc" stroke="#334155" strokeWidth="3"/>
    <rect x="-13" y="-12" width="26" height="19" rx="7" fill="#0891b2"/>
    <circle cx="-6" cy="-4" r="3" fill="#cffafe"/><circle cx="6" cy="-4" r="3" fill="#cffafe"/>
    <path d="M-5 2 Q0 6 5 2" fill="none" stroke="#cffafe" strokeWidth="2" strokeLinecap="round"/>
    <path d="M-9 -18 L-13 -25 M9 -18 L13 -25" stroke="#475569" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="-13" cy="-26" r="4" fill="#facc15"/><circle cx="13" cy="-26" r="4" fill="#facc15"/>
    <path d="M-18 -5 L-24 1 M18 -5 L24 1" stroke="#64748b" strokeWidth="5" strokeLinecap="round"/>
    <path d="M-10 17 L-12 22 M10 17 L12 22" stroke="#475569" strokeWidth="5" strokeLinecap="round"/>
    <path d="M0 -26 L-6 -19 L6 -19 Z" fill="#f97316" stroke="#9a3412" strokeWidth="1.5"/>
  </g>
}

export default function MazeV2IsometricBoard({ width, height, start, target, obstacles, robot, direction = 1, mode = 'play', editMode, onCellClick, running = false, title = 'Labirin Petualangan' }: Props) {
  const cols = Math.max(2, Math.min(12, width))
  const rows = Math.max(2, Math.min(12, height))
  const pad = 34, top = 72
  const boardWidth = cols * STEP - GAP, boardHeight = rows * STEP - GAP
  const svgWidth = boardWidth + pad * 2, svgHeight = boardHeight + top + 42
  const cell = (x: number, y: number) => ({ x: pad + x * STEP, y: top + y * STEP })
  const isWall = (x: number, y: number) => obstacles.some(p => p.x === x && p.y === y)
  const activeRobot = robot ?? start
  const robotCell = cell(activeRobot.x, activeRobot.y)

  return <div className="relative isolate overflow-hidden rounded-[1.6rem] border-2 border-cyan-200/70 bg-[linear-gradient(145deg,#67e8f9_0%,#38bdf8_35%,#818cf8_72%,#c084fc_100%)] p-3 shadow-2xl sm:p-5">
    <style jsx>{`
      @keyframes portalGlow { 0%,100% { opacity:.75; transform:scale(.94) } 50% { opacity:1; transform:scale(1.06) } }
      @keyframes floatCloud { 0%,100% { translate:0 0 } 50% { translate:8px 0 } }
      .maze-portal-ring { transform-box:fill-box; transform-origin:center; animation:portalGlow 1.5s ease-in-out infinite; }
      .maze-cloud { animation:floatCloud 5s ease-in-out infinite; }
    `}</style>
    <div className="pointer-events-none absolute -left-8 top-10 h-28 w-28 rounded-full bg-yellow-200/35 blur-xl"/>
    <div className="pointer-events-none absolute -right-8 bottom-8 h-36 w-36 rounded-full bg-fuchsia-200/35 blur-xl"/>
    <div className="relative z-10 mb-3 flex items-center justify-between gap-2">
      <div><span className="text-xs font-black tracking-wide text-sky-950">{title}</span><p className="text-[10px] font-bold text-sky-950/70">Peta petualangan • Tampak dari atas</p></div>
      <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-black text-sky-950 shadow">{cols} × {rows}</span>
    </div>
    <div className="relative z-10 mx-auto w-full overflow-x-auto">
      <svg viewBox={'0 0 ' + svgWidth + ' ' + svgHeight} role="img" aria-label={'Peta labirin tampak atas ' + cols + ' kali ' + rows} className="mx-auto block h-auto w-full min-w-[300px] max-w-[760px]">
        <defs>
          <linearGradient id="maze-meadow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bbf7d0"/><stop offset=".55" stopColor="#4ade80"/><stop offset="1" stopColor="#16a34a"/></linearGradient>
          <linearGradient id="maze-path-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff7cc"/><stop offset="1" stopColor="#fbbf24"/></linearGradient>
          <linearGradient id="maze-rock" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#cbd5e1"/><stop offset="1" stopColor="#64748b"/></linearGradient>
          <linearGradient id="maze-portal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f0abfc"/><stop offset=".5" stopColor="#8b5cf6"/><stop offset="1" stopColor="#2563eb"/></linearGradient>
          <filter id="maze-soft-shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>
        <g className="maze-cloud" opacity=".8" fill="#fff">
          <path d="M24 44 Q17 31 31 27 Q36 11 53 20 Q68 10 76 29 Q92 29 87 44Z"/>
          <path d={'M' + (svgWidth-105) + ' 46 Q' + (svgWidth-112) + ' 33 ' + (svgWidth-98) + ' 29 Q' + (svgWidth-93) + ' 13 ' + (svgWidth-76) + ' 22 Q' + (svgWidth-61) + ' 12 ' + (svgWidth-53) + ' 31 Q' + (svgWidth-37) + ' 31 ' + (svgWidth-42) + ' 46Z'}/>
        </g>
        <rect x={pad-12} y={top-12} width={boardWidth+24} height={boardHeight+24} rx="24" fill="#0f766e" opacity=".28" filter="url(#maze-soft-shadow)"/>
        <rect x={pad-12} y={top-12} width={boardWidth+24} height={boardHeight+24} rx="24" fill="url(#maze-meadow)" stroke="#ecfccb" strokeWidth="5"/>
        <rect x={pad-5} y={top-5} width={boardWidth+10} height={boardHeight+10} rx="17" fill="none" stroke="#f0fdf4" strokeWidth="2" strokeDasharray="5 7" opacity=".9"/>
        {Array.from({length:cols*rows},(_,i)=>({x:i%cols,y:Math.floor(i/cols)})).map(({x,y})=>{
          const p=cell(x,y), wall=isWall(x,y), isStart=start.x===x&&start.y===y, isGoal=target.x===x&&target.y===y
          const clickable=mode==='edit'&&!!onCellClick
          return <g key={x + '-' + y}>
            <rect x={p.x} y={p.y+3} width={TILE} height={TILE} rx="13" fill="#14532d" opacity=".22"/>
            {wall ? <>
              <rect x={p.x+2} y={p.y+5} width={TILE-4} height={TILE-4} rx="12" fill="#334155" opacity=".55"/>
              <rect x={p.x+2} y={p.y-2} width={TILE-4} height={TILE-4} rx="12" fill="url(#maze-rock)" stroke="#475569" strokeWidth="2"/>
              <path d={'M'+(p.x+8)+' '+(p.y+17)+' h20 m8 0 h13 M'+(p.x+17)+' '+(p.y+34)+' h18 m7 0 h8'} stroke="#475569" strokeWidth="2" opacity=".65" strokeLinecap="round"/>
              <path d={'M'+(p.x+9)+' '+(p.y+8)+' h18'} stroke="#fff" strokeWidth="3" opacity=".55" strokeLinecap="round"/>
            </> : <>
              <rect x={p.x} y={p.y} width={TILE} height={TILE} rx="12" fill="url(#maze-path-top)" stroke="#fff7ed" strokeWidth="2.5"/>
              <rect x={p.x+6} y={p.y+6} width={TILE-12} height={TILE-12} rx="8" fill="none" stroke="#d97706" strokeWidth="1.5" strokeDasharray="4 5" opacity=".45"/>
              <circle cx={p.x+12} cy={p.y+12} r="2" fill="#fff" opacity=".8"/>
            </>}
            {isStart&&<g transform={'translate('+(p.x+TILE/2)+' '+(p.y+TILE/2)+')'}>
              <circle r="22" fill="#0f766e" opacity=".18"/><path d="M-2 14 V-19" stroke="#78350f" strokeWidth="4" strokeLinecap="round"/><path d="M0 -18 Q16 -25 23 -14 L0 -7Z" fill="#fb7185" stroke="#9f1239" strokeWidth="2"/><rect x="-26" y="17" width="52" height="15" rx="7" fill="#166534"/><text x="0" y="28" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff">MULAI</text>
            </g>}
            {isGoal&&<g transform={'translate('+(p.x+TILE/2)+' '+(p.y+TILE/2)+')'}>
              <circle r="31" fill="#f0abfc" opacity=".42" filter="url(#maze-soft-shadow)"/>
              <circle r="27" fill="none" stroke="#fef08a" strokeWidth="5" className="maze-portal-ring"/>
              <circle r="21" fill="url(#maze-portal)" stroke="#fff" strokeWidth="3"/>
              <circle r="13" fill="#1e1b4b" stroke="#c4b5fd" strokeWidth="2"/>
              <path d="M0 -10 L3 -3 L11 -3 L5 2 L7 10 L0 5 L-7 10 L-5 2 L-11 -3 L-3 -3Z" fill="#fde047" stroke="#fff7ed" strokeWidth="1"/>
              <rect x="-25" y="29" width="50" height="16" rx="8" fill="#7e22ce" stroke="#fff" strokeWidth="1.5"/>
              <text x="0" y="40" textAnchor="middle" fontSize="10" fontWeight="900" fill="#fff">GOAL</text>
            </g>}
            {clickable&&<rect x={p.x} y={p.y} width={TILE} height={TILE} rx="12" fill="transparent" stroke="#fff" strokeWidth="2" strokeDasharray="4 3" className="cursor-pointer hover:fill-white/30" role="button" tabIndex={0} aria-label={'Pilih petak ' + x + ', ' + y} onClick={()=>!running&&onCellClick?.(x,y)} onKeyDown={ev=>{if(!running&&(ev.key==='Enter'||ev.key===' ')){ev.preventDefault();onCellClick?.(x,y)}}}/>}
          </g>
        })}
        <Robot x={robotCell.x+TILE/2} y={robotCell.y+TILE/2} direction={direction} animate={running}/>
        <g transform={'translate('+pad+' '+(svgHeight-17)+')'}><text x="0" y="0" fontSize="10" fontWeight="900" fill="#082f49">JELAJAHI • SUSUN PERINTAH • MASUK KE PORTAL GOAL</text></g>
      </svg>
    </div>
    <div className="relative z-10 mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/70 bg-white/75 p-3 text-xs font-extrabold text-slate-800 sm:grid-cols-4">
      <span className="inline-flex items-center gap-2"><span className="text-xl">🤖</span> Robot</span>
      <span className="inline-flex items-center gap-2"><span className="text-xl">🚩</span> Titik mulai</span>
      <span className="inline-flex items-center gap-2"><span className="text-xl">🌀</span> Goal / Tujuan</span>
      <span className="inline-flex items-center gap-2"><span className="inline-block h-4 w-4 rounded bg-gradient-to-br from-amber-100 to-amber-400 ring-2 ring-amber-700/30"/> Jalan</span>
      <span className="inline-flex items-center gap-2 sm:col-span-4"><span className="text-xl">🧱</span> Penghalang (batu sedikit terangkat)</span>
    </div>
    {mode==='edit'&&<p className="relative z-10 mt-2 text-center text-[10px] font-semibold text-sky-950/75">Pilih petak untuk {editMode==='start'?'memindahkan titik mulai':editMode==='target'?'memindahkan tujuan':'menambah atau menghapus rintangan'}.</p>}
  </div>
}
