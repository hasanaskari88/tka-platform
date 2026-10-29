'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'

function ExamEngineContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

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
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Ref untuk menghindari stale closure dan submit ganda
  const userAnswersRef = useRef<{ [key: string]: any }>({})
  const questionsRef = useRef<any[]>([])
  const isSubmittingRef = useRef<boolean>(false)
  const sessionIdRef = useRef<string | null>(null)
  const flaggedQuestionsRef = useRef<{ [key: string]: boolean }>({})
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

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

  // Simpan seluruh jawaban dan status ragu-ragu ke Supabase secara berurutan.
  const persistAnswersToSupabase = async () => {
    const activeSessId = sessionIdRef.current
    const currentQuestions = questionsRef.current
    if (!activeSessId || currentQuestions.length === 0) return

    const answers = userAnswersRef.current
    const flags = flaggedQuestionsRef.current
    const updatedAt = new Date().toISOString()
    const records = currentQuestions.map((q) => {
      const raw = answers[q.id]
      const isObjectiveMultiple = q.question_type === 'complex_multiple_choice' || q.question_type === 'true_false_matrix'
      return {
        session_id: activeSessId,
        question_id: q.id,
        user_answer: raw === undefined || raw === null ? null : (typeof raw === 'string' ? raw : JSON.stringify(raw)),
        selected_option: q.question_type === 'multiple_choice' && typeof raw === 'string' ? raw : null,
        selected_answers: isObjectiveMultiple && raw !== undefined && raw !== null ? raw : null,
        is_flagged: Boolean(flags[q.id]),
        updated_at: updatedAt,
      }
    })

    // Jangan menulis ke sesi yang sudah berganti/dihapus.
    if (sessionIdRef.current !== activeSessId) return
    const { error } = await createClient().from('answers').upsert(records, {
      onConflict: 'session_id,question_id',
    })
    if (error) throw error
  }

  const queueAutosave = () => {
    saveQueueRef.current = saveQueueRef.current.then(() => persistAnswersToSupabase())
    return saveQueueRef.current
  }

  const scheduleAutosave = () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null
      queueAutosave().catch((error) => console.error('Autosave gagal:', error))
    }, 800)
  }

  const flushAutosave = async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    await queueAutosave()
  }

  // Update state, ref, cadangan lokal, lalu jadwalkan autosave 800 ms.
  const updateAnswersState = (newAnswersMap: { [key: string]: any }) => {
    setUserAnswers(newAnswersMap)
    userAnswersRef.current = newAnswersMap
    if (examId) localStorage.setItem(`cbt_answers_${examId}`, JSON.stringify(newAnswersMap))
    scheduleAutosave()
  }

  // 1. MEMUAT DATA UJIAN, BUKA/HUBUNGKAN SESI ONGOING SUPABASE, & HITUNG TIMER AKURAT
  const loadExamData = async () => {
    if (!examId) return
    
    const supabase = createClient()

    let user = null

    try {
      const { data, error } = await supabase.auth.getUser()

      if (error) throw error

      user = data.user
    } catch (error) {
      console.error('Gagal memeriksa login:', error)

      alert('Gagal memeriksa sesi login. Silakan coba kembali.')

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
    // A. Ambil User Aktif
    const {
      data: { user: activeUser },
    } = await supabase.auth.getUser()

    if (!activeUser) {
      router.push('/login')
      return
    }

    // B. Fetch Data Ujian
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (!examData) {
      alert('Ujian tidak ditemukan!')
      router.push('/')
      return
    }

    // C. Fetch Data Soal
    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (questionData) {
      let processedQuestions = [...questionData]

      if (examData.shuffle_questions) {
        processedQuestions = shuffleArray(processedQuestions)
      }

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
    // E. Cari sesi terbaru, termasuk sesi yang sudah selesai
    let currentSessId: string | null = null
    let startTimeIso = new Date().toISOString()
    let currentSession: any = null

    
const { data: existingSession, error: sessionError } = await supabase
  .from('exam_sessions')
  .select('*')
  .eq('exam_id', examId)
  .eq('user_id', user.id)
  .in('status', ['ongoing', 'paused'])
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle()


    if (sessionError) {
      console.error('Gagal memuat sesi:', sessionError)
      alert('Gagal memuat sesi ujian. Silakan coba kembali.')
      setLoading(false)
      return
    }


    if (existingSession) {
      currentSession = existingSession
      currentSessId = existingSession.id
      startTimeIso = existingSession.start_time || startTimeIso
      setSessionStatus(existingSession.status)
    } else {
      // Sesi baru hanya dibuat saat tidak ada sesi yang tersisa.
      const { data: newSess, error: createError } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: examId,
          user_id: activeUser.id,
          status: 'ongoing',
          start_time: startTimeIso,
          paused_duration_seconds: 0,
          extra_time_seconds: 0,
        })
        .select('*')
        .single()

      if (createError || !newSess) {
        console.error('Gagal membuat sesi:', createError)

        alert(
          `Gagal membuat sesi ujian baru: ${
            createError?.message || 'Data sesi tidak dikembalikan oleh database.'
          }`
        )

        setLoading(false)
        return
      }

      currentSession = newSess
      currentSessId = newSess.id
      setSessionStatus('ongoing')
    }

    if (currentSessId) {
      setSessionId(currentSessId)
      sessionIdRef.current = currentSessId
    }

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
      const { error: placeholderError } = await supabase.from('answers').upsert(placeholders, {
        onConflict: 'session_id,question_id',
        ignoreDuplicates: true,
      })
      if (placeholderError) throw new Error(`Gagal membuat baris jawaban awal: ${placeholderError.message}`)
    }

    const localAnswersKey = `cbt_answers_${examId}`
    const localFlagsKey = `cbt_flags_${examId}`

    if (existingSession && currentSessId) {
      const { data: savedRows, error: savedRowsError } = await supabase
        .from('answers')
        .select('question_id, user_answer, selected_option, selected_answers, is_flagged')
        .eq('session_id', currentSessId)

      if (savedRowsError) console.error('Gagal memulihkan jawaban dari Supabase:', savedRowsError)

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
        const savedAns = localStorage.getItem(localAnswersKey)
        if (savedAns) localAnswers = JSON.parse(savedAns) || {}
      } catch (e) {
        console.error('Gagal memulihkan jawaban lokal:', e)
        localStorage.removeItem(localAnswersKey)
      }
      try {
        const savedFlags = localStorage.getItem(localFlagsKey)
        if (savedFlags) localFlags = JSON.parse(savedFlags) || {}
      } catch (e) {
        console.error('Gagal memulihkan status ragu lokal:', e)
        localStorage.removeItem(localFlagsKey)
      }

      const mergedAnswers = { ...remoteAnswers, ...localAnswers }
      const mergedFlags = { ...remoteFlags, ...localFlags }
      setUserAnswers(mergedAnswers)
      userAnswersRef.current = mergedAnswers
      setFlaggedQuestions(mergedFlags)
      flaggedQuestionsRef.current = mergedFlags
    } else {
      localStorage.removeItem(localAnswersKey)
      localStorage.removeItem(localFlagsKey)
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

    const nowMs = Date.now()
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

    setTimeLeft(remainingSeconds)
    setLoading(false)
  }

  useEffect(() => {
    loadExamData()
  }, [examId])

  // 🟢 HOOK CEK STATUS SESI (PAUSE/RESUME) REAL-TIME
  useEffect(() => {
    if (!examId || loading) return

    const checkSessionStatus = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      
      const currentId = sessionIdRef.current

      if (!currentId) return

      const { data: activeSession, error } = await supabase
        .from('exam_sessions')
        .select('id, status')
        .eq('id', currentId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Gagal memeriksa status sesi:', error)
        return
      }

      // Sesi telah dihapus oleh proktor melalui Reset Sesi.
      if (!activeSession) {
  // Hentikan proses submit lama agar tidak memakai sesi yang sudah dihapus.
  isSubmittingRef.current = false
  setIsSubmitting(false)

  // Hapus seluruh cadangan jawaban sesi sebelumnya.
  localStorage.removeItem(`cbt_answers_${examId}`)
  localStorage.removeItem(`cbt_flags_${examId}`)
  localStorage.removeItem(`cbt_start_time_${examId}`)
  if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
  autosaveTimerRef.current = null
  flaggedQuestionsRef.current = {}

  // Reset state jawaban dan navigasi.
  setUserAnswers({})
  userAnswersRef.current = {}

  setFlaggedQuestions({})
  setCurrentIndex(0)

  // Kosongkan referensi sesi lama.
  sessionIdRef.current = null
  setSessionId(null)

  // Muat ulang untuk membuat sesi baru.
  window.location.replace(`/exam/${examId}`)
  return
}

      setSessionStatus(activeSession.status)

      // Sesi dipaksa selesai oleh proktor.
      if (activeSession.status === 'completed') {
        router.replace(
          `/exam/${examId}/summary?session_id=${activeSession.id}`
        )
      }

    }

    checkSessionStatus()
    const statusInterval = setInterval(checkSessionStatus, 3000)

    return () => clearInterval(statusInterval)
}, [examId, loading, sessionId, router])

  // 🟢 PROTEKSI RELOAD & BACK BROWSER
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // 🟢 TIMER COUNTDOWN PRESISI (HENTIKAN TIMER JIKA DIPAUSE)
      useEffect(() => {
        if (
      timeLeft === null ||
      timeLeft <= 0 ||
      sessionStatus === 'paused' ||
      sessionStatus === 'completed'
    ) {
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer)
          handleFinishExam(true)
          return 0
        }
        return prev !== null ? prev - 1 : null
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, sessionStatus])

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
  const handleEssayChange = (questionId: string, text: string) => {
    const updated = { ...userAnswersRef.current, [questionId]: text }
    updateAnswersState(updated)
  }

  // Handler Ragu-Ragu
  const handleToggleFlag = (questionId: string) => {
    const updated = {
      ...flaggedQuestionsRef.current,
      [questionId]: !flaggedQuestionsRef.current[questionId],
    }
    flaggedQuestionsRef.current = updated
    setFlaggedQuestions(updated)
    if (examId) localStorage.setItem(`cbt_flags_${examId}`, JSON.stringify(updated))
    scheduleAutosave()
  }

  // 🟢 SELAYAKAN UJIAN, POPULASI NILAI PRESISI, & SIMPAN HASIL KE DATABASE
    const handleFinishExam = async (autoFinish = false) => {
    if (isSubmittingRef.current) return

    if (sessionStatus === 'completed') return

    if (!sessionIdRef.current) {
      alert('Sesi ujian tidak ditemukan. Silakan muat ulang halaman.')
      return
    }
    if (!autoFinish && !confirm('Apakah Anda yakin ingin menyelesaikan ujian ini?')) return

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

      alert('Gagal memeriksa sesi login. Silakan coba kembali.')

      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    let totalPointsEarned = 0
    let totalMaxPoints = 0

    try {
      // Verifikasi sesi aktif sebelum flush; validasi penuh tetap dilakukan di bawah.
      await flushAutosave()
    } catch (error) {
      console.error('Autosave terakhir gagal:', error)
      alert('Jawaban terakhir gagal disimpan. Ujian belum dikirim. Silakan coba lagi.')
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    const currentQuestions = questionsRef.current
    const currentAnswers = userAnswersRef.current
    const currentFlags = flaggedQuestionsRef.current

    currentQuestions.forEach((q) => {
      const qMaxScore = Number(q.max_score) || 1
      totalMaxPoints += qMaxScore

      const qType = q.question_type || 'multiple_choice'
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
    })

    const finalScore =
      totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100 * 100) / 100 : 0

    
    const endTimeIso = new Date().toISOString()
    let activeSessId = sessionIdRef.current || sessionId

    try {
      // 1. Pastikan pengguna masih login
      if (!user) {
        throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
      }

      // 2. Pastikan sesi ujian tersedia
      // 2. Pastikan sesi yang akan diselesaikan masih ada dan aktif
      if (!activeSessId) {
        throw new Error(
          'Sesi ujian tidak ditemukan. Silakan muat ulang halaman.'
        )
      }

      const { data: activeSession, error: sessionCheckError } = await supabase
        .from('exam_sessions')
        .select('id, status')
        .eq('id', activeSessId)
        .eq('exam_id', examId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (sessionCheckError) {
        throw new Error(
          `Gagal memeriksa sesi ujian: ${sessionCheckError.message}`
        )
      }

      if (!activeSession) {
        throw new Error(
          'Sesi ujian sudah dihapus atau tidak ditemukan. Muat ulang halaman untuk memulai kembali.'
        )
      }

      if (activeSession.status !== 'ongoing') {
        throw new Error(
          'Sesi ujian tidak lagi aktif. Muat ulang halaman untuk memeriksa status terbaru.'
        )
      }

      // 3. Siapkan semua jawaban, termasuk soal yang tidak dijawab
      const answerRecords = currentQuestions.map((q) => {
        const rawAns = currentAnswers[q.id]

        const formattedAns =
          rawAns === undefined || rawAns === null
            ? null
            : typeof rawAns === 'string'
              ? rawAns
              : JSON.stringify(rawAns)

        return {
          session_id: activeSessId,
          question_id: q.id,
          user_answer: formattedAns,
          selected_option:
            q.question_type === 'multiple_choice' &&
            typeof rawAns === 'string'
              ? rawAns
              : null,
          selected_answers:
            (q.question_type === 'complex_multiple_choice' ||
              q.question_type === 'true_false_matrix') &&
            rawAns !== undefined &&
            rawAns !== null
              ? rawAns
              : null,
          is_flagged: !!currentFlags[q.id],
          updated_at: endTimeIso,
        }
      })

      // 4. Simpan atau perbarui jawaban sebelum menyelesaikan sesi
      if (answerRecords.length > 0) {
        const { error: answersError } = await supabase
          .from('answers')
          .upsert(answerRecords, {
            onConflict: 'session_id,question_id',
          })

        if (answersError) {
          throw new Error(
            `Gagal menyimpan jawaban: ${answersError.message}`
          )
        }
      }

      // 5. Tandai sesi selesai hanya setelah penyimpanan jawaban berhasil
      const { data: completedSession, error: finishError } = await supabase
        .from('exam_sessions')
        .update({
          status: 'completed',
          score: finalScore,
          completed_at: endTimeIso,
          submitted_at: endTimeIso,
          end_time: endTimeIso,
        })
        .eq('id', activeSessId)
        .eq('user_id', user.id)
        .eq('status', 'ongoing')
        .select('id')
        .maybeSingle()

      if (finishError || !completedSession) {
        throw new Error(
          `Jawaban sudah dikirim, tetapi status selesai gagal diperbarui: ${
            finishError?.message || 'Sesi tidak ditemukan atau akses ditolak'
          }`
        )
      }

      // 6. Hapus cadangan lokal hanya setelah penyimpanan berhasil
      localStorage.removeItem(`cbt_answers_${examId}`)
      localStorage.removeItem(`cbt_flags_${examId}`)
      localStorage.removeItem(`cbt_start_time_${examId}`)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat ruang ujian CBT...</p>
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
      className={`min-h-screen flex flex-col font-sans select-none transition-colors duration-200 ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* HEADER CBT SISWA */}
      <header className="bg-slate-900 text-white px-6 py-3 flex flex-wrap justify-between items-center shadow-md gap-3">
        <div>
          <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">
            {exam?.subtest || 'TKA'}
          </span>
          <h1 className="text-base font-bold mt-0.5">{exam?.title}</h1>
        </div>

        <div className="flex flex-wrap items-center space-x-4 sm:space-x-6">
          {/* 🔠 CONTROLS FONT SIZE (UKURAN TEKS) */}
          <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
            <span className="text-[10px] text-slate-400 font-bold px-1 uppercase hidden sm:inline">
              Teks:
            </span>
            <button
              onClick={() => setFontSize('normal')}
              className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition-all ${
                fontSize === 'normal'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
              title="Ukuran Teks Normal"
            >
              A
            </button>
            <button
              onClick={() => setFontSize('large')}
              className={`px-2 py-0.5 rounded-lg font-bold text-xs transition-all ${
                fontSize === 'large'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
              title="Ukuran Teks Besar"
            >
              A+
            </button>
            <button
              onClick={() => setFontSize('xlarge')}
              className={`px-2 py-0.5 rounded-lg font-bold text-sm transition-all ${
                fontSize === 'xlarge'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
              title="Ukuran Teks Sangat Besar"
            >
              A++
            </button>
          </div>

          {/* 🌗 CONTROLS TEMA (DARK / LIGHT MODE) */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1"
            title="Ganti Tema Tampilan Ujian"
          >
            <span>{isDark ? '☀️ Mode Terang' : '🌙 Mode Gelap'}</span>
          </button>

          {/* TIMER */}
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-bold uppercase">
              Sisa Waktu
            </span>
            <span className="font-mono text-lg font-bold text-amber-400">
              ⏱ {timeLeft !== null ? formatTime(timeLeft) : '00:00'}
            </span>
          </div>

          <button
            onClick={() => handleFinishExam(false)}
            disabled={isSubmitting || sessionStatus !== 'ongoing'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
            suppressHydrationWarning
          >
            {isSubmitting ? 'Menyimpan...' : 'Selesaikan Ujian ✓'}
          </button>
        </div>
      </header>

      {/* BODY KONTEN SOAL & NAVIGASI */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEMBAR SOAL */}
        <div
          className={`lg:col-span-3 p-6 rounded-2xl border shadow-sm flex flex-col justify-between space-y-6 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {currentQuestion ? (
            <div className="space-y-4">
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
                      : qType === 'essay'
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
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
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
                        className={`w-full text-left p-3.5 rounded-xl border flex items-center space-x-3 transition-all ${
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
                    <table className="w-full text-left border-collapse">
                      <thead
                        className={`font-bold border-b ${
                          isDark
                            ? 'bg-slate-800/90 text-slate-100 border-slate-700'
                            : 'bg-slate-100 text-slate-800 border-slate-300'
                        }`}
                      >
                        <tr>
                          <th className="p-3 font-extrabold text-xs">Pernyataan</th>
                          <th className="p-3 w-36 text-center border-l font-extrabold text-xs">
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
                              <td className="p-3">
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
                              <td className={`p-3 border-l ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                                <div className="flex justify-center space-x-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleSelectMatrixValue(currentQuestion.id, stId, 'Benar')
                                    }
                                    disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
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
                                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
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
              {qType === 'essay' && (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold uppercase">Lembar Jawaban Essay Anda:</label>
                  <textarea
                    rows={6}
                    placeholder="Tuliskan jawaban lengkap Anda di sini..."
                    value={userAnswers[currentQuestion.id] || ''}
                    disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                    onChange={(e) => handleEssayChange(currentQuestion.id, e.target.value)}
                    className={`w-full p-3.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-600 font-semibold shadow-inner ${textClass} ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500'
                        : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                    }`}
                    suppressHydrationWarning
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-10">Belum ada soal pada ujian ini.</p>
          )}

          {/* NAVIGASI SEBELUMNYA / SELANJUTNYA */}
          <div
            className={`flex justify-between items-center pt-4 border-t ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <button
              disabled={currentIndex === 0 || isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
              onClick={() => setCurrentIndex((prev) => prev - 1)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors disabled:opacity-40 ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              suppressHydrationWarning
            >
              ← Sebelumnya
            </button>

            <button
              disabled={currentIndex === questions.length - 1 || isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
              onClick={() => setCurrentIndex((prev) => prev + 1)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-40"
              suppressHydrationWarning
            >
              Selanjutnya →
            </button>
          </div>
        </div>

        {/* SIDEBAR NAVIGASI NOMOR SOAL */}
        <div
          className={`p-5 rounded-2xl border shadow-sm space-y-4 h-fit ${
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

          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ans = userAnswers[q.id]
              const isAnswered =
                ans !== undefined &&
                ans !== null &&
                (Array.isArray(ans)
                  ? ans.length > 0
                  : typeof ans === 'object'
                  ? Object.keys(ans).length > 0
                  : true)
              const isFlagged = !!flaggedQuestions[q.id]
              const isCurrent = idx === currentIndex

              let btnClass = isDark
                ? 'bg-slate-800 text-slate-300 border-slate-700'
                : 'bg-slate-100 text-slate-600 border-slate-200'

              if (isAnswered) btnClass = 'bg-emerald-600 text-white border-emerald-600 font-bold'
              if (isFlagged) btnClass = 'bg-amber-500 text-white border-amber-500 font-bold'
              if (isCurrent) btnClass += ' ring-2 ring-indigo-600 ring-offset-1 font-bold'

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(idx)}
                  disabled={isSubmitting || timeLeft === 0 || sessionStatus !== 'ongoing'}
                  className={`h-9 rounded-lg text-xs font-mono transition-all border flex items-center justify-center ${btnClass}`}
                  suppressHydrationWarning
                >
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 🔒 OVERLAY LAYAR DIPAUSE / DIHENTIKAN SEMENTARA OLEH PENGAWAS */}
      {sessionStatus === 'paused' && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center font-sans">
          <div className="w-20 h-20 bg-amber-500/20 border-2 border-amber-400 rounded-full flex items-center justify-center text-4xl animate-bounce mb-4">
            ⏸️
          </div>
          <h2 className="text-2xl font-black">Ujian Dipause oleh Pengawas</h2>
          <p className="text-slate-300 text-xs max-w-md mt-2 leading-relaxed">
            Pengawas sedang menghentikan sementara aktivitas ujian Anda (misal untuk penanganan kendala teknis/jaringan).
            <br />
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
