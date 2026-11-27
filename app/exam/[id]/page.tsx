'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'

const RichTextEditor = dynamic(
  () => import('@/components/editor/RichTextEditor'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[240px] rounded-xl border border-slate-300 bg-slate-50 p-4 text-xs text-slate-500">
        Menyiapkan editor jawaban...
      </div>
    ),
  }
)

const StudentAnswerPhotos = dynamic(
  () => import('@/components/exam/StudentAnswerPhotos'),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        Menyiapkan fitur foto jawaban...
      </div>
    ),
  }
)

function getPlainAnswerText(value: any): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/<br\s*\/?\s*>/gi, ' ').replace(/<\/p\s*>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').replace(/[\u00a0\u200b\uFEFF]/g, ' ').trim()
}

function isQuestionAnswered(question: any, answer: any): boolean {
  const type = question?.question_type || 'multiple_choice'
  if (answer === undefined || answer === null) return false
  if (type === 'essay' || type === 'uraian') return getPlainAnswerText(answer).length > 0
  if (type === 'true_false_matrix') {
    if (typeof answer !== 'object' || Array.isArray(answer)) return false
    const statements = Array.isArray(question?.options) && question.options.length > 0
      ? question.options
      : Array.isArray(question?.statements) && question.statements.length > 0
        ? question.statements
        : Array.isArray(question?.matrix_statements)
          ? question.matrix_statements
          : []
    const isSelected = (value: any) =>
      ['benar', 'salah'].includes(String(value ?? '').trim().toLowerCase())
    if (statements.length > 0) {
      return statements.every((statement: any, index: number) =>
        isSelected(answer[String(statement?.id || index + 1)])
      )
    }
    const values = Object.values(answer)
    return values.length > 0 && values.every(isSelected)
  }
  if (Array.isArray(answer)) return answer.length > 0
  if (typeof answer === 'object') return Object.values(answer).some((value) => String(value ?? '').trim() !== '')
  return String(answer).trim().length > 0
}

function ExamEngineContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()
  const searchParams = useSearchParams()
  const explicitStart = searchParams.get('start') === '1'

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // State ID Sesi & Status Real-Time (Ongoing / Paused)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionStatus, setSessionStatus] = useState<string>('ongoing')

  // State Jawaban Siswa & Ragu-ragu
  const [userAnswers, setUserAnswers] = useState<{ [key: string]: any }>({})
  const [flaggedQuestions, setFlaggedQuestions] = useState<{ [key: string]: boolean }>({})

  // 🎨 State Mode Tema (Light / Dark) & Ukuran Teks (Normal / Besar / Sangat Besar)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal')

  // State Modal Zoom Gambar (Lightbox)
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null)

  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [deadlineAtMs, setDeadlineAtMs] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [authCheckFailed, setAuthCheckFailed] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoUploadInProgress, setPhotoUploadInProgress] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [isOnline, setIsOnline] = useState(true)
  const [forceSubmitDeadline, setForceSubmitDeadline] = useState<string | null>(null)
  const [forceSubmitSeconds, setForceSubmitSeconds] = useState(0)
  const [participantName, setParticipantName] = useState('')
  const [participantIdentifier, setParticipantIdentifier] = useState('')
  const [participantClass, setParticipantClass] = useState('')
  const [showQuestionNav, setShowQuestionNav] = useState(true)
  const [questionNavFilter, setQuestionNavFilter] = useState<'all' | 'incomplete' | 'flagged'>('all')
  const [showSubmitReview, setShowSubmitReview] = useState(false)
  const [reviewPhotoQuestionIds, setReviewPhotoQuestionIds] = useState<string[]>([])
  const [proctorViolationCount, setProctorViolationCount] = useState(0)
  const [proctorPauseReason, setProctorPauseReason] = useState<string | null>(null)
  const [fullscreenActive, setFullscreenActive] = useState(false)
  const [fullscreenError, setFullscreenError] = useState<string | null>(null)
  const [proctorNotice, setProctorNotice] = useState<string | null>(null)
  const hasEnteredFullscreenRef = useRef(false)
  const lastProctorEventAtRef = useRef(0)

  // Ref untuk menghindari stale closure dan submit ganda
  const userAnswersRef = useRef<{ [key: string]: any }>({})
  const questionsRef = useRef<any[]>([])
  const isSubmittingRef = useRef<boolean>(false)
  const sessionIdRef = useRef<string | null>(null)
  const sessionCompletedRef = useRef(false)
  const userIdRef = useRef<string | null>(null)
  const flaggedQuestionsRef = useRef<{ [key: string]: boolean }>({})
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const dirtyQuestionIdsRef = useRef<Set<string>>(new Set())
  const serverClockOffsetRef = useRef(0)
  const loadStartedRef = useRef(false)

  // Helper Acak Array (Fisher-Yates Shuffle)
  const shuffleArray = (array: any[]) => {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // 🟢 Helper parsing fleksibel data JSON string dari Supabase
  const parseJsonIfNeeded = (val: any) => {
    if (val === null || val === undefined) return val
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('{') && trimmed.endsWith('}'))
      ) {
        try {
          return JSON.parse(trimmed)
        } catch (e) {
          return val
        }
      }
    }
    return val
  }

  // Batasi satu permintaan simpan agar antrean tidak tertahan tanpa batas.
  const upsertWithTimeout = async (request: any) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    try {
      return await request.abortSignal(controller.signal)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // Autosave hanya mengirim jawaban yang berubah. Submit akhir meminta snapshot lengkap.
  const persistAnswersToSupabase = async (forceAll = false) => {
    const activeSessId = sessionIdRef.current
    const currentQuestions = questionsRef.current
    if (!activeSessId || currentQuestions.length === 0 || sessionCompletedRef.current) return

    const answers = userAnswersRef.current
    const flags = flaggedQuestionsRef.current
    const questionIds = forceAll
      ? currentQuestions.map((question) => question.id)
      : Array.from(dirtyQuestionIdsRef.current)
    if (questionIds.length === 0) return

    const questionsById = new Map(currentQuestions.map((question) => [question.id, question]))
    const updatedAt = new Date().toISOString()
    const records = questionIds.flatMap((questionId) => {
      const q = questionsById.get(questionId)
      if (!q) return []
      const raw = answers[q.id]
      const isObjectiveMultiple = q.question_type === 'complex_multiple_choice' || q.question_type === 'true_false_matrix'
      return [{
        session_id: activeSessId,
        question_id: q.id,
        user_answer: raw === undefined || raw === null ? null : (typeof raw === 'string' ? raw : JSON.stringify(raw)),
        selected_option: q.question_type === 'multiple_choice' && typeof raw === 'string' ? raw : null,
        selected_answers: isObjectiveMultiple && raw !== undefined && raw !== null ? raw : null,
        is_flagged: Boolean(flags[q.id]),
        updated_at: updatedAt,
      }]
    })

    // Jangan menulis ke sesi yang sudah berganti/dihapus.
    if (sessionIdRef.current !== activeSessId) return
    const supabase = createClient()
    for (let offset = 0; offset < records.length; offset += 50) {
      if (sessionIdRef.current !== activeSessId || sessionCompletedRef.current) return
      const batch = records.slice(offset, offset + 50)
      const { error } = await upsertWithTimeout(
        supabase.from('answers').upsert(batch, {
          onConflict: 'session_id,question_id',
        })
      )
      if (error) throw error

      // Hapus dirty marker hanya jika tidak ada perubahan baru selama batch berjalan.
      batch.forEach((record) => {
        const questionId = record.question_id
        const currentAnswer = userAnswersRef.current[questionId]
        const savedAnswer = record.user_answer === null
          ? undefined
          : (typeof record.user_answer === 'string'
              ? record.user_answer
              : record.user_answer)
        const currentSerialized = currentAnswer === undefined ? null : JSON.stringify(currentAnswer)
        const savedSerialized = record.user_answer === null ? null : JSON.stringify(
          typeof record.user_answer === 'string' &&
          ['complex_multiple_choice', 'true_false_matrix'].includes(
            questionsById.get(questionId)?.question_type
          )
            ? record.selected_answers
            : record.user_answer
        )
        const sameAnswer = currentSerialized === savedSerialized
        const sameFlag = Boolean(flaggedQuestionsRef.current[questionId]) === Boolean(record.is_flagged)
        if (sameAnswer && sameFlag) dirtyQuestionIdsRef.current.delete(questionId)
      })
    }
    if (sessionIdRef.current === activeSessId && dirtyQuestionIdsRef.current.size === 0) {
      setSaveStatus('saved')
    }
  }

  const queueAutosave = (forceAll = false) => {
    // Pulihkan antrean setelah satu kegagalan agar penyimpanan berikutnya tetap dapat berjalan.
    const nextSave = saveQueueRef.current
      .catch(() => undefined)
      .then(() => persistAnswersToSupabase(forceAll))
    saveQueueRef.current = nextSave
    return nextSave
  }

  const scheduleAutosave = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      setSaveStatus('saving')
      queueAutosave().catch((error) => { console.error('Autosave gagal:', error); setSaveStatus('error') })
    }, 800)
  }

  const flushAutosave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }

    // Coba ulang penyimpanan snapshot terbaru beberapa kali sebelum submit dinyatakan gagal.
    let lastError: unknown = null
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await queueAutosave(true)
        return
      } catch (error) {
        lastError = error
      }
    }
    throw lastError
  }

  // Update state, ref, cadangan lokal, lalu jadwalkan autosave 800 ms.
  const updateAnswersState = (newAnswersMap: { [key: string]: any }) => {
    const previousAnswers = userAnswersRef.current
    const changedIds = new Set([...Object.keys(previousAnswers), ...Object.keys(newAnswersMap)])
    changedIds.forEach((questionId) => {
      if (JSON.stringify(previousAnswers[questionId] ?? null) !== JSON.stringify(newAnswersMap[questionId] ?? null)) {
        dirtyQuestionIdsRef.current.add(questionId)
      }
    })
    setUserAnswers(newAnswersMap)
    userAnswersRef.current = newAnswersMap
    setSaveStatus('saving')
    if (examId) localStorage.setItem(getSessionLocalKeys().answers, JSON.stringify(newAnswersMap))
    scheduleAutosave()
  }

  function getSessionLocalKeys(activeSessionId: string | null = sessionIdRef.current) {
    return {
      answers: activeSessionId ? `cbt_answers_${examId}_${activeSessionId}` : `cbt_answers_${examId}`,
      flags: activeSessionId ? `cbt_flags_${examId}_${activeSessionId}` : `cbt_flags_${examId}`,
    }
  }

  function clearLocalSubmissionBackup(activeSessionId: string | null) {
    const keys = getSessionLocalKeys(activeSessionId)
    localStorage.removeItem(keys.answers)
    localStorage.removeItem(keys.flags)
    localStorage.removeItem(`cbt_answers_${examId}`)
    localStorage.removeItem(`cbt_flags_${examId}`)
    localStorage.removeItem(`cbt_start_time_${examId}`)
  }

  // 1. MEMUAT DATA UJIAN, BUKA/HUBUNGKAN SESI ONGOING SUPABASE, & HITUNG TIMER AKURAT
  const loadExamData = async () => {
    if (!examId) return
    const launchIntentKey = `cbt_launch_intent_${examId}`
    const hasLaunchIntent =
      explicitStart && sessionStorage.getItem(launchIntentKey) === '1'
    // Niat mulai hanya boleh dipakai sekali. Refresh berikutnya tidak boleh
    // dianggap sebagai perintah membuat percobaan baru.
    if (hasLaunchIntent) sessionStorage.removeItem(launchIntentKey)
    setLoading(true)
    setAuthCheckFailed(false)
    setLoadError(null)

    try {
    const supabase = createClient()
    try {
      const timeResponse = await fetch('/api/server-time', { cache: 'no-store' })
      if (timeResponse.ok) {
        const timePayload = await timeResponse.json()
        if (Number.isFinite(Number(timePayload.now))) serverClockOffsetRef.current = Number(timePayload.now) - Date.now()
      }
    } catch (timeError) {
      console.warn('Sinkronisasi jam server belum tersedia, memakai jam perangkat sementara.', timeError)
    }

    let user = null

    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) throw error

      user = data.user
    } catch (error) {
      console.error('Gagal memeriksa login:', error)

      setAuthCheckFailed(true)
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    if (!user) {
      alert('Sesi login tidak ditemukan. Silakan login kembali.')

      isSubmittingRef.current = false
      setIsSubmitting(false)
      router.push('/login')
      return
    }

    userIdRef.current = user.id

    // Profil, paket ujian, daftar soal, dan sesi adalah permintaan independen.
    // Jalankan bersamaan untuk mengurangi waktu tunggu jaringan.
    const [
      profileResult,
      examResult,
      questionResult,
      sessionResult,
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, username, class_code')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single(),
      supabase
        .from('questions')
        .select('*')
        .eq('exam_id', examId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      supabase
        .from('exam_sessions')
        .select('*')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .in('status', ['ongoing', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const { data: participantProfile, error: profileError } = profileResult
    if (profileError) {
      console.error('Gagal mengambil profil peserta:', profileError)
    }

    setParticipantName(participantProfile?.full_name || 'Peserta Ujian')
    setParticipantIdentifier(participantProfile?.username || '')
    setParticipantClass(participantProfile?.class_code || '')

    const { data: examData, error: examError } = examResult
    if (examError) {
      throw new Error(`Gagal memuat data ujian: ${examError.message}`)
    }

    if (!examData) {
      alert('Ujian tidak ditemukan!')
      router.push('/')
      return
    }

    const { data: questionData, error: questionError } = questionResult
    if (questionError) {
      throw new Error(`Gagal memuat daftar soal: ${questionError.message}`)
    }

    if (questionData) {
      let processedQuestions = [...questionData]
      const groups = [
        processedQuestions.filter((q) => q.question_type === 'multiple_choice'),
        processedQuestions.filter((q) => q.question_type === 'complex_multiple_choice'),
        processedQuestions.filter((q) => q.question_type === 'true_false_matrix'),
        processedQuestions.filter((q) => q.question_type === 'essay' || q.question_type === 'uraian'),
        processedQuestions.filter((q) => !['multiple_choice', 'complex_multiple_choice', 'true_false_matrix', 'essay', 'uraian'].includes(q.question_type || 'multiple_choice')),
      ]
      processedQuestions = groups.flatMap((group) => examData.shuffle_questions ? shuffleArray(group) : group)

      if (examData.shuffle_options) {
        processedQuestions = processedQuestions.map((q) => {
          if (
            (q.question_type === 'multiple_choice' ||
              q.question_type === 'complex_multiple_choice' ||
              q.question_type === 'true_false_matrix') &&
            Array.isArray(q.options) &&
            q.options.length > 0
          ) {
            return {
              ...q,
              options: shuffleArray(q.options),
            }
          }
          return q
        })
      }

      setQuestions(processedQuestions)
      questionsRef.current = processedQuestions
    }

    setExam(examData)

    // D. RESTORE JAWABAN DARI LOCALSTORAGE

    // E. 🟢 PROSES SESI REAL-TIME DI SUPABASE (AGAR MUNCUL DI LIVE PROCTORING)
    let currentSessId: string | null = null
    let startTimeIso = ''
    let currentSession: any = null

    const { data: existingSession, error: sessionError } = sessionResult

    if (sessionError) {
      console.error('Gagal memuat sesi:', sessionError)
      alert('Gagal memuat sesi ujian. Silakan coba kembali.')
      setLoading(false)
      return
    }


    if (!existingSession && !hasLaunchIntent) {
      // Refresh/URL lama setelah submit harus kembali ke hasil sesi terakhir,
      // bukan membuka percobaan baru secara diam-diam.
      const { data: lastSession, error: lastSessionError } = await supabase
        .from('exam_sessions')
        .select('id, status')
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (lastSessionError) {
        throw new Error(`Gagal memeriksa riwayat sesi: ${lastSessionError.message}`)
      }
      if (lastSession?.status === 'completed') {
        router.replace(`/exam/${examId}/summary?session_id=${lastSession.id}`)
      } else {
        router.replace('/')
      }
      return
    }

    if (existingSession) {
      currentSession = existingSession
      currentSessId = existingSession.id
      startTimeIso = existingSession.start_time || startTimeIso
      setSessionStatus(existingSession.status)
    } else {
      // Sesi baru hanya dibuat jika belum ada sesi aktif. Jika dua klik terjadi bersamaan,
      // unique index aktif memastikan permintaan kedua mengambil sesi yang pertama.
      const { data: newSess, error: createError } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: examId, user_id: user.id, status: 'ongoing',
          paused_duration_seconds: 0, extra_time_seconds: 0,
        }).select('*').single()

      if (createError || !newSess) {
        const { data: racedSession, error: raceLookupError } = await supabase
          .from('exam_sessions').select('*').eq('exam_id', examId).eq('user_id', user.id)
          .in('status', ['ongoing', 'paused']).order('created_at', { ascending: false }).limit(1).maybeSingle()
        if (raceLookupError || !racedSession) {
          console.error('Gagal membuat sesi:', createError, raceLookupError)
          alert(`Gagal membuat sesi ujian baru: ${createError?.message || raceLookupError?.message || 'Data sesi tidak dikembalikan oleh database.'}`)
          setLoading(false)
          return
        }
        currentSession = racedSession
        currentSessId = racedSession.id
        startTimeIso = racedSession.start_time || startTimeIso
        setSessionStatus(racedSession.status)
      } else {
        currentSession = newSess
        currentSessId = newSess.id
        startTimeIso = newSess.start_time || startTimeIso
        setSessionStatus('ongoing')
      }
    }

    if (currentSessId) {
      setSessionId(currentSessId)
      sessionIdRef.current = currentSessId
      sessionCompletedRef.current = false
      setProctorViolationCount(Number(currentSession?.proctor_violation_count) || 0)
      setProctorPauseReason(currentSession?.proctor_pause_reason || null)

      // Muat status foto sejak sesi dibuka agar navigasi langsung akurat.
      try {
        const { data: photoRows, error: photoRowsError } = await supabase
          .from('answer_images')
          .select('question_id')
          .eq('session_id', currentSessId)
        if (photoRowsError) throw photoRowsError
        setReviewPhotoQuestionIds(Array.from(new Set((photoRows || []).map((row: any) => row.question_id))))
      } catch (photoLoadError) {
        console.warn('Status foto jawaban belum dapat dimuat:', photoLoadError)
        setReviewPhotoQuestionIds([])
      }
    }
    if (!startTimeIso) {
      throw new Error('Database tidak mengembalikan waktu mulai sesi ujian.')
    }

    // Hapus penanda start dari URL setelah sesi ditemukan/dibuat. Reload berikutnya
    // hanya boleh melanjutkan sesi aktif, bukan otomatis membuat percobaan baru.
    if (explicitStart) router.replace(`/exam/${examId}`)

    // Buat placeholder untuk semua soal; ignoreDuplicates menjaga jawaban saat resume.
    if (currentSessId && questionsRef.current.length > 0) {
      const placeholders = questionsRef.current.map((q) => ({
        session_id: currentSessId,
        question_id: q.id,
        user_answer: null,
        selected_option: null,
        selected_answers: null,
        is_flagged: false,
        updated_at: new Date().toISOString(),
      }))
      for (let offset = 0; offset < placeholders.length; offset += 50) {
        const { error: placeholderError } = await upsertWithTimeout(
          supabase.from('answers').upsert(placeholders.slice(offset, offset + 50), {
            onConflict: 'session_id,question_id', ignoreDuplicates: true,
          })
        )
        if (placeholderError) throw new Error(`Gagal membuat batch jawaban awal: ${placeholderError.message}`)
      }
    }

    const sessionLocalKeys = getSessionLocalKeys(currentSessId)
    const legacyAnswersKey = `cbt_answers_${examId}`
    const legacyFlagsKey = `cbt_flags_${examId}`

    if (existingSession && currentSessId) {
      const { data: savedRows, error: savedRowsError } = await supabase
        .from('answers')
        .select('question_id, user_answer, selected_option, selected_answers, is_flagged')
        .eq('session_id', currentSessId)

      if (savedRowsError) {
        // Jangan lanjutkan dengan jawaban kosong: autosave berikutnya bisa menimpa
        // jawaban server yang sebenarnya. Error akan menampilkan opsi coba lagi,
        // sementara cadangan lokal tetap dipertahankan.
        throw new Error(`Gagal memulihkan jawaban dari Supabase: ${savedRowsError.message}`)
      }

      const remoteAnswers: { [key: string]: any } = {}
      const remoteFlags: { [key: string]: boolean } = {}
      ;(savedRows || []).forEach((row: any) => {
        const q = questionsRef.current.find((item) => item.id === row.question_id)
        if (!q) return
        const type = q.question_type || 'multiple_choice'
        let value: any = row.user_answer
        if (type === 'multiple_choice') value = row.selected_option ?? row.user_answer
        else if (type === 'complex_multiple_choice' || type === 'true_false_matrix') {
          value = row.selected_answers ?? parseJsonIfNeeded(row.user_answer)
        }
        if (value !== null && value !== undefined) remoteAnswers[row.question_id] = parseJsonIfNeeded(value)
        remoteFlags[row.question_id] = Boolean(row.is_flagged)
      })

      let localAnswers: { [key: string]: any } = {}
      let localFlags: { [key: string]: boolean } = {}
      try {
        const savedAns = localStorage.getItem(sessionLocalKeys.answers) ?? localStorage.getItem(legacyAnswersKey)
        if (savedAns) localAnswers = JSON.parse(savedAns) || {}
      } catch (e) {
        console.error('Gagal memulihkan jawaban lokal:', e)
        localStorage.removeItem(sessionLocalKeys.answers)
        localStorage.removeItem(legacyAnswersKey)
      }
      try {
        const savedFlags = localStorage.getItem(sessionLocalKeys.flags) ?? localStorage.getItem(legacyFlagsKey)
        if (savedFlags) localFlags = JSON.parse(savedFlags) || {}
      } catch (e) {
        console.error('Gagal memulihkan status ragu lokal:', e)
        localStorage.removeItem(sessionLocalKeys.flags)
      }

      // Data lokal baru yang sudah memakai kunci sesi boleh memulihkan jawaban yang belum tersinkron.
      // Data legacy hanya dipakai untuk mengisi jawaban yang masih kosong di server agar cache
      // ujian/percobaan sebelumnya tidak menimpa jawaban sesi aktif.
      const hasSessionLocalAnswers = localStorage.getItem(sessionLocalKeys.answers) !== null
      const mergedAnswers = { ...remoteAnswers }
      Object.entries(localAnswers).forEach(([questionId, value]) => {
        if (hasSessionLocalAnswers || remoteAnswers[questionId] === undefined || remoteAnswers[questionId] === null) {
          mergedAnswers[questionId] = value
        }
      })
      const hasLocalFlagBackup =
        localStorage.getItem(sessionLocalKeys.flags) !== null ||
        localStorage.getItem(legacyFlagsKey) !== null
      const mergedFlags = hasLocalFlagBackup
        ? { ...remoteFlags, ...localFlags }
        : { ...remoteFlags }
      Object.keys(mergedAnswers).forEach((questionId) => {
        if (JSON.stringify(mergedAnswers[questionId] ?? null) !== JSON.stringify(remoteAnswers[questionId] ?? null) || Boolean(mergedFlags[questionId]) !== Boolean(remoteFlags[questionId])) {
          dirtyQuestionIdsRef.current.add(questionId)
        }
      })
      localStorage.setItem(sessionLocalKeys.answers, JSON.stringify(mergedAnswers))
      localStorage.setItem(sessionLocalKeys.flags, JSON.stringify(mergedFlags))
      setUserAnswers(mergedAnswers)
      userAnswersRef.current = mergedAnswers
      setFlaggedQuestions(mergedFlags)
      flaggedQuestionsRef.current = mergedFlags
    } else {
      localStorage.removeItem(sessionLocalKeys.answers)
      localStorage.removeItem(sessionLocalKeys.flags)
      localStorage.removeItem(legacyAnswersKey)
      localStorage.removeItem(legacyFlagsKey)
      localStorage.removeItem(`cbt_start_time_${examId}`)
      setUserAnswers({})
      userAnswersRef.current = {}
      setFlaggedQuestions({})
      flaggedQuestionsRef.current = {}
      setCurrentIndex(0)
    }

    // F. PERHITUNGAN TIMER SISA WAKTU BERBASIS TIMESTAMP START_TIME
    const durationSeconds =
      (Number(examData.duration_minutes) || 15) * 60

    const nowMs = Date.now() + serverClockOffsetRef.current
    const startMs = new Date(startTimeIso).getTime()

    const pausedAtMs = currentSession?.paused_at
      ? new Date(currentSession.paused_at).getTime()
      : null

    const accumulatedPause =
      Number(currentSession?.paused_duration_seconds) || 0

    const extraTime =
      Number(currentSession?.extra_time_seconds) || 0

    const currentPauseSeconds = pausedAtMs
      ? Math.max(0, Math.floor((nowMs - pausedAtMs) / 1000))
      : 0

    const elapsedSeconds = Math.max(
      0,
      Math.floor((nowMs - startMs) / 1000) -
        accumulatedPause -
        currentPauseSeconds
    )

    const remainingSeconds = Math.max(
      0,
      durationSeconds + extraTime - elapsedSeconds
    )

    setDeadlineAtMs(startMs + (durationSeconds + accumulatedPause + extraTime) * 1000)
    setTimeLeft(remainingSeconds)
    } catch (error) {
      console.error('Gagal memuat ruang ujian:', error)
      setLoadError(error instanceof Error ? error.message : 'Terjadi kendala saat memuat data ujian.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Mencegah pembuatan dua sesi jika efek dipanggil ulang saat development/Strict Mode.
    if (loadStartedRef.current) return
    loadStartedRef.current = true
    loadExamData()
  }, [examId, explicitStart])

  // 🟢 HOOK CEK STATUS SESI (PAUSE/RESUME) REAL-TIME
  useEffect(() => {
    if (!examId || loading) return

    const checkSessionStatus = async () => {
      const supabase = createClient()
      const currentId = sessionIdRef.current
      const currentUserId = userIdRef.current
      if (!currentId || !currentUserId) return

      const { data: activeSession, error } = await supabase
        .from('exam_sessions')
        .select('id, status, start_time, paused_at, paused_duration_seconds, extra_time_seconds, force_submit_state, force_submit_deadline_at, proctor_violation_count, proctor_pause_reason')
        .eq('id', currentId)
        .eq('user_id', currentUserId)
        .maybeSingle()

      if (error) {
        console.error('Gagal memeriksa status sesi:', error)
        return
      }

      // Hasil kosong belum cukup untuk memastikan sesi dihapus.
      // Pertahankan cadangan jawaban; polling berikutnya akan memeriksa kembali.
      if (!activeSession) {
        setSessionStatus('missing')
        console.warn('Sesi CBT belum ditemukan. Jawaban lokal tetap dipertahankan.')
        return
      }

      setSessionStatus(activeSession.status)
      setProctorViolationCount(Number(activeSession.proctor_violation_count) || 0)
      setProctorPauseReason(activeSession.proctor_pause_reason || null)
      if (activeSession.start_time && exam?.duration_minutes) {
        setDeadlineAtMs(new Date(activeSession.start_time).getTime() + (Number(exam.duration_minutes) * 60 + (Number(activeSession.paused_duration_seconds) || 0) + (Number(activeSession.extra_time_seconds) || 0)) * 1000)
      }
      if (activeSession.force_submit_state === 'requested' && activeSession.force_submit_deadline_at) {
        setForceSubmitDeadline(activeSession.force_submit_deadline_at)
      } else {
        setForceSubmitDeadline(null)
        setForceSubmitSeconds(0)
      }

      // Sesi dipaksa selesai oleh proktor.
      if (activeSession.status === 'completed') {
        sessionCompletedRef.current = true
        setSaveStatus('saved')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        router.replace(
          `/exam/${examId}/summary?session_id=${activeSession.id}`
        )
        return
      }

    }

    checkSessionStatus()
    const statusInterval = setInterval(checkSessionStatus, 3000)

    return () => clearInterval(statusInterval)
}, [examId, loading, sessionId, router, exam])

  useEffect(() => {
    if (!forceSubmitDeadline) return
    const tick = () => setForceSubmitSeconds(Math.max(0, Math.ceil((new Date(forceSubmitDeadline).getTime() - (Date.now() + serverClockOffsetRef.current)) / 1000)))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [forceSubmitDeadline])

  // Pantau koneksi. Saat tersambung kembali, kirim ulang snapshot jawaban sesi aktif.
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (sessionIdRef.current && !isSubmittingRef.current) {
        setSaveStatus('saving')
        queueAutosave().catch((error) => {
          console.error('Sinkronisasi setelah koneksi pulih gagal:', error)
          setSaveStatus('error')
        })
      }
    }
    const handleOffline = () => setIsOnline(false)

    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Pengawasan perpindahan tab dan keluarnya Full Screen.
  // Server menghitung pelanggaran secara atomik dan menjeda sesi ketika batas tercapai.
  useEffect(() => {
    if (!exam?.proctor_enabled || !sessionId || sessionStatus !== 'ongoing') return

    const sendProctorEvent = async (eventType: 'tab_hidden' | 'fullscreen_exit') => {
      const now = Date.now()
      if (now - lastProctorEventAtRef.current < 1500) return
      lastProctorEventAtRef.current = now

      try {
        const response = await fetch('/api/exam/proctor-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, eventType }),
          keepalive: true,
        })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Pelanggaran belum tercatat.')
        if (Number.isFinite(Number(payload.violation_count))) {
          setProctorViolationCount(Number(payload.violation_count))
        }
        if (payload.accepted) {
          const label = eventType === 'tab_hidden' ? 'berpindah tab' : 'keluar dari Full Screen'
          setProctorNotice(`Terdeteksi ${label}. Peringatan ${payload.violation_count} dari ${payload.max_violations}.`)
        }
        if (payload.paused || payload.status === 'paused') {
          setSessionStatus('paused')
          setProctorNotice('Batas pelanggaran tercapai. Ujian dijeda dan menunggu izin admin.')
        }
      } catch (error) {
        console.error('Gagal mengirim catatan pengawasan:', error)
        setProctorNotice('Catatan pengawasan belum terkirim. Periksa koneksi dan jangan tutup halaman.')
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') sendProctorEvent('tab_hidden')
    }
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement)
      setFullscreenActive(active)
      if (active) {
        hasEnteredFullscreenRef.current = true
        setFullscreenError(null)
      } else if (hasEnteredFullscreenRef.current && exam?.proctor_require_fullscreen) {
        sendProctorEvent('fullscreen_exit')
      }
    }

    setFullscreenActive(Boolean(document.fullscreenElement))
    if (document.fullscreenElement) hasEnteredFullscreenRef.current = true
    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [exam?.proctor_enabled, exam?.proctor_require_fullscreen, sessionId, sessionStatus])

  const enterExamFullscreen = async () => {
    try {
      if (!document.documentElement.requestFullscreen) {
        throw new Error('Browser atau perangkat ini tidak mendukung Full Screen. Hubungi pengawas untuk penyesuaian.')
      }
      await document.documentElement.requestFullscreen()
      setFullscreenActive(Boolean(document.fullscreenElement))
      setFullscreenError(null)
    } catch (error) {
      setFullscreenError(error instanceof Error ? error.message : 'Full Screen tidak dapat diaktifkan.')
    }
  }

    // 🟢 PROTEKSI RELOAD & BACK BROWSER
  useEffect(() => {
    if (loading || sessionStatus !== 'ongoing') return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [loading, sessionStatus])

  // Hitung mundur selalu dari deadline server, bukan mengurangi angka lokal.
  useEffect(() => {
    if (deadlineAtMs === null || sessionStatus === 'paused' || sessionStatus === 'missing' || sessionStatus === 'completed') return
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((deadlineAtMs - (Date.now() + serverClockOffsetRef.current)) / 1000))
      setTimeLeft(remaining)
    }
    updateRemaining()
    const timer = setInterval(updateRemaining, 1000)
    document.addEventListener('visibilitychange', updateRemaining)
    window.addEventListener('focus', updateRemaining)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', updateRemaining)
      window.removeEventListener('focus', updateRemaining)
    }
  }, [deadlineAtMs, sessionStatus])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Handler Jawaban Pilihan Ganda Biasa
  const handleSelectSingleOption = (questionId: string, optKey: string) => {
    const updated = { ...userAnswersRef.current, [questionId]: optKey }
    updateAnswersState(updated)
  }

  // Handler Jawaban PG Kompleks (Multiple Checkbox)
  const handleToggleComplexOption = (questionId: string, optKey: string) => {
    const currentAns = Array.isArray(userAnswersRef.current[questionId])
      ? userAnswersRef.current[questionId]
      : []
    let updatedList: string[] = []
    if (currentAns.includes(optKey)) {
      updatedList = currentAns.filter((k: string) => k !== optKey)
    } else {
      updatedList = [...currentAns, optKey]
    }
    const updated = { ...userAnswersRef.current, [questionId]: updatedList }
    updateAnswersState(updated)
  }

  // Handler Jawaban Matriks Benar-Salah
  const handleSelectMatrixValue = (
    questionId: string,
    statementId: string,
    val: 'Benar' | 'Salah'
  ) => {
    const currentMatrix =
      typeof userAnswersRef.current[questionId] === 'object' &&
      !Array.isArray(userAnswersRef.current[questionId])
        ? userAnswersRef.current[questionId]
        : {}
    const updatedMatrix = { ...currentMatrix, [statementId]: val }
    const updated = { ...userAnswersRef.current, [questionId]: updatedMatrix }
    updateAnswersState(updated)
  }

  // Handler Jawaban Essay
  const handleEssayChange = (questionId: string, html: string) => {
    const normalizedHtml = getPlainAnswerText(html).length > 0 ? html : ''
    const updated = { ...userAnswersRef.current, [questionId]: normalizedHtml }
    updateAnswersState(updated)
  }

  // Handler Ragu-Ragu
  const handleToggleFlag = (questionId: string) => {
    const updated = {
      ...flaggedQuestionsRef.current,
      [questionId]: !flaggedQuestionsRef.current[questionId],
    }
    flaggedQuestionsRef.current = updated
    dirtyQuestionIdsRef.current.add(questionId)
    setFlaggedQuestions(updated)
    setSaveStatus('saving')
    if (examId) localStorage.setItem(getSessionLocalKeys().flags, JSON.stringify(updated))
    scheduleAutosave()
  }

  const openSubmitReview = async () => {
    if (photoUploadInProgress) {
      alert('Tunggu sampai foto jawaban selesai dikirim sebelum memeriksa ujian.')
      return
    }
    if (!sessionIdRef.current) {
      alert('Sesi ujian tidak ditemukan. Silakan muat ulang halaman.')
      return
    }
    try {
      const { data, error } = await createClient()
        .from('answer_images')
        .select('question_id')
        .eq('session_id', sessionIdRef.current)
      if (error) throw error
      setReviewPhotoQuestionIds(Array.from(new Set((data || []).map((item: any) => item.question_id))))
      setShowSubmitReview(true)
    } catch (error) {
      console.error('Gagal memeriksa foto jawaban:', error)
      alert('Foto jawaban belum dapat diverifikasi. Periksa koneksi internet lalu coba kembali.')
    }
  }

  // 🟢 SELAYAKAN UJIAN, POPULASI NILAI PRESISI, & SIMPAN HASIL KE DATABASE
    const handleFinishExam = async (autoFinish = false, reviewConfirmed = false) => {
    if (photoUploadInProgress) {
      alert('Tunggu sampai foto jawaban selesai dikirim sebelum mengumpulkan ujian.')
      return
    }
    if (isSubmittingRef.current) return

    if (sessionStatus === 'completed') return

    if (!sessionIdRef.current) {
      alert('Sesi ujian tidak ditemukan. Silakan muat ulang halaman.')
      return
    }
    if (!autoFinish && !reviewConfirmed) {
      await openSubmitReview()
      return
    }
    if (reviewConfirmed) setShowSubmitReview(false)

    isSubmittingRef.current = true
    setIsSubmitting(true)

    const supabase = createClient()

    let user: any = null

    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) throw error

      user = data.user
    } catch (error) {
      console.error('Gagal memeriksa login:', error)

      alert('Belum dapat memverifikasi sesi login karena terjadi kendala. Ini belum membuktikan akun Anda keluar. Jawaban lokal tetap disimpan; periksa koneksi lalu coba lagi.')

      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    const currentQuestions = questionsRef.current
    const activeSessId = sessionIdRef.current || sessionId
    let isForceSubmitResponse = false

    try {
      if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      if (!activeSessId) throw new Error('Sesi ujian tidak ditemukan. Silakan muat ulang halaman.')

      // Periksa status di server sebelum autosave terakhir. Jika permintaan submit
      // sebelumnya sebenarnya berhasil tetapi responsnya terputus, jangan tulis ulang
      // jawaban; cukup bersihkan backup dan arahkan peserta ke ringkasan.
      const { data: latestSession, error: latestSessionError } = await supabase
        .from('exam_sessions')
        .select('id, status, force_submit_state')
        .eq('id', activeSessId)
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (latestSessionError) throw new Error(`Gagal memeriksa status sesi: ${latestSessionError.message}`)
      if (!latestSession) throw new Error('Sesi ujian tidak ditemukan. Cadangan jawaban lokal tetap dipertahankan.')
      if (latestSession.status === 'completed') {
        sessionCompletedRef.current = true
        clearLocalSubmissionBackup(activeSessId)
        router.replace(`/exam/${examId}/summary?session_id=${activeSessId}`)
        return
      }
      isForceSubmitResponse = latestSession.force_submit_state === 'requested'
      if (latestSession.status !== 'ongoing' && !(latestSession.status === 'paused' && isForceSubmitResponse)) {
        throw new Error('Sesi ujian tidak lagi aktif. Muat ulang halaman untuk memeriksa status terbaru.')
      }

      setSaveStatus('saving')
      await flushAutosave()

      // Force-submit timeout dapat menyelesaikan sesi ketika antrean autosave berjalan.
      // Periksa ulang status database sebelum menghitung dan menutup sesi dari browser.
      const { data: postFlushSession, error: postFlushError } = await supabase
        .from('exam_sessions')
        .select('id, status, force_submit_state')
        .eq('id', activeSessId)
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (postFlushError) throw new Error(`Gagal memeriksa status sesi setelah penyimpanan: ${postFlushError.message}`)
      if (!postFlushSession) throw new Error('Sesi ujian tidak ditemukan setelah penyimpanan.')
      if (postFlushSession.status === 'completed') {
        sessionCompletedRef.current = true
        setSessionStatus('completed')
        setSaveStatus('saved')
        isSubmittingRef.current = false
        setIsSubmitting(false)
        router.replace(`/exam/${examId}/summary?session_id=${activeSessId}`)
        return
      }
      isForceSubmitResponse = postFlushSession.force_submit_state === 'requested'
      if (postFlushSession.status !== 'ongoing' && !(postFlushSession.status === 'paused' && isForceSubmitResponse)) {
        throw new Error('Status sesi berubah sebelum ujian dapat dikumpulkan. Muat ulang halaman untuk memeriksa status terbaru.')
      }
    } catch (error) {
      console.error('Verifikasi sesi atau autosave terakhir gagal:', error)
      setSaveStatus('error')
      alert(`${error instanceof Error ? error.message : 'Jawaban terakhir gagal disimpan.'}\\n\\nUjian belum dikirim. Cadangan jawaban lokal tetap disimpan; silakan coba lagi.`)
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }
    let localAnswerSnapshot: { [key: string]: any } = {}
    const submitLocalKeys = getSessionLocalKeys(activeSessId)
    try {
      localAnswerSnapshot = JSON.parse(localStorage.getItem(submitLocalKeys.answers) || '{}') || {}
    } catch (error) {
      console.error('Cadangan jawaban lokal tidak dapat dibaca:', error)
    }
    // Ref terbaru menjadi prioritas; localStorage menjadi cadangan untuk nilai yang belum ada di ref.
    const currentAnswers = { ...localAnswerSnapshot, ...userAnswersRef.current }

    let totalPointsEarned = 0
    let autoMaxPoints = 0
    let totalCorrect = 0

    currentQuestions.forEach((q) => {
      const qMaxScore = Number(q.max_score) || 1
      const qType = q.question_type || 'multiple_choice'
      const isEssayQuestion = qType === 'essay' || qType === 'uraian'
      if (!isEssayQuestion) autoMaxPoints += qMaxScore
      const pointsBeforeQuestion = totalPointsEarned
      const userAns = currentAnswers[q.id]

      const isUnattempted =
        userAns === undefined ||
        userAns === null ||
        userAns === '' ||
        (Array.isArray(userAns) && userAns.length === 0) ||
        (typeof userAns === 'object' &&
          !Array.isArray(userAns) &&
          Object.keys(userAns).length === 0)

      if (!isUnattempted) {
        if (qType === 'multiple_choice') {
          const correctOpt = String(q.correct_option ?? q.correct_answer ?? '')
            .trim()
            .toUpperCase()
          if (String(userAns).trim().toUpperCase() === correctOpt) {
            totalPointsEarned += qMaxScore
          }
        } else if (qType === 'complex_multiple_choice') {
          const parsedCorrect = parseJsonIfNeeded(q.correct_answers)
          let correctKeys: string[] = []

          if (Array.isArray(parsedCorrect)) {
            correctKeys = parsedCorrect.map((k: any) => String(k).trim().toUpperCase())
          } else if (q.correct_option || q.correct_answer) {
            correctKeys = [String(q.correct_option || q.correct_answer).trim().toUpperCase()]
          }

          const userKeys: string[] = Array.isArray(userAns)
            ? userAns.map((k: any) => String(k).trim().toUpperCase())
            : []

          const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
          const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length

          const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
          if (correctKeys.length > 0) {
            const ratio = netCorrect / correctKeys.length
            totalPointsEarned += ratio * qMaxScore
          }
        } else if (qType === 'true_false_matrix') {
          const parsedCorrect = parseJsonIfNeeded(q.correct_answers)
          const correctObj: { [key: string]: string } =
            typeof parsedCorrect === 'object' && parsedCorrect !== null ? parsedCorrect : {}
          const userObj = typeof userAns === 'object' && !Array.isArray(userAns) ? userAns : {}

          const statementIds = Object.keys(correctObj)
          if (statementIds.length > 0) {
            let correctRows = 0
            statementIds.forEach((sId) => {
              if (
                userObj[sId] &&
                String(userObj[sId]).trim().toLowerCase() ===
                  String(correctObj[sId]).trim().toLowerCase()
              ) {
                correctRows++
              }
            })
            const ratio = correctRows / statementIds.length
            totalPointsEarned += ratio * qMaxScore
          }
        }
      }

      if (!isEssayQuestion && totalPointsEarned - pointsBeforeQuestion >= qMaxScore - 0.000001) {
        totalCorrect += 1
      }
    })

    const finalScore =
      autoMaxPoints > 0 ? Math.round((totalPointsEarned / autoMaxPoints) * 100 * 100) / 100 : 0

    
    try {
      // Jawaban sudah tersimpan oleh flushAutosave(true); hindari upsert ulang
      // seluruh jawaban agar beban database tidak berlipat saat banyak siswa submit.
      if (!user) {
        throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      }

      // Tandai sesi selesai hanya setelah snapshot jawaban berhasil disimpan
      const { data: completedSession, error: finishError } = await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          score: finalScore,
          total_correct: totalCorrect,
          force_submit_state: isForceSubmitResponse ? 'responded' : 'completed',
        })
        .eq('id', activeSessId)
        .eq('user_id', user.id)
        .in('status', ['ongoing', 'paused'])
        .select('id')
        .maybeSingle()

      if (finishError || !completedSession) {
        // Update bisa saja berhasil di database tetapi respons jaringan terputus.
        // Baca ulang status sebelum menampilkan kegagalan agar submit bersifat idempoten.
        const { data: verifiedSession, error: verifyError } = await supabase
          .from('exam_sessions')
          .select('id, status')
          .eq('id', activeSessId)
          .eq('exam_id', examId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!verifyError && verifiedSession?.status === 'completed') {
          sessionCompletedRef.current = true
          clearLocalSubmissionBackup(activeSessId)
          router.replace(`/exam/${examId}/summary?session_id=${activeSessId}`)
          return
        }

        throw new Error(
          `Jawaban sudah tersimpan, tetapi status selesai belum dapat dikonfirmasi: ${
            finishError?.message || verifyError?.message || 'Sesi belum berstatus selesai'
          }`
        )
      }

      // 6. Hapus cadangan lokal hanya setelah penyimpanan dan status selesai terkonfirmasi.
      sessionCompletedRef.current = true
      clearLocalSubmissionBackup(activeSessId)

      router.push(
        `/exam/${examId}/summary?session_id=${activeSessId}`
      )
    } catch (error) {
      console.error('Gagal menyelesaikan ujian:', error)

      const message =
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan yang tidak diketahui.'

      alert(
        `${message}\n\nJawaban lokal tidak dihapus. Silakan coba selesaikan ujian kembali atau hubungi proktor.`
      )

      isSubmittingRef.current = false
      setIsSubmitting(false)
    }

  }

  // Jika halaman dibuka kembali setelah batas waktu, kirim sesi yang masih aktif
  // menggunakan jawaban hasil pemulihan Supabase + localStorage.
  useEffect(() => {
    // Jika waktu habis saat offline atau foto masih diunggah, tunggu hingga aman submit.
    if (
      loading ||
      !isOnline ||
      photoUploadInProgress ||
      timeLeft !== 0 ||
      sessionStatus !== 'ongoing' ||
      !sessionId
    ) return
    handleFinishExam(true)
  }, [loading, isOnline, photoUploadInProgress, timeLeft, sessionStatus, sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat ruang ujian CBT...</p>
      </div>
    )
  }

  if (authCheckFailed || loadError) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold">Ruang ujian belum dapat dimuat</h2>
        <p className="text-sm text-slate-300 max-w-lg mt-3">
          {authCheckFailed
            ? 'Pemeriksaan sesi login mengalami kendala. Ini belum berarti akun Anda logout. Periksa koneksi internet, lalu coba kembali.'
            : loadError || 'Terjadi kendala saat memuat data ujian.'}
        </p>
        <p className="text-xs text-slate-400 max-w-lg mt-2">Cadangan jawaban di perangkat tidak dihapus.</p>
        <button type="button" onClick={() => loadExamData()} className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold">
          Coba Periksa Kembali
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentIndex]
  const qType = currentQuestion?.question_type || 'multiple_choice'

  const matrixStatements =
    Array.isArray(currentQuestion?.options) && currentQuestion.options.length > 0
      ? currentQuestion.options
      : Array.isArray(currentQuestion?.statements)
      ? currentQuestion.statements
      : Array.isArray(currentQuestion?.matrix_statements)
      ? currentQuestion.matrix_statements
      : []

  // 🎨 HELPER PEMETAAN TEMA & UKURAN TEKS DINAMIS
  const isDark = theme === 'dark'

  const textClass =
    fontSize === 'xlarge'
      ? 'text-lg leading-relaxed'
      : fontSize === 'large'
      ? 'text-base leading-relaxed'
      : 'text-sm leading-relaxed'

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {forceSubmitDeadline && sessionStatus !== 'completed' && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border-2 border-amber-400 bg-white p-5 text-center text-slate-900 shadow-2xl">
            <div className="mb-2 text-3xl">📢</div><h2 className="text-lg font-black">Guru meminta ujian dikumpulkan</h2>
            <p className="mt-2 text-sm text-slate-600">Tekan tombol di bawah untuk mengirim jawaban terakhir. Jika tidak direspons, sistem akan mengumpulkan jawaban yang sudah tersimpan setelah waktu habis.</p>
            <div className="my-4 text-3xl font-black tabular-nums text-rose-600">{String(Math.floor(forceSubmitSeconds / 60)).padStart(2, '0')}:{String(forceSubmitSeconds % 60).padStart(2, '0')}</div>
            <button type="button" onClick={() => handleFinishExam(true)} disabled={isSubmitting || photoUploadInProgress || !isOnline || forceSubmitSeconds <= 0} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">{photoUploadInProgress ? 'Tunggu foto selesai dikirim...' : 'Kumpulkan Sekarang'}</button>
            <p className="mt-2 text-[11px] text-slate-500">Perangkat offline tidak dapat menerima perintah; server akan menutup sesi setelah batas waktu.</p>
          </div>
        </div>
      )}
      {/* HEADER CBT SISWA — ringkas dan tidak sticky pada semua ukuran layar */}
      <header className="relative z-10 bg-slate-900 text-white px-3 sm:px-6 py-2 sm:py-3 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">
              {exam?.subtest || 'TKA'}
            </span>
            <h1 className="truncate text-sm sm:text-base font-bold mt-0.5">{exam?.title}</h1>
          </div>

          {/* Timer selalu terlihat, tetapi tidak mengambil satu baris sendiri di HP. */}
          <div className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-right">
            <span className="block text-[9px] text-slate-400 font-bold uppercase">Sisa waktu</span>
            <span className="font-mono text-base sm:text-lg font-bold tabular-nums text-amber-400">
              ⏱ {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
            </span>
          </div>
        </div>

        {/* Pengaturan dasar langsung terlihat dengan label ringkas. */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 p-1">
            <button type="button" onClick={() => setFontSize('normal')} aria-pressed={fontSize === 'normal'} aria-label="Ukuran huruf normal" className={`min-h-8 min-w-8 rounded-md px-2 text-xs font-bold ${fontSize === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>A</button>
            <button type="button" onClick={() => setFontSize('large')} aria-pressed={fontSize === 'large'} aria-label="Perbesar huruf" className={`min-h-8 min-w-9 rounded-md px-2 text-xs font-bold ${fontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>A+</button>
            <button type="button" onClick={() => setFontSize('xlarge')} aria-pressed={fontSize === 'xlarge'} aria-label="Perbesar huruf maksimal" className={`min-h-8 min-w-10 rounded-md px-2 text-xs font-bold ${fontSize === 'xlarge' ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>A++</button>
          </div>
          <button type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')} aria-label={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'} className="min-h-8 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-700">
            {isDark ? '☀ Terang' : '🌙 Gelap'}
          </button>
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="text-[9px] text-slate-400 font-semibold uppercase">Peserta</span>
            <span className="max-w-[190px] truncate text-[11px] font-semibold text-white" title={participantName}>{participantName || 'Memuat identitas...'}</span>
            {participantIdentifier && <span className="max-w-[190px] truncate text-[9px] text-slate-400" title={`Username: ${participantIdentifier}`}>@{participantIdentifier}</span>}
            {participantClass && <span className="max-w-[190px] truncate text-[9px] text-slate-400" title={`Kelas: ${participantClass}`}>Kelas {participantClass}</span>}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuestionNav((visible) => !visible)}
            className="min-h-9 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
            title={showQuestionNav ? 'Sembunyikan navigasi nomor soal' : 'Tampilkan navigasi nomor soal'}
            aria-label={showQuestionNav ? 'Sembunyikan navigasi nomor soal' : 'Tampilkan navigasi nomor soal'}
          >
            {showQuestionNav ? 'Sembunyikan Nomor' : 'Tampilkan Nomor'}
          </button>

          <button
            type="button"
            onClick={openSubmitReview}
            disabled={isSubmitting || sessionStatus !== 'ongoing'}
            className="min-h-9 flex-1 sm:flex-none rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            suppressHydrationWarning
          >
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Ujian ✓'}
          </button>

          <div className="w-full text-[10px] font-bold sm:w-auto sm:ml-auto" aria-live="polite">
            {!isOnline ? <span className="text-rose-300">⚠ Offline — jawaban tersimpan sementara di perangkat</span> : saveStatus === 'saving' ? <span className="text-amber-300">⏳ Menyimpan jawaban…</span> : saveStatus === 'error' ? <span className="text-rose-300">⚠ Gagal menyimpan — akan dicoba lagi</span> : <span className="text-emerald-300">✓ Semua perubahan tersimpan</span>}
          </div>
        </div>
      </header>

      {/* BODY KONTEN SOAL & NAVIGASI */}
      <div className={`flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 grid grid-cols-1 ${showQuestionNav ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-3 sm:gap-6`}>
        {/* LEMBAR SOAL */}
        <div
          className={`${showQuestionNav ? 'lg:col-span-3' : 'lg:col-span-1'} p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border shadow-sm flex flex-col justify-between space-y-4 sm:space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {currentQuestion ? (
            <div
              className="space-y-4 select-none"
              onContextMenu={(event) => {
                const target = event.target as HTMLElement
                if (target.closest('[contenteditable="true"], input, textarea, select')) return
                event.preventDefault()
              }}
              onCopy={(event) => {
                const target = event.target as HTMLElement
                if (target.closest('[contenteditable="true"], input, textarea, select')) return
                event.preventDefault()
              }}
            >
              <div
                className={`flex justify-between items-center border-b pb-3 ${
                  isDark ? 'border-slate-800' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'} text-sm`}>
                    Soal Nomor {currentIndex + 1} dari {questions.length}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {qType === 'complex_multiple_choice'
                      ? 'PG Kompleks'
                      : qType === 'true_false_matrix'
                      ? 'Matriks'
                      : qType === 'essay' || qType === 'uraian'
                      ? 'Uraian / Essay'
                      : 'Pilihan Ganda'}
                  </span>
                </div>

                <button
                  onClick={() => handleToggleFlag(currentQuestion.id)}
                  disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    flaggedQuestions[currentQuestion.id]
                      ? 'bg-amber-500 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  suppressHydrationWarning
                >
                  🚩 {flaggedQuestions[currentQuestion.id] ? 'Ragu-Ragu' : 'Tandai Ragu'}
                </button>
              </div>

              {/* TEKS SOAL & GAMBAR (DINAMIS SESUAI UKURAN FONT) */}
              <div
                className={`font-semibold ${textClass} ${
                  isDark ? 'text-slate-100' : 'text-slate-900'
                }`}
              >
                <MathRenderer content={currentQuestion.question_text || ''} />
              </div>

              {currentQuestion.image_url && (
                <div className="my-2">
                  <img
                    src={currentQuestion.image_url}
                    alt="Gambar Soal"
                    onClick={() => setZoomedImageUrl(currentQuestion.image_url)}
                    className="max-h-60 rounded-xl border cursor-zoom-in hover:opacity-90 transition-opacity border-slate-700"
                  />
                </div>
              )}

              {/* 1. PILIHAN GANDA BIASA */}
              {qType === 'multiple_choice' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-2 pt-2">
                  {currentQuestion.options.map((opt: any, oIdx: number) => {
                    const optKey = opt.key || String.fromCharCode(65 + oIdx)
                    const displayLabel = String.fromCharCode(65 + oIdx)
                    const isSelected = userAnswers[currentQuestion.id] === optKey

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleSelectSingleOption(currentQuestion.id, optKey)}
                        disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                        className={`w-full min-h-14 text-left p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/70 ring-2 ring-indigo-500 text-indigo-200 font-bold'
                            : isDark
                            ? 'border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : isDark
                              ? 'bg-slate-700 text-slate-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {displayLabel}
                        </span>
                        <div className={`flex-1 font-semibold ${textClass}`}>
                          <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                          {opt.image_url && (
                            <img
                              src={opt.image_url}
                              alt={`Opsi ${displayLabel}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setZoomedImageUrl(opt.image_url)
                              }}
                              className="max-h-24 mt-2 rounded border cursor-zoom-in hover:opacity-90 transition-opacity border-slate-700"
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 2. PILIHAN GANDA KOMPLEKS (CHECKBOX) */}
              {qType === 'complex_multiple_choice' && Array.isArray(currentQuestion.options) && (
                <div className="space-y-2 pt-2">
                  <p
                    className={`text-xs font-semibold p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                    }`}
                  >
                    ℹ️ Pilih satu atau beberapa jawaban yang Anda anggap benar.
                  </p>
                  {currentQuestion.options.map((opt: any, oIdx: number) => {
                    const optKey = opt.key || String.fromCharCode(65 + oIdx)
                    const displayLabel = String.fromCharCode(65 + oIdx)
                    const currentAns = Array.isArray(userAnswers[currentQuestion.id])
                      ? userAnswers[currentQuestion.id]
                      : []
                    const isSelected = currentAns.includes(optKey)

                    return (
                      <button
                        key={optKey || oIdx}
                        onClick={() => handleToggleComplexOption(currentQuestion.id, optKey)}
                        disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                        className={`w-full min-h-14 text-left p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-950/70 ring-2 ring-indigo-500 text-indigo-200 font-bold'
                            : isDark
                            ? 'border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-medium'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-800 font-medium'
                        }`}
                        suppressHydrationWarning
                      >
                        <input
                          type="checkbox"
                          readOnly
                          checked={isSelected}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="font-bold text-xs shrink-0">{displayLabel}.</span>
                        <div className={`flex-1 font-semibold ${textClass}`}>
                          <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                          {opt.image_url && (
                            <img
                              src={opt.image_url}
                              alt={`Opsi ${displayLabel}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                setZoomedImageUrl(opt.image_url)
                              }}
                              className="max-h-24 mt-2 rounded border cursor-zoom-in hover:opacity-90 transition-opacity border-slate-700"
                            />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* 3. MATRIKS BENAR - SALAH */}
              {qType === 'true_false_matrix' && (
                <div className="space-y-3 pt-2">
                  <p
                    className={`text-xs font-semibold p-2.5 rounded-xl border ${
                      isDark
                        ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800'
                        : 'bg-indigo-50 text-indigo-800 border-indigo-100'
                    }`}
                  >
                    ℹ️ Tentukan pilihan Benar atau Salah untuk setiap baris pernyataan di bawah ini.
                  </p>
                  <div
                    className={`border rounded-xl overflow-hidden shadow-xs ${
                      isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-300 bg-white'
                    }`}
                  >
                    <table className="w-full min-w-[320px] text-left border-collapse">
                      <thead
                        className={`font-bold border-b ${
                          isDark
                            ? 'bg-slate-800/90 text-slate-100 border-slate-700'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        <tr>
                          <th className="p-2 sm:p-3 font-extrabold text-xs">Pernyataan</th>
                          <th className="p-2 sm:p-3 w-28 sm:w-36 text-center border-l font-extrabold text-xs">
                            Pilihan Jawaban
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                        {matrixStatements.map((st: any, sIdx: number) => {
                          const stId = String(st.id || sIdx + 1)
                          const currentMatrix =
                            typeof userAnswers[currentQuestion.id] === 'object'
                              ? userAnswers[currentQuestion.id]
                              : {}
                          const selectedVal = currentMatrix?.[stId]

                          const statementText =
                            typeof st === 'string'
                              ? st
                              : st?.text ||
                                st?.statement ||
                                st?.statement_text ||
                                st?.title ||
                                st?.content ||
                                st?.label ||
                                ''

                          return (
                            <tr
                              key={stId || sIdx}
                              className={`transition-colors ${isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'}`}
                            >
                              <td className="p-2 sm:p-3">
                                <div className="flex items-start space-x-2">
                                  <span className="font-bold text-xs shrink-0">{sIdx + 1}.</span>
                                  <div className={`flex-1 font-semibold ${textClass}`}>
                                    <MathRenderer content={statementText} />
                                    {st.image_url && (
                                      <img
                                        src={st.image_url}
                                        alt={`Gambar Pernyataan ${sIdx + 1}`}
                                        onClick={() => setZoomedImageUrl(st.image_url)}
                                        className="max-h-24 mt-1.5 rounded border cursor-zoom-in hover:opacity-90 transition-opacity border-slate-700"
                                      />
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className={`p-2 sm:p-3 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectMatrixValue(currentQuestion.id, stId, 'Benar')
                                    }
                                    disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                                    className={`min-h-11 min-w-16 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                                      selectedVal === 'Benar'
                                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400'
                                        : isDark
                                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    suppressHydrationWarning
                                  >
                                    Benar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectMatrixValue(currentQuestion.id, stId, 'Salah')
                                    }
                                    disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                                    className={`min-h-11 min-w-16 px-3 py-2 rounded-lg font-bold text-xs transition-all ${
                                      selectedVal === 'Salah'
                                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400'
                                        : isDark
                                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                    }`}
                                    suppressHydrationWarning
                                  >
                                    Salah
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. URAIAN / ESSAY */}
              {(qType === 'essay' || qType === 'uraian') && (
                <div className="space-y-3 pt-3">
                  <label className="block text-sm font-bold uppercase tracking-wide">
                    Lembar Jawaban Essay Anda
                  </label>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                    <p>
                      Gunakan toolbar untuk memformat jawaban. Pilih عربي untuk tulisan Arab atau ꦗꦮ untuk Aksara Jawa. Tombol ⌨ Huruf membuka keyboard khusus.
                    </p>
                  </div>
                  <RichTextEditor
                    content={typeof userAnswers[currentQuestion.id] === 'string' ? userAnswers[currentQuestion.id] : ''}
                    onChange={(html) => handleEssayChange(currentQuestion.id, html)}
                    placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    editable={!isSubmitting && timeLeft !== 0 && sessionStatus === 'ongoing'}
                    toolbarMode="essay"
                    showJavaneseLatinConversion={false}
                    minHeight={240}
                    className="w-full shadow-sm select-text"
                  />
                  {sessionId && userIdRef.current && (
                    <div className="pt-1">
                      <StudentAnswerPhotos
                        sessionId={sessionId}
                        questionId={currentQuestion.id}
                        userId={userIdRef.current}
                        disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                        onUploadingChange={setPhotoUploadInProgress}
                        onPhotosChange={(count) => {
                          setReviewPhotoQuestionIds((current) => {
                            const hasPhoto = current.includes(currentQuestion.id)
                            if (count > 0 && !hasPhoto) return [...current, currentQuestion.id]
                            if (count === 0 && hasPhoto) return current.filter((id) => id !== currentQuestion.id)
                            return current
                          })
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">Belum ada soal pada ujian ini.</p>
          )}

          {/* NAVIGASI SEBELUMNYA / SELANJUTNYA */}
          <div
            className={`grid grid-cols-2 gap-2 pt-4 border-t ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              disabled={currentIndex === 0 || isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className={`w-full min-h-11 px-3 py-2 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              suppressHydrationWarning
            >
              ← Sebelumnya
            </button>

            <button
              disabled={currentIndex === questions.length - 1 || isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="w-full min-h-11 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              suppressHydrationWarning
            >
              Selanjutnya →
            </button>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI NOMOR SOAL */}
        {showQuestionNav && <div
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm space-y-3 sm:space-y-4 h-fit ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h3
            className={`text-xs font-bold uppercase border-b pb-2 ${
              isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
            }`}
          >
            🧭 Navigasi Nomor Soal
          </h3>

          <div className={'mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold ' + (isDark ? 'text-slate-400' : 'text-slate-500')}>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-500" />Dijawab {questions.filter((q) => isQuestionAnswered(q, userAnswers[q.id]) || reviewPhotoQuestionIds.includes(q.id)).length}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm border border-slate-400" />Belum lengkap {questions.filter((q) => !isQuestionAnswered(q, userAnswers[q.id]) && !reviewPhotoQuestionIds.includes(q.id)).length}</span>
            <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-500" />Ragu-ragu {questions.filter((q) => flaggedQuestions[q.id]).length}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {([
              { value: 'all', label: 'Semua' },
              { value: 'incomplete', label: 'Belum lengkap' },
              { value: 'flagged', label: 'Ragu-ragu' },
            ] as const).map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setQuestionNavFilter(filter.value)}
                aria-pressed={questionNavFilter === filter.value}
                className={'min-h-10 rounded-lg border px-1.5 sm:px-2 py-2 text-[10px] font-bold transition-colors ' + (
                  questionNavFilter === filter.value
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : isDark
                      ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const incomplete = questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => !isQuestionAnswered(q, userAnswers[q.id]) && !reviewPhotoQuestionIds.includes(q.id))
              const next = incomplete.find(({ idx }) => idx > currentIndex) || incomplete[0]
              if (next) setCurrentIndex(next.idx)
            }}
            disabled={
              questions.every((q) => isQuestionAnswered(q, userAnswers[q.id]) || reviewPhotoQuestionIds.includes(q.id)) ||
              isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'
            }
            className="w-full min-h-11 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[11px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cari soal belum lengkap berikutnya →
          </button>
          <div className="grid grid-cols-6 sm:grid-cols-5 gap-1.5">
            {questions.map((q, idx) => {
              const isAnswered = isQuestionAnswered(q, userAnswers[q.id]) || reviewPhotoQuestionIds.includes(q.id)
              const isFlagged = !!flaggedQuestions[q.id]
              const isCurrent = idx === currentIndex
              const shouldShow =
                questionNavFilter === 'all' ||
                (questionNavFilter === 'incomplete' && !isAnswered) ||
                (questionNavFilter === 'flagged' && isFlagged)
              if (!shouldShow) return null
              let btnClass = isAnswered
                ? 'bg-emerald-600 text-white border-emerald-600'
                : isDark
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              if (isCurrent) btnClass += ' ring-2 ring-indigo-600 ring-offset-1 z-10 font-extrabold'
              else btnClass += ' font-semibold'
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                  aria-label={'Soal ' + (idx + 1) + ', ' + (isAnswered ? 'sudah dijawab' : 'belum dijawab') + (isFlagged ? ', ragu-ragu' : '')}
                  className={'relative min-h-10 rounded-md text-xs font-mono transition-all border flex items-center justify-center ' + btnClass + (isFlagged ? ' outline outline-2 outline-amber-400 outline-offset-[-2px]' : '')}
                  suppressHydrationWarning
                >
                  {idx + 1}
                  {isFlagged && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-white bg-amber-400" />}
                </button>
              )
            })}
          </div>
          {questions.filter((q) => {
            const answered = isQuestionAnswered(q, userAnswers[q.id]) || reviewPhotoQuestionIds.includes(q.id)
            return questionNavFilter === 'all' ||
              (questionNavFilter === 'incomplete' && !answered) ||
              (questionNavFilter === 'flagged' && !!flaggedQuestions[q.id])
          }).length === 0 && (
            <p className={'rounded-lg px-3 py-4 text-center text-[11px] ' + (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-50 text-slate-500')}>
              {questionNavFilter === 'incomplete' ? 'Semua soal sudah lengkap.' : 'Belum ada soal yang ditandai ragu-ragu.'}
            </p>
          )}
        </div>}
      </div>

      {/* TINJAUAN SINGKAT SEBELUM MENGUMPULKAN UJIAN */}
      {showSubmitReview && (() => {
        const unansweredQuestions = questions.filter((q) =>
          !isQuestionAnswered(q, userAnswers[q.id]) && !reviewPhotoQuestionIds.includes(q.id)
        )
        const flaggedCount = questions.filter((q) => Boolean(flaggedQuestions[q.id])).length
        const answeredCount = questions.length - unansweredQuestions.length
        return (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="submit-review-title">
            <div className={'w-full max-w-md rounded-xl border p-4 shadow-2xl ' + (isDark ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="submit-review-title" className="text-sm font-extrabold">Periksa sebelum mengumpulkan</h2>
                  <p className={'mt-1 text-[11px] ' + (isDark ? 'text-slate-400' : 'text-slate-500')}>Pastikan tidak ada jawaban yang terlewat.</p>
                </div>
                <button type="button" onClick={() => setShowSubmitReview(false)} className={'rounded-md px-2 py-1 text-xs font-bold ' + (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')} aria-label="Tutup tinjauan">✕</button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-500/10 px-2 py-2"><div className="text-lg font-black text-emerald-600">{answeredCount}</div><div className="text-[10px] font-semibold">Dijawab</div></div>
                <div className="rounded-lg bg-rose-500/10 px-2 py-2"><div className="text-lg font-black text-rose-600">{unansweredQuestions.length}</div><div className="text-[10px] font-semibold">Belum lengkap</div></div>
                <div className="rounded-lg bg-amber-500/10 px-2 py-2"><div className="text-lg font-black text-amber-600">{flaggedCount}</div><div className="text-[10px] font-semibold">Ragu-ragu</div></div>
              </div>
              {unansweredQuestions.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1.5 text-[11px] font-bold">Soal yang belum lengkap — tekan nomor untuk memeriksa:</p>
                  <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                    {unansweredQuestions.map((q) => {
                      const index = questions.findIndex((item) => item.id === q.id)
                      return <button key={q.id} type="button" onClick={() => { setCurrentIndex(index); setShowSubmitReview(false) }} className="h-7 min-w-7 rounded-md border border-rose-300 bg-rose-50 px-2 text-xs font-bold text-rose-700 hover:bg-rose-100">{index + 1}</button>
                    })}
                  </div>
                </div>
              )}
              {unansweredQuestions.length === 0 && flaggedCount === 0 && <p className="mt-3 text-xs font-semibold text-emerald-700">Semua soal sudah dijawab dan tidak ada yang ditandai ragu-ragu.</p>}
              <p className={'mt-3 text-[11px] leading-relaxed ' + (isDark ? 'text-slate-400' : 'text-slate-500')}>Setelah dikumpulkan, jawaban tidak dapat diubah lagi.</p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setShowSubmitReview(false)} className={'flex-1 rounded-lg border px-3 py-2.5 text-xs font-bold ' + (isDark ? 'border-slate-700 bg-slate-800 text-slate-200' : 'border-slate-300 bg-white text-slate-700')}>Kembali periksa</button>
                <button type="button" onClick={() => handleFinishExam(false, true)} disabled={isSubmitting || photoUploadInProgress} className="flex-1 rounded-lg bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Kumpulkan ujian</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 🔒 OVERLAY LAYAR DIPAUSE / DIHENTIKAN SEMENTARA OLEH PENGAWAS */}
      {sessionStatus === 'missing' && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center font-sans">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-black">Status sesi belum dapat dipastikan</h2>
          <p className="text-slate-300 text-sm max-w-lg mt-3 leading-relaxed">Jawaban di perangkat tetap dipertahankan. Sistem sedang mencoba memeriksa sesi kembali. Jangan tutup atau muat ulang halaman. Jika status ini tidak berubah, hubungi pengawas ujian.</p>
        </div>
      )}

      {exam?.proctor_enabled && exam?.proctor_require_fullscreen && sessionStatus === 'ongoing' && !fullscreenActive && (
        <div className="fixed inset-0 z-[80] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-2xl font-black">Ujian Wajib Full Screen</h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
            Untuk menjaga ketertiban ujian, aktifkan layar penuh sebelum melanjutkan. Jika keluar dari layar penuh, sistem akan mencatatnya sebagai pelanggaran.
          </p>
          {fullscreenError && <p className="mt-3 max-w-md rounded-lg bg-rose-500/15 p-3 text-xs text-rose-200">{fullscreenError}</p>}
          <button type="button" onClick={enterExamFullscreen} className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-indigo-400">
            Aktifkan Full Screen
          </button>
          <p className="mt-3 text-[11px] text-slate-400">Jika perangkat tidak mendukung, minta bantuan pengawas. Jangan membuat sesi ujian baru.</p>
        </div>
      )}

      {exam?.proctor_enabled && proctorNotice && sessionStatus === 'ongoing' && (
        <div className="fixed bottom-4 left-4 right-4 z-[65] mx-auto max-w-lg rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-xs font-bold text-amber-900 shadow-xl">
          {proctorNotice} · {proctorViolationCount}/{exam.proctor_max_violations || 3}
        </div>
      )}

            {sessionStatus === 'paused' && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center font-sans">
          <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center text-4xl animate-bounce mb-4">
            ⏸️
          </div>
          <h2 className="text-2xl font-black">{proctorPauseReason ? 'Ujian Dijeda Otomatis' : 'Ujian Dipause oleh Pengawas'}</h2>
          <p className="text-slate-300 text-xs max-w-md mt-2 leading-relaxed">
            {proctorPauseReason || 'Pengawas sedang menghentikan sementara aktivitas ujian Anda.'}
            <br />
            {proctorViolationCount > 0 && <span className="font-bold text-amber-300">Catatan pelanggaran: {proctorViolationCount} kali. </span>}
            <strong>Jawaban Anda telah tersimpan aman.</strong> Silakan tunggu hingga pengawas melanjutkan ujian.
          </p>
          <div className="mt-6 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-amber-300 animate-pulse">
            ⏳ Menunggu Pengawas Membuka Kuncian...
          </div>
        </div>
      )}

      {/* MODAL ZOOM GAMBAR (LIGHTBOX INTERAKTIF FULLSCREEN) */}
      {zoomedImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setZoomedImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-900/70 text-white flex items-center justify-center font-bold text-sm hover:bg-slate-900 transition-colors z-10"
              title="Tutup Gambar"
            >
              ✕
            </button>
            <img
              src={zoomedImageUrl}
              alt="Gambar Diperbesar"
              className="max-h-[85vh] max-w-full object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamEnginePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
          <p className="font-semibold text-sm">Memuat ruang ujian CBT...</p>
        </div>
      }
    >
      <ExamEngineContent />
    </Suspense>
  )
}
