'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'
import * as XLSX from 'xlsx'

// 🟢 HELPER EVALUASI MULTI-TIPE SOAL (PILIHAN GANDA, KOMPLEKS, MATRIKS)
function evaluateAnswer(q: any, rawAns: any) {
  if (rawAns === null || rawAns === undefined || rawAns === '') {
    return { isCorrect: false, ratio: 0, userChoices: [] }
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

  // A. Pilihan Ganda Biasa
  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? q.answer ?? '').trim().toUpperCase()
    const userChoice = String(parsed || '').trim().toUpperCase()
    const isCorrect = userChoice !== '' && userChoice === correctOpt
    return {
      isCorrect,
      ratio: isCorrect ? 1 : 0,
      userChoices: userChoice ? [userChoice] : []
    }
  }

  // B. Pilihan Ganda Kompleks
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
      return { isCorrect: false, ratio: 0, userChoices: [] }
    }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length
    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0

    return {
      isCorrect: ratio === 1,
      ratio,
      userChoices: userKeys
    }
  }

  // C. Matriks Benar / Salah
  if (qType === 'true_false_matrix') {
    const correctObj: { [key: string]: string } = q.correct_answers || {}
    const userObj = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {}

    const statementIds = Object.keys(correctObj)
    if (statementIds.length === 0) return { isCorrect: false, ratio: 0, userChoices: [] }

    let correctRows = 0
    let attemptedRows = 0
    statementIds.forEach((sId) => {
      if (userObj[sId]) attemptedRows++
      if (String(userObj[sId]).toLowerCase() === String(correctObj[sId]).toLowerCase()) {
        correctRows++
      }
    })

    if (attemptedRows === 0) return { isCorrect: false, ratio: 0, userChoices: [] }

    const ratio = correctRows / statementIds.length
    return {
      isCorrect: ratio === 1,
      ratio,
      userChoices: Object.values(userObj).map((v: any) => String(v).trim())
    }
  }

  return { isCorrect: false, ratio: 0, userChoices: [] }
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

  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([])
  const [isDeleting, setIsDeleting] = useState(false)

  const [sortByStudent, setSortByStudent] = useState<'score' | 'name' | 'class' | 'date'>('score')
  const [sortOrderStudent, setSortOrderStudent] = useState<'asc' | 'desc'>('desc')

  const [sortByItem, setSortByItem] = useState<'no' | 'accuracy'>('no')
  const [sortOrderItem, setSortOrderItem] = useState<'asc' | 'desc'>('asc')

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

    // A. Olah Sesi Pengerjaan Peserta
    const processedSessions = (sessionData || []).map((session) => {
      const student = profileMap.get(session.user_id) || {
        full_name: 'Siswa / Tamu',
        username: 'guest',
        class_code: '-',
      }

      const userAnswers = answerMap.get(session.id) || []
      const totalQ = questionData ? questionData.length : 0
      const finalScore = session.score !== undefined && session.score !== null
        ? Number(session.score)
        : 0

      let correctCount = 0

      if (userAnswers.length > 0) {
        userAnswers.forEach((ans) => {
          const q = questionMap.get(ans.question_id)
          if (q) {
            const rawChoice = ans.selected_answers ?? ans.selected_option
            const { isCorrect } = evaluateAnswer(q, rawChoice)
            if (isCorrect) {
              correctCount += 1
            }
          }
        })
      } else if (session.total_correct !== undefined && session.total_correct !== null && Number(session.total_correct) > 0) {
        correctCount = Number(session.total_correct)
      } else if (finalScore > 0 && totalQ > 0) {
        correctCount = Math.round((finalScore / 100) * totalQ)
      }

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
      }
    })

    // B. Olah Analisis Butir Soal & Pengecoh
    const totalParticipants = processedSessions.length
    const analysisList = (questionData || []).map((q, qIdx) => {
      let correctAnswersCount = 0
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
      } else {
        correctOptDisplay = String(q.correct_option ?? q.correct_answer ?? 'A').trim().toUpperCase()
      }

      if (answerData) {
        answerData.forEach((ans) => {
          if (ans.question_id === q.id) {
            const rawChoice = ans.selected_answers ?? ans.selected_option
            const { isCorrect, userChoices } = evaluateAnswer(q, rawChoice)

            if (isCorrect) {
              correctAnswersCount += 1
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

      if (accuracyRate >= 80) {
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
        question_text: q.question_text || '',
        correct_option: correctOptDisplay,
        max_score: q.max_score || 1,
        correct_count: correctAnswersCount,
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
      'Pilihan A': item.optionCounts?.A ?? 0,
      'Pilihan B': item.optionCounts?.B ?? 0,
      'Pilihan C': item.optionCounts?.C ?? 0,
      'Pilihan D': item.optionCounts?.D ?? 0,
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
      <Navbar />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
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
                      {item.correct_option === 'Matriks' ? (
                        <div className="flex justify-center items-center space-x-1.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded">
                            B: {item.optionCounts?.BENAR ?? 0}
                          </span>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded">
                            S: {item.optionCounts?.SALAH ?? 0}
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
                      {item.topDistractorKey !== 'Tidak ada' ? (
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
                        <button
                          onClick={() => handleDeleteSession(session.id, session.full_name)}
                          className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-[11px] font-bold rounded"
                        >
                          Reset Ujian
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
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