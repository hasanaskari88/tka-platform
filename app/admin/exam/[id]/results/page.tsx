'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import * as XLSX from 'xlsx'

// 🖼️ KOMPONEN SMART LOGO BERBASIS REACT STATE
function SmartLogo({
  candidates,
  alt,
  fallbackText,
  className = 'w-16 h-16 object-contain shrink-0',
  fallbackClassName = 'w-16 h-16 bg-indigo-700 text-white font-black text-xl flex items-center justify-center rounded-2xl shrink-0',
}: {
  candidates: string[]
  alt: string
  fallbackText: string
  className?: string
  fallbackClassName?: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedAll, setFailedAll] = useState(false)

  const handleImgError = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setFailedAll(true)
    }
  }

  if (failedAll) {
    return <div className={fallbackClassName}>{fallbackText}</div>
  }

  return (
    <img
      src={candidates[currentIndex]}
      alt={alt}
      className={className}
      onError={handleImgError}
    />
  )
}

// 🟢 HELPER EVALUASI MULTI-TIPE SOAL
function evaluateAnswer(q: any, rawAns: any) {
  if (rawAns === null || rawAns === undefined || rawAns === '') {
    return { isCorrect: false, isUnanswered: true, isEssay: q.question_type === 'essay' || q.question_type === 'uraian', ratio: 0, userChoices: [], displayVal: 'Kosong' }
  }

  let parsed = rawAns
  if (typeof rawAns === 'string') {
    const trimmed = rawAns.trim()
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      try {
        parsed = JSON.parse(trimmed)
      } catch (e) {
        parsed = trimmed
      }
    }
  }

  const qType = q.question_type || 'multiple_choice'

  if (qType === 'essay' || qType === 'uraian') {
    const textAns = typeof parsed === 'string' ? parsed.trim() : String(parsed || '').trim()
    const isAnswered = textAns.length > 0 && textAns !== 'null' && textAns !== 'undefined'
    return {
      isCorrect: false,
      isUnanswered: !isAnswered,
      isEssay: true,
      ratio: 0,
      userChoices: isAnswered ? [textAns] : [],
      displayVal: isAnswered ? textAns : 'Kosong'
    }
  }

  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? q.answer ?? '').trim().toUpperCase()
    const userChoice = String(parsed || '').trim().toUpperCase()
    const isCorrect = userChoice !== '' && userChoice === correctOpt
    return {
      isCorrect,
      isUnanswered: !userChoice,
      isEssay: false,
      ratio: isCorrect ? 1 : 0,
      userChoices: userChoice ? [userChoice] : [],
      displayVal: userChoice || 'Kosong'
    }
  }

  if (qType === 'complex_multiple_choice') {
    let correctKeys: string[] = []
    if (Array.isArray(q.correct_answers)) {
      correctKeys = q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
    } else if (q.correct_option || q.correct_answer) {
      const str = String(q.correct_option ?? q.correct_answer)
      correctKeys = str.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean)
    }

    let userKeys: string[] = []
    if (Array.isArray(parsed)) {
      userKeys = parsed.map((k: any) => String(k).trim().toUpperCase())
    } else if (typeof parsed === 'string' && parsed) {
      userKeys = parsed.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean)
    }

    if (userKeys.length === 0) {
      return { isCorrect: false, isUnanswered: true, isEssay: false, ratio: 0, userChoices: [], displayVal: 'Kosong' }
    }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length
    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0

    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      isEssay: false,
      ratio,
      userChoices: userKeys,
      displayVal: userKeys.join(', ')
    }
  }

  if (qType === 'true_false_matrix') {
    const correctObj: { [key: string]: string } = q.correct_answers || {}
    const userObj = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {}

    const statementIds = Object.keys(correctObj)
    if (statementIds.length === 0) return { isCorrect: false, isUnanswered: true, isEssay: false, ratio: 0, userChoices: [], displayVal: 'Kosong' }

    let correctRows = 0
    let attemptedRows = 0
    statementIds.forEach((sId) => {
      if (userObj[sId]) attemptedRows++
      if (String(userObj[sId]).trim().toLowerCase() === String(correctObj[sId]).trim().toLowerCase()) {
        correctRows++
      }
    })

    if (attemptedRows === 0) return { isCorrect: false, isUnanswered: true, isEssay: false, ratio: 0, userChoices: [], displayVal: 'Kosong' }

    const ratio = correctRows / statementIds.length
    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      isEssay: false,
      ratio,
      userChoices: Object.values(userObj).map((v: any) => String(v).trim()),
      displayVal: `Benar ${correctRows}/${statementIds.length}`
    }
  }

  return { isCorrect: false, isUnanswered: true, isEssay: false, ratio: 0, userChoices: [], displayVal: 'Kosong' }
}

// 🟢 INTERFACE PENGATURAN DOKUMEN & TANDA TANGAN
interface DocumentSettings {
  schoolName: string
  schoolAddress: string
  certificateTitle: string
  issuePlace: string
  issueDate: string
  kkmTarget: number
  signatoryType: 'both' | 'principal_only' | 'teacher_only'
  includeParentSign: boolean
  principalName: string
  principalNip: string
  teacherName: string
  teacherNip: string
}

function ExamResultsContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [itemAnalysisList, setItemAnalysisList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // State Tab Utama
  const [mainActiveTab, setMainActiveTab] = useState<'recap' | 'settings'>('recap')
  const [previewDocType, setPreviewDocType] = useState<'raport' | 'certificate'>('raport')

  // Filter Kelas & Bulk Modal
  const [filterClass, setFilterClass] = useState('ALL')
  const [showBulkRaporModal, setShowBulkRaporModal] = useState<boolean>(false)

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const [sortByStudent, setSortByStudent] = useState<'score' | 'name' | 'class' | 'date'>('score')
  const [sortOrderStudent, setSortOrderStudent] = useState<'asc' | 'desc'>('desc')

  const [sortByItem, setSortByItem] = useState<'no' | 'accuracy'>('no')
  const [sortOrderItem, setSortOrderItem] = useState<'asc' | 'desc'>('asc')

  // State Modal Review & Penilaian Guru (Essay + Bonus + Override)
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<any | null>(null)
  const [sessionAnswersMap, setSessionAnswersMap] = useState<{ [qId: string]: any }>({})
  const [essayScores, setEssayScores] = useState<{ [qId: string]: number }>({})
  const [bonusPoints, setBonusPoints] = useState<number>(0)
  const [isOverrideScore, setIsOverrideScore] = useState<boolean>(false)
  const [customFinalScore, setCustomFinalScore] = useState<number>(0)
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false)

  // State Cetak Sertifikat Single
  const [showPrintCertModal, setShowPrintCertModal] = useState<boolean>(false)

  // 🟢 STATE PENGATURAN DOKUMEN & TANDA TANGAN
  const [docSettings, setDocSettings] = useState<DocumentSettings>({
    schoolName: 'SD NEGERI GETASAN',
    schoolAddress: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang (50774)',
    certificateTitle: 'SERTIFIKAT CAPAIAN AKADEMIK',
    issuePlace: 'Getasan',
    issueDate: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }),
    kkmTarget: 70,
    signatoryType: 'both',
    includeParentSign: true,
    principalName: 'GIYANTO, S.Pd.',
    principalNip: '19670715 199903 1 006',
    teacherName: 'Hasan Askari, S.Pd.',
    teacherNip: '19880520 201201 1 002',
  })

  const SD_LOGO_CANDIDATES = [
    '/logo-sd-getasan.png',
    '/logo-sd-getasan.PNG',
    '/logo-sd-getasan.jpg',
    '/logo-sd-getasan.jpeg',
    '/logo-sd.png',
  ]

  const TKA_LOGO_CANDIDATES = [
    '/logo-tka.png',
    '/logo-tka.PNG',
    '/logo-tka.jpg',
    '/logo-tka.jpeg',
    '/logo-kemendikbud.png',
  ]

  // =========================================================================
  // 📌 FUNGSI UTAMA: LOAD DATA (MENGAMBIL & MENGOLAH DATA DARI SUPABASE)
  // =========================================================================
  const loadData = async () => {
    // -----------------------------------------------------------------------
    // 🔹 SEKSI 1: VALIDASI KONEKSI & INISIALISASI SUPABASE
    // -----------------------------------------------------------------------
    if (!examId) return // Pembatalan jika ID Ujian tidak ditemukan di URL
    const supabase = createClient() // Inisialisasi client Supabase

    // -----------------------------------------------------------------------
    // 🔹 SEKSI 2: QUERY DATA UTAMA DARI DATABASE (PARALEL/BERURUTAN)
    // -----------------------------------------------------------------------
    // 1. Ambil Informasi/Metadata Ujian (Judul, Subtes, dll)
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    // 2. Ambil Daftar Soal Ujian (Diurutkan berdasarkan waktu pembuatan)
    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    // 3. Ambil Sesi Pengerjaan Siswa (Diurutkan dari siswa yang terbaru selesai)
    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })

    // 4. Ambil Profil Seluruh Siswa (Untuk pencocokan Nama & Kelas)
    const { data: profileData } = await supabase.from('profiles').select('*')

    // 5. Ambil Seluruh Jawaban Siswa dari Tabel `answers` berdasarkan Session IDs
    const sessionIds = (sessionData || []).map((s) => s.id)
    const { data: answerData } = sessionIds.length > 0
      ? await supabase.from('answers').select('*').in('session_id', sessionIds)
      : { data: [] }

    // -----------------------------------------------------------------------
    // 🔹 SEKSI 3: PEMBUATAN STRUKTUR PETA MEMORI (MAP LOOKUP O(1))
    // -----------------------------------------------------------------------
    // Memetakan Data Profil berdasarkan `user_id` agar pencarian data siswa cepat
    const profileMap = new Map()
    if (profileData) {
      profileData.forEach((p) => profileMap.set(p.id, p))
    }

    // Memetakan Rincian Jawaban berdasarkan `session_id` pengerjaan
    const answerMap = new Map<string, any[]>()
    if (answerData) {
      answerData.forEach((ans) => {
        if (!answerMap.has(ans.session_id)) {
          answerMap.set(ans.session_id, [])
        }
        answerMap.get(ans.session_id)?.push(ans)
      })
    }

    // -----------------------------------------------------------------------
    // 🔹 SEKSI 4: PEMROSESAN NILAI & PERHITUNGAN SESI SISWA (PROCESSED SESSIONS)
    // -----------------------------------------------------------------------
    const processedSessions = (sessionData || []).map((session) => {
      // a. Ambil profil siswa (Gunakan Fallback default jika siswa anonim/tamu)
      const student = profileMap.get(session.user_id) || {
        full_name: 'Siswa / Tamu',
        username: 'guest',
        class_code: '-',
      }

      // b. Ambil rincian jawaban siswa untuk sesi ini
      const userAnswers = answerMap.get(session.id) || []
      const totalQ = questionData ? questionData.length : 0

      let correctCount = 0      // Penampung jumlah soal benar
      let totalPointsEarned = 0 // Penampung total poin yang didapat
      let totalMaxPoints = 0    // Penampung batas maksimal poin seluruh soal

      // c. Evaluasi Per Soal secara Real-Time
      if (questionData && questionData.length > 0) {
        questionData.forEach((q) => {
          const qMaxScore = Number(q.max_score) || 1
          totalMaxPoints += qMaxScore

          const ans = userAnswers.find((a) => a.question_id === q.id)
          const rawChoice = ans ? (ans.user_answer ?? ans.selected_answers ?? ans.selected_option) : null
          const evalRes = evaluateAnswer(q, rawChoice)

          const qType = q.question_type || 'multiple_choice'

          // Evaluasi Soal Uraian / Essay vs Pilihan Ganda (PG / PGK / Matriks)
          if (qType === 'essay' || qType === 'uraian') {
            const essayScore = (ans && ans.score !== undefined && ans.score !== null) ? Number(ans.score) : 0
            totalPointsEarned += essayScore
            // Jika essay diberi skor > 0 oleh guru, hitung sebagai poin benar
            if (essayScore > 0) correctCount += 1
          } else {
            // Untuk pilihan ganda: jika benar penuh atau parsial (ratio >= 0.5)
            if (evalRes.isCorrect || evalRes.ratio >= 0.5) correctCount += 1
            totalPointsEarned += evalRes.ratio * qMaxScore
          }
        })
      }

      // d. Hitung Kalkulasi Nilai Akhir (Skala 0 - 100)
      const calculatedScore = totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0
      
      // Utamakan skor tersimpan di Database `session.score` (jika pernah di-override / disimpan)
      const finalScore = session.score !== undefined && session.score !== null 
        ? Number(session.score) 
        : calculatedScore

      // e. 🟢 SINKRONISASI OTOMATIS (FALLBACK PERHITUNGAN JUMLAH BENAR)
      // Jika rincian di DB tidak ada/kosong tetapi Nilai Akhir ada, estimasikan jumlah benar dari Nilai Akhir
      if (correctCount === 0 && finalScore > 0 && totalQ > 0) {
        correctCount = Math.round((finalScore / 100) * totalQ)
      }

      const finishTime = session.end_time || session.submitted_at || session.completed_at || session.created_at

      // f. Kembalikan objek data siswa yang rapi untuk tabel rekapitulasi
      return {
        id: session.id,
        user_id: session.user_id,
        full_name: student.full_name,
        username: student.username,
        class_code: student.class_code || '-',
        status: session.status || 'completed',
        completed_at: finishTime,
        correct_count: correctCount,
        total_questions: totalQ,
        earned_score: Math.round(finalScore),
        accuracy_percentage: Math.round(finalScore),
        rawAnswers: userAnswers,
      }
    })

    const totalParticipants = processedSessions.length

    // -----------------------------------------------------------------------
    // 🔹 SEKSI 5: ANALISIS BUTIR SOAL, SEBARAN OPSI & DAYA BEDA (ITEM ANALYSIS)
    // -----------------------------------------------------------------------
    const analysisList = (questionData || []).map((q, qIdx) => {
      // 1. Urutkan siswa dari nilai tertinggi ke terendah untuk membagi Kelompok Atas & Bawah (27%)
      const sortedByScoreDesc = [...processedSessions].sort((a, b) => b.earned_score - a.earned_score)
      const N = sortedByScoreDesc.length
      const groupSize = Math.max(1, Math.floor(N * 0.27))
      const upperGroup = sortedByScoreDesc.slice(0, groupSize)
      const lowerGroup = sortedByScoreDesc.slice(Math.max(0, N - groupSize))

      let upperCorrect = 0
      let lowerCorrect = 0

      // Hitung berapa banyak siswa kelompok atas & bawah yang menjawab soal ini dengan benar
      if (answerData) {
        answerData.forEach((ans) => {
          if (ans.question_id === q.id) {
            const rawChoice = ans.user_answer ?? ans.selected_answers ?? ans.selected_option
            const { isCorrect } = evaluateAnswer(q, rawChoice)

            if (isCorrect) {
              if (upperGroup.some((s) => s.id === ans.session_id)) upperCorrect++
              if (lowerGroup.some((s) => s.id === ans.session_id)) lowerCorrect++
            }
          }
        })
      }

      // Rumus Indeks Daya Beda D = (UpperCorrect - LowerCorrect) / N_kelompok
      const discriminationIndexVal = groupSize > 0 ? (upperCorrect - lowerCorrect) / groupSize : 0
      const discriminationPercent = Math.round(discriminationIndexVal * 100)

      // 2. Hitung Sebaran Opsi Jawaban (A, B, C, D, Kosong) & Pengecoh Utama (Distraktor)
      let correctAnswersCount = 0
      let answeredCount = 0
      const optionCounts: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0, Kosong: 0 }

      let correctOptDisplay = ''
      if (q.question_type === 'complex_multiple_choice') {
        correctOptDisplay = Array.isArray(q.correct_answers) ? q.correct_answers.join(',') : String(q.correct_option ?? q.correct_answer ?? '').trim().toUpperCase()
      } else if (q.question_type === 'true_false_matrix') {
        correctOptDisplay = 'Matriks'
      } else if (q.question_type === 'essay' || q.question_type === 'uraian') {
        correctOptDisplay = 'ESSAY'
      } else {
        correctOptDisplay = String(q.correct_option ?? q.correct_answer ?? 'A').trim().toUpperCase()
      }

      if (answerData) {
        answerData.forEach((ans) => {
          if (ans.question_id === q.id) {
            const rawChoice = ans.user_answer ?? ans.selected_answers ?? ans.selected_option
            const { isCorrect, isUnanswered, userChoices } = evaluateAnswer(q, rawChoice)

            if (isCorrect) correctAnswersCount += 1
            if (!isUnanswered) answeredCount += 1

            if (userChoices.length > 0) {
              userChoices.forEach((choice) => {
                const upperChoice = String(choice).toUpperCase()
                if (['A', 'B', 'C', 'D'].includes(upperChoice)) {
                  optionCounts[upperChoice] = (optionCounts[upperChoice] || 0) + 1
                } else if (['BENAR', 'SALAH'].includes(upperChoice)) {
                  optionCounts[upperChoice] = (optionCounts[upperChoice] || 0) + 1
                }
              })
            } else {
              optionCounts['Kosong'] = (optionCounts['Kosong'] || 0) + 1
            }
          }
        })
      }

      const wrongAnswersCount = totalParticipants - correctAnswersCount
      const accuracyRate = totalParticipants > 0 ? Math.round((correctAnswersCount / totalParticipants) * 100) : 0

      // Cari opsi jawaban mana selain kunci yang paling banyak dipilih siswa (Distraktor Terkuat)
      let topDistractorKey = '-'
      let maxDistractorCount = 0

      Object.keys(optionCounts).forEach((optKey) => {
        if (!correctOptDisplay.includes(optKey) && optKey !== 'Kosong') {
          if (optionCounts[optKey] > maxDistractorCount) {
            maxDistractorCount = optionCounts[optKey]
            topDistractorKey = optKey
          }
        }
      })

      // 3. Klasifikasi Tingkat Kesulitan Soal Berdasarkan Persentase Akurasi Jawaban Benar
      let difficultyLabel = 'Sedang'
      let difficultyBadge = 'bg-amber-50 text-amber-700 border-amber-200'

      if (q.question_type === 'essay' || q.question_type === 'uraian') {
        difficultyLabel = 'Soal Essay'
        difficultyBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200'
      } else if (accuracyRate >= 80) {
        difficultyLabel = 'Sangat Mudah'
        difficultyBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200'
      } else if (accuracyRate >= 60) {
        difficultyLabel = 'Mudah'
        difficultyBadge = 'bg-teal-50 text-teal-700 border-teal-200'
      } else if (accuracyRate >= 40) {
        difficultyLabel = 'Sedang'
        difficultyBadge = 'bg-amber-50 text-amber-700 border-amber-200'
      } else {
        difficultyLabel = 'Sulit / Perlu Evaluasi'
        difficultyBadge = 'bg-rose-50 text-rose-700 border-rose-200'
      }

      return {
        question_no: qIdx + 1,
        question_id: q.id,
        question_type: q.question_type || 'multiple_choice',
        question_text: q.question_text || '',
        correct_option: correctOptDisplay,
        max_score: q.max_score || 1,
        correct_count: correctAnswersCount,
        answeredCount,
        wrong_count: wrongAnswersCount,
        accuracy_rate: accuracyRate,
        discriminationPercent,
        optionCounts,
        topDistractorKey: maxDistractorCount > 0 ? topDistractorKey : 'Tidak ada',
        maxDistractorCount,
        difficultyLabel,
        difficultyBadge,
      }
    })

    // -----------------------------------------------------------------------
    // 🔹 SEKSI 6: UPDATE STATE REACT HINGGA MEMATIKAN SPINNER LOADING
    // -----------------------------------------------------------------------
    if (examData) setExam(examData)
    if (questionData) setQuestions(questionData)
    setSessions(processedSessions)
    setItemAnalysisList(analysisList)
    setLoading(false) // Mematikan status loading pada antarmuka
  }

  // -------------------------------------------------------------------------
  // 🔹 SEKSI 7: TRIGGER AUTOMATIS SAAT HALAMAN DIBUKA / EXAM ID BERUBAH
  // -------------------------------------------------------------------------
  useEffect(() => {
    loadData()
  }, [examId])

  const calculateAutoScore = (
    answersMap: { [qId: string]: any },
    currentEssayScores: { [qId: string]: number },
    bonus: number = 0
  ) => {
    let totalPoints = 0
    let maxPoints = 0

    questions.forEach((q) => {
      const qMax = Number(q.max_score) || 1
      maxPoints += qMax
      const qType = q.question_type || 'multiple_choice'

      if (qType === 'essay' || qType === 'uraian') {
        const manualScore = currentEssayScores[q.id] !== undefined ? Number(currentEssayScores[q.id]) : 3
        totalPoints += Math.min(qMax, Math.max(0, manualScore))
      } else {
        const rawAns = answersMap[q.id]
        const evalRes = evaluateAnswer(q, rawAns)
        totalPoints += evalRes.ratio * qMax
      }
    })

    const baseScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
    return Math.min(100, Math.max(0, baseScore + bonus))
  }

  const handleOpenDetailModal = (session: any) => {
    const map: { [key: string]: any } = {}
    const answerScoreMap: { [key: string]: number } = {}

    if (Array.isArray(session.rawAnswers)) {
      session.rawAnswers.forEach((ans: any) => {
        map[ans.question_id] = ans.user_answer ?? ans.selected_answers ?? ans.selected_option
        if (ans.score !== undefined && ans.score !== null) {
          answerScoreMap[ans.question_id] = Number(ans.score)
        }
      })
    }
    setSessionAnswersMap(map)

    const initialEssayScores: { [key: string]: number } = {}
    questions.forEach((q) => {
      const qType = q.question_type || 'multiple_choice'
      if (qType === 'essay' || qType === 'uraian') {
        const savedScore = answerScoreMap[q.id]
        initialEssayScores[q.id] = savedScore !== undefined ? savedScore : 3
      }
    })

    setEssayScores(initialEssayScores)
    setBonusPoints(0)
    setIsOverrideScore(false)

    const autoCalculated = calculateAutoScore(map, initialEssayScores, 0)
    setCustomFinalScore(autoCalculated)
    setSelectedSessionForDetail(session)
  }

  const handleEssayScoreChange = (qId: string, value: number, maxScore: number) => {
    const val = Math.max(0, Math.min(value, maxScore))
    const updatedEssayScores = { ...essayScores, [qId]: val }
    setEssayScores(updatedEssayScores)

    if (!isOverrideScore) {
      const autoCalculated = calculateAutoScore(sessionAnswersMap, updatedEssayScores, bonusPoints)
      setCustomFinalScore(autoCalculated)
    }
  }

  const handleBonusChange = (bonusVal: number) => {
    const val = Number(bonusVal) || 0
    setBonusPoints(val)
    if (!isOverrideScore) {
      const autoCalculated = calculateAutoScore(sessionAnswersMap, essayScores, val)
      setCustomFinalScore(autoCalculated)
    }
  }

  const handleOverrideToggle = (checked: boolean) => {
    setIsOverrideScore(checked)
    if (!checked) {
      const autoCalculated = calculateAutoScore(sessionAnswersMap, essayScores, bonusPoints)
      setCustomFinalScore(autoCalculated)
    }
  }

  const handleSaveAssessment = async () => {
    if (!selectedSessionForDetail) return
    setIsSavingScore(true)

    const supabase = createClient()
    const newScore = Math.max(0, Math.min(100, Number(customFinalScore)))

    const { error } = await supabase
      .from('exam_sessions')
      .update({ score: newScore })
      .eq('id', selectedSessionForDetail.id)

    try {
      for (const [qId, eScore] of Object.entries(essayScores)) {
        await supabase
          .from('answers')
          .update({ score: eScore })
          .eq('session_id', selectedSessionForDetail.id)
          .eq('question_id', qId)
      }
    } catch (e) {
      // Abaikan jika tabel answers belum memiliki kolom score
    }

    if (error) {
      alert(`Gagal menyimpan nilai: ${error.message}`)
    } else {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === selectedSessionForDetail.id) {
            return { ...s, earned_score: newScore, accuracy_percentage: newScore }
          }
          return s
        })
      )
      alert(`✅ Nilai ${selectedSessionForDetail.full_name} berhasil diperbarui menjadi ${newScore}!`)
      setSelectedSessionForDetail(null)
    }
    setIsSavingScore(false)
  }

  const handlePrint = () => {
    window.print()
  }

  // 🗑️ METODE HAPUS SATUAN PER SISWA
  const handleDeleteSession = async (sessionId: string, studentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin mereset/menghapus hasil ujian siswa "${studentName}"?`)) return
    setIsDeleting(true)
    const supabase = createClient()
    await supabase.from('answers').delete().eq('session_id', sessionId)
    await supabase.from('exam_sessions').delete().eq('id', sessionId)
    setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionId))
    setIsDeleting(false)
    loadData()
  }

  // 🗑️ METODE HAPUS TERPILIH (BULK DELETE)
  const handleDeleteSelected = async () => {
    if (selectedSessionIds.length === 0) return
    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedSessionIds.length} hasil ujian terpilih?`)) return
    setIsDeleting(true)
    const supabase = createClient()
    await supabase.from('answers').delete().in('session_id', selectedSessionIds)
    await supabase.from('exam_sessions').delete().in('id', selectedSessionIds)
    setSelectedSessionIds([])
    setIsDeleting(false)
    loadData()
  }

  // 🗑️ METODE HAPUS SEMUA (RESET TOTAL)
  const handleDeleteAll = async () => {
    if (sessions.length === 0) return
    if (!confirm(`⚠️ PERINGATAN BERSAMA:\nHapus SELURUH (${sessions.length}) hasil pengerjaan siswa?`)) return
    setIsDeleting(true)
    const supabase = createClient()
    const allSessionIds = sessions.map((s) => s.id)
    if (allSessionIds.length > 0) {
      await supabase.from('answers').delete().in('session_id', allSessionIds)
      await supabase.from('exam_sessions').delete().eq('exam_id', examId)
    }
    setSelectedSessionIds([])
    setIsDeleting(false)
    loadData()
  }

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSessionIds(sortedSessions.map((s) => s.id))
    } else {
      setSelectedSessionIds([])
    }
  }

  const handleSelectSession = (id: string) => {
    setSelectedSessionIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const filteredSessions = sessions.filter((s) => {
    const term = searchTerm.toLowerCase()
    const matchSearch =
      s.full_name.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term) ||
      s.class_code.toLowerCase().includes(term)
    const matchClass = filterClass === 'ALL' || s.class_code === filterClass
    return matchSearch && matchClass
  })

  const uniqueClasses = Array.from(new Set(sessions.map((s) => s.class_code)))

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    let valA: any = a.earned_score
    let valB: any = b.earned_score

    if (sortByStudent === 'name') {
      valA = a.full_name.toLowerCase()
      valB = b.full_name.toLowerCase()
    } else if (sortByStudent === 'class') {
      valA = a.class_code.toLowerCase()
      valB = b.class_code.toLowerCase()
    } else if (sortByStudent === 'date') {
      valA = new Date(a.completed_at || 0).getTime()
      valB = new Date(b.completed_at || 0).getTime()
    }

    if (valA < valB) return sortOrderStudent === 'asc' ? -1 : 1
    if (valA > valB) return sortOrderStudent === 'asc' ? 1 : -1
    return 0
  })

  const sortedItems = [...itemAnalysisList].sort((a, b) => {
    if (sortByItem === 'accuracy') {
      return sortOrderItem === 'asc' ? a.accuracy_rate - b.accuracy_rate : b.accuracy_rate - a.accuracy_rate
    }
    return sortOrderItem === 'asc' ? a.question_no - b.question_no : b.question_no - a.question_no
  })

  const totalParticipants = sessions.length
  const totalScores = sessions.map((s) => s.earned_score)
  const averageScore = totalParticipants > 0 ? (totalScores.reduce((a, b) => a + b, 0) / totalParticipants).toFixed(1) : '0'
  const highestScore = totalParticipants > 0 ? Math.max(...totalScores) : 0
  const lowestScore = totalParticipants > 0 ? Math.min(...totalScores) : 0

  const handleExportToExcel = () => {
    if (sessions.length === 0) return alert('Belum ada data pengerjaan siswa.')
    const workbook = XLSX.utils.book_new()
    const studentData = sortedSessions.map((s, idx) => ({
      No: idx + 1,
      'Nama Lengkap Siswa': s.full_name,
      Username: s.username,
      'Kode Kelas': s.class_code,
      'Waktu Selesai': s.completed_at ? new Date(s.completed_at).toLocaleString('id-ID') : '-',
      'Jawaban Benar': `${s.correct_count} / ${s.total_questions}`,
      'Nilai Akhir': s.earned_score,
    }))
    const wsStudents = XLSX.utils.json_to_sheet(studentData)
    XLSX.utils.book_append_sheet(workbook, wsStudents, 'Rekap Nilai Siswa')

    const itemData = sortedItems.map((item) => ({
      'No Soal': item.question_no,
      'Teks Soal': (item.question_text || '').replace(/<[^>]*>?/gm, ''),
      'Kunci Jawaban': item.correct_option,
      'Akurasi (%)': `${item.accuracy_rate}%`,
      'Daya Beda (%)': `${item.discriminationPercent}%`,
      'Pengecoh Utama': item.topDistractorKey !== 'Tidak ada' ? `Opsi ${item.topDistractorKey}` : '-',
      'Kategori Kesulitan': item.difficultyLabel,
    }))
    const wsItems = XLSX.utils.json_to_sheet(itemData)
    XLSX.utils.book_append_sheet(workbook, wsItems, 'Analisis Butir & Distraktor')

    const cleanTitle = (exam?.title || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_')
    XLSX.writeFile(workbook, `Rekap_Lengkap_${cleanTitle}.xlsx`)
  }

  // 🟢 KOMPONEN BLOK TANDA TANGAN KEKINIAN & ADAPTIF
  const DynamicSignatureBlock = ({ studentClass }: { studentClass?: string }) => {
    const showParent = docSettings.includeParentSign
    const type = docSettings.signatoryType

    let gridColsClass = 'grid-cols-3'
    if (showParent) {
      gridColsClass = type === 'both' ? 'grid-cols-3' : 'grid-cols-2'
    } else {
      gridColsClass = type === 'both' ? 'grid-cols-2' : 'grid-cols-1 font-sans text-center'
    }

    return (
      <div className={`grid ${gridColsClass} gap-6 text-center text-xs pt-8 border-t-2 border-slate-200`}>
        {showParent && (
          <div className="space-y-1">
            <p className="text-slate-500 font-medium">Orang Tua / Wali Murid,</p>
            <div className="h-16"></div>
            <p className="font-bold text-slate-800 border-b-2 border-slate-400 inline-block px-4 pb-0.5">
              ( .................................... )
            </p>
          </div>
        )}

        {(type === 'both' || type === 'teacher_only') && (
          <div className="space-y-0.5">
            <p className="text-slate-500 font-medium">Guru / Wali Kelas {studentClass || ''},</p>
            <div className="h-16"></div>
            <p className="font-bold text-slate-900 underline decoration-indigo-600 decoration-2">{docSettings.teacherName}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {docSettings.teacherNip}</p>
          </div>
        )}

        {(type === 'both' || type === 'principal_only') && (
          <div className="space-y-0.5">
            <p className="text-slate-500 font-medium">{docSettings.issuePlace}, {docSettings.issueDate}</p>
            <p className="text-slate-700 font-bold uppercase tracking-wider text-[11px]">Kepala Sekolah,</p>
            <div className="h-14"></div>
            <p className="font-bold text-slate-900 underline decoration-amber-600 decoration-2">{docSettings.principalName}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {docSettings.principalNip}</p>
          </div>
        )}
      </div>
    )
  }

  const dummyStudent = {
    full_name: 'Cristiano Ronaldo (Contoh Siswa)',
    username: 'cr7',
    class_code: '6A',
    earned_score: 95,
    correct_count: 19,
    total_questions: 20,
    completed_at: new Date().toISOString(),
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">
          Memuat rekap nilai dan analisis butir soal...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-area, #printable-area * {
            visibility: visible !important;
          }
          #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Navbar />
      </div>

      <main className="p-8 max-w-7xl mx-auto space-y-6 no-print">
        {/* HEADER HALAMAN */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {exam?.subtest}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              📊 Rekapitulasi & Desain Dokumen: {exam?.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola hasil ujian siswa, sesuaikan format penandatanganan dokumen, dan cetak sertifikat & rapor berdesain kekinian.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>📊 Export (.xlsx)</span>
            </button>
            <Link
              href={`/admin/exam/${examId}/analysis`}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>🎯 Analisis Soal Detail</span>
            </Link>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ← Kembali
            </Link>
            
          </div>
        </div>

        {/* 🟢 TAB NAVIGASI UTAMA ADMIN */}
        <div className="flex space-x-2 bg-slate-200 p-1.5 rounded-xl border border-slate-300 w-fit">
          <button
            onClick={() => setMainActiveTab('recap')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              mainActiveTab === 'recap'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📊 Data & Analisis Nilai ({sortedSessions.length})
          </button>
          <button
            onClick={() => setMainActiveTab('settings')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${
              mainActiveTab === 'settings'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚙️ Desain Penandatanganan & Live Preview
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DATA REKAPITULASI & ANALISIS BUTIR                                 */}
        {/* ========================================================================= */}
        {mainActiveTab === 'recap' && (
          <div className="space-y-8">
            {/* STATISTIK RINGKAS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">👥 Total Peserta</span>
                <span className="text-2xl font-extrabold text-slate-800">{totalParticipants} Siswa</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">📈 Rata-Rata Nilai</span>
                <span className="text-2xl font-extrabold text-indigo-600">{averageScore}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">🏆 Nilai Tertinggi</span>
                <span className="text-2xl font-extrabold text-emerald-600">{highestScore}</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase block">📉 Nilai Terendah</span>
                <span className="text-2xl font-extrabold text-rose-600">{lowestScore}</span>
              </div>
            </div>

            {/* TABEL ANALISIS SOAL */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
              <div className="border-b pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <span>🎯</span>
                  <span>Analisis Butir Soal, Sebaran Opsi & Daya Beda ($D$)</span>
                </h2>
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">Urutkan:</span>
                  <select
                    value={sortByItem}
                    onChange={(e: any) => setSortByItem(e.target.value)}
                    className="px-2.5 py-1 border rounded-lg text-xs font-semibold text-slate-700"
                  >
                    <option value="no">Berdasarkan Nomor Soal</option>
                    <option value="accuracy">Berdasarkan Akurasi</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Pertanyaan / Soal</th>
                      <th className="p-3 text-center">Kunci</th>
                      <th className="p-3 text-center w-48">Sebaran Opsi Jawaban</th>
                      <th className="p-3 text-center">Pengecoh Utama</th>
                      <th className="p-3 text-center w-32">Daya Beda ($D$)</th>
                      <th className="p-3 text-center w-36">Tingkat Akurasi</th>
                      <th className="p-3 text-center">Kesulitan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedItems.map((item) => (
                      <tr key={item.question_id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-center font-bold text-slate-700">{item.question_no}</td>
                        <td className="p-3 max-w-xs">
                          <div className="line-clamp-2 text-slate-800 font-medium">
                            <MathRenderer content={item.question_text} />
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold text-indigo-700">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg">
                            {item.correct_option}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center items-center space-x-1 font-mono text-[11px]">
                            {['A', 'B', 'C', 'D'].map((optKey) => {
                              const isCorrectKey = item.correct_option.includes(optKey)
                              const count = item.optionCounts?.[optKey] ?? 0
                              let pillStyle = 'bg-slate-100 text-slate-600 border-slate-200'
                              if (isCorrectKey) pillStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                              else if (optKey === item.topDistractorKey && count > 0) pillStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                              return (
                                <span key={optKey} className={`px-2 py-0.5 rounded border ${pillStyle}`}>
                                  {optKey}:{count}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-center font-bold">
                          {item.topDistractorKey !== 'Tidak ada' ? (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px]">
                              Opsi {item.topDistractorKey} ({item.maxDistractorCount})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-indigo-700">
                          {item.discriminationPercent}%
                        </td>
                        <td className="p-3 text-center">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold">
                              <span>{item.accuracy_rate}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${item.accuracy_rate}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${item.difficultyBadge}`}>
                            {item.difficultyLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL DAFTAR PESERTA & KONTROL HAPUS */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
              <div className="border-b pb-3 flex flex-col md:flex-row justify-between items-center gap-3">
                <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Daftar Nilai Peserta Ujian ({sortedSessions.length})</span>
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Tombol Hapus Terpilih / Bulk Delete */}
                  {selectedSessionIds.length > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={isDeleting}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                    >
                      {isDeleting ? 'Menghapus...' : `🗑️ Hapus Terpilih (${selectedSessionIds.length})`}
                    </button>
                  )}

                  {/* Tombol Reset Semua */}
                  <button
                    onClick={handleDeleteAll}
                    disabled={isDeleting || sessions.length === 0}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors"
                  >
                    🗑️ Reset Semua
                  </button>

                  <input
                    type="text"
                    placeholder="🔍 Cari nama/kelas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-xs w-44"
                  />

                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-xs font-bold text-slate-700 bg-slate-50"
                  >
                    <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
                    {uniqueClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Kelas {cls}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowBulkRaporModal(true)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm"
                  >
                    🖨️ Cetak Rapor Massal
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                    <tr>
                      <th className="p-3 text-center w-10">
                        <input
                          type="checkbox"
                          onChange={handleSelectAll}
                          checked={sortedSessions.length > 0 && selectedSessionIds.length === sortedSessions.length}
                          className="rounded text-indigo-600"
                        />
                      </th>
                      <th className="p-3 text-center w-12">No</th>
                      <th className="p-3">Nama Siswa & Username</th>
                      <th className="p-3 text-center">Kelas</th>
                      <th className="p-3 text-center">Waktu Selesai</th>
                      <th className="p-3 text-center">Benar / Total</th>
                      <th className="p-3 text-center">Nilai Akhir</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedSessions.map((session, idx) => {
                      const isSelected = selectedSessionIds.includes(session.id)
                      return (
                        <tr key={session.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectSession(session.id)}
                              className="rounded text-indigo-600"
                            />
                          </td>
                          <td className="p-3 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-800">{session.full_name}</div>
                            <div className="text-slate-400">@{session.username}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                              {session.class_code}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-600">
                            {session.completed_at
                              ? new Date(session.completed_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                              : '-'}
                          </td>
                          <td className="p-3 text-center font-bold text-slate-700">
                            {session.correct_count} / {session.total_questions}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-bold">
                              {session.earned_score} / 100
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center space-x-1.5">
                              <button
                                onClick={() => handleOpenDetailModal(session)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded transition-colors"
                              >
                                👁️ Detail & Nilai
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedSessionForDetail(session)
                                  setShowPrintCertModal(true)
                                }}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded transition-colors"
                              >
                                📜 Cetak
                              </button>
                              {/* 🗑️ Tombol Hapus / Reset Hasil Ujian Siswa */}
                              <button
                                onClick={() => handleDeleteSession(session.id, session.full_name)}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded transition-colors"
                                title="Reset / Hapus Hasil Ujian Siswa Ini"
                              >
                                🗑️ Hapus
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
          </div>
        )}

        {/* TAB 2: PENGATURAN KOP, TANDA TANGAN & LIVE PREVIEW REAL-TIME */}
        {mainActiveTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 font-sans">
              <h2 className="text-sm font-bold text-slate-800 uppercase border-b pb-2">
                ⚙️ Form Pengaturan Penandatanganan & Kop Dokumen
              </h2>

              <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-indigo-900 uppercase">
                  ✍️ OPSI PENANDATANGAN DOKUMEN:
                </label>
                <div className="space-y-1.5 text-xs font-medium">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signatoryType"
                      value="both"
                      checked={docSettings.signatoryType === 'both'}
                      onChange={() => setDocSettings({ ...docSettings, signatoryType: 'both' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Keduanya (Guru Kelas & Kepala Sekolah)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signatoryType"
                      value="principal_only"
                      checked={docSettings.signatoryType === 'principal_only'}
                      onChange={() => setDocSettings({ ...docSettings, signatoryType: 'principal_only' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hanya Kepala Sekolah</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="signatoryType"
                      value="teacher_only"
                      checked={docSettings.signatoryType === 'teacher_only'}
                      onChange={() => setDocSettings({ ...docSettings, signatoryType: 'teacher_only' })}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Hanya Guru Kelas / Wali Kelas</span>
                  </label>
                </div>

                <div className="pt-2 border-t border-indigo-200">
                  <label className="flex items-center space-x-2 text-xs font-bold text-indigo-950 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={docSettings.includeParentSign}
                      onChange={(e) => setDocSettings({ ...docSettings, includeParentSign: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Sertakan Kolom Tanda Tangan Orang Tua / Wali Murid</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">NAMA SEKOLAH / INSTANSI</label>
                <input
                  type="text"
                  value={docSettings.schoolName}
                  onChange={(e) => setDocSettings({ ...docSettings, schoolName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">ALAMAT SEKOLAH / KOP</label>
                <input
                  type="text"
                  value={docSettings.schoolAddress}
                  onChange={(e) => setDocSettings({ ...docSettings, schoolAddress: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">KOTA PENERBITAN</label>
                  <input
                    type="text"
                    value={docSettings.issuePlace}
                    onChange={(e) => setDocSettings({ ...docSettings, issuePlace: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">TARGET KKM</label>
                  <input
                    type="number"
                    value={docSettings.kkmTarget}
                    onChange={(e) => setDocSettings({ ...docSettings, kkmTarget: Number(e.target.value) })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold text-center"
                  />
                </div>
              </div>

              {(docSettings.signatoryType === 'both' || docSettings.signatoryType === 'principal_only') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-indigo-700 block">👤 DATA KEPALA SEKOLAH</span>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">NAMA KEPALA SEKOLAH</label>
                    <input
                      type="text"
                      value={docSettings.principalName}
                      onChange={(e) => setDocSettings({ ...docSettings, principalName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">NIP KEPALA SEKOLAH</label>
                    <input
                      type="text"
                      value={docSettings.principalNip}
                      onChange={(e) => setDocSettings({ ...docSettings, principalNip: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}

              {(docSettings.signatoryType === 'both' || docSettings.signatoryType === 'teacher_only') && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-indigo-700 block">👤 DATA GURU / WALI KELAS</span>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">NAMA GURU KELAS</label>
                    <input
                      type="text"
                      value={docSettings.teacherName}
                      onChange={(e) => setDocSettings({ ...docSettings, teacherName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500">NIP GURU KELAS</label>
                    <input
                      type="text"
                      value={docSettings.teacherNip}
                      onChange={(e) => setDocSettings({ ...docSettings, teacherNip: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* LIVE PREVIEW REAL-TIME */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col">
              <div className="flex justify-between items-center border-b pb-3">
                <span className="text-xs font-bold text-emerald-700 uppercase flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Live Preview Real-Time Layout</span>
                </span>

                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                  <button
                    onClick={() => setPreviewDocType('raport')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      previewDocType === 'raport' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    👁️ Preview Rapor
                  </button>
                  <button
                    onClick={() => setPreviewDocType('certificate')}
                    className={`px-3 py-1 rounded-md transition-all ${
                      previewDocType === 'certificate' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    👁️ Preview Sertifikat
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 p-4 rounded-xl overflow-y-auto max-h-[650px] flex justify-center border">
                {previewDocType === 'raport' ? (
                  <div className="w-full bg-white p-6 shadow-md rounded-xl border border-slate-200 text-slate-900 font-sans text-xs space-y-4">
                    <div className="border-b-2 border-indigo-600 pb-3 flex items-center justify-between text-center">
                      <SmartLogo candidates={SD_LOGO_CANDIDATES} alt="Logo SD" fallbackText="SD" className="w-12 h-12 object-contain" />
                      <div className="flex-1 px-3">
                        <span className="bg-indigo-600 text-white rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase inline-block mb-1">
                          Laporan Capaian CBT
                        </span>
                        <h2 className="text-base font-black uppercase text-slate-900 tracking-wide">{docSettings.schoolName}</h2>
                        <p className="text-[10px] text-slate-500">{docSettings.schoolAddress}</p>
                      </div>
                      <SmartLogo candidates={TKA_LOGO_CANDIDATES} alt="Logo TKA" fallbackText="TKA" className="w-12 h-12 object-contain" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs border border-slate-200 rounded-xl p-3 bg-slate-50">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Peserta</span>
                        <strong className="text-slate-900">{dummyStudent.full_name}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas / Rombel</span>
                        <strong className="text-slate-900">{dummyStudent.class_code}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Ujian</span>
                        <strong>{exam?.title || 'Simulasi TKA'}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Subtes / Topik</span>
                        <strong className="uppercase">{exam?.subtest || 'TKA'}</strong>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full border-collapse text-xs text-center">
                        <thead className="bg-slate-900 text-white font-bold">
                          <tr>
                            <th className="p-2.5 text-left pl-3">Subtes</th>
                            <th className="p-2.5 w-16">KKM</th>
                            <th className="p-2.5 w-24">Skor Siswa</th>
                            <th className="p-2.5 w-28">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white border-t border-slate-200">
                            <td className="p-2.5 text-left pl-3 font-bold uppercase text-slate-800">{exam?.subtest || 'TKA'}</td>
                            <td className="p-2.5 font-semibold text-slate-600">{docSettings.kkmTarget}</td>
                            <td className="p-2.5 font-black text-indigo-700 text-sm">{dummyStudent.earned_score}</td>
                            <td className="p-2.5">
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                ✓ TUNTAS KKM
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <DynamicSignatureBlock studentClass={dummyStudent.class_code} />
                  </div>
                ) : (
                  <div className="w-full bg-gradient-to-br from-amber-50/80 via-white to-slate-50 p-6 shadow-xl rounded-xl border-4 border-indigo-950 relative overflow-hidden font-serif text-center flex flex-col justify-between">
                    <img
                      src="/logo-sd-getasan.png"
                      alt="Watermark"
                      onError={(e: any) => {
                        e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_TUT_WURI_HANDAYANI.svg'
                      }}
                      className="absolute inset-0 m-auto w-56 h-56 opacity-[0.04] object-contain pointer-events-none"
                    />

                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-500 m-2"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-500 m-2"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-500 m-2"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-500 m-2"></div>

                    <div className="relative z-10 space-y-2">
                      <SmartLogo candidates={SD_LOGO_CANDIDATES} alt="Logo SD" fallbackText="SD" className="w-10 h-10 mx-auto object-contain mb-1" />
                      <h2 className="text-[11px] font-sans font-extrabold uppercase tracking-widest text-indigo-950">
                        {docSettings.schoolName}
                      </h2>
                      <h1 className="text-lg font-black tracking-widest text-slate-900 uppercase my-1 border-b-2 border-amber-500 inline-block px-6 pb-1">
                        {docSettings.certificateTitle}
                      </h1>
                      <p className="text-[10px] font-sans text-slate-500 uppercase tracking-wider">Diberikan Secara Resmi Kepada:</p>
                      
                      <h3 className="text-base font-black text-indigo-900 underline decoration-amber-500 decoration-2 tracking-wide py-0.5">
                        {dummyStudent.full_name}
                      </h3>
                      
                      <p className="text-[10px] font-sans text-slate-700 max-w-sm mx-auto leading-relaxed">
                        Telah menyelesaikan Ujian <strong>{exam?.title}</strong> dengan Capaian Skor Akhir:
                      </p>

                      <div className="my-2">
                        <div className="inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 text-white font-sans font-black text-lg px-6 py-1.5 rounded-full shadow-md border-2 border-amber-300">
                          {dummyStudent.earned_score} <span className="text-xs font-normal text-amber-100 ml-1">/ 100</span>
                        </div>
                      </div>
                    </div>

                    <div className="relative z-10 mt-4">
                      <DynamicSignatureBlock studentClass={dummyStudent.class_code} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 📝 MODAL REVIEW & PENILAIAN GURU (INPUT ESSAY MANUAL + BONUS + OVERRIDE) */}
      {selectedSessionForDetail && !showPrintCertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase">PENILAIAN SISWA</span>
                <h3 className="text-sm font-bold mt-0.5">📝 Lembar Jawaban: {selectedSessionForDetail.full_name}</h3>
              </div>
              <button onClick={() => setSelectedSessionForDetail(null)} className="text-white font-bold text-sm">✕</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {questions.map((q, idx) => {
                const rawAns = sessionAnswersMap[q.id]
                const evalRes = evaluateAnswer(q, rawAns)
                const qMax = Number(q.max_score) || 1
                const isEssay = q.question_type === 'essay' || q.question_type === 'uraian'

                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-800">Soal #{idx + 1}</span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] font-bold rounded uppercase">
                          {isEssay ? 'Uraian / Essay' : q.question_type === 'complex_multiple_choice' ? 'PG Kompleks' : q.question_type === 'true_false_matrix' ? 'Matriks' : 'Pilihan Ganda'}
                        </span>
                      </div>

                      {isEssay ? (
                        <span className="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 text-xs">
                          📝 Perlu Penilaian Guru (Maks: {qMax} Poin)
                        </span>
                      ) : evalRes.isCorrect ? (
                        <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 text-xs">
                          ✅ Benar (+{qMax})
                        </span>
                      ) : (
                        <span className="text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-xs">
                          ❌ Salah (0)
                        </span>
                      )}
                    </div>

                    <div className="text-slate-800 font-medium text-xs">
                      <MathRenderer content={q.question_text} />
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-slate-200 font-semibold text-slate-800">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Jawaban Siswa:</span>
                      {isEssay ? (
                        <div className="whitespace-pre-wrap text-slate-900 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs font-mono">
                          {evalRes.displayVal}
                        </div>
                      ) : (
                        <span>{evalRes.displayVal}</span>
                      )}
                    </div>

                    {/* Input Penilaian Manual Khusus Soal Essay (Default Skor = 3) */}
                    {isEssay && (
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                        <div>
                          <span className="font-bold text-indigo-950 text-xs block">✏️ Input Skor Uraian / Essay:</span>
                          <span className="text-[10px] text-slate-500">Masukkan nilai perolehan siswa (0 s.d {qMax})</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min={0}
                            max={qMax}
                            step={0.5}
                            value={essayScores[q.id] ?? 3}
                            onChange={(e) => handleEssayScoreChange(q.id, Number(e.target.value), qMax)}
                            className="w-24 p-1.5 border-2 border-indigo-400 rounded-lg text-center font-black text-sm text-indigo-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          />
                          <span className="font-bold text-indigo-900 text-xs">/ {qMax} Poin</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* PANEL CONTROL NILAI BONUS & OVERRIDE */}
            <div className="p-4 border-t bg-slate-100 space-y-3 font-sans text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <label className="font-bold text-slate-700">🎁 Nilai Bonus / Tambahan:</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={bonusPoints}
                    onChange={(e) => handleBonusChange(Number(e.target.value))}
                    disabled={isOverrideScore}
                    className="w-20 px-2 py-1 border rounded font-bold text-center text-indigo-700 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                  <span className="text-[11px] text-slate-500">Poin</span>
                </div>

                <label className="flex items-center space-x-2 font-bold text-indigo-900 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOverrideScore}
                    onChange={(e) => handleOverrideToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>⚙️ Override / Input Nilai Manual Total</span>
                </label>
              </div>

              <div className="flex justify-between items-center pt-1">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-700">Nilai Akhir Terhitung:</span>
                  {isOverrideScore ? (
                    <div className="flex items-center space-x-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customFinalScore}
                        onChange={(e) => setCustomFinalScore(Number(e.target.value))}
                        className="w-24 px-3 py-1 border-2 border-amber-500 rounded-lg font-black text-sm text-amber-700 bg-amber-50 text-center focus:outline-none"
                      />
                      <span className="text-slate-500 font-bold">/ 100 (Manual)</span>
                    </div>
                  ) : (
                    <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg font-black text-sm">
                      {customFinalScore} / 100{' '}
                      <span className="text-[10px] font-normal text-slate-500">
                        (Otomatis {bonusPoints > 0 ? `+ Bonus ${bonusPoints}` : ''})
                      </span>
                    </span>
                  )}
                </div>

                <button
                  onClick={handleSaveAssessment}
                  disabled={isSavingScore}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSavingScore ? 'Menyimpan...' : '💾 Simpan Nilai'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📜 MODAL CETAK SERTIFIKAT SINGLE */}
      {showPrintCertModal && selectedSessionForDetail && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm">📜 Pratinjau Sertifikat Kelulusan Siswa</span>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrint} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg">
                  🖨️ Cetak / Simpan PDF
                </button>
                <button onClick={() => setShowPrintCertModal(false)} className="px-3 py-1.5 bg-slate-700 text-white font-bold text-xs rounded-lg">
                  Tutup
                </button>
              </div>
            </div>

            <div id="printable-area" className="p-10 font-serif text-slate-900 bg-gradient-to-br from-amber-50/80 via-white to-slate-50 border-[12px] border-double border-indigo-950 rounded-xl relative m-4 text-center">
              <img
                src="/logo-sd-getasan.png"
                alt="Watermark"
                onError={(e: any) => {
                  e.target.src = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_TUT_WURI_HANDAYANI.svg'
                }}
                className="absolute inset-0 m-auto w-72 h-72 opacity-[0.04] object-contain pointer-events-none"
              />

              <div className="relative z-10 space-y-3">
                <SmartLogo candidates={SD_LOGO_CANDIDATES} alt="Logo SD" fallbackText="SD" className="w-14 h-14 mx-auto object-contain" />
                <h2 className="text-xs font-sans font-black uppercase text-indigo-950 tracking-widest">{docSettings.schoolName}</h2>
                <h1 className="text-2xl font-black tracking-widest text-slate-900 uppercase border-b-2 border-amber-500 pb-1 inline-block px-8 my-2">
                  {docSettings.certificateTitle}
                </h1>
                <p className="text-xs font-sans text-slate-500 uppercase tracking-widest">Diberikan secara resmi kepada:</p>
                
                <h2 className="text-2xl font-black text-indigo-900 underline decoration-amber-500 decoration-2 uppercase my-2">
                  {selectedSessionForDetail.full_name}
                </h2>
                
                <p className="text-xs font-sans text-slate-700 max-w-xl mx-auto leading-relaxed">
                  Telah menyelesaikan Ujian <strong>"{exam?.title}"</strong> Subtes <strong className="uppercase">{exam?.subtest}</strong> dengan Raihan Capaian Skor Resmi:
                </p>

                <div className="my-3">
                  <div className="inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 text-white font-sans font-black text-2xl px-8 py-2 rounded-full shadow-lg border-2 border-amber-300">
                    {selectedSessionForDetail.earned_score} <span className="text-xs font-normal text-amber-100 ml-1">/ 100</span>
                  </div>
                </div>

                <div className="pt-6">
                  <DynamicSignatureBlock studentClass={selectedSessionForDetail.class_code} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📑 MODAL CETAK RAPOR MASSAL KELAS */}
      {showBulkRaporModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm">🖨️ Cetak Kolektif Rapor Ujian ({sortedSessions.length} Siswa)</span>
              <div className="flex items-center space-x-2">
                <button onClick={handlePrint} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg">
                  🖨️ Cetak / Simpan PDF Satu Kelas
                </button>
                <button onClick={() => setShowBulkRaporModal(false)} className="px-3 py-1.5 bg-slate-700 text-white font-bold text-xs rounded-lg">
                  Tutup
                </button>
              </div>
            </div>

            <div id="printable-area" className="p-8 overflow-y-auto font-sans text-slate-900 bg-white space-y-12">
              {sortedSessions.map((student, studentIndex) => (
                <div key={student.id} className={studentIndex < sortedSessions.length - 1 ? 'page-break pb-12 border-b-2 border-dashed border-slate-300' : ''}>
                  <div className="border-b-2 border-indigo-600 pb-3 mb-4 flex items-center justify-between text-center">
                    <SmartLogo candidates={SD_LOGO_CANDIDATES} alt="Logo SD" fallbackText="SD" className="w-14 h-14 object-contain" />
                    <div className="flex-1 px-4">
                      <span className="bg-indigo-600 text-white rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase inline-block mb-1">
                        Laporan Capaian CBT
                      </span>
                      <h2 className="text-base font-black uppercase text-slate-900 tracking-wide">{docSettings.schoolName}</h2>
                      <p className="text-xs text-slate-500">{docSettings.schoolAddress}</p>
                    </div>
                    <SmartLogo candidates={TKA_LOGO_CANDIDATES} alt="Logo TKA" fallbackText="TKA" className="w-14 h-14 object-contain" />
                  </div>

                  <div className="text-center mb-4">
                    <h3 className="text-sm font-black uppercase text-indigo-900 tracking-wider">RAPOR CAPAIAN SIMULASI TKA</h3>
                    <p className="text-xs font-semibold text-slate-500">Paket Ujian: {exam?.title} | Subtes: {exam?.subtest}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs font-medium border border-slate-200 rounded-xl p-3.5 mb-4 bg-slate-50">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Peserta</span>
                      <strong className="text-slate-900">{student.full_name}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas / Rombel</span>
                      <strong className="text-slate-900">{student.class_code}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Username</span>
                      <strong>@{student.username}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal Cetak</span>
                      <strong>{docSettings.issueDate}</strong>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
                    <table className="w-full border-collapse text-xs text-center">
                      <thead className="bg-slate-900 text-white font-bold">
                        <tr>
                          <th className="p-2.5 text-left pl-3">Nama Ujian</th>
                          <th className="p-2.5 w-28">Subtes</th>
                          <th className="p-2.5 w-20">KKM</th>
                          <th className="p-2.5 w-28">Skor Siswa</th>
                          <th className="p-2.5 w-32">Status Ketuntasan</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="bg-white border-t border-slate-200">
                          <td className="p-2.5 text-left pl-3 font-bold">{exam?.title}</td>
                          <td className="p-2.5 uppercase font-semibold text-slate-700">{exam?.subtest}</td>
                          <td className="p-2.5 font-semibold text-slate-600">{docSettings.kkmTarget}</td>
                          <td className="p-2.5 font-black text-indigo-700 text-sm">{student.earned_score}</td>
                          <td className="p-2.5 font-bold">
                            {student.earned_score >= docSettings.kkmTarget ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">✓ TUNTAS</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px]">✕ BELUM TUNTAS</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <DynamicSignatureBlock studentClass={student.class_code} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExamResultsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-semibold text-slate-500">Memuat rekapitulasi nilai...</div>}>
      <ExamResultsContent />
    </Suspense>
  )
}