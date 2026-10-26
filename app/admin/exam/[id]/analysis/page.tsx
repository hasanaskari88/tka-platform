'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// =========================================================================
// 🟢 HELPER 1: EVALUASI JAWABAN MULTI-TIPE (PG, PG KOMPLEKS, MATRIKS, ESSAY)
// =========================================================================
function evaluateAnswer(q: any, rawAns: any) {
  if (rawAns === null || rawAns === undefined || rawAns === '') {
    return { isCorrect: false, isUnanswered: true, ratio: 0, displayVal: 'Kosong', userChoices: [] }
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

  // 1. Soal Uraian / Essay
  if (qType === 'essay' || qType === 'uraian') {
    const textAns = typeof parsed === 'string' ? parsed.trim() : String(parsed || '').trim()
    const isAnswered = textAns.length > 0 && textAns !== 'null' && textAns !== 'undefined'
    return {
      isCorrect: false,
      isUnanswered: !isAnswered,
      ratio: 0,
      displayVal: isAnswered ? textAns : 'Kosong',
      userChoices: isAnswered ? [textAns] : [],
    }
  }

  // 2. Pilihan Ganda Biasa
  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? '').trim().toUpperCase()
    const userChoice = String(parsed || '').trim().toUpperCase()
    const isCorrect = userChoice !== '' && userChoice === correctOpt
    return {
      isCorrect,
      isUnanswered: !userChoice,
      ratio: isCorrect ? 1 : 0,
      displayVal: userChoice ? `Opsi ${userChoice}` : 'Kosong',
      userChoices: userChoice ? [userChoice] : [],
    }
  }

  // 3. Pilihan Ganda Kompleks (Multi-Select)
  if (qType === 'complex_multiple_choice') {
    let correctKeys: string[] = []
    if (Array.isArray(q.correct_answers)) {
      correctKeys = q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
    } else if (q.correct_option || q.correct_answer) {
      correctKeys = String(q.correct_option ?? q.correct_answer)
        .split(',')
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean)
    }

    let userKeys: string[] = []
    if (Array.isArray(parsed)) {
      userKeys = parsed.map((k: any) => String(k).trim().toUpperCase())
    } else if (typeof parsed === 'string' && parsed) {
      userKeys = parsed
        .split(',')
        .map((k) => k.trim().toUpperCase())
        .filter(Boolean)
    }

    if (userKeys.length === 0)
      return { isCorrect: false, isUnanswered: true, ratio: 0, displayVal: 'Kosong', userChoices: [] }

    const correctUserChoices = userKeys.filter((k) => correctKeys.includes(k)).length
    const wrongUserChoices = userKeys.filter((k) => !correctKeys.includes(k)).length
    const netCorrect = Math.max(0, correctUserChoices - wrongUserChoices)
    const ratio = correctKeys.length > 0 ? netCorrect / correctKeys.length : 0

    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      ratio,
      displayVal: `Opsi: ${userKeys.join(', ')}`,
      userChoices: userKeys,
    }
  }

  // 4. Matriks Benar / Salah (True False Matrix)
  if (qType === 'true_false_matrix') {
    let correctObj: { [key: string]: string } = {}
    if (typeof q.correct_answers === 'object' && q.correct_answers !== null) {
      correctObj = q.correct_answers
    } else if (typeof q.correct_answers === 'string') {
      try {
        correctObj = JSON.parse(q.correct_answers)
      } catch (e) {}
    }

    const userObj = typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {}
    const statementIds = Object.keys(correctObj).length > 0 ? Object.keys(correctObj) : Object.keys(userObj)

    if (statementIds.length === 0)
      return { isCorrect: false, isUnanswered: true, ratio: 0, displayVal: 'Kosong', userChoices: [] }

    let correctRows = 0
    let attemptedRows = 0
    const userChoices: string[] = []

    statementIds.forEach((sId) => {
      if (userObj[sId] !== undefined && userObj[sId] !== null && userObj[sId] !== '') {
        attemptedRows++
        userChoices.push(String(userObj[sId]).trim())
      }
      if (
        userObj[sId] &&
        correctObj[sId] &&
        String(userObj[sId]).trim().toLowerCase() === String(correctObj[sId]).trim().toLowerCase()
      ) {
        correctRows++
      }
    })

    if (attemptedRows === 0)
      return { isCorrect: false, isUnanswered: true, ratio: 0, displayVal: 'Kosong', userChoices: [] }

    const ratio = correctRows / statementIds.length
    return {
      isCorrect: ratio === 1,
      isUnanswered: false,
      ratio,
      displayVal: `Benar ${correctRows}/${statementIds.length}`,
      userChoices,
    }
  }

  return { isCorrect: false, isUnanswered: true, ratio: 0, displayVal: 'Kosong', userChoices: [] }
}

// =========================================================================
// 🖼️ HELPER 2: KOMPONEN RENDER SOAL UTUH & RINCIAN KUNCI JAWABAN
// =========================================================================
function RenderFullQuestionDetail({ question }: { question: any }) {
  const qType = question.question_type || 'multiple_choice'

  let rawOptions: any[] = []
  if (Array.isArray(question.options)) rawOptions = question.options
  else if (Array.isArray(question.statements)) rawOptions = question.statements
  else if (typeof question.options === 'string') {
    try {
      rawOptions = JSON.parse(question.options)
    } catch (e) {}
  } else if (typeof question.statements === 'string') {
    try {
      rawOptions = JSON.parse(question.statements)
    } catch (e) {}
  }

  let correctMatrixObj: { [key: string]: string } = {}
  if (typeof question.correct_answers === 'object' && question.correct_answers !== null) {
    correctMatrixObj = question.correct_answers
  } else if (typeof question.correct_answers === 'string') {
    try {
      correctMatrixObj = JSON.parse(question.correct_answers)
    } catch (e) {}
  }

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-sm">
        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Teks Pertanyaan Soal:</span>
        <MathRenderer content={question.question_text || 'Teks soal tidak tersedia.'} />
      </div>

      {rawOptions.length > 0 && (
        <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">
            {qType === 'true_false_matrix' ? '📋 Daftar Pernyataan Matriks:' : '🔘 Opsi Jawaban:'}
          </span>

          {qType === 'true_false_matrix' ? (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                  <tr>
                    <th className="p-2.5 w-12 text-center">No</th>
                    <th className="p-2.5">Pernyataan</th>
                    <th className="p-2.5 w-32 text-center">Kunci Jawaban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rawOptions.map((opt: any, idx: number) => {
                    const statementId = opt.id ?? String(idx + 1)
                    const keyVal = correctMatrixObj[statementId] || opt.correct_answer || opt.answer || '-'
                    const isBenar = String(keyVal).toLowerCase() === 'benar' || String(keyVal).toLowerCase() === 'true'

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 text-slate-800 font-medium">
                          <MathRenderer content={opt.text || opt.statement || String(opt)} />
                        </td>
                        <td className="p-2.5 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isBenar ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {String(keyVal).toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {rawOptions.map((opt: any, idx: number) => {
                const optKey = opt.key || String.fromCharCode(65 + idx)
                const isCorrect = String(question.correct_option || question.correct_answer).includes(optKey)

                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border flex items-center space-x-2 ${
                      isCorrect
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                        isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {optKey}
                    </span>
                    <div className="flex-1">
                      <MathRenderer content={opt.text || String(opt)} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1 text-xs">
          <span className="font-bold text-indigo-900 block uppercase text-[10px]">🔑 Kunci Jawaban Resmi:</span>
          <div className="font-black text-indigo-700 text-xs">
            {qType === 'true_false_matrix' ? (
              <div className="space-y-0.5 mt-1">
                {Object.keys(correctMatrixObj).length > 0 ? (
                  Object.entries(correctMatrixObj).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between bg-white px-2 py-0.5 rounded border border-indigo-100 font-mono text-[11px]"
                    >
                      <span>Pernyataan #{k}:</span>
                      <strong className="text-indigo-900">{String(v).toUpperCase()}</strong>
                    </div>
                  ))
                ) : (
                  <span>Matriks (Lihat Tabel Pernyataan)</span>
                )}
              </div>
            ) : qType === 'essay' || qType === 'uraian' ? (
              <span>Penilaian Manual Guru (Essay)</span>
            ) : (
              <span className="text-sm">Opsi {question.correct_option || question.correct_answer || '-'}</span>
            )}
          </div>
        </div>

        <div className="md:col-span-8 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1 text-xs">
          <span className="font-bold text-amber-900 block uppercase text-[10px]">💡 Pembahasan Soal:</span>
          <div className="text-slate-800 leading-relaxed">
            {question.explanation || question.discussion ? (
              <MathRenderer content={question.explanation || question.discussion} />
            ) : (
              <span className="text-slate-400 italic">Belum ada pembahasan yang dimasukkan untuk soal ini.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// 🚀 HALAMAN UTAMA ANALISIS
// =========================================================================
function AnalysisContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [filterClass, setFilterClass] = useState('ALL')
  const [sortBy, setSortBy] = useState<'lowest_accuracy' | 'highest_accuracy' | 'number'>('lowest_accuracy')
  const [activeQuestionTab, setActiveQuestionTab] = useState<{ [key: string]: 'correct' | 'wrong' }>({})

  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    avgScore: 0,
    maxScore: 0,
    minScore: 0,
    passCount: 0,
    passRate: 0,
    stdDev: 0,
  })

  const loadData = async () => {
    if (!examId) return
    const supabase = createClient()

    const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single()
    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })
    const { data: sessionData } = await supabase.from('exam_sessions').select('*').eq('exam_id', examId)
    const { data: profileData } = await supabase.from('profiles').select('*')

    const sessionIds = (sessionData || []).map((s) => s.id)
    const { data: answerData } =
      sessionIds.length > 0
        ? await supabase.from('answers').select('*').in('session_id', sessionIds)
        : { data: [] }

    setExam(examData)
    setQuestions(questionData || [])
    setSessions(sessionData || [])
    setProfiles(profileData || [])
    setAnswers(answerData || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [examId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">Memuat Analisis Butir Soal Detail...</main>
      </div>
    )
  }

  const profileMap = new Map()
  profiles.forEach((p) => profileMap.set(p.id, p))

  const uniqueClasses = Array.from(
    new Set(sessions.map((s) => profileMap.get(s.user_id)?.class_code || '-'))
  ).filter(Boolean)

  const filteredSessions = sessions.filter((s) => {
    const studentClass = profileMap.get(s.user_id)?.class_code || '-'
    return filterClass === 'ALL' || studentClass === filterClass
  })

  const filteredSessionIds = filteredSessions.map((s) => s.id)
  const filteredAnswers = answers.filter((a) => filteredSessionIds.includes(a.session_id))
  const totalFilteredStudents = filteredSessions.length

  // 🟢 CALCULATE STATISTIK RINGKASAN KELAS
  const completedScores = filteredSessions.map((s) => Number(s.score) || 0)
  const avgScore = totalFilteredStudents > 0 ? completedScores.reduce((a, b) => a + b, 0) / totalFilteredStudents : 0
  const maxScore = totalFilteredStudents > 0 ? Math.max(...completedScores) : 0
  const minScore = totalFilteredStudents > 0 ? Math.min(...completedScores) : 0
  const passCount = completedScores.filter((sc) => sc >= 75).length
  const passRate = totalFilteredStudents > 0 ? Math.round((passCount / totalFilteredStudents) * 100) : 0
  const variance =
    totalFilteredStudents > 0
      ? completedScores.reduce((acc, sc) => acc + Math.pow(sc - avgScore, 2), 0) / totalFilteredStudents
      : 0
  const stdDev = Math.round(Math.sqrt(variance) * 10) / 10

  // 🟢 HITUNG ATURAN 27% ANATES UNTUK DAYA BEDA (D)
  const sortedSessions = [...filteredSessions].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
  const groupSize = Math.max(1, Math.floor(totalFilteredStudents * 0.27))
  const upperGroup = sortedSessions.slice(0, groupSize)
  const lowerGroup = sortedSessions.slice(Math.max(0, totalFilteredStudents - groupSize))

  const detailedAnalysis = questions.map((q, qIdx) => {
    const qAnswers = filteredAnswers.filter((a) => a.question_id === q.id)

    const correctStudents: any[] = []
    const wrongStudents: any[] = []

    let upperCorrect = 0
    let lowerCorrect = 0

    const optionCounts: { [key: string]: number } = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      Benar: 0,
      Salah: 0,
      Kosong: 0,
    }

    filteredSessions.forEach((sess) => {
      const student = profileMap.get(sess.user_id) || { full_name: 'Siswa / Tamu', username: 'guest', class_code: '-' }
      const ans = qAnswers.find((a) => a.session_id === sess.id)
      const rawChoice = ans ? ans.user_answer ?? ans.selected_answers ?? ans.selected_option : null
      const evalRes = evaluateAnswer(q, rawChoice)

      const studentItem = {
        id: sess.id,
        name: student.full_name,
        username: student.username,
        class_code: student.class_code || '-',
        userChoice: evalRes.displayVal,
        isUnanswered: evalRes.isUnanswered,
        essayScore: ans?.score ?? null,
      }

      const qType = q.question_type || 'multiple_choice'
      let isStudentCorrect = false

      if (qType === 'essay' || qType === 'uraian') {
        if (ans && ans.score !== undefined && ans.score !== null && Number(ans.score) > 0) {
          isStudentCorrect = true
          correctStudents.push(studentItem)
        } else {
          wrongStudents.push(studentItem)
        }
      } else {
        if (evalRes.isCorrect || evalRes.ratio >= 0.5) {
          isStudentCorrect = true
          correctStudents.push(studentItem)
        } else {
          wrongStudents.push(studentItem)
        }
      }

      if (isStudentCorrect) {
        if (upperGroup.some((u) => u.id === sess.id)) upperCorrect++
        if (lowerGroup.some((l) => l.id === sess.id)) lowerCorrect++
      }

      if (evalRes.userChoices.length > 0) {
        evalRes.userChoices.forEach((ch: string) => {
          const upperCh = String(ch).toUpperCase()
          if (['A', 'B', 'C', 'D'].includes(upperCh)) {
            optionCounts[upperCh] = (optionCounts[upperCh] || 0) + 1
          } else if (['BENAR', 'TRUE'].includes(upperCh.toLowerCase())) {
            optionCounts['Benar'] = (optionCounts['Benar'] || 0) + 1
          } else if (['SALAH', 'FALSE'].includes(upperCh.toLowerCase())) {
            optionCounts['Salah'] = (optionCounts['Salah'] || 0) + 1
          }
        })
      } else {
        optionCounts['Kosong']++
      }
    })

    const correctCount = correctStudents.length
    const wrongCount = wrongStudents.length
    const accuracyRate = totalFilteredStudents > 0 ? Math.round((correctCount / totalFilteredStudents) * 100) : 0

    // Tingkat Kesukaran (P)
    const facilityIndex = totalFilteredStudents > 0 ? correctCount / totalFilteredStudents : 0
    let facilityLabel = 'Sedang'
    let facilityColor = 'bg-amber-100 text-amber-800 border-amber-300'
    if (facilityIndex >= 0.7) {
      facilityLabel = 'Mudah'
      facilityColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'
    } else if (facilityIndex < 0.3) {
      facilityLabel = 'Sulit'
      facilityColor = 'bg-rose-100 text-rose-800 border-rose-300'
    }

    // Indeks Daya Beda (D)
    const discriminationIndex = groupSize > 0 ? (upperCorrect - lowerCorrect) / groupSize : 0
    const discriminationPercent = Math.round(discriminationIndex * 100)
    let discriminationLabel = 'Cukup'
    let discriminationColor = 'bg-amber-100 text-amber-800 border-amber-300'

    if (discriminationIndex >= 0.4) {
      discriminationLabel = 'Sangat Baik'
      discriminationColor = 'bg-emerald-100 text-emerald-800 border-emerald-300'
    } else if (discriminationIndex >= 0.3) {
      discriminationLabel = 'Baik'
      discriminationColor = 'bg-teal-100 text-teal-800 border-teal-300'
    } else if (discriminationIndex < 0) {
      discriminationLabel = '⚠️ Negatif (Cek Kunci!)'
      discriminationColor = 'bg-rose-600 text-white border-rose-700 font-bold'
    } else if (discriminationIndex < 0.2) {
      discriminationLabel = 'Buruk'
      discriminationColor = 'bg-rose-100 text-rose-800 border-rose-300'
    }

    // Pengecoh Utama
    const keyOpt = String(q.correct_option || q.correct_answer || '').toUpperCase()
    let topDistractor = '-'
    let maxDistractorCount = 0
    Object.keys(optionCounts).forEach((opt) => {
      if (opt !== keyOpt && opt !== 'Kosong' && optionCounts[opt] > maxDistractorCount) {
        maxDistractorCount = optionCounts[opt]
        topDistractor = opt
      }
    })

    // Rekomendasi
    let recommendation = '🟢 Soal Baik (Pertahankan)'
    if (discriminationIndex < 0) {
      recommendation = '🚨 Cek Kunci Jawaban!'
    } else if (facilityIndex < 0.25 && discriminationIndex < 0.2) {
      recommendation = '🔴 Terlalu Sulit / Perlu Revisi'
    } else if (facilityIndex > 0.85) {
      recommendation = '🟡 Terlalu Mudah'
    }

    return {
      question_no: qIdx + 1,
      question: q,
      correctCount,
      wrongCount,
      accuracyRate,
      facilityLabel,
      facilityColor,
      discriminationPercent,
      discriminationLabel,
      discriminationColor,
      optionCounts,
      topDistractor,
      recommendation,
      correctStudents,
      wrongStudents,
    }
  })

  const sortedAnalysis = [...detailedAnalysis].sort((a, b) => {
    if (sortBy === 'lowest_accuracy') return a.accuracyRate - b.accuracyRate
    if (sortBy === 'highest_accuracy') return b.accuracyRate - a.accuracyRate
    return a.question_no - b.question_no
  })

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-12">
      <Navbar />

      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {/* HEADER & NAVIGASI */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                {exam?.subtest}
              </span>
              <span className="text-xs text-slate-500 font-bold">Total: {questions.length} Soal</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              🎯 Analisis Butir Soal & Diagnostik Siswa: {exam?.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluasi mendalam per butir soal, daya beda, pembahasan, serta rincian siswa yang menjawab benar & salah.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors no-print"
            >
              🖨️ Cetak Analisis
            </button>
            <Link
              href={`/admin/exam/${examId}/results`}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors w-fit no-print"
            >
              ← Kembali ke Rekap Nilai
            </Link>
          </div>
        </div>

        {/* 🟢 KARTU STATISTIK RINGKASAN KELAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Peserta</span>
            <span className="text-lg font-black text-indigo-900 mt-0.5 block">
              {totalFilteredStudents} <span className="text-xs font-normal text-slate-400">Siswa</span>
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Rata-Rata Kelas</span>
            <span className="text-lg font-black text-indigo-600 mt-0.5 block">
              {Math.round(avgScore * 10) / 10} <span className="text-xs font-normal text-slate-400">/ 100</span>
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Nilai Tertinggi</span>
            <span className="text-lg font-black text-emerald-600 mt-0.5 block">{maxScore}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Nilai Terendah</span>
            <span className="text-lg font-black text-rose-600 mt-0.5 block">{minScore}</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Ketuntasan (≥75)</span>
            <span className="text-lg font-black text-teal-600 mt-0.5 block">
              {passRate}% <span className="text-xs font-normal text-slate-400">({passCount})</span>
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Standar Deviasi</span>
            <span className="text-lg font-black text-purple-600 mt-0.5 block">±{stdDev}</span>
          </div>
        </div>

        {/* BAR FILTER KELAS & PENGURUTAN */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">📌 Filter Kelas:</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50/50 focus:outline-none"
              >
                <option value="ALL">Semua Kelas ({totalFilteredStudents} Siswa)</option>
                {uniqueClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Kelas {cls}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-700">📊 Urutkan Soal:</label>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none"
              >
                <option value="lowest_accuracy">🔥 Paling Banyak Salah (Akurasi Terendah)</option>
                <option value="highest_accuracy">🏆 Paling Banyak Benar (Akurasi Tertinggi)</option>
                <option value="number">🔢 Urut Nomor Soal (1 - {questions.length})</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Menampilkan data dari <strong className="text-slate-800">{totalFilteredStudents} Peserta Ujian</strong>
          </div>
        </div>

        {/* DAFTAR CARD DETAIL PER SOAL */}
        <div className="space-y-6">
          {sortedAnalysis.map((item) => {
            const q = item.question
            const activeTab = activeQuestionTab[q.id] || 'wrong'

            let accuracyBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200'
            if (item.accuracyRate >= 80) accuracyBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200'
            else if (item.accuracyRate < 50) accuracyBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200'

            const qType = q.question_type || 'multiple_choice'

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
                {/* HEAD CARD SOAL */}
                <div className="p-4 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 font-black text-sm flex items-center justify-center text-white">
                      #{item.question_no}
                    </span>
                    <span className="text-xs font-bold uppercase bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      Tipe: {qType === 'complex_multiple_choice' ? 'PG Kompleks' : qType === 'true_false_matrix' ? 'Matriks' : qType === 'essay' ? 'Essay' : 'Pilihan Ganda'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-medium text-slate-300">
                      Benar: <strong className="text-emerald-400">{item.correctCount}</strong> | Salah: <strong className="text-rose-400">{item.wrongCount}</strong>
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-black border ${accuracyBadgeClass}`}>
                      Akurasi {item.accuracyRate}%
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* 🟢 METRIK PSIKOMETRI (KESUKARAN, DAYA BEDA, SEBARAN OPSI) */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Kesukaran Soal:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block mt-0.5 ${item.facilityColor}`}>
                        {item.facilityLabel} ({item.accuracyRate}%)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Daya Beda (ANATES 27%):</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block mt-0.5 ${item.discriminationColor}`}>
                        {item.discriminationLabel} ({item.discriminationPercent}%)
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Sebaran Opsi Jawaban:</span>
                      <div className="flex space-x-1 font-mono text-[10px] mt-0.5">
                        {qType === 'true_false_matrix' ? (
                          <>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border rounded">B:{item.optionCounts.Benar || 0}</span>
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-800 border rounded">S:{item.optionCounts.Salah || 0}</span>
                          </>
                        ) : (
                          ['A', 'B', 'C', 'D'].map((opt) => (
                            <span key={opt} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                              {opt}:{item.optionCounts[opt] || 0}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Catatan Rekomendasi:</span>
                      <span className="font-bold text-slate-800 text-[11px] block mt-0.5">{item.recommendation}</span>
                    </div>
                  </div>

                  {/* RENDER RINCIAN SOAL UTUH */}
                  <RenderFullQuestionDetail question={q} />

                  {/* TAB DIAGNOSTIK SISWA (BENAR vs SALAH) */}
                  <div className="pt-2 border-t border-slate-200 space-y-3">
                    <div className="flex space-x-2 border-b pb-2">
                      <button
                        onClick={() => setActiveQuestionTab((prev) => ({ ...prev, [q.id]: 'wrong' }))}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          activeTab === 'wrong' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ❌ Siswa Salah / Kosong ({item.wrongCount})
                      </button>
                      <button
                        onClick={() => setActiveQuestionTab((prev) => ({ ...prev, [q.id]: 'correct' }))}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          activeTab === 'correct' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        ✅ Siswa Jawab Benar ({item.correctCount})
                      </button>
                    </div>

                    {/* LIST DAFTAR SISWA */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-56 overflow-y-auto">
                      {activeTab === 'wrong' ? (
                        item.wrongStudents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {item.wrongStudents.map((st) => (
                              <div key={st.id} className="p-2 bg-white rounded-lg border border-rose-100 shadow-xs flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800 block truncate">{st.name}</span>
                                  <span className="text-[10px] text-slate-400">Kelas {st.class_code}</span>
                                </div>
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded text-[10px]">
                                  {st.isUnanswered ? 'Kosong' : st.userChoice}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-emerald-600 font-bold text-center py-2">🎉 Luar Biasa! Tidak ada siswa yang menjawab salah.</p>
                        )
                      ) : (
                        item.correctStudents.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                            {item.correctStudents.map((st) => (
                              <div key={st.id} className="p-2 bg-white rounded-lg border border-emerald-100 shadow-xs flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-800 block truncate">{st.name}</span>
                                  <span className="text-[10px] text-slate-400">Kelas {st.class_code}</span>
                                </div>
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded text-[10px]">
                                  ✓ {st.userChoice}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-rose-600 font-bold text-center py-2">⚠️ Belum ada siswa yang menjawab benar pada soal ini.</p>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}

export default function ExamAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-semibold text-slate-500">Memuat Halaman Analisis...</div>}>
      <AnalysisContent />
    </Suspense>
  )
}