'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function AdminPracticeContent() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')

  // State Modal Edit / Tambah Modul
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtest: 'Matematika',
    description: '',
    target_mode: 'PRACTICE_ONLY', // 'CBT_ONLY' | 'PRACTICE_ONLY' | 'BOTH'
    activity_type: 'QUIZ', // 'QUIZ' | 'MAZE_GAME' | 'FLASHCARD'
    is_published: true,
  })

  // State Modal Import Bulk
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [activeExamForBulk, setActiveExamForBulk] = useState<any>(null)
  const [bulkInputText, setBulkInputText] = useState('')

  // 🟢 1. FETCH SEMUA PAKET LATIHAN / GAME
  const fetchExams = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setExams(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExams()
  }, [])

  // 🟢 2. HANDLER AUTO GENERATOR DINAMIS (MEMBANGKITKAN SOAL VARIASI SD SESUAI SUBTES - APPEND)
  const handleAutoGenerateQuestions = async (exam: any) => {
    const actType = exam.activity_type || 'QUIZ'
    const subtestName = exam.subtest || 'Matematika'

    const confirmGen = confirm(
      `Tambahkan soal otomatis dinamis ke "${exam.title}"?\n\n` +
      `Subtes Baku: ${subtestName}\n` +
      `Bentuk Kegiatan: ${actType}\n` +
      `Tingkat: Sekolah Dasar (SD)\n\n` +
      `➕ Catatan: Soal variasi baru akan DITAMBAHKAN di bagian bawah (tanpa menghapus soal lama).`
    )
    if (!confirmGen) return

    const supabase = createClient()
    let generatedQuestions: any[] = []

    if (actType === 'QUIZ') {
      const lowerSub = subtestName.toLowerCase()

      // A. MATEMATIKA / NUMERASI
      if (lowerSub.includes('matematika') || lowerSub.includes('hitung') || lowerSub.includes('numerasi')) {
        const n1 = Math.floor(Math.random() * 20) + 10
        const n2 = Math.floor(Math.random() * 8) + 2
        const n3 = Math.floor(Math.random() * 40) + 10
        const ans = n1 * n2 + n3
        const side = Math.floor(Math.random() * 10) + 4
        const keliling = 4 * side

        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: `Berapakah hasil dari $${n1} \\times ${n2} + ${n3}$?`,
            options: [
              { key: 'A', text: `${ans - 10}` },
              { key: 'B', text: `${ans}` },
              { key: 'C', text: `${ans + 10}` },
              { key: 'D', text: `${ans + 15}` },
            ],
            correct_option: 'B',
            question_type: 'multiple_choice',
            explanation: `Perkalian didahulukan: $${n1} \\times ${n2} = ${n1 * n2}$, lalu ditambahkan $${n3} = ${ans}$.`,
          },
          {
            exam_id: exam.id,
            question_text: `Sebuah persegi memiliki panjang sisi $${side}\\text{ cm}$. Berapakah kelilingnya?`,
            options: [
              { key: 'A', text: `$${side * 2}\\text{ cm}$` },
              { key: 'B', text: `$${side * 3}\\text{ cm}$` },
              { key: 'C', text: `$${keliling}\\text{ cm}$` },
              { key: 'D', text: `$${side * side}\\text{ cm}$` },
            ],
            correct_option: 'C',
            question_type: 'multiple_choice',
            explanation: `Keliling persegi = $4 \\times \\text{sisi} = 4 \\times ${side} = ${keliling}\\text{ cm}$.`,
          },
        ]
      }
      // B. IPAS / IPA / IPS
      else if (lowerSub.includes('ipas') || lowerSub.includes('ipa') || lowerSub.includes('sains')) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: 'Organ pernapasan utama pada manusia yang berfungsi menyerap oksigen adalah...',
            options: [
              { key: 'A', text: 'Jantung' },
              { key: 'B', text: 'Paru-paru' },
              { key: 'C', text: 'Lambung' },
              { key: 'D', text: 'Hati' },
            ],
            correct_option: 'B',
            question_type: 'multiple_choice',
            explanation: 'Paru-paru adalah organ utama pernapasan manusia.',
          },
          {
            exam_id: exam.id,
            question_text: 'Tumbuhan hijau memasak makanannya sendiri dengan sinar matahari melalui proses...',
            options: [
              { key: 'A', text: 'Fotosintesis' },
              { key: 'B', text: 'Respirasi' },
              { key: 'C', text: 'Adaptasi' },
              { key: 'D', text: 'Metamorfosis' },
            ],
            correct_option: 'A',
            question_type: 'multiple_choice',
            explanation: 'Fotosintesis adalah proses pembuatan makanan oleh tumbuhan hijau.',
          },
        ]
      }
      // C. BAHASA INDONESIA / LITERASI
      else if (lowerSub.includes('bahasa') || lowerSub.includes('indo') || lowerSub.includes('literasi')) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: 'Gagasan utama yang menjadi inti pembahasan dalam sebuah paragraf disebut...',
            options: [
              { key: 'A', text: 'Ide pokok' },
              { key: 'B', text: 'Kalimat penjelas' },
              { key: 'C', text: 'Kesimpulan' },
              { key: 'D', text: 'Judul' },
            ],
            correct_option: 'A',
            question_type: 'multiple_choice',
            explanation: 'Ide pokok adalah pikiran utama dalam sebuah paragraf.',
          },
        ]
      }
      // D. PANCASILA / PKN
      else if (lowerSub.includes('pancasila') || lowerSub.includes('pkn')) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: 'Lambang Sila Pertama Pancasila "Ketuhanan Yang Maha Esa" adalah...',
            options: [
              { key: 'A', text: 'Rantai Emas' },
              { key: 'B', text: 'Bintang Emas' },
              { key: 'C', text: 'Pohon Beringin' },
              { key: 'D', text: 'Kepala Banteng' },
            ],
            correct_option: 'B',
            question_type: 'multiple_choice',
            explanation: 'Sila ke-1 dilambangkan dengan Bintang Emas.',
          },
        ]
      }
      // E. PENALARAN LOGIS / CODING
      else if (lowerSub.includes('logis') || lowerSub.includes('logika') || lowerSub.includes('coding')) {
        const step = Math.floor(Math.random() * 3) + 2
        const start = 3
        const ans = start + step * 3

        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: `Perhatikan deret pola berikut: $${start}, ${start + step}, ${start + step * 2}, ...$ Berapakah angka berikutnya?`,
            options: [
              { key: 'A', text: `${ans - 1}` },
              { key: 'B', text: `${ans}` },
              { key: 'C', text: `${ans + 2}` },
              { key: 'D', text: `${ans + 5}` },
            ],
            correct_option: 'B',
            question_type: 'multiple_choice',
            explanation: `Pola bertambah $+${step}$ secara konsisten.`,
          },
        ]
      }
      // F. SENI & OLAHRAGA
      else {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: 'Tiga warna dasar/primer dalam seni rupa adalah...',
            options: [
              { key: 'A', text: 'Hijau, Oranye, Ungu' },
              { key: 'B', text: 'Merah, Kuning, Biru' },
              { key: 'C', text: 'Hitam, Putih, Cokelat' },
              { key: 'D', text: 'Merah, Hijau, Kuning' },
            ],
            correct_option: 'B',
            question_type: 'multiple_choice',
            explanation: 'Warna primer terdiri dari Merah, Kuning, dan Biru.',
          },
        ]
      }
    } else if (actType === 'FLASHCARD') {
      generatedQuestions = [
        {
          exam_id: exam.id,
          question_text: `Kartu Memori Subtes ${subtestName}`,
          options: [],
          correct_option: 'A',
          explanation: `Ringkasan konsep/rumus penting untuk ${subtestName}.`,
        },
      ]
    
      } else if (actType === 'MAZE_GAME') {
        // Papan 6 × 6. Robot mulai di (0, 0).
        // Posisi target dan rintangan dipastikan valid.
        const width = 6
        const height = 6
        const start = { x: 0, y: 0 }

        const possibleTargets = [
          { x: 5, y: 5 },
          { x: 5, y: 4 },
          { x: 4, y: 5 },
          { x: 4, y: 4 },
          { x: 3, y: 5 },
        ]

        const target =
          possibleTargets[Math.floor(Math.random() * possibleTargets.length)]

        // Rintangan contoh. Jalur di sisi atas dan kanan tetap terbuka.
        const obstacles = [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 3, y: 1 },
          { x: 1, y: 3 },
          { x: 2, y: 3 },
          { x: 3, y: 3 },
        ]

        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text: `Misi Coding Maze SD: Bantu robot dari titik awal menuju bintang di titik (${target.x}, ${target.y})!`,
            options: [],
            correct_option: 'FORWARD',
            question_type: 'maze_game',
            start_x: start.x,
            start_y: start.y,
            target_x: target.x,
            target_y: target.y,
            maze_width: width,
            maze_height: height,
            obstacles,
            difficulty: 'medium',
            explanation: 'Gunakan perintah Maju, Belok Kiri, dan Belok Kanan untuk mencapai bintang tanpa menabrak penghalang.',
          },
        ]
      }


    const { error: insertErr } = await supabase.from('questions').insert(generatedQuestions)

    if (insertErr) {
      alert(`Gagal generate: ${insertErr.message}`)
    } else {
      alert(`🎉 Berhasil menambahkan ${generatedQuestions.length} soal variasi baru (${subtestName})!`)
      fetchExams()
    }
  }

  // 🟢 3. HANDLER IMPORT PG STANDAR DARI BANK SOAL LAIN
  const handleImportFromBankSoal = async (exam: any) => {
    const subtestName = exam.subtest || 'Matematika'
    const confirmImport = confirm(
      `Impor soal PG Standar (A-D) yang sesuai dengan subtes "${subtestName}" dari Bank Soal lain?\n\n` +
      `➕ Catatan: Soal impor akan DITAMBAHKAN di bagian bawah (tanpa menghapus soal lama).`
    )
    if (!confirmImport) return

    const supabase = createClient()
    const { data: allQuestions, error } = await supabase
      .from('questions')
      .select('*, exams(subtest, title)')
      .neq('exam_id', exam.id)
      .limit(150)

    if (error || !allQuestions || allQuestions.length === 0) {
      alert('Belum ada soal PG dari modul lain di Bank Soal Supabase.')
      return
    }

    const currentSubtest = subtestName.trim().toLowerCase()

    let candidateQuestions = allQuestions.filter((q) => {
      const hasOptions = Array.isArray(q.options) && q.options.length === 4
      const correctOpt = String(q.correct_option || q.correct_answer || '').trim().toUpperCase()
      // Filter khusus soal yang bisa dinilai otomatis (PG Standar A-D)
      const isAutoScorable = q.question_type ? q.question_type !== 'essay' : true
      return hasOptions && ['A', 'B', 'C', 'D'].includes(correctOpt) && isAutoScorable
    })

    if (candidateQuestions.length === 0) {
      alert('Tidak ditemukan soal PG Standar A-D yang dinilai otomatis dari modul lain.')
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
      exam_id: exam.id,
      question_text: q.question_text,
      options: q.options,
      correct_option: String(q.correct_option || q.correct_answer || 'A').trim().toUpperCase(),
      question_type: q.question_type || 'multiple_choice',
      explanation: q.explanation || q.pembahasan || '',
      image_url: q.image_url || null,
    }))

    const { error: insertErr } = await supabase.from('questions').insert(questionsToInsert)

    if (insertErr) {
      alert(`Gagal impor: ${insertErr.message}`)
    } else {
      alert(`✅ Berhasil mengimpor ${questionsToInsert.length} soal PG Standar (${subtestName})!`)
      fetchExams()
    }
  }

  // 🟢 4. HANDLER BUKA MODAL BULK IMPORT KARTU
  const handleOpenBulkModalCard = (exam: any) => {
    setActiveExamForBulk(exam)
    const actType = exam.activity_type || 'QUIZ'

    let sample = []
    if (actType === 'QUIZ') {
      sample = [
        {
          question_text: 'Berapakah hasil dari $12 \\times 4 + 10$?',
          options: [{ key: 'A', text: '48' }, { key: 'B', text: '58' }, { key: 'C', text: '68' }, { key: 'D', text: '78' }],
          correct_option: 'B',
          question_type: 'multiple_choice',
          explanation: 'Perkalian didahulukan: $12 \\times 4 = 48 + 10 = 58$.',
        },
      ]
    } else if (actType === 'FLASHCARD') {
      sample = [
        {
          question_text: 'Rumus Luas Persegi Panjang',
          explanation: '$L = p \\times l$.',
        },
      ]
    } else {
      sample = [
        {
          question_text: 'Bantu Robot ke Bintang di titik (3, 3)',
          target_x: 3,
          target_y: 3,
          explanation: 'Gunakan perintah Maju 3x.',
        },
      ]
    }

    setBulkInputText(JSON.stringify(sample, null, 2))
    setIsBulkModalOpen(true)
  }

  const handleProcessBulkImportCard = async () => {
    if (!bulkInputText.trim() || !activeExamForBulk) return

    try {
      const parsedData = JSON.parse(bulkInputText)
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        alert('Format JSON harus berupa Array daftar [...]!')
        return
      }

      const actType = activeExamForBulk.activity_type || 'QUIZ'
      const questionsToInsert = parsedData.map((item: any, idx: number) => {
        let payload: any = {
          exam_id: activeExamForBulk.id,
          question_text: item.question_text || `Item #${idx + 1}`,
          explanation: item.explanation || item.pembahasan || '',
          image_url: item.image_url || null,
        }

        if (actType === 'QUIZ') {
          payload.options = Array.isArray(item.options) ? item.options : []
          payload.correct_option = String(item.correct_option || item.correct_answer || 'A').toUpperCase()
          payload.question_type = item.question_type || 'multiple_choice'
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
        alert(`🎉 Berhasil mengimpor ${questionsToInsert.length} item baru sekaligus ke "${activeExamForBulk.title}"!`)
        setIsBulkModalOpen(false)
        fetchExams()
      }
    } catch (err: any) {
      alert(`⚠️ Format JSON tidak valid! Error: ${err.message}`)
    }
  }

  // 🟢 5. HANDLER EDIT / TAMBAH KEGIATAN
  const handleOpenModal = (exam?: any) => {
    if (exam) {
      setSelectedExam(exam)
      setFormData({
        title: exam.title || '',
        subtest: exam.subtest || 'Matematika',
        description: exam.description || '',
        target_mode: exam.target_mode || 'PRACTICE_ONLY',
        activity_type: exam.activity_type || 'QUIZ',
        is_published: exam.is_published ?? true,
      })
    } else {
      setSelectedExam(null)
      setFormData({
        title: '',
        subtest: 'Matematika',
        description: '',
        target_mode: 'PRACTICE_ONLY',
        activity_type: 'QUIZ',
        is_published: true,
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Judul kegiatan wajib diisi!')
      return
    }

    const supabase = createClient()

    if (selectedExam) {
      const { error } = await supabase
        .from('exams')
        .update({
          title: formData.title,
          subtest: formData.subtest,
          description: formData.description,
          target_mode: formData.target_mode,
          activity_type: formData.activity_type,
          is_published: formData.is_published,
        })
        .eq('id', selectedExam.id)

      if (error) {
        alert(`Gagal memperbarui: ${error.message}`)
      } else {
        alert('✅ Pengaturan kegiatan berhasil diperbarui!')
        setIsModalOpen(false)
        fetchExams()
      }
    } else {
      const { error } = await supabase.from('exams').insert([
        {
          title: formData.title,
          subtest: formData.subtest,
          description: formData.description,
          target_mode: formData.target_mode,
          activity_type: formData.activity_type,
          is_published: formData.is_published,
          duration_minutes: 30,
        },
      ])

      if (error) {
        alert(`Gagal menambah kegiatan: ${error.message}`)
      } else {
        alert('🎉 Modul Latihan/Game baru berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchExams()
      }
    }
  }

  // 🟢 6. HANDLER HAPUS AKTIVITAS / EXAM PERMANEN
  const handleDeleteExam = async (exam: any) => {
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus modul "${exam.title}"?\n\n` +
      `⚠️ PERINGATAN: Seluruh soal dan data pengerjaan yang terkait dengan modul kegiatan ini akan dihapus secara permanen!`
    )
    if (!confirmDelete) return

    const supabase = createClient()
    const { error } = await supabase.from('exams').delete().eq('id', exam.id)

    if (error) {
      alert(`Gagal menghapus kegiatan: ${error.message}`)
    } else {
      alert(`🗑️ Modul "${exam.title}" berhasil dihapus!`)
      setExams((prev) => prev.filter((item) => item.id !== exam.id))
    }
  }

  // 🟢 7. HANDLER TOGGLE PUBLISH
  const handleTogglePublish = async (exam: any) => {
    const supabase = createClient()
    const newStatus = !exam.is_published

    const { error } = await supabase
      .from('exams')
      .update({ is_published: newStatus })
      .eq('id', exam.id)

    if (!error) {
      setExams((prev) =>
        prev.map((item) => (item.id === exam.id ? { ...item, is_published: newStatus } : item))
      )
    }
  }

  // 🟢 8. FILTER DATA SEMENTARA
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'ALL' || (exam.activity_type || 'QUIZ') === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans select-none">
      {/* HEADER PANEL ADMIN */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            ← Kembali ke Admin Dashboard
          </Link>
          <div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-extrabold border border-indigo-500/30 uppercase">
              PANEL MANAJEMEN LATIHAN & GAME
            </span>
            <h1 className="text-lg font-black mt-0.5">🎮 Pengaturan Mode Kegiatan Siswa</h1>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
        >
          <span>➕ Tambah Kegiatan / Game Baru</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* BARIS KONTROL: SEARCH & TAB FILTER GAME TYPE */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
          <input
            type="text"
            placeholder="🔍 Cari nama kegiatan atau modul..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'ALL' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Semua Kegiatan ({exams.length})
            </button>
            <button
              onClick={() => setFilterType('QUIZ')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'QUIZ' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              📝 Quiz Soal
            </button>
            <button
              onClick={() => setFilterType('MAZE_GAME')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'MAZE_GAME' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🌀 Coding Maze
            </button>
            <button
              onClick={() => setFilterType('FLASHCARD')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'FLASHCARD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              🃏 Flashcard Rumus
            </button>
          </div>
        </div>

        {/* DAFTAR KARTU MANAJEMEN KEGIATAN */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Memuat data kegiatan latihan...
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              let actBadge = { label: '📝 Quiz Pilihan Ganda', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' }
              if (exam.activity_type === 'MAZE_GAME') {
                actBadge = { label: '🌀 Coding Maze Logika', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
              } else if (exam.activity_type === 'FLASHCARD') {
                actBadge = { label: '🃏 Flashcard Rumus', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
              }

              let targetBadge = { label: '🎯 Khusus Latihan', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' }
              if (exam.target_mode === 'CBT_ONLY') {
                targetBadge = { label: '📝 Khusus Ujian CBT', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40' }
              } else if (exam.target_mode === 'BOTH') {
                targetBadge = { label: '🌐 Tampil di Both Page', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
              }

              return (
                <div
                  key={exam.id}
                  className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-4 shadow-md hover:border-slate-700 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                      <span className={`px-2 py-0.5 rounded-md border ${actBadge.bg}`}>
                        {actBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md border ${targetBadge.bg}`}>
                        {targetBadge.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md border bg-slate-800 text-amber-300 border-slate-700">
                        {exam.subtest || 'Matematika'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{exam.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {exam.description || 'Tidak ada deskripsi kegiatan.'}
                    </p>
                  </div>

                  {/* TOMBOL AKSI LENGKAP PADA KARTU */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="grid grid-cols-4 gap-1">
                      <button
                        onClick={() => handleAutoGenerateQuestions(exam)}
                        className="py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Tambah soal otomatis SD dinamis"
                      >
                        ⚡ Auto
                      </button>

                      <button
                        onClick={() => handleImportFromBankSoal(exam)}
                        className="py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Import PG Standar dari modul lain"
                      >
                        📥 Import
                      </button>

                      <button
                        onClick={() => handleOpenBulkModalCard(exam)}
                        className="py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Import Bulk JSON"
                      >
                        📦 Bulk
                      </button>

                      <Link
                        href={`/admin/exams/${exam.id}/questions`}
                        className="py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Buka Bank Soal / Edit Soal"
                      >
                        ✏️ Soal
                      </Link>
                    </div>

                    {/* BARIS STATUS, PENGATURAN, & HAPUS */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        onClick={() => handleTogglePublish(exam)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                          exam.is_published
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {exam.is_published ? '🟢 Publik' : '🔴 Draft'}
                      </button>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenModal(exam)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl border border-slate-700 transition-colors"
                          title="Edit Pengaturan Modul"
                        >
                          ⚙️ Edit
                        </button>

                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold rounded-xl border border-rose-500/40 transition-colors"
                          title="Hapus Modul Kegiatan Ini"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-xs bg-slate-950 rounded-2xl border border-slate-800">
            Tidak ada kegiatan latihan yang sesuai dengan filter.
          </div>
        )}
      </main>

      {/* MODAL EDIT & TAMBAH KEGIATAN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-lg w-full rounded-3xl p-6 space-y-5 text-white shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>⚙️</span>
                <span>{selectedExam ? 'Edit Pengaturan Kegiatan' : 'Tambah Kegiatan / Game Baru'}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Judul Kegiatan / Game</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Contoh: Tantangan Logika Coding Maze VI-A"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Bentuk Kegiatan / Game Edukatif</label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="QUIZ">📝 Quiz Pilihan Ganda (Standard Interaktif)</option>
                  <option value="MAZE_GAME">🌀 Coding Maze (Game Labirin Logika)</option>
                  <option value="FLASHCARD">🃏 Flashcard Rumus (Game Pasangan Memori)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kategori / Subtes Baku (Sekolah Dasar)
                </label>
                <select
                  value={formData.subtest}
                  onChange={(e) => setFormData({ ...formData, subtest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="Matematika">📐 Matematika (Numerasi & Hitung SD)</option>
                  <option value="IPAS">🌿 IPAS (IPA & IPS Terpadu SD)</option>
                  <option value="Bahasa Indonesia">📖 Bahasa Indonesia (Literasi & Membaca SD)</option>
                  <option value="Pancasila">🇮🇩 Pancasila (Pendidikan Pancasila / PKn SD)</option>
                  <option value="Penalaran Logis">🧩 Penalaran Logis (Logika & Coding SD)</option>
                  <option value="Seni & Olahraga">🎨 Seni & Olahraga (Seni Budaya & PJOK SD)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Target Halaman Tampil (Visibilitas)</label>
                <select
                  value={formData.target_mode}
                  onChange={(e) => setFormData({ ...formData, target_mode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRACTICE_ONLY">🎯 Khusus Halaman Latihan Mandiri (/practice)</option>
                  <option value="CBT_ONLY">📝 Khusus Halaman Ujian CBT Resmi (/)</option>
                  <option value="BOTH">🌐 Tampil di Kedua Halaman (Beranda & Latihan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Keterangan singkat mengenai kegiatan ini..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="pubCheck"
                  checked={formData.is_published}
                  onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                />
                <label htmlFor="pubCheck" className="text-xs font-semibold text-slate-300">
                  Publikasikan kegiatan ini agar dapat diakses siswa
                </label>
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
                  💾 Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BULK IMPORT KARTU */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 space-y-4 text-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>📦</span>
                <span>Import Bulk ke Modul: {activeExamForBulk?.title}</span>
              </h2>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                rows={10}
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
                onClick={handleProcessBulkImportCard}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
              >
                🚀 Proses Import Bulk
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center font-sans">
          <p className="font-semibold text-sm">Memuat Panel Admin...</p>
        </div>
      }
    >
      <AdminPracticeContent />
    </Suspense>
  )
}