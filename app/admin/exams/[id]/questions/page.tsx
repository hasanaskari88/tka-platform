'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import MathRenderer from '@/components/MathRenderer'
import RichTextEditor from '@/components/editor/RichTextEditor'
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
  const [isQuickEditOpen, setIsQuickEditOpen] = useState(false)
  const [quickEditQuestion, setQuickEditQuestion] = useState<any>(null)
  const [quickEditData, setQuickEditData] = useState<any>(null)
  const [quickEditSaving, setQuickEditSaving] = useState(false)
  const [isPaperPreviewOpen, setIsPaperPreviewOpen] = useState(false)
  const [paperSettings, setPaperSettings] = useState({
    schoolName: 'SD NEGERI GETASAN',
    schoolAddress: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang (50774)',
    title: '',
    instructions: 'Bacalah setiap soal dengan teliti. Pilih atau tuliskan jawaban yang paling tepat.',
    orientation: 'portrait',
    includeAnswerKey: false,
    includeExplanations: false,
  })

  // State Modal Import Bulk
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [bulkInputText, setBulkInputText] = useState('')

  // State pemilih soal dari paket lain
  const [isBankImportModalOpen, setIsBankImportModalOpen] = useState(false)
  const [importSourceExams, setImportSourceExams] = useState<any[]>([])
  const [selectedImportExamId, setSelectedImportExamId] = useState('')
  const [importCandidateQuestions, setImportCandidateQuestions] = useState<any[]>([])
  const [selectedImportQuestionIds, setSelectedImportQuestionIds] = useState<string[]>([])
  const [importSearchTerm, setImportSearchTerm] = useState('')
  const [loadingImportSources, setLoadingImportSources] = useState(false)
  const [loadingImportQuestions, setLoadingImportQuestions] = useState(false)
  const [importingSelectedQuestions, setImportingSelectedQuestions] = useState(false)

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

  // 🟢 3. IMPORT TERPILIH: PILIH PAKET SUMBER, PRATINJAU, DAN PILIH SOAL
  const normalizeQuestionText = (value: string) =>
    String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

  const handleOpenBankImport = async () => {
    setIsBankImportModalOpen(true)
    setImportSearchTerm('')
    setSelectedImportExamId('')
    setImportCandidateQuestions([])
    setSelectedImportQuestionIds([])
    setLoadingImportSources(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('id,title,subtest,target_mode,activity_type')
      .neq('id', examId)
      .order('created_at', { ascending: false })

    if (error) {
      alert(`Gagal memuat paket sumber: ${error.message}`)
      setImportSourceExams([])
    } else {
      const currentIsPractice = exam?.target_mode === 'PRACTICE_ONLY'
      const compatible = (data || []).filter((item: any) => {
        const isQuiz = !item.activity_type || item.activity_type === 'QUIZ'
        const sameSystem = currentIsPractice
          ? item.target_mode === 'PRACTICE_ONLY'
          : item.target_mode !== 'PRACTICE_ONLY'
        return isQuiz && sameSystem
      })
      setImportSourceExams(compatible)
    }
    setLoadingImportSources(false)
  }

  const handleSelectImportSource = async (sourceExamId: string) => {
    setSelectedImportExamId(sourceExamId)
    setSelectedImportQuestionIds([])
    setImportCandidateQuestions([])
    if (!sourceExamId) return

    setLoadingImportQuestions(true)
    const supabase = createClient()
    const collected: any[] = []
    const pageSize = 500
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('exam_id', sourceExamId)
        .order('created_at', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) {
        alert(`Gagal memuat soal sumber: ${error.message}`)
        setLoadingImportQuestions(false)
        return
      }
      collected.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
    setImportCandidateQuestions(collected)
    setLoadingImportQuestions(false)
  }

  const handleImportSelectedQuestions = async () => {
    const selected = importCandidateQuestions.filter((question) => selectedImportQuestionIds.includes(question.id))
    if (selected.length === 0) {
      alert('Pilih minimal satu soal yang akan diimpor.')
      return
    }

    const existingTexts = new Set(questions.map((question) => normalizeQuestionText(question.question_text)))
    const duplicateCount = selected.filter((question) => existingTexts.has(normalizeQuestionText(question.question_text))).length
    const toInsert = selected.filter((question) => !existingTexts.has(normalizeQuestionText(question.question_text)))

    if (toInsert.length === 0) {
      alert('Semua soal yang dipilih sudah terdeteksi ada di paket tujuan. Tidak ada soal yang ditambahkan.')
      return
    }

    const confirmation = confirm(
      `Impor ${toInsert.length} soal terpilih ke paket ini?\\n` +
      (duplicateCount > 0 ? `${duplicateCount} soal yang terdeteksi duplikat akan dilewati.\\n` : '') +
      'Soal lama tidak dihapus. Setiap soal baru akan memiliki ID sendiri.'
    )
    if (!confirmation) return

    setImportingSelectedQuestions(true)
    const supabase = createClient()
    const questionColumns = [
      'question_text', 'image_url', 'options', 'correct_option', 'explanation', 'difficulty',
      'question_type', 'max_score', 'correct_answers', 'indicator', 'cognitive_level',
      'target_x', 'target_y', 'maze_width', 'maze_height', 'start_x', 'start_y',
      'obstacles', 'answer_mode', 'correct_answer',
    ]
    const rows = toInsert.map((question) => {
      const copy: Record<string, any> = { exam_id: examId }
      questionColumns.forEach((column) => { copy[column] = question[column] })
      return copy
    })

    const { error } = await supabase.from('questions').insert(rows)
    if (error) {
      alert(`Gagal mengimpor soal: ${error.message}`)
    } else {
      alert(`Berhasil mengimpor ${rows.length} soal. ${duplicateCount} soal duplikat dilewati.`)
      setIsBankImportModalOpen(false)
      setSelectedImportQuestionIds([])
      await fetchExamAndQuestions()
    }
    setImportingSelectedQuestions(false)
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

  // Quick Edit: hanya memperbarui kolom yang ditampilkan; kolom khusus lain tetap utuh.
  const handleOpenQuickEdit = (question: any) => {
    const options = Array.isArray(question.options) ? JSON.parse(JSON.stringify(question.options)) : []
    const type = question.question_type || 'multiple_choice'
    const correctAnswers = question.correct_answers
    const selectedKeys = Array.isArray(correctAnswers)
      ? correctAnswers.map(String)
      : String(question.correct_option || '').split(',').map((value: string) => value.trim()).filter(Boolean)

    setQuickEditQuestion(question)
    setQuickEditData({
      question_text: question.question_text || '',
      image_url: question.image_url || '',
      options,
      correct_option: question.correct_option || 'A',
      selected_keys: selectedKeys,
      matrix_answers: correctAnswers && !Array.isArray(correctAnswers) ? { ...correctAnswers } : {},
      explanation: question.explanation || '',
      max_score: question.max_score ?? 1,
      indicator: question.indicator || '',
      cognitive_level: question.cognitive_level || 'MOTS',
      question_type: type,
    })
    setIsQuickEditOpen(true)
  }

  const handleSaveQuickEdit = async () => {
    if (!quickEditQuestion || !quickEditData || quickEditSaving) return
    const plainText = String(quickEditData.question_text || '').replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;/g, ' ').trim()
    if (!plainText && !/<img\b/i.test(quickEditData.question_text || '')) {
      alert('Teks pertanyaan wajib diisi.')
      return
    }
    const score = Number(quickEditData.max_score)
    if (!Number.isFinite(score) || score <= 0) {
      alert('Skor maksimum harus berupa angka lebih dari 0.')
      return
    }

    const type = quickEditData.question_type
    const payload: any = {
      question_text: quickEditData.question_text,
      image_url: String(quickEditData.image_url || '').trim() || null,
      explanation: quickEditData.explanation || null,
      max_score: score,
      indicator: String(quickEditData.indicator || '').trim() || null,
      cognitive_level: quickEditData.cognitive_level || 'MOTS',
    }

    if (['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(type)) {
      payload.options = quickEditData.options
    }
    if (type === 'multiple_choice') {
      payload.correct_option = quickEditData.correct_option
      payload.correct_answers = [quickEditData.correct_option]
    } else if (type === 'complex_multiple_choice') {
      const keys = quickEditData.selected_keys || []
      if (keys.length === 0) {
        alert('Pilih minimal satu kunci jawaban benar.')
        return
      }
      payload.correct_option = keys.join(',')
      payload.correct_answers = keys
    } else if (type === 'true_false_matrix') {
      const answers = quickEditData.matrix_answers || {}
      const missing = quickEditData.options.filter((option: any, index: number) => !answers[String(option.id ?? index + 1)])
      if (missing.length > 0) {
        alert('Tentukan Benar atau Salah untuk setiap pernyataan pada matriks.')
        return
      }
      payload.correct_answers = answers
      payload.correct_option = 'MATRIX'
    }

    setQuickEditSaving(true)
    try {
      const supabase = createClient()
      const { count, error: countError } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', quickEditQuestion.id)
      if (countError) throw new Error(`Tidak dapat memeriksa riwayat jawaban: ${countError.message}`)
      if ((count || 0) > 0) {
        const proceed = confirm(
          `Soal ini sudah memiliki ${count} jawaban siswa.\\n\\n` +
          'Perubahan isi, kunci, atau skor tidak menghapus jawaban dan nilai tersimpan, tetapi dapat memengaruhi penilaian jika jawaban dihitung ulang di kemudian hari. Lanjutkan?'
        )
        if (!proceed) return
      }

      const { error } = await supabase
        .from('questions')
        .update(payload)
        .eq('id', quickEditQuestion.id)
        .eq('exam_id', examId)
      if (error) throw new Error(`Gagal menyimpan Quick Edit: ${error.message}`)

      alert('Quick Edit berhasil disimpan. Jawaban dan nilai historis tidak diubah.')
      setIsQuickEditOpen(false)
      setQuickEditQuestion(null)
      setQuickEditData(null)
      await fetchExamAndQuestions()
    } catch (error: any) {
      alert(error?.message || 'Terjadi kesalahan saat menyimpan Quick Edit.')
    } finally {
      setQuickEditSaving(false)
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
    const questionPlainText = formData.question_text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/g, ' ')
      .trim()
    const questionHasImage = /<img\b/i.test(formData.question_text)

    if (!questionPlainText && !questionHasImage) {
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
              onClick={handleOpenBankImport}
              className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1"
              title="Import Soal PG Standar Sesuai Subtes"
            >
              <span>📥 Pilih & Impor Soal</span>
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
          {actType === 'QUIZ' && questions.length > 0 && (
            <button
              type="button"
              onClick={() => { setPaperSettings((current) => ({ ...current, title: exam?.title || 'Naskah Soal' })); setIsPaperPreviewOpen(true) }}
              className="px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-200 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
            >
              🖨️ Cetak / PDF
            </button>
          )}
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
                      {actType === 'QUIZ' && (
                        <button
                          type="button"
                          onClick={() => handleOpenQuickEdit(q)}
                          className="px-3 py-1 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200 text-xs font-bold rounded-xl border border-cyan-500/30 transition-colors"
                        >
                          ⚡ Quick Edit
                        </button>
                      )}
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
                      <MathRenderer content={q.question_text || ''} className="flow-root" normalizeRotatedImages />
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
                              <MathRenderer content={typeof opt === 'string' ? opt : (opt.text || opt.title || '')} className="flow-root" normalizeRotatedImages />
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
                        <MathRenderer content={q.explanation || q.pembahasan || 'Belum ada penjelasan.'} className="flow-root" normalizeRotatedImages />
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
                        <MathRenderer content={q.explanation || q.pembahasan} className="flow-root" normalizeRotatedImages />
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

      {/* 📥 MODAL PILIH & IMPOR SOAL DARI PAKET LAIN */}
      {isBankImportModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-950 border border-slate-800 max-w-4xl w-full rounded-3xl p-5 sm:p-6 space-y-4 text-white shadow-2xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-3">
              <div>
                <h2 className="text-sm font-black">📥 Pilih Soal dari Paket Lain</h2>
                <p className="text-[11px] text-slate-400 mt-1">Pilih paket sumber, periksa pratinjau, lalu centang soal yang ingin ditambahkan.</p>
              </div>
              <button type="button" onClick={() => setIsBankImportModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Paket sumber</label>
                <select value={selectedImportExamId} onChange={(e) => handleSelectImportSource(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  <option value="">Pilih paket sumber…</option>
                  {importSourceExams.map((source) => (
                    <option key={source.id} value={source.id}>{source.title} — {source.subtest || 'Tanpa subtes'}</option>
                  ))}
                </select>
                {loadingImportSources && <p className="text-[11px] text-slate-400 mt-1">Memuat daftar paket…</p>}
                {!loadingImportSources && importSourceExams.length === 0 && <p className="text-[11px] text-amber-300 mt-1">Tidak ada paket Quiz yang sesuai untuk sistem ini.</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Cari soal dalam paket</label>
                <input value={importSearchTerm} onChange={(e) => setImportSearchTerm(e.target.value)} placeholder="Cari teks pertanyaan…" className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{importCandidateQuestions.length} soal tersedia</span>
              <span>{selectedImportQuestionIds.length} dipilih</span>
            </div>

            <div className="overflow-y-auto min-h-0 flex-1 space-y-2 pr-1">
              {loadingImportQuestions ? (
                <p className="text-center text-xs text-slate-400 py-8">Memuat soal dari paket sumber…</p>
              ) : !selectedImportExamId ? (
                <p className="text-center text-xs text-slate-500 py-8">Pilih paket sumber untuk melihat soal.</p>
              ) : importCandidateQuestions.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-8">Paket sumber belum memiliki soal.</p>
              ) : importCandidateQuestions
                .filter((question) => normalizeQuestionText(question.question_text).includes(importSearchTerm.trim().toLowerCase()))
                .map((question, index) => {
                  const isDuplicate = questions.some((current) => normalizeQuestionText(current.question_text) === normalizeQuestionText(question.question_text))
                  const isChecked = selectedImportQuestionIds.includes(question.id)
                  return (
                    <label key={question.id} className={`block p-3 rounded-xl border ${isDuplicate ? 'border-amber-900/70 bg-amber-950/20 opacity-80' : isChecked ? 'border-cyan-500/60 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/70'} cursor-pointer`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={isChecked} disabled={isDuplicate || importingSelectedQuestions} onChange={(e) => setSelectedImportQuestionIds((current) => e.target.checked ? [...current, question.id] : current.filter((id) => id !== question.id))} className="mt-1 accent-cyan-500" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                            <span className="text-cyan-300">Soal #{index + 1}</span>
                            <span className="text-slate-400">{question.question_type || 'multiple_choice'}</span>
                            {isDuplicate && <span className="text-amber-300">Sudah ada di paket tujuan</span>}
                            {!isDuplicate && <span className="text-emerald-300">Siap diimpor</span>}
                          </div>
                          <div className="text-xs text-slate-100 leading-relaxed"><MathRenderer content={question.question_text || '(Pertanyaan kosong)'} className="flow-root" normalizeRotatedImages /></div>
                          {question.image_url && <img src={question.image_url} alt="Pratinjau gambar soal" className="max-h-24 max-w-full rounded-lg border border-slate-700 object-contain" />}
                          {Array.isArray(question.options) && question.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                              {question.options.map((option: any, optionIndex: number) => (
                                <div key={option.key || optionIndex} className="text-[10px] text-slate-400 truncate">{option.key || String.fromCharCode(65 + optionIndex)}. {typeof option === 'string' ? option : option.text || option.title || ''}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </label>
                  )
                })}
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">Soal yang terdeteksi sama berdasarkan teks pertanyaan tidak dapat dipilih ulang.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsBankImportModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Batal</button>
                <button type="button" onClick={handleImportSelectedQuestions} disabled={importingSelectedQuestions || selectedImportQuestionIds.length === 0} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl">{importingSelectedQuestions ? 'Mengimpor…' : `Impor ${selectedImportQuestionIds.length} Soal`}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🖨️ PRATINJAU NASKAH SOAL DAN CETAK / SIMPAN PDF */}
      {isPaperPreviewOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <style jsx global>{`
            @page { size: A4 ${paperSettings.orientation}; margin: 15mm; }
            @media print {
              html, body { background: #fff !important; }
              body * { visibility: hidden !important; }
              #question-paper-print-area, #question-paper-print-area * { visibility: visible !important; }
              #question-paper-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; background: #fff !important; color: #111 !important; box-shadow: none !important; }
              .question-paper-no-print { display: none !important; }
              .question-paper-item { break-inside: avoid; page-break-inside: avoid; }
              .question-paper-option { break-inside: avoid; page-break-inside: avoid; }
            }
          `}</style>
          <div className="w-full max-w-7xl max-h-[96vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row">
            <div className="question-paper-no-print w-full lg:w-80 shrink-0 p-4 sm:p-5 border-b lg:border-b-0 lg:border-r border-slate-700 space-y-3 overflow-y-auto">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-black text-white">Pengaturan Naskah Soal</h2>
                <button type="button" onClick={() => setIsPaperPreviewOpen(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama sekolah</label>
                <input value={paperSettings.schoolName} onChange={(e) => setPaperSettings((current) => ({ ...current, schoolName: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Alamat sekolah</label>
                <textarea value={paperSettings.schoolAddress} onChange={(e) => setPaperSettings((current) => ({ ...current, schoolAddress: e.target.value }))} rows={2} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Judul naskah</label>
                <input value={paperSettings.title} onChange={(e) => setPaperSettings((current) => ({ ...current, title: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Petunjuk pengerjaan</label>
                <textarea value={paperSettings.instructions} onChange={(e) => setPaperSettings((current) => ({ ...current, instructions: e.target.value }))} rows={3} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Orientasi kertas</label>
                <select value={paperSettings.orientation} onChange={(e) => setPaperSettings((current) => ({ ...current, orientation: e.target.value }))} className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white">
                  <option value="portrait">Potret</option><option value="landscape">Lanskap</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={paperSettings.includeAnswerKey} onChange={(e) => setPaperSettings((current) => ({ ...current, includeAnswerKey: e.target.checked, includeExplanations: e.target.checked ? current.includeExplanations : false }))} className="accent-emerald-500" /> Sertakan kunci jawaban (naskah guru)</label>
              {paperSettings.includeAnswerKey && <label className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={paperSettings.includeExplanations} onChange={(e) => setPaperSettings((current) => ({ ...current, includeExplanations: e.target.checked }))} className="accent-emerald-500" /> Sertakan pembahasan</label>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIsPaperPreviewOpen(false)} className="flex-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold">Tutup</button>
                <button type="button" onClick={() => window.print()} className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Cetak / Simpan PDF</button>
              </div>
              <p className="text-[10px] text-slate-500">Pada dialog cetak perangkat, pilih “Simpan sebagai PDF” untuk menyimpan berkas PDF.</p>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-700 p-3 sm:p-5">
              <article id="question-paper-print-area" className="max-w-[210mm] mx-auto bg-white text-slate-900 shadow-xl p-8 sm:p-10 font-serif text-[11pt] leading-relaxed">
                <header className="text-center border-b-2 border-slate-900 pb-3 mb-5">
                  <h2 className="font-black text-base uppercase tracking-wide">{paperSettings.schoolName || 'Nama Sekolah'}</h2>
                  {paperSettings.schoolAddress && <p className="text-[9pt]">{paperSettings.schoolAddress}</p>}
                  <div className="border-t border-slate-400 mt-3 pt-3">
                    <h1 className="font-black text-lg uppercase">{paperSettings.title || exam?.title}</h1>
                    <p className="text-[10pt]">{exam?.subtest || 'Mata Pelajaran'} · {questions.length} Soal · Waktu {exam?.duration_minutes || '—'} menit</p>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10pt] mb-4">
                  <div>Nama: ................................................................................</div><div>Kelas: ....................................</div>
                  <div>Nomor: ............................................................</div><div>Tanggal: ..................................</div>
                </div>
                <div className="border border-slate-400 p-3 mb-5 text-[10pt]">
                  <strong>Petunjuk:</strong> {paperSettings.instructions}
                </div>

                <div className="space-y-4">
                  {questions.map((question, index) => {
                    const type = question.question_type || 'multiple_choice'
                    const options = Array.isArray(question.options) ? question.options : []
                    const correctAnswers = question.correct_answers
                    const answerLabel = type === 'true_false_matrix'
                      ? (correctAnswers && typeof correctAnswers === 'object' ? Object.entries(correctAnswers).map(([key, value]) => `${key}: ${value}`).join('; ') : '')
                      : Array.isArray(correctAnswers) ? correctAnswers.join(', ') : String(question.correct_option || '')
                    return (
                      <section key={question.id} className="question-paper-item text-[10.5pt]">
                        <div className="flex gap-2">
                          <strong className="shrink-0">{index + 1}.</strong>
                          <div className="min-w-0 flex-1">
                            <MathRenderer content={question.question_text || ''} className="flow-root" normalizeRotatedImages />
                            {question.image_url && <img src={question.image_url} alt="Ilustrasi soal" className="max-h-52 max-w-full object-contain my-2" />}
                            {options.length > 0 && type !== 'true_false_matrix' && (
                              <div className="mt-2 ml-1 space-y-1">
                                {options.map((option: any, optionIndex: number) => {
                                  const key = String(option.key ?? String.fromCharCode(65 + optionIndex))
                                  const value = typeof option === 'string' ? option : option.text || option.title || ''
                                  return <div key={key} className="question-paper-option flex gap-2"><span className="shrink-0">{key}.</span><div className="min-w-0"><MathRenderer content={value} className="flow-root" normalizeRotatedImages /></div></div>
                                })}
                              </div>
                            )}
                            {type === 'true_false_matrix' && (
                              <table className="w-full border-collapse border border-slate-500 mt-2 text-[9.5pt]"><tbody>
                                {options.map((option: any, optionIndex: number) => <tr key={String(option.id ?? optionIndex)}><td className="border border-slate-500 p-2">{option.text || ''}</td><td className="border border-slate-500 p-2 w-16 text-center">Benar</td><td className="border border-slate-500 p-2 w-16 text-center">Salah</td></tr>)}
                              </tbody></table>
                            )}
                            {type === 'essay' && <div className="mt-2 space-y-5"><div className="border-b border-slate-400" /><div className="border-b border-slate-400" /><div className="border-b border-slate-400" /></div>}
                            {paperSettings.includeAnswerKey && (
                              <div className="mt-2 text-[9pt] text-slate-700"><strong>Kunci:</strong> {answerLabel || 'Belum diisi'}{paperSettings.includeExplanations && question.explanation && <div className="mt-1"><strong>Pembahasan:</strong> <MathRenderer content={question.explanation} className="flow-root" normalizeRotatedImages /></div>}</div>
                            )}
                          </div>
                        </div>
                      </section>
                    )
                  })}
                </div>
                <footer className="mt-8 pt-3 border-t border-slate-400 text-center text-[8pt] text-slate-500">{paperSettings.schoolName} · {exam?.title}</footer>
              </article>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ QUICK EDIT: UPDATE TERBATAS, MENJAGA KOLOM LAIN */}
      {isQuickEditOpen && quickEditData && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 z-[65]">
          <div className="bg-slate-950 border border-cyan-900/60 max-w-3xl w-full rounded-3xl p-5 sm:p-6 space-y-4 text-white shadow-2xl max-h-[94vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-black text-cyan-200">⚡ Quick Edit Soal</h2>
                <p className="text-[11px] text-slate-400 mt-1">Mengubah bagian terpilih tanpa mengganti kolom khusus atau menghapus riwayat jawaban.</p>
              </div>
              <button type="button" disabled={quickEditSaving} onClick={() => setIsQuickEditOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-2">Teks pertanyaan</label>
                <RichTextEditor content={quickEditData.question_text} onChange={(html) => setQuickEditData((current: any) => ({ ...current, question_text: html }))} placeholder="Perbaiki teks pertanyaan…" minHeight={130} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">URL gambar tambahan</label>
                <input value={quickEditData.image_url} onChange={(e) => setQuickEditData((current: any) => ({ ...current, image_url: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" placeholder="https://…" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Skor maksimum</label>
                <input type="number" min="0.01" step="0.01" value={quickEditData.max_score} onChange={(e) => setQuickEditData((current: any) => ({ ...current, max_score: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Indikator soal</label>
                <input value={quickEditData.indicator} onChange={(e) => setQuickEditData((current: any) => ({ ...current, indicator: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" placeholder="Indikator pembelajaran…" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Level kognitif</label>
                <select value={quickEditData.cognitive_level} onChange={(e) => setQuickEditData((current: any) => ({ ...current, cognitive_level: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  {['LOTS', 'MOTS', 'HOTS', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
            </div>

            {['multiple_choice', 'complex_multiple_choice', 'true_false_matrix'].includes(quickEditData.question_type) && (
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <h3 className="text-xs font-bold text-slate-200">Pilihan / pernyataan</h3>
                {quickEditData.options.map((option: any, index: number) => {
                  const key = String(option.key ?? option.id ?? String.fromCharCode(65 + index))
                  const label = option.text ?? option.title ?? (typeof option === 'string' ? option : '')
                  return (
                    <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
                      <div className="text-[10px] font-bold text-cyan-300">{quickEditData.question_type === 'true_false_matrix' ? `Pernyataan ${key}` : `Pilihan ${key}`}</div>
                      <RichTextEditor content={label} onChange={(html) => setQuickEditData((current: any) => ({ ...current, options: current.options.map((item: any, itemIndex: number) => itemIndex === index ? (typeof item === 'string' ? html : { ...item, text: html }) : item) }))} minHeight={75} placeholder="Isi pilihan/pernyataan…" />
                      {quickEditData.question_type === 'true_false_matrix' && (
                        <select value={quickEditData.matrix_answers[key] || ''} onChange={(e) => setQuickEditData((current: any) => ({ ...current, matrix_answers: { ...current.matrix_answers, [key]: e.target.value } }))} className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white">
                          <option value="">Pilih kunci…</option><option value="Benar">Benar</option><option value="Salah">Salah</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {quickEditData.question_type === 'multiple_choice' && (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kunci jawaban</label>
                <select value={quickEditData.correct_option} onChange={(e) => setQuickEditData((current: any) => ({ ...current, correct_option: e.target.value }))} className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                  {quickEditData.options.map((option: any, index: number) => {
                    const key = String(option.key ?? String.fromCharCode(65 + index))
                    return <option key={key} value={key}>Pilihan {key}</option>
                  })}
                </select>
              </div>
            )}
            {quickEditData.question_type === 'complex_multiple_choice' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">Kunci jawaban (boleh lebih dari satu)</label>
                <div className="flex flex-wrap gap-3">
                  {quickEditData.options.map((option: any, index: number) => {
                    const key = String(option.key ?? String.fromCharCode(65 + index))
                    return <label key={key} className="flex items-center gap-2 text-xs text-slate-200"><input type="checkbox" checked={quickEditData.selected_keys.includes(key)} onChange={(e) => setQuickEditData((current: any) => ({ ...current, selected_keys: e.target.checked ? [...current.selected_keys, key] : current.selected_keys.filter((item: string) => item !== key) }))} className="accent-cyan-500" />{key}</label>
                  })}
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 pt-3">
              <label className="block text-xs font-bold text-slate-300 mb-2">Pembahasan / penjelasan</label>
              <RichTextEditor content={quickEditData.explanation} onChange={(html) => setQuickEditData((current: any) => ({ ...current, explanation: html }))} placeholder="Perbaiki pembahasan…" minHeight={110} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
              <p className="text-[10px] text-slate-500">Riwayat jawaban dan nilai tidak dihapus atau dihitung ulang otomatis.</p>
              <div className="flex gap-2">
                <button type="button" disabled={quickEditSaving} onClick={() => setIsQuickEditOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl">Batal</button>
                <button type="button" disabled={quickEditSaving} onClick={handleSaveQuickEdit} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl">{quickEditSaving ? 'Menyimpan…' : 'Simpan Quick Edit'}</button>
              </div>
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
                    <label className="block text-xs font-bold text-slate-300 mb-2">Teks Pertanyaan</label>
                    <RichTextEditor
                      content={formData.question_text}
                      onChange={(html) => setFormData({ ...formData, question_text: html })}
                      placeholder="Tuliskan pertanyaan. Gunakan toolbar untuk rumus, gambar, format teks, Arab, dan Aksara Jawa."
                      minHeight={150}
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <span className="block text-xs font-bold text-slate-300">Pilihan Jawaban (Tunggal A-D):</span>
                    <div className="grid grid-cols-1 gap-3">
                      <div><label className="block text-xs text-slate-400 mb-1">Pilihan A</label><RichTextEditor content={formData.option_a} onChange={(html) => setFormData({ ...formData, option_a: html })} placeholder="Isi pilihan A..." minHeight={100} /></div>
                      <div><label className="block text-xs text-slate-400 mb-1">Pilihan B</label><RichTextEditor content={formData.option_b} onChange={(html) => setFormData({ ...formData, option_b: html })} placeholder="Isi pilihan B..." minHeight={100} /></div>
                      <div><label className="block text-xs text-slate-400 mb-1">Pilihan C</label><RichTextEditor content={formData.option_c} onChange={(html) => setFormData({ ...formData, option_c: html })} placeholder="Isi pilihan C..." minHeight={100} /></div>
                      <div><label className="block text-xs text-slate-400 mb-1">Pilihan D</label><RichTextEditor content={formData.option_d} onChange={(html) => setFormData({ ...formData, option_d: html })} placeholder="Isi pilihan D..." minHeight={100} /></div>
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
                    <RichTextEditor content={formData.explanation} onChange={(html) => setFormData({ ...formData, explanation: html })} placeholder="Tuliskan pembahasan langkah demi langkah..." minHeight={130} />
                  </div>
                </>
              )}

              {actType === 'FLASHCARD' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sisi Depan Kartu (Pertanyaan / Rumus)</label>
                    <RichTextEditor content={formData.question_text} onChange={(html) => setFormData({ ...formData, question_text: html })} placeholder="Tuliskan sisi depan kartu..." minHeight={150} />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Sisi Belakang Kartu (Jawaban & Rumus Lengkap)</label>
                    <RichTextEditor content={formData.explanation} onChange={(html) => setFormData({ ...formData, explanation: html })} placeholder="Tuliskan jawaban, rumus, atau penjelasan..." minHeight={150} />
                  </div>
                </>
              )}

              {actType === 'MAZE_GAME' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Instruksi Misi Labirin</label>
                    <RichTextEditor content={formData.question_text} onChange={(html) => setFormData({ ...formData, question_text: html })} placeholder="Tuliskan instruksi misi..." minHeight={130} />
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
                    <RichTextEditor content={formData.explanation} onChange={(html) => setFormData({ ...formData, explanation: html })} placeholder="Tuliskan petunjuk perintah..." minHeight={120} />
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