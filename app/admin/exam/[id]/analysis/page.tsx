'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

// 🟢 HELPER EVALUASI JAWABAN SISWA
function evaluateAnswer(q: any, rawAns: any) {
  if (rawAns === null || rawAns === undefined || rawAns === '') {
    return { isCorrect: false, isUnanswered: true, displayVal: 'Kosong' }
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
    const isAnswered = textAns.length > 0 && textAns !== 'null'
    return { isCorrect: false, isUnanswered: !isAnswered, displayVal: isAnswered ? textAns : 'Kosong' }
  }

  if (qType === 'multiple_choice') {
    const correctOpt = String(q.correct_option ?? q.correct_answer ?? q.correct_key ?? '').trim().toUpperCase()
    const userChoice = String(parsed || '').trim().toUpperCase()
    return { isCorrect: userChoice !== '' && userChoice === correctOpt, isUnanswered: !userChoice, displayVal: userChoice || 'Kosong' }
  }

  if (qType === 'complex_multiple_choice') {
    let correctKeys: string[] = []
    if (Array.isArray(q.correct_answers)) {
      correctKeys = q.correct_answers.map((k: any) => String(k).trim().toUpperCase())
    } else if (q.correct_option || q.correct_answer) {
      correctKeys = String(q.correct_option ?? q.correct_answer).split(',').map((k) => k.trim().toUpperCase()).filter(Boolean)
    }

    let userKeys: string[] = []
    if (Array.isArray(parsed)) {
      userKeys = parsed.map((k: any) => String(k).trim().toUpperCase())
    } else if (typeof parsed === 'string' && parsed) {
      userKeys = parsed.split(',').map((k) => k.trim().toUpperCase()).filter(Boolean)
    }

    if (userKeys.length === 0) return { isCorrect: false, isUnanswered: true, displayVal: 'Kosong' }
    const isExact = correctKeys.length === userKeys.length && correctKeys.every((k) => userKeys.includes(k))
    return { isCorrect: isExact, isUnanswered: false, displayVal: userKeys.join(', ') }
  }

  return { isCorrect: false, isUnanswered: true, displayVal: 'Kosong' }
}

function AnalysisContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter & Sort State
  const [filterClass, setFilterClass] = useState('ALL')
  const [sortBy, setSortBy] = useState<'lowest_accuracy' | 'highest_accuracy' | 'number'>('lowest_accuracy')
  const [activeQuestionTab, setActiveQuestionTab] = useState<{ [key: string]: 'correct' | 'wrong' }>({})

  const loadData = async () => {
    if (!examId) return
    const supabase = createClient()

    const { data: examData } = await supabase.from('exams').select('*').eq('id', examId).single()
    const { data: questionData } = await supabase.from('questions').select('*').eq('exam_id', examId).order('created_at', { ascending: true })
    const { data: sessionData } = await supabase.from('exam_sessions').select('*').eq('exam_id', examId)
    const { data: profileData } = await supabase.from('profiles').select('*')

    const sessionIds = (sessionData || []).map((s) => s.id)
    const { data: answerData } = sessionIds.length > 0
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

  // 1. Peta Profil & Kelas
  const profileMap = new Map()
  profiles.forEach((p) => profileMap.set(p.id, p))

  const uniqueClasses = Array.from(new Set(sessions.map((s) => profileMap.get(s.user_id)?.class_code || '-'))).filter(Boolean)

  // 2. Filter Sesi Berdasarkan Kelas
  const filteredSessions = sessions.filter((s) => {
    const studentClass = profileMap.get(s.user_id)?.class_code || '-'
    return filterClass === 'ALL' || studentClass === filterClass
  })

  const filteredSessionIds = filteredSessions.map((s) => s.id)
  const filteredAnswers = answers.filter((a) => filteredSessionIds.includes(a.session_id))
  const totalFilteredStudents = filteredSessions.length

  // 3. Olah Detail Per Soal
  const detailedAnalysis = questions.map((q, qIdx) => {
    const qAnswers = filteredAnswers.filter((a) => a.question_id === q.id)

    const correctStudents: any[] = []
    const wrongStudents: any[] = []

    filteredSessions.forEach((sess) => {
      const student = profileMap.get(sess.user_id) || { full_name: 'Siswa / Tamu', username: 'guest', class_code: '-' }
      const ans = qAnswers.find((a) => a.session_id === sess.id)
      const rawChoice = ans ? (ans.user_answer ?? ans.selected_answers ?? ans.selected_option) : null
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
      if (qType === 'essay' || qType === 'uraian') {
        if (ans && ans.score !== undefined && ans.score !== null && Number(ans.score) > 0) {
          correctStudents.push(studentItem)
        } else {
          wrongStudents.push(studentItem)
        }
      } else {
        if (evalRes.isCorrect) {
          correctStudents.push(studentItem)
        } else {
          wrongStudents.push(studentItem)
        }
      }
    })

    const correctCount = correctStudents.length
    const wrongCount = wrongStudents.length
    const accuracyRate = totalFilteredStudents > 0 ? Math.round((correctCount / totalFilteredStudents) * 100) : 0

    return {
      question_no: qIdx + 1,
      question: q,
      correctCount,
      wrongCount,
      accuracyRate,
      correctStudents,
      wrongStudents,
    }
  })

  // 4. Urutkan Soal
  const sortedAnalysis = [...detailedAnalysis].sort((a, b) => {
    if (sortBy === 'lowest_accuracy') return a.accuracyRate - b.accuracyRate // Paling Banyak Salah Dahulu
    if (sortBy === 'highest_accuracy') return b.accuracyRate - a.accuracyRate // Paling Banyak Benar Dahulu
    return a.question_no - b.question_no // Sesuai Nomor Soal
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
              Evaluasi mendalam per butir soal, pembahasan, serta identifikasi siswa yang menjawab benar & salah.
            </p>
          </div>

          <Link
            href={`/admin/exam/${examId}/results`}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium rounded-lg transition-colors w-fit"
          >
            ← Kembali ke Rekap Nilai
          </Link>
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

            return (
              <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">
                {/* HEAD CARD SOAL */}
                <div className="p-4 bg-slate-900 text-white flex flex-wrap justify-between items-center gap-2">
                  <div className="flex items-center space-x-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 font-black text-sm flex items-center justify-center text-white">
                      #{item.question_no}
                    </span>
                    <span className="text-xs font-bold uppercase bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                      Tipe: {q.question_type || 'Pilihan Ganda'}
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
                  {/* TEKS PERTANYAAN */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 text-sm">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Pertanyaan Soal:</span>
                    <MathRenderer content={q.question_text || 'Teks soal tidak tersedia.'} />
                  </div>

                  {/* KUNCI JAWABAN & PEMBAHASAN */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1 text-xs">
                      <span className="font-bold text-indigo-900 block uppercase text-[10px]">🔑 Kunci Jawaban Resmi:</span>
                      <div className="font-extrabold text-indigo-700 text-sm">
                        {q.question_type === 'essay' || q.question_type === 'uraian' ? (
                          <span>Soal Uraian / Essay</span>
                        ) : (
                          <span>Opsi {q.correct_option || q.correct_answer || '-'}</span>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-8 p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1 text-xs">
                      <span className="font-bold text-amber-900 block uppercase text-[10px]">💡 Pembahasan Soal:</span>
                      <div className="text-slate-800 leading-relaxed">
                        {q.explanation || q.discussion ? (
                          <MathRenderer content={q.explanation || q.discussion} />
                        ) : (
                          <span className="text-slate-400 italic">Belum ada pembahasan yang dimasukkan untuk soal ini.</span>
                        )}
                      </div>
                    </div>
                  </div>

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

                    {/* LIST SISWA TERKAIT */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-48 overflow-y-auto">
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
                                  {st.isUnanswered ? 'Kosong' : `Pilih: ${st.userChoice}`}
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