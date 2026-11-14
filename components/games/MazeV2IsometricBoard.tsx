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

const arrows = ['⬆️', '➡️', '⬇️', '⬅️']

export default function MazeV2IsometricBoard({
  width, height, start, target, obstacles, robot, direction = 1,
  mode = 'play', editMode, onCellClick, running = false, title = 'Labirin 3D',
}: Props) {
  const isWall = (x: number, y: number) => obstacles.some((p) => p.x === x && p.y === y)
  const activeRobot = robot ?? start
  return (
    <div className="relative isolate overflow-hidden rounded-[1.6rem] border border-sky-200/20 bg-[radial-gradient(ellipse_at_50%_35%,#2563a5_0%,#102b4c_48%,#07172d_100%)] p-3 sm:p-5">
      <div className="pointer-events-none absolute inset-0 opacity-20" style={{backgroundImage:'radial-gradient(#bae6fd 1px,transparent 1px)',backgroundSize:'22px 22px'}} />
      <div className="relative z-10 mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-black tracking-wide text-sky-100">{title}</span>
        <span className="rounded-full border border-white/15 bg-slate-950/40 px-2.5 py-1 text-[10px] font-bold text-sky-100">{width} × {height}</span>
      </div>
      <div className="relative mx-auto flex w-full items-center justify-center overflow-visible py-5" style={{minHeight: 'clamp(250px, 42vw, 430px)', perspective:'1000px'}}>
        <div className="relative" style={{
          display:'grid', gridTemplateColumns:`repeat(${width}, minmax(0, 1fr))`,
          width:`min(100%, ${Math.min(width * 62, 560)}px)`,
          aspectRatio:`${width}/${height}`,
          transform:'rotateX(54deg) rotateZ(45deg) scale(.78)',
          transformStyle:'preserve-3d',
          filter:'drop-shadow(0 28px 18px rgba(0,0,0,.42))',
        }}>
          {Array.from({length:width*height},(_,i)=>{
            const x=i%width, y=Math.floor(i/width)
            const wall=isWall(x,y), isRobot=activeRobot.x===x&&activeRobot.y===y
            const isGoal=target.x===x&&target.y===y, isStart=start.x===x&&start.y===y
            const clickable=mode==='edit'&&!!onCellClick
            return (
              <button key={`${x}-${y}`} type="button" disabled={!clickable||running}
                onClick={()=>onCellClick?.(x,y)}
                aria-label={`Kotak ${x}, ${y}${wall?', dinding':''}`}
                className={`group relative flex aspect-square min-w-0 items-center justify-center border transition-all ${clickable?'cursor-pointer hover:brightness-125':''} ${wall?'border-slate-500/80 bg-gradient-to-br from-slate-500 to-slate-800':'border-cyan-100/20 bg-gradient-to-br from-emerald-300 via-emerald-500 to-emerald-800'}`}
                style={{
                  borderRadius:'5px',
                  boxShadow: wall
                    ? 'inset 2px 2px 5px rgba(255,255,255,.2), inset -5px -7px 8px rgba(0,0,0,.35), 5px 7px 0 #26384a, 8px 11px 12px rgba(0,0,0,.25)'
                    : 'inset 2px 2px 5px rgba(255,255,255,.25), inset -4px -5px 7px rgba(0,0,0,.2), 3px 4px 0 rgba(5,55,62,.75)',
                  transform: wall ? 'translateZ(9px)' : 'translateZ(0)',
                }}>
                {wall ? <span className="text-[clamp(12px,2.2vw,23px)] drop-shadow-lg" style={{transform:'rotateZ(-45deg) rotateX(-54deg)'}}>🪨</span> : <span className="absolute inset-1 rounded-md border border-white/10 bg-white/5" />}
                {isStart && <span className="absolute inset-0 flex items-center justify-center text-[clamp(12px,2.5vw,25px)] drop-shadow-lg" style={{transform:'rotateZ(-45deg) rotateX(-54deg)'}}>🏁</span>}
                {isGoal && <span className="absolute inset-0 flex items-center justify-center text-[clamp(15px,2.8vw,28px)] drop-shadow-[0_0_8px_#fde047]" style={{transform:'rotateZ(-45deg) rotateX(-54deg)'}}>⭐</span>}
                {isRobot && <span className="absolute z-20 flex items-center justify-center text-[clamp(18px,3.2vw,32px)] drop-shadow-[0_8px_5px_rgba(0,0,0,.6)]" style={{transform:'rotateZ(-45deg) rotateX(-54deg) translateY(-8px)'}}>{arrows[direction] ?? '🤖'}<span className="absolute -top-3 text-[.55em]">🤖</span></span>}
                {clickable && <span className="absolute bottom-0 right-0 rounded-tl bg-slate-950/60 px-1 text-[8px] text-white">{x},{y}</span>}
              </button>
            )
          })}
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] font-bold text-sky-100/90">
        <span>🤖 Robot</span><span>🏁 Titik awal</span><span>⭐ Tujuan</span><span>🪨 Dinding</span>
      </div>
      {mode==='edit' && <p className="relative z-10 mt-2 text-center text-[10px] text-sky-100/70">Ketuk petak untuk menempatkan {editMode==='start'?'robot':editMode==='target'?'bintang':'atau menghapus dinding'}.</p>}
    </div>
  )
}
