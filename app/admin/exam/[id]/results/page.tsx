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
    return { isCorrect: false, isUnanswered: true, ratio: 0, userChoices: [], displayVal: 'Kosong' }
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

  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? q.answer ?? '').trim().toUpperCase()
    const userChoice = String(parsed || '').trim().toUpperCase()
    const isCorrect = userChoice !== '' && userChoice === correctOpt
    return {
      isCorrect,
      isUnanswered: !userChoice,
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
      return { isCorrect: false, isUnanswered: true, ratio: 0, userChoices: [], displayVal: 'Kosong' }
    }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length
    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0

    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      ratio,
      userChoices: userKeys,
      displayVal: userKeys.join(', ')
    }
  }

  if (qType === 'true_false_matrix') {
    const correctObj: { [key: string]: string } = q.correct_answers || {}
    const userObj = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {}

    const statementIds = Object.keys(correctObj)
    if (statementIds.length === 0) return { isCorrect: false, isUnanswered: true, ratio: 0, userChoices: [], displayVal: 'Kosong' }

    let correctRows = 0
    let attemptedRows = 0
    statementIds.forEach((sId) => {
      if (userObj[sId]) attemptedRows++
      if (String(userObj[sId]).trim().toLowerCase() === String(correctObj[sId]).trim().toLowerCase()) {
        correctRows++
      }
    })

    if (attemptedRows === 0) return { isCorrect: false, isUnanswered: true, ratio: 0, userChoices: [], displayVal: 'Kosong' }

    const ratio = correctRows / statementIds.length
    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      ratio,
      userChoices: Object.values(userObj).map((v: any) => String(v).trim()),
      displayVal: `Benar ${correctRows}/${statementIds.length}`
    }
  }

  if (qType === 'essay') {
    const textAns = typeof parsed === 'string' ? parsed.trim() : String(parsed || '').trim()
    const isAnswered = textAns.length > 0 && textAns !== 'null' && textAns !== 'undefined'
    return {
      isCorrect: isAnswered,
      isUnanswered: !isAnswered,
      isEssay: true,
      ratio: isAnswered ? 1 : 0,
      userChoices: isAnswered ? [textAns] : [],
      displayVal: isAnswered ? textAns : 'Kosong'
    }
  }

  return { isCorrect: false, isUnanswered: true, ratio: 0, userChoices: [], displayVal: 'Kosong' }
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

  // 🟢 TAMBAHKAN 2 BARIS INI PADA STATE ANDA
  const [filterClass, setFilterClass] = useState('ALL') // Untuk filter per kelas/rombel
  const [showBulkRaporModal, setShowBulkRaporModal] = useState<boolean>(false) // Untuk modal cetak massal

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const [sortByStudent, setSortByStudent] = useState<'score' | 'name' | 'class' | 'date'>('score')
  const [sortOrderStudent, setSortOrderStudent] = useState<'asc' | 'desc'>('desc')

  const [sortByItem, setSortByItem] = useState<'no' | 'accuracy'>('no')
  const [sortOrderItem, setSortOrderItem] = useState<'asc' | 'desc'>('asc')

  // 📝 STATE MODAL REVIEW & PENILAIAN GURU
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState<any | null>(null)
  const [sessionAnswersMap, setSessionAnswersMap] = useState<{ [qId: string]: any }>({})
  const [essayScores, setEssayScores] = useState<{ [qId: string]: number }>({})
  const [isOverrideScore, setIsOverrideScore] = useState<boolean>(false)
  const [customFinalScore, setCustomFinalScore] = useState<number>(0)
  const [isSavingScore, setIsSavingScore] = useState<boolean>(false)

  // 🖨️ STATE CETAK RAPOR & SERTIFIKAT VIA ADMIN
  const [showPrintCertModal, setShowPrintCertModal] = useState<boolean>(false)

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

  const KKM_TARGET = 70

  const loadData = async () => {
    if (!examId) return
    const supabase = createClient()

    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })

    const { data: profileData } = await supabase.from('profiles').select('*')
    
    const sessionIds = (sessionData || []).map((s) => s.id)
    const { data: answerData } = sessionIds.length > 0
      ? await supabase.from('answers').select('*').in('session_id', sessionIds)
      : { data: [] }

    const profileMap = new Map()
    if (profileData) {
      profileData.forEach((p) => profileMap.set(p.id, p))
    }

    const questionMap = new Map()
    if (questionData) {
      questionData.forEach((q) => {
        questionMap.set(q.id, q)
      })
    }

    const answerMap = new Map<string, any[]>()
    if (answerData) {
      answerData.forEach((ans) => {
        if (!answerMap.has(ans.session_id)) {
          answerMap.set(ans.session_id, [])
        }
        answerMap.get(ans.session_id)?.push(ans)
      })
    }

    const processedSessions = (sessionData || []).map((session) => {
      const student = profileMap.get(session.user_id) || {
        full_name: 'Siswa / Tamu',
        username: 'guest',
        class_code: '-',
      }

      const userAnswers = answerMap.get(session.id) || []
      const totalQ = questionData ? questionData.length : 0

      let correctCount = 0
      let totalPointsEarned = 0
      let totalMaxPoints = 0

      if (questionData && questionData.length > 0) {
        questionData.forEach((q) => {
          const qMaxScore = Number(q.max_score) || 1
          totalMaxPoints += qMaxScore

          const ans = userAnswers.find((a) => a.question_id === q.id)
          const rawChoice = ans ? (ans.user_answer ?? ans.selected_answers ?? ans.selected_option) : null
          const evalRes = evaluateAnswer(q, rawChoice)

          if (evalRes.isCorrect) {
            correctCount += 1
          }
          totalPointsEarned += evalRes.ratio * qMaxScore
        })
      }

      const finalScore = session.score !== undefined && session.score !== null
        ? Number(session.score)
        : totalMaxPoints > 0 ? Math.round((totalPointsEarned / totalMaxPoints) * 100) : 0

      const finishTime = session.end_time || session.submitted_at || session.completed_at || session.created_at

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
    const analysisList = (questionData || []).map((q, qIdx) => {
      // 🟢 1. Urutkan sesi siswa dari nilai tertinggi ke terendah
const sortedByScoreDesc = [...processedSessions].sort((a, b) => b.earned_score - a.earned_score)
const N = sortedByScoreDesc.length
const groupSize = Math.max(1, Math.floor(N * 0.27)) // 27% Kelompok Atas & Bawah
const upperGroup = sortedByScoreDesc.slice(0, groupSize)
const lowerGroup = sortedByScoreDesc.slice(Math.max(0, N - groupSize))

// 🟢 2. Di dalam mapping questionData, hitung berapa siswa kelompok atas & bawah yang benar:
let upperCorrect = 0
let lowerCorrect = 0

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

    // 🟢 3. Rumus Daya Beda (D) = (UpperCorrect - LowerCorrect) / GroupSize
  const discriminationIndexVal = groupSize > 0 ? (upperCorrect - lowerCorrect) / groupSize : 0
const discriminationPercent = Math.round(discriminationIndexVal * 100)

      
      
      let correctAnswersCount = 0
      let answeredCount = 0
      const optionCounts: { [key: string]: number } = { A: 0, B: 0, C: 0, D: 0, Kosong: 0 }
      
      let correctOptDisplay = ''
      if (q.question_type === 'complex_multiple_choice') {
        if (Array.isArray(q.correct_answers)) {
          correctOptDisplay = q.correct_answers.join(',')
        } else {
          correctOptDisplay = String(q.correct_option ?? q.correct_answer ?? '').trim().toUpperCase()
        }
      } else if (q.question_type === 'true_false_matrix') {
        correctOptDisplay = 'Matriks'
      } else if (q.question_type === 'essay') {
        correctOptDisplay = 'ESSAY'
      } else {
        correctOptDisplay = String(q.correct_option ?? q.correct_answer ?? 'A').trim().toUpperCase()
      }

      if (answerData) {
        answerData.forEach((ans) => {
          if (ans.question_id === q.id) {
            const rawChoice = ans.user_answer ?? ans.selected_answers ?? ans.selected_option
            const { isCorrect, isUnanswered, userChoices } = evaluateAnswer(q, rawChoice)

            if (isCorrect) {
              correctAnswersCount += 1
            }

            if (!isUnanswered) {
              answeredCount += 1
            }

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
      const accuracyRate =
        totalParticipants > 0 ? Math.round((correctAnswersCount / totalParticipants) * 100) : 0

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

      let difficultyLabel = 'Sedang'
      let difficultyBadge = 'bg-amber-50 text-amber-700 border-amber-200'

      if (q.question_type === 'essay') {
        difficultyLabel = 'Soal Essay / Uraian'
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
        optionCounts: optionCounts || { A: 0, B: 0, C: 0, D: 0, Kosong: 0 },
        topDistractorKey: maxDistractorCount > 0 ? topDistractorKey : 'Tidak ada',
        maxDistractorCount,
        difficultyLabel,
        difficultyBadge,
      }
    })

    if (examData) setExam(examData)
    if (questionData) setQuestions(questionData)
    setSessions(processedSessions)
    setItemAnalysisList(analysisList)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [examId])

  const calculateAutoScore = (
    answersMap: { [qId: string]: any },
    currentEssayScores: { [qId: string]: number }
  ) => {
    let totalPoints = 0
    let maxPoints = 0

    questions.forEach((q) => {
      const qMax = Number(q.max_score) || 1
      maxPoints += qMax

      if (q.question_type === 'essay') {
        totalPoints += currentEssayScores[q.id] ?? 0
      } else {
        const rawAns = answersMap[q.id]
        const evalRes = evaluateAnswer(q, rawAns)
        totalPoints += evalRes.ratio * qMax
      }
    })

    return maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0
  }

  const handleOpenDetailModal = (session: any) => {
    const map: { [key: string]: any } = {}
    if (Array.isArray(session.rawAnswers)) {
      session.rawAnswers.forEach((ans: any) => {
        map[ans.question_id] = ans.user_answer ?? ans.selected_answers ?? ans.selected_option
      })
    }
    setSessionAnswersMap(map)

    const initialEssayScores: { [key: string]: number } = {}
    questions.forEach((q) => {
      const qMax = Number(q.max_score) || 1
      if (q.question_type === 'essay') {
        const rawAns = map[q.id]
        const evalRes = evaluateAnswer(q, rawAns)
        initialEssayScores[q.id] = evalRes.isUnanswered ? 0 : qMax
      }
    })

    setEssayScores(initialEssayScores)
    setIsOverrideScore(false)

    const autoCalculated = calculateAutoScore(map, initialEssayScores)
    setCustomFinalScore(autoCalculated)
    setSelectedSessionForDetail(session)
  }

  const handleEssayScoreChange = (qId: string, value: number, maxScore: number) => {
    const val = Math.max(0, Math.min(value, maxScore))
    const updatedEssayScores = { ...essayScores, [qId]: val }
    setEssayScores(updatedEssayScores)

    if (!isOverrideScore) {
      const autoCalculated = calculateAutoScore(sessionAnswersMap, updatedEssayScores)
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

    if (error) {
      alert(`Gagal menyimpan nilai: ${error.message}`)
    } else {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === selectedSessionForDetail.id) {
            return {
              ...s,
              earned_score: newScore,
              accuracy_percentage: newScore,
            }
          }
          return s
        })
      )
      alert(`✅ Nilai siswa ${selectedSessionForDetail.full_name} berhasil diperbarui menjadi ${newScore}!`)
      setSelectedSessionForDetail(null)
    }

    setIsSavingScore(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDeleteSession = async (sessionId: string, studentName: string) => {
    if (!confirm(`Apakah Anda yakin ingin mereset hasil ujian siswa "${studentName}"?`)) return

    const supabase = createClient()
    await supabase.from('answers').delete().eq('session_id', sessionId)
    await supabase.from('exam_sessions').delete().eq('id', sessionId)
    setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionId))
    loadData()
  }

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

  const handleDeleteAll = async () => {
    if (sessions.length === 0) return
    if (!confirm(`⚠️ PERINGATAN:\nHapus SELURUH (${sessions.length}) hasil pengerjaan siswa?`)) return

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
    return (
      s.full_name.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term) ||
      s.class_code.toLowerCase().includes(term)
    )
  })

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
      return sortOrderItem === 'asc'
        ? a.accuracy_rate - b.accuracy_rate
        : b.accuracy_rate - a.accuracy_rate
    }
    return sortOrderItem === 'asc'
      ? a.question_no - b.question_no
      : b.question_no - a.question_no
  })

  const totalParticipants = sessions.length
  const totalScores = sessions.map((s) => s.earned_score)
  const averageScore =
    totalParticipants > 0
      ? (totalScores.reduce((a, b) => a + b, 0) / totalParticipants).toFixed(1)
      : '0'
  const highestScore = totalParticipants > 0 ? Math.max(...totalScores) : 0
  const lowestScore = totalParticipants > 0 ? Math.min(...totalScores) : 0

  const handleExportToExcel = () => {
    if (sessions.length === 0) {
      alert('Belum ada data pengerjaan siswa untuk di-export.')
      return
    }

    const workbook = XLSX.utils.book_new()

    const studentData = sortedSessions.map((s, idx) => ({
      No: idx + 1,
      'Nama Lengkap Siswa': s.full_name,
      Username: s.username,
      'Kode Kelas': s.class_code,
      'Waktu Selesai': s.completed_at
        ? new Date(s.completed_at).toLocaleString('id-ID')
        : '-',
      'Jawaban Benar': `${s.correct_count} / ${s.total_questions}`,
      'Nilai Akhir': s.earned_score,
      'Akurasi (%)': `${s.accuracy_percentage}%`,
    }))
    const wsStudents = XLSX.utils.json_to_sheet(studentData)
    XLSX.utils.book_append_sheet(workbook, wsStudents, 'Rekap Nilai Siswa')

    const itemData = sortedItems.map((item) => ({
      'No Soal': item.question_no,
      'Teks Soal': (item.question_text || '').replace(/<[^>]*>?/gm, ''),
      'Kunci Jawaban': item.correct_option,
      'Pilihan A / Status': item.question_type === 'essay' ? `Dijawab: ${item.answeredCount}` : (item.optionCounts?.A ?? 0),
      'Pilihan B': item.question_type === 'essay' ? '-' : (item.optionCounts?.B ?? 0),
      'Pilihan C': item.question_type === 'essay' ? '-' : (item.optionCounts?.C ?? 0),
      'Pilihan D': item.question_type === 'essay' ? '-' : (item.optionCounts?.D ?? 0),
      'Tidak Dijawab': item.optionCounts?.Kosong ?? 0,
      'Akurasi (%)': `${item.accuracy_rate}%`,
      'Pengecoh Utama': item.topDistractorKey !== 'Tidak ada' ? `Opsi ${item.topDistractorKey}` : '-',
      'Kategori Kesulitan': item.difficultyLabel,
    }))
    const wsItems = XLSX.utils.json_to_sheet(itemData)
    XLSX.utils.book_append_sheet(workbook, wsItems, 'Analisis Butir & Distraktor')

    const cleanTitle = (exam?.title || 'Ujian').replace(/[^a-zA-Z0-9]/g, '_')
    XLSX.writeFile(workbook, `Rekap_Lengkap_${cleanTitle}.xlsx`)
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

      <main className="p-8 max-w-7xl mx-auto space-y-8 no-print">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {exam?.subtest}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              📊 Rekap & Analisis Nilai: {exam?.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis tingkat kebenaran per nomor, sebaran opsi jawaban, dan rekapitulasi nilai peserta
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportToExcel}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center space-x-1.5"
            >
              <span>📊</span>
              <span>Export Rekap & Analisis (.xlsx)</span>
            </button>
            <Link
              href="/admin"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors"
            >
              ← Kembali ke Dashboard
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">👥 Total Peserta</span>
            <span className="text-2xl font-extrabold text-slate-800">{totalParticipants} Siswa</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">📈 Rata-Rata Nilai</span>
            <span className="text-2xl font-extrabold text-indigo-600">{averageScore} Nilai</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">🏆 Nilai Tertinggi</span>
            <span className="text-2xl font-extrabold text-emerald-600">{highestScore} Nilai</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">📉 Nilai Terendah</span>
            <span className="text-2xl font-extrabold text-rose-600">{lowestScore} Nilai</span>
          </div>
        </div>

        {/* TABEL ANALISIS SOAL */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
          <div className="border-b pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <span>🎯</span>
                <span>Analisis Butir Soal & Sebaran Pilihan Jawaban (A, B, C, D)</span>
              </h2>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-semibold text-slate-600">Urutkan Soal:</span>
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
                  <th className="p-3 text-center w-36">Tingkat Akurasi</th>
                  <th className="p-3 text-center">Kategori Kesulitan</th>
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
                      {item.question_type === 'true_false_matrix' || item.correct_option === 'Matriks' ? (
                        <div className="flex justify-center items-center space-x-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded">
                            B: {item.optionCounts?.BENAR ?? 0}
                          </span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded">
                            S: {item.optionCounts?.SALAH ?? 0}
                          </span>
                        </div>
                      ) : item.question_type === 'essay' || item.correct_option === 'ESSAY' ? (
                        <div className="flex justify-center items-center space-x-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-300 font-bold rounded">
                            Dijawab: {item.answeredCount ?? 0}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 font-bold rounded">
                            Kosong: {item.optionCounts?.Kosong ?? 0}
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-center items-center space-x-1.5 font-mono text-[11px]">
                          {['A', 'B', 'C', 'D'].map((optKey) => {
                            const isCorrectKey = item.correct_option.includes(optKey)
                            const count = item.optionCounts?.[optKey] ?? 0
                            let pillStyle = 'bg-slate-100 text-slate-600 border-slate-200'
                            if (isCorrectKey) {
                              pillStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                            } else if (optKey === item.topDistractorKey && count > 0) {
                              pillStyle = 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                            }
                            return (
                              <span key={optKey} className={`px-2 py-0.5 rounded border ${pillStyle}`}>
                                {optKey}:{count}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {item.question_type === 'essay' ? (
                        <span className="text-slate-400 text-[11px] font-normal">Uraian</span>
                      ) : item.topDistractorKey !== 'Tidak ada' ? (
                        <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px]">
                          Opsi {item.topDistractorKey} ({item.maxDistractorCount})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-normal">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span>{item.accuracy_rate}%</span>
                          <span className="text-slate-400 font-normal">
                            ({item.correct_count}/{totalParticipants})
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${item.accuracy_rate}%` }}
                          ></div>
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

        {/* TABEL DAFTAR PESERTA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
          <div className="border-b pb-3 flex flex-col md:flex-row justify-between items-center gap-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>📋</span>
              <span>Daftar Nilai Peserta Ujian ({sortedSessions.length})</span>
            </h2>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                placeholder="🔍 Cari nama, username, kelas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-1.5 border rounded-lg text-xs w-48 sm:w-60"
              />

              {selectedSessionIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg"
                >
                  🗑️ Hapus Terpilih ({selectedSessionIds.length})
                </button>
              )}

              {sessions.length > 0 && (
                <button
                  onClick={handleDeleteAll}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-red-100 text-red-700 border border-red-300 text-xs font-bold rounded-lg"
                >
                  ⚠️ Hapus Semua Hasil
                </button>
              )}
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
                      checked={
                        sortedSessions.length > 0 &&
                        selectedSessionIds.length === sortedSessions.length
                      }
                      className="rounded text-indigo-600"
                    />
                  </th>
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3">Nama Siswa & Username</th>
                  <th className="p-3 text-center">Kelas</th>
                  <th className="p-3 text-center">Waktu Selesai</th>
                  <th className="p-3 text-center">Jawaban Benar</th>
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
                          ? new Date(session.completed_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
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
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold rounded transition-colors shadow-sm"
                            title="Lihat lembar jawaban & beri nilai"
                          >
                            👁️ Detail & Nilai
                          </button>

                          <button
                            onClick={() => {
                              setSelectedSessionForDetail(session)
                              setShowPrintCertModal(true)
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded transition-colors shadow-sm"
                            title="Cetak Sertifikat Siswa"
                          >
                            📜 Cetak
                          </button>

                          <button
                            onClick={() => handleDeleteSession(session.id, session.full_name)}
                            className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold rounded transition-colors"
                            title="Reset hasil pengerjaan"
                          >
                            Reset
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
      </main>

      {/* 📝 MODAL REVIEW LEMBAR JAWABAN & PENILAIAN GURU */}
      {selectedSessionForDetail && !showPrintCertModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b bg-slate-900 text-white flex justify-between items-center">
              <div>
                <span className="text-[10px] bg-indigo-500 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  PENILAIAN SISWA
                </span>
                <h3 className="text-base font-bold mt-0.5">
                  📝 Lembar Jawaban: {selectedSessionForDetail.full_name}
                </h3>
                <p className="text-xs text-slate-300">
                  Kelas: <strong>{selectedSessionForDetail.class_code}</strong> | @{selectedSessionForDetail.username}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowPrintCertModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  📜 Pratinjau Sertifikat
                </button>
                <button
                  onClick={() => setSelectedSessionForDetail(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm font-bold transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold">💡 Petunjuk Guru:</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Periksa jawaban essay siswa di bawah, tentukan poin nilai essay. Nilai Akhir akan otomatis terhitung secara presisi.
                  </p>
                </div>
              </div>

              {questions.map((q, idx) => {
                const qType = q.question_type || 'multiple_choice'
                const rawAns = sessionAnswersMap[q.id]
                const evalRes = evaluateAnswer(q, rawAns)
                const qMax = Number(q.max_score) || 1

                let correctOptDisplay = q.correct_option ?? q.correct_answer ?? '-'
                if (qType === 'complex_multiple_choice') {
                  correctOptDisplay = Array.isArray(q.correct_answers) ? q.correct_answers.join(', ') : correctOptDisplay
                } else if (qType === 'true_false_matrix') {
                  correctOptDisplay = 'Matriks Benar-Salah'
                } else if (qType === 'essay') {
                  correctOptDisplay = 'Uraian / Essay'
                }

                return (
                  <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-800">
                        Soal #{idx + 1}{' '}
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase ml-2">
                          {qType === 'complex_multiple_choice'
                            ? 'PG Kompleks'
                            : qType === 'true_false_matrix'
                            ? 'Matriks'
                            : qType === 'essay'
                            ? 'Essay'
                            : 'Pilihan Ganda'}
                        </span>
                      </span>

                      {qType === 'essay' ? (
                        <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded">
                          📝 Essay / Uraian
                        </span>
                      ) : evalRes.isCorrect ? (
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">
                          ✅ Jawaban Tepat (+{qMax})
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded">
                          ❌ Kurang Tepat
                        </span>
                      )}
                    </div>

                    <div className="font-medium text-slate-800">
                      <MathRenderer content={q.question_text} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px]">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-slate-400 font-bold block uppercase text-[9px]">
                          Kunci Jawaban Resmi:
                        </span>
                        <span className="font-bold text-indigo-700">{correctOptDisplay}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
                        <span className="text-slate-400 font-bold block uppercase text-[9px]">
                          Jawaban Siswa:
                        </span>
                        <span className={`font-bold ${evalRes.isCorrect ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {evalRes.displayVal}
                        </span>
                      </div>
                    </div>

                    {qType === 'essay' && (
                      <div className="mt-2 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
                        <span className="font-bold text-indigo-900 text-xs">
                          Skor Nilai Essay (0 - {qMax}):
                        </span>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0"
                            max={qMax}
                            step="0.1"
                            value={essayScores[q.id] ?? 0}
                            onChange={(e) =>
                              handleEssayScoreChange(q.id, parseFloat(e.target.value) || 0, qMax)
                            }
                            className="w-20 px-2.5 py-1 border border-indigo-300 rounded-lg text-center font-bold text-indigo-700 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          />
                          <span className="font-bold text-slate-500 text-xs">/ {qMax} Poin</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="p-5 border-t bg-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="space-y-1.5">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isOverrideScore}
                    onChange={(e) => {
                      const checked = e.target.checked
                      setIsOverrideScore(checked)
                      if (!checked) {
                        const autoCalculated = calculateAutoScore(sessionAnswersMap, essayScores)
                        setCustomFinalScore(autoCalculated)
                      }
                    }}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Override Nilai Akhir secara manual (Opsional)</span>
                </label>

                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={!isOverrideScore}
                    value={customFinalScore}
                    onChange={(e) => setCustomFinalScore(Number(e.target.value))}
                    className={`w-24 px-3 py-1.5 border-2 rounded-xl text-center font-black text-base focus:outline-none transition-all ${
                      isOverrideScore
                        ? 'border-indigo-600 bg-white text-indigo-700 shadow-sm'
                        : 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                    }`}
                  />
                  <span className="font-bold text-slate-600 text-sm">/ 100</span>

                  {!isOverrideScore && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                      ⚡ Otomatis Terhitung
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSelectedSessionForDetail(null)}
                  className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-colors flex-1 sm:flex-none"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleSaveAssessment}
                  disabled={isSavingScore}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex-1 sm:flex-none"
                >
                  {isSavingScore ? 'Menyimpan...' : '💾 Simpan Penilaian'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📜 MODAL CETAK SERTIFIKAT VIA ADMIN */}
      {showPrintCertModal && selectedSessionForDetail && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm">📜 Pratinjau Sertifikat Siswa (Admin View)</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  🖨️ Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setShowPrintCertModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* AREA CETAK SERTIFIKAT */}
            <div id="printable-area" className="p-10 font-serif text-slate-900 bg-amber-50/30 border-[12px] border-double border-indigo-900 rounded-xl relative m-4">
              <div className="border border-indigo-900 p-8 text-center rounded-lg space-y-4 bg-white/90">
                <div className="flex justify-center items-center space-x-3">
                  <SmartLogo
                    candidates={SD_LOGO_CANDIDATES}
                    alt="Logo SD Getasan"
                    fallbackText="SD"
                    className="w-10 h-10 object-contain shrink-0"
                    fallbackClassName="w-10 h-10 bg-indigo-700 text-white font-black text-xs flex items-center justify-center rounded-xl shrink-0"
                  />
                  <span className="text-xs font-sans font-extrabold uppercase tracking-widest text-indigo-900">
                    SD NEGERI GETASAN
                  </span>
                  <SmartLogo
                    candidates={TKA_LOGO_CANDIDATES}
                    alt="Logo Kemendikbud TKA"
                    fallbackText="TKA"
                    className="w-10 h-10 object-contain shrink-0"
                    fallbackClassName="w-10 h-10 border border-indigo-600 text-indigo-700 font-black text-xs flex items-center justify-center rounded-xl shrink-0 uppercase"
                  />
                </div>

                <h1 className="text-3xl font-bold uppercase tracking-wider text-slate-900 font-serif border-b-2 border-amber-500 pb-2 inline-block px-8">
                  SERTIFIKAT CAPAIAN UJIAN
                </h1>

                <p className="text-xs font-sans text-slate-600 uppercase tracking-widest">
                  Diberikan secara resmi kepada:
                </p>

                <div className="py-2">
                  <h2 className="text-2xl font-black text-indigo-900 underline decoration-amber-500 uppercase tracking-wide">
                    {selectedSessionForDetail.full_name}
                  </h2>
                  <p className="text-xs font-sans font-bold text-slate-500 mt-1">
                    NIS/Username: @{selectedSessionForDetail.username} | Kelas: {selectedSessionForDetail.class_code || '-'}
                  </p>
                </div>

                <p className="text-xs font-sans text-slate-700 max-w-xl mx-auto leading-relaxed">
                  Telah menyelesaikan Ujian <strong className="text-indigo-900">"{exam?.title}"</strong> Subtes <strong className="uppercase text-indigo-900">{exam?.subtest}</strong> dengan perolehan nilai resmi:
                </p>

                <div className="py-2">
                  <span className="text-4xl font-black font-sans text-indigo-700 bg-indigo-50 border-2 border-indigo-200 px-6 py-2 rounded-2xl inline-block shadow-inner">
                    {selectedSessionForDetail.earned_score} <span className="text-xs font-normal text-slate-500">/ 100</span>
                  </span>
                </div>

                <p className="text-xs font-sans font-bold text-emerald-700">
                  Status: {selectedSessionForDetail.earned_score >= KKM_TARGET ? '✓ DILATIH DENGAN SANGAT BAIK (TUNTAS KKM)' : 'PERLU LATIHAN LANJUTAN'}
                </p>

                <div className="flex justify-between items-end pt-8 font-sans text-xs">
                  <div className="text-left">
                    <p className="text-slate-500">Tanggal Selesai:</p>
                    <p className="font-bold text-slate-800">
                      {selectedSessionForDetail.completed_at ? new Date(selectedSessionForDetail.completed_at).toLocaleDateString('id-ID', { dateStyle: 'full' }) : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500">Kepala Sekolah / Panitia Ujian,</p>
                    <div className="h-12"></div>
                    <p className="font-bold underline text-slate-900">SD NEGERI GETASAN</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    {/* 📑 MODAL CETAK RAPOR MASSAL 1 KELAS */}
{showBulkRaporModal && (
  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
      <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
        <span className="font-bold text-sm">🖨️ Cetak Kolektif Rapor Ujian ({sortedSessions.length} Siswa)</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
          >
            🖨️ Cetak / Simpan PDF Satu Kelas
          </button>
          <button
            onClick={() => setShowBulkRaporModal(false)}
            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* AREA CETAK RAPOR KOLEKTIF */}
      <div id="printable-area" className="p-8 overflow-y-auto font-sans text-slate-900 bg-white space-y-12">
        {sortedSessions.map((student, studentIndex) => (
          <div key={student.id} className={studentIndex < sortedSessions.length - 1 ? 'page-break pb-12 border-b-2 border-dashed border-slate-300' : ''}>
            {/* KOP RESMI SEKOLAH */}
            <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex items-center justify-between text-center">
              <SmartLogo candidates={SD_LOGO_CANDIDATES} alt="Logo SD Getasan" fallbackText="SD" />

              <div className="flex-1 px-4">
                <h2 className="text-xl font-extrabold uppercase tracking-wide text-slate-900">
                  SD NEGERI GETASAN
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang, Jawa Tengah (50774)
                </p>
                <p className="text-[11px] text-slate-500">
                  Platform Ujian CBT Interaktif & Simulasi Tes Kemampuan Akademik (TKA)
                </p>
              </div>

              <SmartLogo candidates={TKA_LOGO_CANDIDATES} alt="Logo Kemendikbud TKA" fallbackText="TKA" />
            </div>

            <div className="text-center mb-6">
              <h3 className="text-lg font-black uppercase text-indigo-900 tracking-wider">
                RAPOR CAPAIAN SIMULASI TKA
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Paket Ujian: {exam?.title} | Subtes: {exam?.subtest}
              </p>
            </div>

            {/* IDENTITAS SISWA */}
            <div className="grid grid-cols-2 gap-4 text-xs font-medium border border-slate-300 rounded-xl p-4 mb-6 bg-slate-50/50">
              <div>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="w-32 py-1 text-slate-500">Nama Siswa</td>
                      <td className="font-bold text-slate-900">: {student.full_name}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">NIS / Username</td>
                      <td className="font-bold text-slate-900">: @{student.username}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div>
                <table className="w-full">
                  <tbody>
                    <tr>
                      <td className="w-32 py-1 text-slate-500">Kelas / Rombel</td>
                      <td className="font-bold text-slate-900">: {student.class_code}</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-slate-500">Tanggal Cetak</td>
                      <td className="font-bold text-slate-900">: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL SKOR SISWA */}
            <table className="w-full border-collapse text-xs border border-slate-300 text-center mb-8">
              <thead className="bg-slate-100 font-bold text-slate-800">
                <tr>
                  <th className="border border-slate-300 p-2">Nama Ujian</th>
                  <th className="border border-slate-300 p-2 w-28">Subtes</th>
                  <th className="border border-slate-300 p-2 w-20">KKM</th>
                  <th className="border border-slate-300 p-2 w-28">Skor Siswa</th>
                  <th className="border border-slate-300 p-2 w-32">Status Ketuntasan</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 p-3 text-left font-bold">{exam?.title}</td>
                  <td className="border border-slate-300 p-3 uppercase">{exam?.subtest}</td>
                  <td className="border border-slate-300 p-3 font-semibold">{KKM_TARGET}</td>
                  <td className="border border-slate-300 p-3 font-black text-indigo-700 text-sm">{student.earned_score}</td>
                  <td className="border border-slate-300 p-3 font-bold">
                    {student.earned_score >= KKM_TARGET ? (
                      <span className="text-emerald-700">✓ TUNTAS</span>
                    ) : (
                      <span className="text-rose-600">✕ BELUM TUNTAS</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* TANDA TANGAN */}
            <div className="grid grid-cols-3 gap-4 text-center text-xs pt-8 border-t border-slate-200">
              <div>
                <p className="text-slate-500">Orang Tua / Wali Murid,</p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-800">( .................................... )</p>
              </div>
              <div>
                <p className="text-slate-500">Guru Kelas,</p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-800">( Wali Kelas {student.class_code} )</p>
              </div>
              <div>
                <p className="text-slate-500">Kepala Sekolah,</p>
                <div className="h-16"></div>
                <p className="font-bold underline text-slate-800">SD NEGERI GETASAN</p>
              </div>
            </div>
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
    <Suspense fallback={<div className="p-8 text-center">Memuat rekap...</div>}>
      <ExamResultsContent />
    </Suspense>
  )
}