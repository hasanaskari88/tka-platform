'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import Link from 'next/link'

function BankSoalContent() {
  const params = useParams()
  const examId = params?.id as string
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Modal Form Editor Manual
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  // State Modal Import Bulk
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkInputText, setBulkInputText] = useState('')

  // State Form Input Manual
  const [formData, setFormData] = useState({
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    explanation: '',
    image_url: '',
    target_x: 3,
    target_y: 3,
  })

  // 🟢 1. FETCH DATA EXAM & SOAL
  const fetchExamAndQuestions = async () => {
    if (!examId) return
    setLoading(true)
    const supabase = createClient()

    const { data: examData, error: examErr } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .single()

    if (examErr || !examData) {
      alert('Modul kegiatan tidak ditemukan!')
      router.push('/admin/practice')
      return
    }
    setExam(examData)

    const { data: questionData } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: true })

    if (questionData) setQuestions(questionData)
    setLoading(false)
  }

  useEffect(() => {
    fetchExamAndQuestions()
  }, [examId])

  // 🟢 2. HANDLER TOMBOL 1: AUTO GENERATE SD (ACAK & APPEND)
  const handleAutoGenerateQuestions = async () => {
    const actType = exam?.activity_type || 'QUIZ'
    const subtestName = exam?.subtest || 'Matematika'

    const confirmGen = confirm(
      `Tambahkan soal otomatis dinamis ke "${exam.title}"?\n\n` +
      `Subtes: ${subtestName}\n` +
      `Bentuk Kegiatan: ${actType}\n` +
      `Tingkat: Sekolah Dasar (SD)\n\n` +
      `➕ Catatan: Soal variasi baru akan DITAMBAHKAN di bagian bawah (tanpa menghapus soal lama).`
    )
    if (!confirmGen) return

    const supabase = createClient()
    let generatedQuestions: any[] = []

    if (actType === 'QUIZ') {
      const lowerSub = subtestName.toLowerCase()

      if (lowerSub.includes('matematika') || lowerSub.includes('hitung') || lowerSub.includes('numerasi')) {
        const num1 = Math.floor(Math.random() * 20) + 10
        const num2 = Math.floor(Math.random() * 8) + 2
        const num3 = Math.floor(Math.random() * 50) + 10
        const ans1 = num1 * num2 + num3
        const side = Math.floor(Math.random() * 12) + 4
        const keliling = 4 * side

        generatedQuestions = [
          {
            exam_id: examId,
            question_text: `Berapakah hasil dari $${num1} \\times ${num2} + ${num3}$?`,
            options: [
              { key: 'A', text: `${ans1 - 10}` },
              { key: 'B', text: `${ans1}` },
              { key: 'C', text: `${ans1 + 10}` },
              { key: 'D', text: `${ans1 + 25}` },
            ],
            correct_option: 'B',
            explanation: `Perkalian didahulukan: $${num1} \\times ${num2} = ${num1 * num2}$, lalu $+ ${num3} = ${ans1}$.`,
          },
          {
            exam_id: examId,
            question_text: `Sebuah persegi memiliki panjang sisi $${side}\\text{ cm}$. Berapakah keliling persegi tersebut?`,
            options: [
              { key: 'A', text: `$${side * 2}\\text{ cm}$` },
              { key: 'B', text: `$${side * 3}\\text{ cm}$` },
              { key: 'C', text: `$${keliling}\\text{ cm}$` },
              { key: 'D', text: `$${side * side}\\text{ cm}$` },
            ],
            correct_option: 'C',
            explanation: `Keliling persegi = $4 \\times \\text{sisi} = 4 \\times ${side} = ${keliling}\\text{ cm}$.`,
          },
        ]
      } else if (lowerSub.includes('ipas') || lowerSub.includes('ipa') || lowerSub.includes('sains')) {
        generatedQuestions = [
          {
            exam_id: examId,
            question_text: 'Organ pernapasan utama pada manusia yang berfungsi menyerap oksigen adalah...',
            options: [{ key: 'A', text: 'Jantung' }, { key: 'B', text: 'Paru-paru' }, { key: 'C', text: 'Lambung' }, { key: 'D', text: 'Hati' }],
            correct_option: 'B',
            explanation: 'Paru-paru menyerap oksigen dan mengeluarkan karbondioksida.',
          },
          {
            exam_id: examId,
            question_text: 'Tumbuhan hijau membuat makanannya sendiri melalui proses yang disebut...',
            options: [{ key: 'A', text: 'Fotosintesis' }, { key: 'B', text: 'Respirasi' }, { key: 'C', text: 'Adaptasi' }, { key: 'D', text: 'Metamorfosis' }],
            correct_option: 'A',
            explanation: 'Fotosintesis memanfaatkan sinar matahari, air, dan CO2.',
          },
        ]
      } else if (lowerSub.includes('bahasa') || lowerSub.includes('indo') || lowerSub.includes('literasi')) {
        generatedQuestions = [
          {
            exam_id: examId,
            question_text: 'Gagasan utama yang menjadi inti pembahasan dalam sebuah paragraf disebut...',
            options: [{ key: 'A', text: 'Ide pokok' }, { key: 'B', text: 'Kalimat penjelas' }, { key: 'C', text: 'Kesimpulan' }, { key: 'D', text: 'Judul' }],
            correct_option: 'A',
            explanation: 'Ide pokok adalah pikiran utama dalam sebuah paragraf.',
          },
        ]
      } else if (lowerSub.includes('pancasila') || lowerSub.includes('pkn')) {
        generatedQuestions = [
          {
            exam_id: examId,
            question_text: 'Lambang Sila Pertama Pancasila "Ketuhanan Yang Maha Esa" adalah...',
            options: [{ key: 'A', text: 'Rantai Emas' }, { key: 'B', text: 'Bintang Emas' }, { key: 'C', text: 'Pohon Beringin' }, { key: 'D', text: 'Kepala Banteng' }],
            correct_option: 'B',
            explanation: 'Sila pertama dilambangkan Bintang Emas.',
          },
        ]
      } else if (lowerSub.includes('logis') || lowerSub.includes('logika') || lowerSub.includes('coding')) {
        const step = Math.floor(Math.random() * 3) + 2
        generatedQuestions = [
          {
            exam_id: examId,
            question_text: `Perhatikan deret pola berikut: $2, ${2 + step}, ${2 + step * 2}, ...$ Berapakah angka berikutnya?`,
            options: [
              { key: 'A', text: `${2 + step * 3 - 1}` },
              { key: 'B', text: `${2 + step * 3}` },
              { key: 'C', text: `${2 + step * 3 + 2}` },
              { key: 'D', text: `${2 + step * 4}` },
            ],
            correct_option: 'B',
            explanation: `Pola selalu bertambah $+${step}$.`,
          },
        ]
      } else {
        generatedQuestions = [
          {
            exam_id: examId,
            question_text: 'Warna primer yang tidak dapat dibuat dari campuran warna lain adalah...',
            options: [{ key: 'A', text: 'Hijau, Oranye' }, { key: 'B', text: 'Merah, Kuning, Biru' }, { key: 'C', text: 'Hitam, Putih' }, { key: 'D', text: 'Cokelat, Abu' }],
            correct_option: 'B',
            explanation: 'Warna primer terdiri dari Merah, Kuning, dan Biru.',
          },
        ]
      }
    } else if (actType === 'FLASHCARD') {
      generatedQuestions = [
        {
          exam_id: examId,
          question_text: `Kartu Memori Subtes ${subtestName} (#${questions.length + 1})`,
          options: [],
          correct_option: 'A',
          explanation: `Ringkasan konsep penting untuk ${subtestName}.`,
        },
      ]
    } else if (actType === 'MAZE_GAME') {
      const tx = Math.floor(Math.random() * 4)
      const ty = Math.floor(Math.random() * 4)
      generatedQuestions = [
        {
          exam_id: examId,
          question_text: `Misi Labirin SD #${questions.length + 1}: Pandu Robot ke Bintang di koordinat (${tx}, ${ty})!`,
          options: [],
          correct_option: 'FORWARD',
          target_x: tx,
          target_y: ty,
          explanation: 'Kombinasikan blok perintah Maju dan Belok.',
        },
      ]
    }

    const { error: insertErr } = await supabase.from('questions').insert(generatedQuestions)

    if (insertErr) {
      alert(`Gagal generate: ${insertErr.message}`)
    } else {
      alert(`🎉 Berhasil menambahkan ${generatedQuestions.length} soal variasi baru (${subtestName})!`)
      fetchExamAndQuestions()
    }
  }

  // 🟢 3. HANDLER TOMBOL 2: AUTO IMPORT PG DARI BANK SOAL UTAMA
  const handleImportFromBankSoal = async () => {
    const subtestName = exam?.subtest || 'Matematika'
    const confirmImport = confirm(
      `Impor soal PG Standar A-D yang sesuai dengan subtes "${subtestName}" dari Bank Soal lain?\n\n` +
      `➕ Catatan: Soal impor akan DITAMBAHKAN di bagian bawah (tanpa menghapus soal lama).`
    )
    if (!confirmImport) return

    setLoading(true)
    const supabase = createClient()

    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('*, exams(subtest, title)')
      .neq('exam_id', examId)
      .limit(150)

    if (error || !allQuestions || allQuestions.length === 0) {
      alert('Belum ada soal PG dari modul lain di Bank Soal Supabase.')
      setLoading(false)
      return
    }

    const currentSubtest = subtestName.trim().toLowerCase()

    let candidateQuestions = allQuestions.filter((q) => {
      const hasOptions = Array.isArray(q.options) && q.options.length === 4
      const correctOpt = String(q.correct_option || q.correct_answer || '').trim().toUpperCase()
      return hasOptions && ['A', 'B', 'C', 'D'].includes(correctOpt)
    })

    if (candidateQuestions.length === 0) {
      alert('Tidak ditemukan soal PG Standar A-D dari modul lain.')
      setLoading(false)
      return
    }

    const matchedBySubtest = candidateQuestions.filter((q) => {
      const parentSubtest = (q.exams?.subtest || '').trim().toLowerCase()
      return parentSubtest && (parentSubtest.includes(currentSubtest) || currentSubtest.includes(parentSubtest))
    })

    const pool = matchedBySubtest.length > 0 ? matchedBySubtest : candidateQuestions
    const shuffled = [...pool].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 5)

    const questionsToInsert = selected.map((q) => ({
      exam_id: examId,
      question_text: q.question_text,
      options: q.options,
      correct_option: String(q.correct_option || q.correct_answer || 'A').trim().toUpperCase(),
      explanation: q.explanation || q.pembahasan || '',
      image_url: q.image_url || null,
    }))

    const { error: insertErr } = await supabase.from('questions').insert(questionsToInsert)

    if (insertErr) {
      alert(`Gagal impor: ${insertErr.message}`)
    } else {
      alert(`✅ Berhasil mengimpor ${questionsToInsert.length} soal PG Standar (${subtestName}) ke bagian bawah!`)
      fetchExamAndQuestions()
    }
    setLoading(false)
  }

  // 🟢 4. HANDLER TOMBOL 3: IMPORT BULK (TEMPLATE MODAL ADAPTIF)
  const getBulkTemplateSample = () => {
    const actType = exam?.activity_type || 'QUIZ'
    if (actType === 'QUIZ') {
      return JSON.stringify(
        [
          {
            question_text: 'Berapakah hasil dari $15 \\times 3 + 20$?',
            options: [
              { key: 'A', text: '55' },
              { key: 'B', text: '65' },
              { key: 'C', text: '75' },
              { key: 'D', text: '85' },
            ],
            correct_option: 'B',
            explanation: 'Perkalian didahulukan: $15 \\times 3 = 45$, lalu $45 + 20 = 65$.',
          },
          {
            question_text: 'Organ tubuh manusia yang menyerap oksigen adalah...',
            options: [
              { key: 'A', text: 'Jantung' },
              { key: 'B', text: 'Paru-paru' },
              { key: 'C', text: 'Hati' },
              { key: 'D', text: 'Ginjal' },
            ],
            correct_option: 'B',
            explanation: 'Paru-paru adalah organ utama sistem pernapasan.',
          },
        ],
        null,
        2
      )
    } else if (actType === 'FLASHCARD') {
      return JSON.stringify(
        [
          {
            question_text: 'Berapakah Rumus Luas Segitiga?',
            explanation: 'Rumus: $L = \\frac{1}{2} \\times a \\times t$.',
          },
          {
            question_text: 'Berapakah Rumus Keliling Persegi?',
            explanation: 'Rumus: $K = 4 \\times s$.',
          },
        ],
        null,
        2
      )
    } else {
      return JSON.stringify(
        [
          {
            question_text: 'Misi Labirin #1: Arahkan Robot ke Bintang di titik (3, 2)!',
            target_x: 3,
            target_y: 2,
            explanation: 'Petunjuk: Gunakan perintah Maju 3x dan Belok Kanan.',
          },
        ],
        null,
        2
      )
    }
  }

  const handleOpenBulkModal = () => {
    setBulkInputText(getBulkTemplateSample())
    setIsBulkModalOpen(true)
  }

  const handleProcessBulkImport = async () => {
    if (!bulkInputText.trim()) {
      alert('Teks JSON impor massal tidak boleh kosong!')
      return
    }

    try {
      const parsedData = JSON.parse(bulkInputText)
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        alert('Format JSON harus berupa Array daftar soal [...]!')
        return
      }

      const actType = exam?.activity_type || 'QUIZ'
      const questionsToInsert = parsedData.map((item: any, idx: number) => {
        let payload: any = {
          exam_id: examId,
          question_text: item.question_text || `Item #${idx + 1}`,
          explanation: item.explanation || item.pembahasan || '',
          image_url: item.image_url || null,
        }

        if (actType === 'QUIZ') {
          payload.options = Array.isArray(item.options) ? item.options : []
          payload.correct_option = String(item.correct_option || item.correct_answer || 'A').toUpperCase()
        } else if (actType === 'MAZE_GAME') {
          payload.options = []
          payload.correct_option = 'FORWARD'
          payload.target_x = Number(item.target_x ?? 3)
          payload.target_y = Number(item.target_y ?? 3)
        } else if (actType === 'FLASHCARD') {
          payload.options = []
          payload.correct_option = 'A'
        }

        return payload
      })

      const supabase = createClient()
      const { error } = await supabase.from('questions').insert(questionsToInsert)

      if (error) {
        alert(`Gagal Impor Bulk: ${error.message}`)
      } else {
        alert(`🎉 Berhasil mengimpor ${questionsToInsert.length} item baru sekaligus!`)
        setIsBulkModalOpen(false)
        fetchExamAndQuestions()
      }
    } catch (err: any) {
      alert(`⚠️ Format JSON tidak valid! Pastikan tanda petik dan koma sudah benar.\n\nDetail Error: ${err.message}`)
    }
  }

  // 🟢 5. HANDLER TOMBOL 4: TAMBAH / EDIT MANUAL
  const handleOpenModal = (q?: any) => {
    if (q) {
      setEditingQuestion(q)
      const opts = Array.isArray(q.options) ? q.options : []
      const getOptText = (key: string) => {
        const found = opts.find((o: any) => o.key === key || o.label === key)
        return typeof found === 'string' ? found : found?.text || ''
      }

      setFormData({
        question_text: q.question_text || '',
        option_a: getOptText('A') || (typeof opts[0] === 'string' ? opts[0] : opts[0]?.text || ''),
        option_b: getOptText('B') || (typeof opts[1] === 'string' ? opts[1] : opts[1]?.text || ''),
        option_c: getOptText('C') || (typeof opts[2] === 'string' ? opts[2] : opts[2]?.text || ''),
        option_d: getOptText('D') || (typeof opts[3] === 'string' ? opts[3] : opts[3]?.text || ''),
        correct_option: q.correct_option || q.correct_answer || 'A',
        explanation: q.explanation || q.pembahasan || '',
        image_url: q.image_url || '',
        target_x: q.target_x ?? 3,
        target_y: q.target_y ?? 3,
      })
    } else {
      setEditingQuestion(null)
      setFormData({
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_option: 'A',
        explanation: '',
        image_url: '',
        target_x: 3,
        target_y: 3,
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.question_text.trim()) {
      alert('Isi pertanyaan / judul level wajib diisi!')
      return
    }

    const supabase = createClient()
    const actType = exam?.activity_type || 'QUIZ'

    let payload: any = {
      exam_id: examId,
      question_text: formData.question_text,
      explanation: formData.explanation,
      image_url: formData.image_url.trim() || null,
    }

    if (actType === 'QUIZ') {
      payload.options = [
        { key: 'A', text: formData.option_a },
        { key: 'B', text: formData.option_b },
        { key: 'C', text: formData.option_c },
        { key: 'D', text: formData.option_d },
      ]
      payload.correct_option = formData.correct_option
    } else if (actType === 'MAZE_GAME') {
      payload.options = []
      payload.correct_option = 'FORWARD'
      payload.target_x = Number(formData.target_x)
      payload.target_y = Number(formData.target_y)
    } else if (actType === 'FLASHCARD') {
      payload.options = []
      payload.correct_option = 'A'
    }

    if (editingQuestion) {
      const { error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', editingQuestion.id)

      if (error) {
        alert(`Gagal memperbarui: ${error.message}`)
      } else {
        alert('✅ Data berhasil diperbarui!')
        setIsModalOpen(false)
        fetchExamAndQuestions()
      }
    } else {
      const { error } = await supabase.from('questions').insert([payload])

      if (error) {
        alert(`Gagal menyimpan: ${error.message}`)
      } else {
        alert('🎉 Item/Level baru berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchExamAndQuestions()
      }
    }
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus item ini?')) return
    const supabase = createClient()
    const { error } = await supabase.from('questions').delete().eq('id', qId)

    if (error) {
      alert(`Gagal menghapus: ${error.message}`)
    } else {
      setQuestions((prev) => prev.filter((q) => q.id !== qId))
    }
  }

  const actType = exam?.activity_type || 'QUIZ'

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
        <p className="font-semibold text-sm">Memuat Editor Aktivitas...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans select-none">
      {/* HEADER BAR DENGAN 4 TOMBOL AKSI */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/practice"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            ← Kembali ke Kelola Latihan
          </Link>
          <div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-extrabold border uppercase ${
                actType === 'MAZE_GAME'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : actType === 'FLASHCARD'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
              }`}
            >
              {actType === 'MAZE_GAME'
                ? '🌀 LEVEL CODING MAZE'
                : actType === 'FLASHCARD'
                ? '🃏 KARTU FLASHCARD RUMUS'
                : '📝 BANK SOAL QUIZ (PG STANDAR)'}
            </span>
            <h1 className="text-lg font-black mt-0.5">
              {exam?.title} ({questions.length} {actType === 'QUIZ' ? 'Soal' : actType === 'FLASHCARD' ? 'Kartu' : 'Level'})
            </h1>
          </div>
        </div>

        {/* 4 TOMBOL AKSI */}
        <div className="flex flex-wrap items-center gap-2">
          {/* TOMBOL 1 */}
          <button
            onClick={handleAutoGenerateQuestions}
            className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
            title="Tambah Soal Variasi SD di Bagian Bawah"
          >
            <span>⚡ Auto Generate SD</span>
          </button>

          {/* TOMBOL 2 */}
          {actType === 'QUIZ' && (
            <button
              onClick={handleImportFromBankSoal}
              className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
              title="Import Soal PG Standar Sesuai Subtes"
            >
              <span>📥 Auto Import PG</span>
            </button>
          )}

          {/* TOMBOL 3 */}
          <button
            onClick={handleOpenBulkModal}
            className="px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
            title="Impor Massal Format JSON/Template"
          >
            <span>📦 Import Bulk</span>
          </button>

          {/* TOMBOL 4 */}
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-1"
          >
            <span>➕ Tambah Manual</span>
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* RINGKASAN MODUL */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block">Detail Modul Kegiatan:</span>
            <p className="text-white font-bold">
              {exam?.title} — Kategori/Subtes: <span className="text-amber-400">{exam?.subtest || 'Matematika'}</span>
            </p>
          </div>
          <div className="text-right font-mono">
            <span className="px-3 py-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 rounded-xl font-bold">
              Total {questions.length} Item Konten
            </span>
          </div>
        </div>

        {/* DAFTAR ITEM/LEVEL TERSEDIA */}
        {questions.length > 0 ? (
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const correctOpt = String(q.correct_option ?? q.correct_answer ?? '').trim().toUpperCase()

              return (
                <div
                  key={q.id}
                  className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4 relative shadow-md"
                >
                  <div className="flex justify-between items-start gap-4 border-b border-slate-800 pb-3">
                    <span className="font-extrabold text-indigo-400 text-xs font-mono">
                      {actType === 'QUIZ' ? `Soal Pilihan Ganda #${idx + 1}` : actType === 'FLASHCARD' ? `Kartu Memori #${idx + 1}` : `Misi Labirin #${idx + 1}`}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleOpenModal(q)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl border border-rose-500/40 transition-colors"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">
                      {actType === 'FLASHCARD' ? 'Kartu Sisi Depan (Pertanyaan/Rumus)' : 'Deskripsi Soal / Instruksi Misi:'}
                    </span>
                    <div className="text-sm font-semibold text-white leading-relaxed">
                      <MathRenderer content={q.question_text || ''} />
                    </div>
                  </div>

                  {q.image_url && (
                    <img src={q.image_url} alt="Gambar Soal" className="max-h-48 rounded-xl border border-slate-800" />
                  )}

                  {actType === 'QUIZ' && Array.isArray(q.options) && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {q.options.map((opt: any, oIdx: number) => {
                        const optKey = opt.key || String.fromCharCode(65 + oIdx)
                        const isCorrect = optKey === correctOpt

                        return (
                          <div
                            key={optKey || oIdx}
                            className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
                              isCorrect
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200 font-bold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-mono text-[10px] shrink-0 font-bold">
                              {String.fromCharCode(65 + oIdx)}
                            </span>
                            <div className="flex-1">
                              <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} />
                            </div>
                            {isCorrect && <span className="text-[10px] bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded font-black">KUNCI</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {actType === 'FLASHCARD' && (
                    <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 text-xs space-y-1">
                      <span className="font-bold text-amber-300 block">💡 Kartu Sisi Belakang (Pembahasan / Solusi):</span>
                      <div className="text-slate-200 leading-relaxed">
                        <MathRenderer content={q.explanation || q.pembahasan || 'Belum ada penjelasan.'} />
                      </div>
                    </div>
                  )}

                  {actType === 'MAZE_GAME' && (
                    <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-xs space-y-1">
                      <span className="font-bold text-emerald-300 block">🎯 Koordinat Bintang Target:</span>
                      <p className="font-mono text-white">X: {q.target_x ?? 3}, Y: {q.target_y ?? 3}</p>
                    </div>
                  )}

                  {actType === 'QUIZ' && (q.explanation || q.pembahasan) && (
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1">
                      <span className="font-bold text-indigo-300 block">💡 Pembahasan / Solusi:</span>
                      <div className="text-slate-300 leading-relaxed">
                        <MathRenderer content={q.explanation || q.pembahasan} />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
            <p>Belum ada item/level yang tersimpan di dalam modul ini.</p>
            <div className="flex justify-center gap-2">
              <button
                onClick={handleAutoGenerateQuestions}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                ⚡ Auto Generate SD
              </button>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
              >
                ➕ Tambah Item Pertama
              </button>
            </div>
          </div>
        )}
      </main>

      {/* 📦 MODAL IMPORT BULK ADAPTIF */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 space-y-4 text-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>📦</span>
                <span>Import Bulk (Impor Massal Modul: {actType})</span>
              </h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-300 font-semibold">
                  Format JSON Template Sesuai Kegiatan (<span className="text-amber-400">{actType}</span>):
                </span>
                <button
                  type="button"
                  onClick={() => setBulkInputText(getBulkTemplateSample())}
                  className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[11px] font-bold rounded-lg border border-purple-500/30"
                >
                  🔄 Muat ulang Template Sampel
                </button>
              </div>

              <textarea
                rows={12}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-purple-500 leading-relaxed"
                placeholder="Paste kode JSON array di sini..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                🚀 Proses Import Bulk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ MODAL FORM MANUAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-xl w-full rounded-3xl p-6 space-y-4 text-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>⚙️</span>
                <span>
                  {editingQuestion ? 'Edit Data' : 'Tambah Baru'} (Mode:{' '}
                  {actType === 'MAZE_GAME' ? 'Coding Maze' : actType === 'FLASHCARD' ? 'Flashcard' : 'Quiz Standar'})
                </span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {actType === 'QUIZ' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Teks Pertanyaan (Mendukung Formula KaTeX)</label>
                    <textarea
                      rows={3}
                      required
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      placeholder="Contoh: Berapakah hasil dari $25 \times 4 + 50$?"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <span className="block text-xs font-bold text-slate-300">Pilihan Jawaban (Tunggal A-D):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" value={formData.option_a} onChange={(e) => setFormData({ ...formData, option_a: e.target.value })} placeholder="Opsi A" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_b} onChange={(e) => setFormData({ ...formData, option_b: e.target.value })} placeholder="Opsi B" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_c} onChange={(e) => setFormData({ ...formData, option_c: e.target.value })} placeholder="Opsi C" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_d} onChange={(e) => setFormData({ ...formData, option_d: e.target.value })} placeholder="Opsi D" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Kunci Jawaban Benar (Pilihan Tunggal)</label>
                    <select value={formData.correct_option} onChange={(e) => setFormData({ ...formData, correct_option: e.target.value })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                      <option value="A">Pilihan A</option>
                      <option value="B">Pilihan B</option>
                      <option value="C">Pilihan C</option>
                      <option value="D">Pilihan D</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Pembahasan / Solusi</label>
                    <textarea rows={2} value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} placeholder="Pembahasan langkah demi langkah..." className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                  </div>
                </>
              )}

              {actType === 'FLASHCARD' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sisi Depan Kartu (Pertanyaan / Rumus)</label>
                    <textarea
                      rows={3}
                      required
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      placeholder="Contoh: Berapakah Rumus Luas Lingkaran?"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sisi Belakang Kartu (Jawaban & Rumus Lengkap)</label>
                    <textarea
                      rows={3}
                      required
                      value={formData.explanation}
                      onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                      placeholder="Contoh: $L = \pi \times r^2$ (dengan $\pi = 3.14$ atau $22/7$)."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </>
              )}

              {actType === 'MAZE_GAME' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Instruksi Misi Labirin</label>
                    <textarea
                      rows={2}
                      required
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      placeholder="Contoh: Bantu Robot Maskot mencapai Bintang di titik (3, 3) pada Papan Grid!"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Koordinat Target X (0 - 3)</label>
                      <input type="number" min={0} max={3} value={formData.target_x} onChange={(e) => setFormData({ ...formData, target_x: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Koordinat Target Y (0 - 3)</label>
                      <input type="number" min={0} max={3} value={formData.target_y} onChange={(e) => setFormData({ ...formData, target_y: Number(e.target.value) })} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Petunjuk Perintah (Hint)</label>
                    <textarea rows={2} value={formData.explanation} onChange={(e) => setFormData({ ...formData, explanation: e.target.value })} placeholder="Gunakan perintah Maju 3x dan Belok Kanan..." className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">URL Gambar Tambahan (Opsional)</label>
                <input
                  type="text"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  💾 Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BankSoalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
          <p className="font-semibold text-sm">Memuat Editor Aktivitas...</p>
        </div>
      }
    >
      <BankSoalContent />
    </Suspense>
  )
}