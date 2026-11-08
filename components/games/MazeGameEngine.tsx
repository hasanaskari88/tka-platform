
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
  pembahasan?: string
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

interface MazeGameProps {
  exam: any
  questions: MazeQuestion[]
}

type Direction = 0 | 1 | 2 | 3
type Command = 'FORWARD' | 'LEFT' | 'RIGHT'

const DIRECTIONS = [
  { x: 0, y: -1, label: 'Utara' },
  { x: 1, y: 0, label: 'Timur' },
  { x: 0, y: 1, label: 'Selatan' },
  { x: -1, y: 0, label: 'Barat' },
]

const COMMANDS: {
  id: Command
  label: string
  icon: string
}[] = [
  { id: 'FORWARD', label: 'Maju', icon: '⬆️' },
  { id: 'LEFT', label: 'Belok Kiri', icon: '↶' },
  { id: 'RIGHT', label: 'Belok Kanan', icon: '↷' },
]

export default function MazeGameEngine({
  exam,
  questions = [],
}: MazeGameProps) {
  const router = useRouter()

  const missions = useMemo(() => questions, [questions])

  const [missionIndex, setMissionIndex] = useState(0)
  const currentMission = missions[missionIndex]

  // Attempt
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [attemptLoading, setAttemptLoading] = useState(true)
  const [attemptError, setAttemptError] = useState('')
  const [attemptRetryKey, setAttemptRetryKey] = useState(0)
  const [isSavingAndExit, setIsSavingAndExit] = useState(false)
  const [isResumedSession, setIsResumedSession] = useState(false)

  // Satu Promise untuk mencegah pembuatan attempt ganda
  // ketika React Strict Mode menjalankan effect dua kali.
  const startAttemptPromiseRef = useRef<Promise<{
    attemptId: string
    progress: any
    resumed: boolean
  }> | null>(null)

  // Progress misi
  const [completedCount, setCompletedCount] = useState(0)
  const completedMissionIdsRef = useRef<Set<string>>(new Set())

  // Finalisasi
  const finishingRef = useRef(false)
  const [finishSummary, setFinishSummary] = useState<any>(null)
  const [isFinishing, setIsFinishing] = useState(false)

  // Ukuran papan
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
    const value = currentMission?.obstacles

    if (!Array.isArray(value)) return []

    return value
      .filter(
        (item: any) =>
          Number.isInteger(Number(item?.x)) &&
          Number.isInteger(Number(item?.y))
      )
      .map((item: any) => ({
        x: Number(item.x),
        y: Number(item.y),
      }))
  }, [currentMission])

  const isWall = (position: Position) =>
    obstacles.some(
      (wall) => wall.x === position.x && wall.y === position.y
    )

  // Kondisi permainan
  const [commands, setCommands] = useState<Command[]>([])
  const [robot, setRobot] = useState<Position>(start)
  const [direction, setDirection] = useState<Direction>(1)
  const [isRunning, setIsRunning] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [feedback, setFeedback] = useState(
    'Susun blok perintah, lalu jalankan program!'
  )

  // ==========================================
  // 1. MEMULAI ATTEMPT
  // ==========================================

  useEffect(() => {
    let active = true

    async function startAttempt() {
      if (questions.length === 0) {
        setAttemptError(
          'Modul Maze belum memiliki misi. Silakan hubungi guru atau admin.'
        )
        setAttemptLoading(false)
        return
      }

      if (!exam?.id) {
        setAttemptError('ID modul tidak ditemukan.')
        setAttemptLoading(false)
        return
      }

      try {
        if (!startAttemptPromiseRef.current) {
          startAttemptPromiseRef.current = (async () => {
            const supabase = createClient()

            const { data, error } = await supabase.rpc(
              'start_practice_attempt',
              {
                p_exam_id: exam.id,
              }
            )

            if (error) throw error

            // Mendukung respons UUID langsung maupun objek.
            const newAttemptId =
              typeof data === 'string'
                ? data
                : data?.attempt_id ?? data?.id

            if (!newAttemptId) {
              throw new Error('ID attempt tidak ditemukan dari RPC.')
            }

            return {
              attemptId: String(newAttemptId),
              progress: data?.progress ?? {},
              resumed: Boolean(data?.resumed),
            }
          })()
        }

        const startResult = await startAttemptPromiseRef.current

        if (active) {
          const saved = startResult.progress || {}
          const restoredIds = Array.isArray(saved.completedMissionIds)
            ? saved.completedMissionIds.map(String)
            : []

          completedMissionIdsRef.current = new Set(restoredIds)
          setCompletedCount(restoredIds.length)
          setMissionIndex(
            Math.min(
              Number(saved.missionIndex || 0),
              Math.max(0, missions.length - 1)
            )
          )
          setAttemptId(startResult.attemptId)
          setIsResumedSession(startResult.resumed)
          setAttemptError('')
          setAttemptLoading(false)
        }
      } catch (error) {
        console.error('Gagal memulai Maze attempt:', error)

        // Izinkan percobaan ulang setelah kegagalan.
        startAttemptPromiseRef.current = null

        if (active) {
          setAttemptError('Gagal memulai sesi Maze. Silakan coba lagi.')
          setAttemptLoading(false)
        }
      }
    }

    startAttempt()

    return () => {
      active = false
    }
  }, [exam?.id, questions.length, attemptRetryKey])

  const retryStartAttempt = () => {
    startAttemptPromiseRef.current = null
    setAttemptId(null)
    setAttemptError('')
    setAttemptLoading(true)
    setAttemptRetryKey((previous) => previous + 1)
  }

  // ==========================================
  // 2. RESET SAAT PINDAH MISI
  // ==========================================

  useEffect(() => {
    setCommands([])

    setRobot({
      x: Number(currentMission?.start_x ?? 0),
      y: Number(currentMission?.start_y ?? 0),
    })

    setDirection(1)
    setIsRunning(false)
    setIsComplete(false)
    setFeedback('Misi siap! Susun algoritmamu.')
  }, [missionIndex, currentMission])

  // ==========================================
  // 3. INFORMASI KESULITAN
  // ==========================================

  const difficultyLabel = (() => {
    const value = String(
      currentMission?.difficulty ?? 'medium'
    ).toLowerCase()

    if (value === 'easy' || value === 'mudah') return 'Mudah'
    if (value === 'hard' || value === 'sulit') return 'Sulit'

    return 'Sedang'
  })()

  // ==========================================
  // 4. BLOK PERINTAH
  // ==========================================

  const addCommand = (command: Command) => {
    if (isRunning || isComplete || isFinishing) return

    setCommands((previous) => [...previous, command])
    setFeedback('Perintah ditambahkan.')
  }

  const resetRobot = () => {
  if (isRunning || isFinishing) return

  setCommands([])
  setRobot({ ...start })
  setDirection(1)
  setIsRunning(false)
  setIsComplete(false)
  setFeedback('Robot kembali ke titik awal. Susun ulang perintah dan coba lagi!')
}

  // ==========================================
  // 5. SIMPAN PROGRES DAN FINALISASI ATTEMPT
  // ==========================================

  const persistMazeProgress = async (
    nextCompletedCount: number,
    completedIds: string[],
    nextMissionIndex = missionIndex
  ) => {
    if (!attemptId) return false

    const progress = {
      missionIndex: nextMissionIndex,
      completedMissionIds: completedIds,
      completedCount: nextCompletedCount,
    }

    const { error } = await createClient().rpc(
      'save_practice_attempt_progress',
      {
        p_attempt_id: attemptId,
        p_progress: progress,
        p_answered_count: nextCompletedCount,
        p_correct_count: nextCompletedCount,
        p_answer_xp: nextCompletedCount * 10,
        p_streak_xp: 0,
      }
    )

    if (error) {
      console.error('Gagal menyimpan progres Maze:', error)
      return false
    }
    return true
  }

  const finishMaze = async (newCompletedCount: number) => {
    if (
      !attemptId ||
      finishingRef.current ||
      newCompletedCount !== missions.length
    ) {
      return
    }

    finishingRef.current = true
    setIsFinishing(true)

    try {
      const completedIds = Array.from(completedMissionIdsRef.current)
      await persistMazeProgress(newCompletedCount, completedIds)

      const supabase = createClient()

      const { data, error } = await supabase.rpc(
        'finish_practice_attempt',
        {
          p_attempt_id: attemptId,
          p_answered_count: newCompletedCount,
          p_correct_count: newCompletedCount,
          p_streak_xp: 0,
        }
      )

      if (error) throw error

      setFinishSummary(data)
      setFeedback('🏆 Semua misi berhasil diselesaikan!')
    } catch (error) {
      console.error('Gagal menyimpan hasil Maze:', error)

      // Reset guard supaya finalisasi bisa dicoba lagi.
      finishingRef.current = false

      setFeedback(
        'Semua misi selesai, tetapi hasil belum tersimpan. Tekan tombol coba simpan lagi.'
      )
    } finally {
      setIsFinishing(false)
    }
  }

  // ==========================================
  // 6. MENJALANKAN PROGRAM ROBOT
  // ==========================================

  const runProgram = async () => {
    if (
      isRunning ||
      isComplete ||
      !attemptId ||
      isFinishing
    ) {
      return
    }

    if (commands.length === 0) {
      setFeedback('Tambahkan setidaknya satu blok perintah.')
      return
    }

    // Validasi konfigurasi papan.
    if (
      start.x < 0 ||
      start.x >= width ||
      start.y < 0 ||
      start.y >= height ||
      target.x < 0 ||
      target.x >= width ||
      target.y < 0 ||
      target.y >= height ||
      isWall(start) ||
      isWall(target)
    ) {
      setFeedback(
        'Konfigurasi misi tidak valid. Periksa posisi awal, target, dan rintangan.'
      )
      return
    }

    setIsRunning(true)

    let nextRobot: Position = { ...start }
    let nextDirection: Direction = 1

    let reachedGoal =
      nextRobot.x === target.x &&
      nextRobot.y === target.y

    let crashed = false

    for (const command of commands) {
      if (reachedGoal) break

      if (command === 'LEFT') {
        nextDirection = ((nextDirection + 3) % 4) as Direction
      } else if (command === 'RIGHT') {
        nextDirection = ((nextDirection + 1) % 4) as Direction
      } else {
        const movement = DIRECTIONS[nextDirection]

        const nextPosition = {
          x: nextRobot.x + movement.x,
          y: nextRobot.y + movement.y,
        }

        if (
          nextPosition.x < 0 ||
          nextPosition.x >= width ||
          nextPosition.y < 0 ||
          nextPosition.y >= height ||
          isWall(nextPosition)
        ) {
          crashed = true
          break
        }

        nextRobot = nextPosition
      }

      setRobot({ ...nextRobot })
      setDirection(nextDirection)

      if (
        nextRobot.x === target.x &&
        nextRobot.y === target.y
      ) {
        reachedGoal = true
      }
    }

    setIsRunning(false)

    if (reachedGoal) {
      setIsComplete(true)

      const missionId = String(
        currentMission?.id ?? `mission-${missionIndex}`
      )

      // Mencegah misi yang sama dihitung dua kali.
      if (!completedMissionIdsRef.current.has(missionId)) {
        completedMissionIdsRef.current.add(missionId)

        const newCount = completedMissionIdsRef.current.size

        setCompletedCount(newCount)
        setFeedback('🎉 Hebat! Robot berhasil mencapai bintang!')

        const completedIds = Array.from(completedMissionIdsRef.current)
        if (newCount === missions.length) {
          await finishMaze(newCount)
        } else {
          const saved = await persistMazeProgress(
            newCount,
            completedIds,
            Math.min(missionIndex + 1, missions.length - 1)
          )
          if (!saved) {
            setFeedback('Misi berhasil, tetapi progres belum tersinkron. Tekan Simpan & Keluar untuk mencoba menyimpan lagi.')
          }
        }
      }
    } else if (crashed) {
      setFeedback(
        '💥 Robot menabrak penghalang atau keluar papan. Coba lagi!'
      )
    } else {
      setFeedback(
        'Robot belum mencapai bintang. Perbaiki algoritmamu!'
      )
    }
  }

  // ==========================================
  // 7. COBA FINALISASI LAGI
  // ==========================================

  const retryFinishMaze = async () => {
    if (
      completedMissionIdsRef.current.size !== missions.length ||
      finishSummary ||
      isFinishing
    ) {
      return
    }

    await finishMaze(completedMissionIdsRef.current.size)
  }

  // ==========================================
  // 8. PINDAH MISI
  // ==========================================

  const nextMission = () => {
    if (
      missionIndex >= missions.length - 1 ||
      !isComplete ||
      isFinishing
    ) {
      return
    }

    setMissionIndex((previous) => previous + 1)
  }

  // ==========================================
  // 9. KELUAR DAN ABANDON ATTEMPT
  // ==========================================

  const handleExit = async () => {
    if (isRunning || isFinishing || isSavingAndExit) return

    if (finishSummary || !attemptId) {
      router.push('/practice')
      return
    }

    setIsSavingAndExit(true)
    const completedIds = Array.from(completedMissionIdsRef.current)
    const saved = await persistMazeProgress(
      completedIds.length,
      completedIds,
      missionIndex
    )
    setIsSavingAndExit(false)

    if (!saved) {
      alert('Progres Maze belum berhasil disimpan. Periksa koneksi lalu coba lagi.')
      return
    }

    router.push('/practice')
  }

  // ==========================================
  // 10. TAMPILAN LOADING
  // ==========================================

  if (attemptLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Memulai sesi Maze...
      </div>
    )
  }

  // ==========================================
  // 11. TAMPILAN ERROR
  // ==========================================

  if (attemptError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="max-w-md text-center">
          <p>{attemptError}</p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={retryStartAttempt}
              className="rounded-xl bg-indigo-600 px-5 py-3 font-bold"
            >
              Coba Lagi
            </button>

            <button
              type="button"
              onClick={() => router.push('/practice')}
              className="rounded-xl bg-slate-700 px-5 py-3 font-bold"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!currentMission) return null

  // ==========================================
  // 12. TAMPILAN UTAMA
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <header className="border-b border-slate-800 bg-slate-900 px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={handleExit}
              disabled={isRunning || isFinishing || isSavingAndExit}
              className="text-xs font-bold text-emerald-300 hover:text-white disabled:opacity-40"
            >
              {isSavingAndExit ? 'Menyimpan...' : '💾 Simpan & Keluar'}
            </button>

            <h1 className="mt-2 text-lg font-extrabold">
              🤖 {exam?.title || 'Misi Labirin Robot'}
            </h1>

            <p className="text-xs text-slate-400">
              Misi {missionIndex + 1} dari {missions.length}
              {' · '}
              Berhasil {completedCount}
            </p>
            {isResumedSession && (
              <p className="mt-1 text-[10px] font-semibold text-emerald-300">
                Progres sesi sebelumnya dipulihkan
              </p>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-bold text-amber-300">
            ⭐ {completedCount * 10} XP
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 p-4 md:grid-cols-2 md:p-6">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="mb-2 font-extrabold">
            🗺️ Papan Labirin
          </h2>

          <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <span>Arah: {DIRECTIONS[direction].label}</span>
            <span>·</span>
            <span>Kesulitan: {difficultyLabel}</span>
            <span>·</span>
            <span>
              {width} × {height}
            </span>
          </div>

          <div
            className="grid aspect-square gap-1"
            style={{
              gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
            }}
            role="img"
            aria-label={`Papan labirin ${width} kali ${height}`}
          >
            {Array.from(
              { length: width * height },
              (_, index) => {
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
                    className={`flex aspect-square items-center justify-center rounded-md border text-base sm:text-2xl ${
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
              }
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
            <span>🤖 Robot</span>
            <span>🏁 Awal</span>
            <span>⭐ Tujuan</span>
            <span>🧱 Penghalang</span>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-extrabold">🎯 Misi</h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {currentMission.question_text ||
                'Arahkan robot menuju bintang.'}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="mb-3 font-extrabold">
              🧩 Blok Perintah
            </h2>

            <div className="grid grid-cols-3 gap-2">
              {COMMANDS.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  disabled={
                    isRunning ||
                    isComplete ||
                    isFinishing
                  }
                  onClick={() => addCommand(command.id)}
                  className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-2 py-3 text-xs font-bold text-indigo-200 disabled:opacity-40"
                >
                  <span className="mb-1 block text-xl">
                    {command.icon}
                  </span>

                  {command.label}
                </button>
              ))}
            </div>

            <h3 className="mb-2 mt-5 text-xs font-bold text-slate-400">
              ALGORITMA KAMU
            </h3>

            <div className="min-h-24 space-y-2 rounded-xl border border-dashed border-slate-700 bg-slate-950 p-3">
              {commands.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Blok perintah akan muncul di sini.
                </p>
              ) : (
                commands.map((command, index) => {
                  const item = COMMANDS.find(
                    (entry) => entry.id === command
                  )

                  return (
                    <div
                      key={`${command}-${index}`}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold"
                    >
                      {index + 1}. {item?.icon} {item?.label}
                    </div>
                  )
                })
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={
                  isRunning ||
                  isComplete ||
                  isFinishing ||
                  commands.length === 0
                }
                onClick={() => {
                  setCommands((previous) => previous.slice(0, -1))
                  setFeedback('Blok terakhir dihapus.')
                }}
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold disabled:opacity-40"
              >
                ⌫ Hapus Blok
              </button>

              <button
                type="button"
                disabled={
                  isRunning ||
                  isComplete ||
                  isFinishing
                }
                onClick={() => {
                  setCommands([])
                  resetRobot()
                }}
                className="rounded-xl bg-slate-800 px-3 py-3 text-xs font-bold disabled:opacity-40"
              >
                ↺ Ulangi
              </button>
            </div>

            <button
              type="button"
              disabled={
                isRunning ||
                isComplete ||
                isFinishing
              }
              onClick={runProgram}
              className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-3 font-extrabold disabled:opacity-40"
            >
              ▶ Jalankan Program
            </button>
          </div>

          <div
            aria-live="polite"
            className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm text-indigo-100"
          >
            {feedback}
          </div>

          {isComplete && missionIndex < missions.length - 1 && (
            <button
              type="button"
              onClick={nextMission}
              disabled={isFinishing}
              className="w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950 disabled:opacity-40"
            >
              Misi Berikutnya →
            </button>
          )}

          {/* Retry finalisasi jika seluruh misi sudah selesai */}
          {completedCount === missions.length &&
            !finishSummary &&
            !isFinishing && (
              <button
                type="button"
                onClick={retryFinishMaze}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 font-extrabold text-slate-950"
              >
                Coba Simpan Hasil Lagi
              </button>
            )}

          {/* Ringkasan hasil */}
          {finishSummary && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <h2 className="text-lg font-extrabold text-emerald-300">
                🏆 Semua Misi Selesai!
              </h2>

              <p className="mt-2 text-sm">
                Nilai: {finishSummary.score ?? 0}
              </p>

              <p className="text-sm">
                Total XP: +{finishSummary.total_xp ?? 0}
              </p>

              <button
                type="button"
                onClick={() => router.push('/practice')}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold"
              >
                Kembali ke Latihan
              </button>
            </div>
          )}

          {isFinishing && (
            <p className="text-center text-xs text-amber-300">
              Menyimpan hasil latihan...
            </p>
          )}
        </section>
      </main>
    </div>
  )
}
