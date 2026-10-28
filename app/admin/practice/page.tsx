'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type MazePoint = { x: number; y: number }
type MazeEditMode = 'start' | 'target' | 'obstacle'

function AdminPracticeContent() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('ALL')

  // State modal tambah/edit kegiatan
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedExam, setSelectedExam] = useState<any>(null)
  const [formData, setFormData] = useState({
    title: '',
    subtest: 'Matematika',
    description: '',
    target_mode: 'PRACTICE_ONLY',
    activity_type: 'QUIZ',
    is_published: true,
  })

  // State modal import bulk
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false)
  const [activeExamForBulk, setActiveExamForBulk] = useState<any>(null)
  const [bulkInputText, setBulkInputText] = useState('')

  // State editor Maze Game
  const [isMazeEditorOpen, setIsMazeEditorOpen] = useState(false)
  const [activeMazeExam, setActiveMazeExam] = useState<any>(null)
  const [mazeWidth, setMazeWidth] = useState(6)
  const [mazeHeight, setMazeHeight] = useState(6)
  const [mazeStart, setMazeStart] = useState<MazePoint>({ x: 0, y: 0 })
  const [mazeTarget, setMazeTarget] = useState<MazePoint>({ x: 5, y: 5 })
  const [mazeObstacles, setMazeObstacles] = useState<MazePoint[]>([])
  const [mazeEditMode, setMazeEditMode] = useState<MazeEditMode>('obstacle')
  const [mazeDifficulty, setMazeDifficulty] = useState('medium')
  const [mazeQuestionText, setMazeQuestionText] = useState(
    'Bantu robot mencapai bintang tanpa menabrak rintangan!'
  )
  const [mazeSaving, setMazeSaving] = useState(false)
  const [mazeMissions, setMazeMissions] = useState<any[]>([])
  const [mazeMissionsLoading, setMazeMissionsLoading] = useState(false)
  const [mazeQuestionId, setMazeQuestionId] = useState<string | number | null>(null)

  // Mengambil semua kegiatan
  const fetchExams = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Gagal memuat kegiatan:', error.message)
    } else if (data) {
      setExams(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchExams()
  }, [])

  // Generator soal otomatis
  const handleAutoGenerateQuestions = async (exam: any) => {
    const actType = exam.activity_type || 'QUIZ'
    const subtestName = exam.subtest || 'Matematika'

    const confirmGen = confirm(
      `Tambahkan soal otomatis ke "${exam.title}"?\n\n` +
        `Subtes: ${subtestName}\nBentuk kegiatan: ${actType}\n` +
        `Soal baru akan ditambahkan tanpa menghapus soal lama.`
    )
    if (!confirmGen) return

    const supabase = createClient()
    let generatedQuestions: any[] = []

    if (actType === 'QUIZ') {
      const lowerSub = subtestName.toLowerCase()

      if (
        lowerSub.includes('matematika') ||
        lowerSub.includes('hitung') ||
        lowerSub.includes('numerasi')
      ) {
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
      } else if (
        lowerSub.includes('ipas') ||
        lowerSub.includes('ipa') ||
        lowerSub.includes('sains')
      ) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text:
              'Organ pernapasan utama pada manusia yang berfungsi menyerap oksigen adalah...',
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
            question_text:
              'Tumbuhan hijau memasak makanannya sendiri dengan sinar matahari melalui proses...',
            options: [
              { key: 'A', text: 'Fotosintesis' },
              { key: 'B', text: 'Respirasi' },
              { key: 'C', text: 'Adaptasi' },
              { key: 'D', text: 'Metamorfosis' },
            ],
            correct_option: 'A',
            question_type: 'multiple_choice',
            explanation:
              'Fotosintesis adalah proses pembuatan makanan oleh tumbuhan hijau.',
          },
        ]
      } else if (
        lowerSub.includes('bahasa') ||
        lowerSub.includes('indo') ||
        lowerSub.includes('literasi')
      ) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text:
              'Gagasan utama yang menjadi inti pembahasan dalam sebuah paragraf disebut...',
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
      } else if (
        lowerSub.includes('pancasila') ||
        lowerSub.includes('pkn')
      ) {
        generatedQuestions = [
          {
            exam_id: exam.id,
            question_text:
              'Lambang Sila Pertama Pancasila "Ketuhanan Yang Maha Esa" adalah...',
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
      } else if (
        lowerSub.includes('logis') ||
        lowerSub.includes('logika') ||
        lowerSub.includes('coding')
      ) {
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
      } else {
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
          question_type: 'flashcard',
          explanation: `Ringkasan konsep/rumus penting untuk ${subtestName}.`,
        },
      ]
    } else if (actType === 'MAZE_GAME') {
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
          explanation:
            'Gunakan perintah Maju, Belok Kiri, dan Belok Kanan untuk mencapai bintang tanpa menabrak penghalang.',
        },
      ]
    }

    if (generatedQuestions.length === 0) {
      alert('Tidak ada soal yang berhasil dibuat.')
      return
    }

    const { error: insertErr } = await supabase
      .from('questions')
      .insert(generatedQuestions)

    if (insertErr) {
      alert(`Gagal generate: ${insertErr.message}`)
    } else {
      alert(
        `🎉 Berhasil menambahkan ${generatedQuestions.length} item baru (${subtestName})!`
      )
      fetchExams()
    }
  }

  // Import soal PG dari bank soal lain
  const handleImportFromBankSoal = async (exam: any) => {
    const subtestName = exam.subtest || 'Matematika'
    const confirmImport = confirm(
      `Impor soal PG Standar (A-D) yang sesuai dengan subtes "${subtestName}" dari Bank Soal lain?\n\n` +
        'Soal impor akan ditambahkan tanpa menghapus soal lama.'
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
    const candidateQuestions = allQuestions.filter((q: any) => {
      const hasOptions = Array.isArray(q.options) && q.options.length === 4
      const correctOpt = String(
        q.correct_option || q.correct_answer || ''
      ).trim().toUpperCase()
      const isAutoScorable = q.question_type ? q.question_type !== 'essay' : true
      return (
        hasOptions &&
        ['A', 'B', 'C', 'D'].includes(correctOpt) &&
        isAutoScorable
      )
    })

    if (candidateQuestions.length === 0) {
      alert('Tidak ditemukan soal PG Standar A-D yang dinilai otomatis dari modul lain.')
      return
    }

    const matchedBySubtest = candidateQuestions.filter((q: any) => {
      const parentSubtest = (q.exams?.subtest || '').trim().toLowerCase()
      return (
        parentSubtest &&
        (parentSubtest.includes(currentSubtest) ||
          currentSubtest.includes(parentSubtest))
      )
    })

    const pool = matchedBySubtest.length > 0 ? matchedBySubtest : candidateQuestions
    const shuffled = [...pool].sort(() => 0.5 - Math.random())
    const selected = shuffled.slice(0, 5)

    const questionsToInsert = selected.map((q: any) => ({
      exam_id: exam.id,
      question_text: q.question_text,
      options: q.options,
      correct_option: String(
        q.correct_option || q.correct_answer || 'A'
      ).trim().toUpperCase(),
      question_type: q.question_type || 'multiple_choice',
      explanation: q.explanation || q.pembahasan || '',
      image_url: q.image_url || null,
    }))

    const { error: insertErr } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (insertErr) {
      alert(`Gagal impor: ${insertErr.message}`)
    } else {
      alert(`✅ Berhasil mengimpor ${questionsToInsert.length} soal PG (${subtestName})!`)
      fetchExams()
    }
  }

  // Membuka modal bulk import
  const handleOpenBulkModalCard = (exam: any) => {
    setActiveExamForBulk(exam)
    const actType = exam.activity_type || 'QUIZ'

    let sample: any[] = []
    if (actType === 'QUIZ') {
      sample = [
        {
          question_text: 'Berapakah hasil dari $12 \\times 4 + 10$?',
          options: [
            { key: 'A', text: '48' },
            { key: 'B', text: '58' },
            { key: 'C', text: '68' },
            { key: 'D', text: '78' },
          ],
          correct_option: 'B',
          question_type: 'multiple_choice',
          explanation: 'Perkalian didahulukan: 12 × 4 = 48, lalu + 10 = 58.',
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
          question_text: 'Bantu Robot ke Bintang di titik (5, 5)',
          start_x: 0,
          start_y: 0,
          target_x: 5,
          target_y: 5,
          maze_width: 6,
          maze_height: 6,
          obstacles: [{ x: 2, y: 2 }, { x: 3, y: 2 }],
          difficulty: 'medium',
          explanation: 'Gunakan perintah Maju dan Belok.',
        },
      ]
    }

    setBulkInputText(JSON.stringify(sample, null, 2))
    setIsBulkModalOpen(true)
  }

  // Memproses JSON bulk import
  const handleProcessBulkImportCard = async () => {
    if (!bulkInputText.trim() || !activeExamForBulk) return

    try {
      const parsedData = JSON.parse(bulkInputText)
      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        alert('Format JSON harus berupa array daftar [...].')
        return
      }

      const actType = activeExamForBulk.activity_type || 'QUIZ'
      const questionsToInsert = parsedData.map((item: any, idx: number) => {
        const payload: any = {
          exam_id: activeExamForBulk.id,
          question_text: item.question_text || `Item #${idx + 1}`,
          explanation: item.explanation || item.pembahasan || '',
          image_url: item.image_url || null,
        }

        if (actType === 'QUIZ') {
          payload.options = Array.isArray(item.options) ? item.options : []
          payload.correct_option = String(
            item.correct_option || item.correct_answer || 'A'
          ).toUpperCase()
          payload.question_type = item.question_type || 'multiple_choice'
        } else if (actType === 'MAZE_GAME') {
          const width = Math.max(2, Math.min(12, Number(item.maze_width ?? 6)))
          const height = Math.max(2, Math.min(12, Number(item.maze_height ?? 6)))
          const startX = Math.max(0, Math.min(width - 1, Number(item.start_x ?? 0)))
          const startY = Math.max(0, Math.min(height - 1, Number(item.start_y ?? 0)))
          const targetX = Math.max(0, Math.min(width - 1, Number(item.target_x ?? 3)))
          const targetY = Math.max(0, Math.min(height - 1, Number(item.target_y ?? 3)))
          const obstacles = Array.isArray(item.obstacles)
            ? item.obstacles.filter(
                (p: any) =>
                  Number.isInteger(Number(p.x)) &&
                  Number.isInteger(Number(p.y)) &&
                  Number(p.x) >= 0 &&
                  Number(p.x) < width &&
                  Number(p.y) >= 0 &&
                  Number(p.y) < height &&
                  !(Number(p.x) === startX && Number(p.y) === startY) &&
                  !(Number(p.x) === targetX && Number(p.y) === targetY)
              ).map((p: any) => ({ x: Number(p.x), y: Number(p.y) }))
            : []

          payload.options = []
          payload.correct_option = 'FORWARD'
          payload.question_type = 'maze_game'
          payload.start_x = startX
          payload.start_y = startY
          payload.target_x = targetX
          payload.target_y = targetY
          payload.maze_width = width
          payload.maze_height = height
          payload.obstacles = obstacles
          payload.difficulty = ['easy', 'medium', 'hard'].includes(item.difficulty)
            ? item.difficulty
            : 'medium'
        } else if (actType === 'FLASHCARD') {
          payload.options = []
          payload.correct_option = 'A'
          payload.question_type = 'flashcard'
        }

        return payload
      })

      const supabase = createClient()
      const { error } = await supabase
        .from('questions')
        .insert(questionsToInsert)

      if (error) {
        alert(`Gagal impor bulk: ${error.message}`)
      } else {
        alert(
          `🎉 Berhasil mengimpor ${questionsToInsert.length} item ke "${activeExamForBulk.title}"!`
        )
        setIsBulkModalOpen(false)
        fetchExams()
      }
    } catch (err: any) {
      alert(`⚠️ Format JSON tidak valid. ${err.message}`)
    }
  }

  // Memuat misi Maze yang sudah tersimpan dan membuka editor dalam mode misi baru.
  const handleOpenMazeEditor = async (exam: any) => {
    setActiveMazeExam(exam)
    setMazeQuestionId(null)
    setMazeWidth(6)
    setMazeHeight(6)
    setMazeStart({ x: 0, y: 0 })
    setMazeTarget({ x: 5, y: 5 })
    setMazeObstacles([])
    setMazeEditMode('obstacle')
    setMazeDifficulty('medium')
    setMazeQuestionText(
      `Bantu robot mencapai bintang pada kegiatan "${exam.title}" tanpa menabrak rintangan!`
    )
    setMazeMissions([])
    setMazeMissionsLoading(true)
    setIsMazeEditorOpen(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('questions')
        .select(
          'id, exam_id, question_text, start_x, start_y, target_x, target_y, maze_width, maze_height, obstacles, difficulty, question_type'
        )
        .eq('exam_id', exam.id)
        .eq('question_type', 'maze_game')

      if (error) {
        console.error('Gagal memuat misi Maze:', error.message)
        alert(`Misi lama tidak dapat dimuat: ${error.message}`)
        return
      }

      setMazeMissions(data || [])
    } catch (error: any) {
      console.error('Gagal memuat misi Maze:', error)
      alert(`Misi lama tidak dapat dimuat: ${error.message || 'Kesalahan tidak diketahui'}`)
    } finally {
      setMazeMissionsLoading(false)
    }
  }

  // Memilih misi tersimpan untuk diedit, atau kembali ke mode misi baru.
  const handleSelectMazeMission = (selectedId: string) => {
    if (!selectedId) {
      setMazeQuestionId(null)
      setMazeWidth(6)
      setMazeHeight(6)
      setMazeStart({ x: 0, y: 0 })
      setMazeTarget({ x: 5, y: 5 })
      setMazeObstacles([])
      setMazeEditMode('obstacle')
      setMazeDifficulty('medium')
      setMazeQuestionText(
        `Bantu robot mencapai bintang pada kegiatan "${activeMazeExam?.title || ''}" tanpa menabrak rintangan!`
      )
      return
    }

    const mission = mazeMissions.find((item) => String(item.id) === selectedId)
    if (!mission) return

    const width = Math.max(2, Math.min(12, Number(mission.maze_width) || 6))
    const height = Math.max(2, Math.min(12, Number(mission.maze_height) || 6))
    const start = {
      x: Math.max(0, Math.min(width - 1, Number(mission.start_x) || 0)),
      y: Math.max(0, Math.min(height - 1, Number(mission.start_y) || 0)),
    }
    const target = {
      x: Math.max(0, Math.min(width - 1, Number(mission.target_x) || 0)),
      y: Math.max(0, Math.min(height - 1, Number(mission.target_y) || 0)),
    }
    const obstacles = Array.isArray(mission.obstacles)
      ? mission.obstacles
          .map((point: any) => ({ x: Number(point.x), y: Number(point.y) }))
          .filter(
            (point: MazePoint) =>
              Number.isInteger(point.x) &&
              Number.isInteger(point.y) &&
              point.x >= 0 &&
              point.x < width &&
              point.y >= 0 &&
              point.y < height &&
              !(point.x === start.x && point.y === start.y) &&
              !(point.x === target.x && point.y === target.y)
          )
      : []

    setMazeQuestionId(mission.id)
    setMazeWidth(width)
    setMazeHeight(height)
    setMazeStart(start)
    setMazeTarget(target)
    setMazeObstacles(obstacles)
    setMazeEditMode('obstacle')
    setMazeDifficulty(['easy', 'medium', 'hard'].includes(mission.difficulty)
      ? mission.difficulty
      : 'medium')
    setMazeQuestionText(mission.question_text || 'Bantu robot mencapai bintang!')
  }

  // Mengatur posisi robot, bintang, atau rintangan
  const handleMazeCellClick = (x: number, y: number) => {
    if (mazeEditMode === 'start') {
      if (x === mazeTarget.x && y === mazeTarget.y) {
        alert('Posisi robot tidak boleh sama dengan posisi bintang.')
        return
      }
      setMazeStart({ x, y })
      setMazeObstacles((prev) => prev.filter((p) => p.x !== x || p.y !== y))
      return
    }

    if (mazeEditMode === 'target') {
      if (x === mazeStart.x && y === mazeStart.y) {
        alert('Posisi bintang tidak boleh sama dengan posisi robot.')
        return
      }
      setMazeTarget({ x, y })
      setMazeObstacles((prev) => prev.filter((p) => p.x !== x || p.y !== y))
      return
    }

    if (
      (x === mazeStart.x && y === mazeStart.y) ||
      (x === mazeTarget.x && y === mazeTarget.y)
    ) {
      alert('Kotak robot dan bintang tidak bisa dijadikan rintangan.')
      return
    }

    setMazeObstacles((prev) =>
      prev.some((p) => p.x === x && p.y === y)
        ? prev.filter((p) => p.x !== x || p.y !== y)
        : [...prev, { x, y }]
    )
  }

  // Menyimpan misi baru atau memperbarui misi Maze yang sedang diedit.
  const handleSaveMazeMission = async () => {
    if (!activeMazeExam || mazeSaving) return

    if (
      mazeWidth < 2 ||
      mazeWidth > 12 ||
      mazeHeight < 2 ||
      mazeHeight > 12
    ) {
      alert('Ukuran papan harus antara 2 sampai 12 kotak.')
      return
    }

    if (
      mazeStart.x < 0 || mazeStart.x >= mazeWidth ||
      mazeStart.y < 0 || mazeStart.y >= mazeHeight ||
      mazeTarget.x < 0 || mazeTarget.x >= mazeWidth ||
      mazeTarget.y < 0 || mazeTarget.y >= mazeHeight
    ) {
      alert('Posisi robot atau bintang berada di luar papan. Atur ulang posisinya.')
      return
    }

    if (mazeStart.x === mazeTarget.x && mazeStart.y === mazeTarget.y) {
      alert('Posisi robot dan bintang tidak boleh sama.')
      return
    }

    const wallSet = new Set(mazeObstacles.map((p) => `${p.x},${p.y}`))
    const queue: MazePoint[] = [{ ...mazeStart }]
    const visited = new Set<string>([`${mazeStart.x},${mazeStart.y}`])
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]

    while (queue.length > 0) {
      const current = queue.shift()!
      for (const direction of directions) {
        const nx = current.x + direction.x
        const ny = current.y + direction.y
        const key = `${nx},${ny}`

        if (
          nx < 0 ||
          nx >= mazeWidth ||
          ny < 0 ||
          ny >= mazeHeight ||
          wallSet.has(key) ||
          visited.has(key)
        ) {
          continue
        }

        visited.add(key)
        queue.push({ x: nx, y: ny })
      }
    }

    if (!visited.has(`${mazeTarget.x},${mazeTarget.y}`)) {
      alert('Jalur menuju bintang terhalang. Hapus beberapa rintangan terlebih dahulu.')
      return
    }

    setMazeSaving(true)
    try {
      const supabase = createClient()
      const missionPayload = {
        exam_id: activeMazeExam.id,
        question_text:
          mazeQuestionText.trim() || 'Bantu robot mencapai bintang!',
        options: [],
        correct_option: 'FORWARD',
        question_type: 'maze_game',
        start_x: mazeStart.x,
        start_y: mazeStart.y,
        target_x: mazeTarget.x,
        target_y: mazeTarget.y,
        maze_width: mazeWidth,
        maze_height: mazeHeight,
        obstacles: mazeObstacles,
        difficulty: mazeDifficulty,
        explanation:
          'Gunakan perintah Maju, Belok Kiri, dan Belok Kanan untuk mencapai bintang tanpa menabrak rintangan.',
      }

      const result = mazeQuestionId !== null
        ? await supabase
            .from('questions')
            .update(missionPayload)
            .eq('id', mazeQuestionId)
            .eq('exam_id', activeMazeExam.id)
            .eq('question_type', 'maze_game')
        : await supabase.from('questions').insert(missionPayload)

      if (result.error) {
        alert(`Gagal menyimpan misi: ${result.error.message}`)
        return
      }

      alert(
        mazeQuestionId !== null
          ? 'Misi Maze Game berhasil diperbarui!'
          : 'Misi Maze Game berhasil disimpan sebagai misi baru!'
      )
      setIsMazeEditorOpen(false)
      setMazeQuestionId(null)
      fetchExams()
    } catch (error: any) {
      alert(`Terjadi kesalahan: ${error.message || 'Tidak diketahui'}`)
    } finally {
      setMazeSaving(false)
    }
  }

  // Membuka modal tambah/edit kegiatan
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
    const examPayload = {
      title: formData.title,
      subtest: formData.subtest,
      description: formData.description,
      target_mode: formData.target_mode,
      activity_type: formData.activity_type,
      is_published: formData.is_published,
    }

    if (selectedExam) {
      const { error } = await supabase
        .from('exams')
        .update(examPayload)
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
          ...examPayload,
          duration_minutes: 30,
        },
      ])

      if (error) {
        alert(`Gagal menambah kegiatan: ${error.message}`)
      } else {
        alert('🎉 Modul latihan/game baru berhasil ditambahkan!')
        setIsModalOpen(false)
        fetchExams()
      }
    }
  }

  // Menghapus kegiatan
  const handleDeleteExam = async (exam: any) => {
    const confirmDelete = confirm(
      `Apakah Anda yakin ingin menghapus modul "${exam.title}"?\n\n` +
        'Seluruh soal dan data pengerjaan terkait mungkin ikut terhapus sesuai aturan database.'
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

  // Mengubah status publikasi
  const handleTogglePublish = async (exam: any) => {
    const supabase = createClient()
    const newStatus = !exam.is_published
    const { error } = await supabase
      .from('exams')
      .update({ is_published: newStatus })
      .eq('id', exam.id)

    if (error) {
      alert(`Gagal mengubah status publikasi: ${error.message}`)
      return
    }

    setExams((prev) =>
      prev.map((item) =>
        item.id === exam.id ? { ...item, is_published: newStatus } : item
      )
    )
  }

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = (exam.title || '')
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
    const matchesType =
      filterType === 'ALL' || (exam.activity_type || 'QUIZ') === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans select-none">
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
            <h1 className="text-lg font-black mt-0.5">
              🎮 Pengaturan Mode Kegiatan Siswa
            </h1>
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
                filterType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌐 Semua Kegiatan ({exams.length})
            </button>
            <button
              onClick={() => setFilterType('QUIZ')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'QUIZ'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📝 Quiz Soal
            </button>
            <button
              onClick={() => setFilterType('MAZE_GAME')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'MAZE_GAME'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🌀 Coding Maze
            </button>
            <button
              onClick={() => setFilterType('FLASHCARD')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'FLASHCARD'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🃏 Flashcard Rumus
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Memuat data kegiatan latihan...
          </div>
        ) : filteredExams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExams.map((exam) => {
              let actBadge = {
                label: '📝 Quiz Pilihan Ganda',
                bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
              }
              if (exam.activity_type === 'MAZE_GAME') {
                actBadge = {
                  label: '🌀 Coding Maze Logika',
                  bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                }
              } else if (exam.activity_type === 'FLASHCARD') {
                actBadge = {
                  label: '🃏 Flashcard Rumus',
                  bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                }
              }

              let targetBadge = {
                label: '🎯 Khusus Latihan',
                bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
              }
              if (exam.target_mode === 'CBT_ONLY') {
                targetBadge = {
                  label: '📝 Khusus Ujian CBT',
                  bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                }
              } else if (exam.target_mode === 'BOTH') {
                targetBadge = {
                  label: '🌐 Tampil di Kedua Halaman',
                  bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                }
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

                    <h3 className="text-base font-bold text-white leading-snug">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {exam.description || 'Tidak ada deskripsi kegiatan.'}
                    </p>
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div
                      className={`grid gap-1 ${
                        exam.activity_type === 'MAZE_GAME'
                          ? 'grid-cols-3 sm:grid-cols-5'
                          : 'grid-cols-4'
                      }`}
                    >
                      <button
                        onClick={() => handleAutoGenerateQuestions(exam)}
                        className="py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Tambah soal otomatis"
                      >
                        ⚡ Auto
                      </button>
                      <button
                        onClick={() => handleImportFromBankSoal(exam)}
                        className="py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Import PG standar dari modul lain"
                      >
                        📥 Import
                      </button>
                      <button
                        onClick={() => handleOpenBulkModalCard(exam)}
                        className="py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Import bulk JSON"
                      >
                        📦 Bulk
                      </button>

                      {exam.activity_type === 'MAZE_GAME' && (
                        <button
                          onClick={() => handleOpenMazeEditor(exam)}
                          className="py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                          title="Buat dan atur papan labirin"
                        >
                          🧩 Editor Maze
                        </button>
                      )}

                      <Link
                        href={`/admin/exams/${exam.id}/questions`}
                        className="py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold rounded-xl transition-all flex items-center justify-center"
                        title="Buka bank soal / edit soal"
                      >
                        ✏️ Soal
                      </Link>
                    </div>

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
                          title="Edit pengaturan modul"
                        >
                          ⚙️ Edit
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam)}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold rounded-xl border border-rose-500/40 transition-colors"
                          title="Hapus modul"
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

      {/* Modal tambah/edit kegiatan */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-lg w-full rounded-3xl p-6 space-y-5 text-white shadow-2xl animate-fadeIn max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold">
                ⚙️ {selectedExam ? 'Edit Pengaturan Kegiatan' : 'Tambah Kegiatan / Game Baru'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Judul Kegiatan / Game
                </label>
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
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Bentuk Kegiatan / Game Edukatif
                </label>
                <select
                  value={formData.activity_type}
                  onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="QUIZ">📝 Quiz Pilihan Ganda</option>
                  <option value="MAZE_GAME">🌀 Coding Maze</option>
                  <option value="FLASHCARD">🃏 Flashcard Rumus</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Kategori / Subtes
                </label>
                <select
                  value={formData.subtest}
                  onChange={(e) => setFormData({ ...formData, subtest: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="Matematika">📐 Matematika</option>
                  <option value="IPAS">🌿 IPAS</option>
                  <option value="Bahasa Indonesia">📖 Bahasa Indonesia</option>
                  <option value="Pancasila">🇮🇩 Pendidikan Pancasila</option>
                  <option value="Penalaran Logis">🧩 Penalaran Logis</option>
                  <option value="Seni & Olahraga">🎨 Seni & Olahraga</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Target Halaman Tampil
                </label>
                <select
                  value={formData.target_mode}
                  onChange={(e) => setFormData({ ...formData, target_mode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PRACTICE_ONLY">🎯 Khusus Latihan Mandiri (/practice)</option>
                  <option value="CBT_ONLY">📝 Khusus Ujian CBT (/)</option>
                  <option value="BOTH">🌐 Tampil di Kedua Halaman</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Deskripsi Singkat
                </label>
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  💾 Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal bulk import */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-2xl w-full rounded-3xl p-6 space-y-4 text-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold">
                📦 Import Bulk ke Modul: {activeExamForBulk?.title}
              </h2>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Masukkan JSON berbentuk array. Untuk Maze, tiap item dapat memiliki
                start_x, start_y, target_x, target_y, maze_width, maze_height,
                obstacles, dan difficulty.
              </p>
              <textarea
                rows={12}
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                className="w-full p-3 bg-slate-900 border border-slate-700 rounded-2xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-purple-500 leading-relaxed"
                placeholder="Paste JSON array di sini..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImportCard}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md"
              >
                🚀 Proses Import Bulk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editor Maze Game */}
      {isMazeEditorOpen && activeMazeExam && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-slate-950 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[95vh] overflow-y-auto p-5 sm:p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-lg font-black">🧩 Editor Maze Game</h2>
                <p className="text-xs text-slate-400 mt-1">{activeMazeExam.title}</p>
              </div>
              <button
                onClick={() => setIsMazeEditorOpen(false)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-200 space-y-1">
                Pilih misi Maze
                <select
                  value={mazeQuestionId === null ? '' : String(mazeQuestionId)}
                  onChange={(e) => handleSelectMazeMission(e.target.value)}
                  disabled={mazeMissionsLoading || mazeSaving}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-white disabled:opacity-60"
                >
                  <option value="">＋ Buat misi baru</option>
                  {mazeMissions.map((mission) => (
                    <option key={String(mission.id)} value={String(mission.id)}>
                      {String(mission.question_text || 'Misi Maze tanpa judul').slice(0, 100)}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-slate-400">
                {mazeMissionsLoading
                  ? 'Memuat misi yang sudah tersimpan…'
                  : mazeQuestionId !== null
                    ? 'Mode edit: perubahan akan memperbarui misi yang dipilih.'
                    : mazeMissions.length > 0
                      ? `${mazeMissions.length} misi ditemukan. Pilih misi lama untuk mengeditnya, atau buat misi baru.`
                      : 'Belum ada misi Maze pada kegiatan ini. Anda dapat membuat misi baru.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="text-xs text-slate-300 space-y-1">
                Lebar papan (2–12)
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={mazeWidth}
                  onChange={(e) => {
                    const value = Math.max(2, Math.min(12, Number(e.target.value) || 2))
                    setMazeWidth(value)
                    setMazeStart((p) => ({ ...p, x: Math.min(p.x, value - 1) }))
                    setMazeTarget((p) => ({ ...p, x: Math.min(p.x, value - 1) }))
                    setMazeObstacles((prev) => prev.filter((p) => p.x < value))
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </label>

              <label className="text-xs text-slate-300 space-y-1">
                Tinggi papan (2–12)
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={mazeHeight}
                  onChange={(e) => {
                    const value = Math.max(2, Math.min(12, Number(e.target.value) || 2))
                    setMazeHeight(value)
                    setMazeStart((p) => ({ ...p, y: Math.min(p.y, value - 1) }))
                    setMazeTarget((p) => ({ ...p, y: Math.min(p.y, value - 1) }))
                    setMazeObstacles((prev) => prev.filter((p) => p.y < value))
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white"
                />
              </label>

              <label className="text-xs text-slate-300 space-y-1 col-span-2 sm:col-span-1">
                Tingkat kesulitan
                <select
                  value={mazeDifficulty}
                  onChange={(e) => setMazeDifficulty(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-white"
                >
                  <option value="easy">Mudah</option>
                  <option value="medium">Sedang</option>
                  <option value="hard">Sulit</option>
                </select>
              </label>
            </div>

            <label className="block text-xs text-slate-300 space-y-1">
              Instruksi misi untuk siswa
              <textarea
                rows={2}
                value={mazeQuestionText}
                onChange={(e) => setMazeQuestionText(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white"
              />
            </label>

            <div className="space-y-2">
              <p className="text-sm font-bold">
                Pilih tindakan, lalu klik kotak papan:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setMazeEditMode('start')}
                  className={`rounded-xl px-3 py-2 text-xs font-bold border ${
                    mazeEditMode === 'start'
                      ? 'bg-sky-600 border-sky-400'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  🤖 Atur Robot
                </button>
                <button
                  onClick={() => setMazeEditMode('target')}
                  className={`rounded-xl px-3 py-2 text-xs font-bold border ${
                    mazeEditMode === 'target'
                      ? 'bg-amber-500 text-black border-amber-300'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  ⭐ Atur Bintang
                </button>
                <button
                  onClick={() => setMazeEditMode('obstacle')}
                  className={`rounded-xl px-3 py-2 text-xs font-bold border ${
                    mazeEditMode === 'obstacle'
                      ? 'bg-rose-600 border-rose-400'
                      : 'bg-slate-900 border-slate-700'
                  }`}
                >
                  🧱 Tambah/Hapus Rintangan
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Robot: ({mazeStart.x}, {mazeStart.y}) · Bintang: ({mazeTarget.x}, {mazeTarget.y}) ·
                Rintangan: {mazeObstacles.length}
              </p>
            </div>

            <div className="flex justify-center overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 p-3">
              <div
                className="grid gap-1"
                style={{
                  gridTemplateColumns: `repeat(${mazeWidth}, minmax(0, 1fr))`,
                  width: 'min(100%, 520px)',
                  minWidth: `${mazeWidth * 30}px`,
                }}
              >
                {Array.from({ length: mazeHeight * mazeWidth }, (_, index) => {
                  const x = index % mazeWidth
                  const y = Math.floor(index / mazeWidth)
                  const isStart = mazeStart.x === x && mazeStart.y === y
                  const isTarget = mazeTarget.x === x && mazeTarget.y === y
                  const isObstacle = mazeObstacles.some(
                    (p) => p.x === x && p.y === y
                  )

                  return (
                    <button
                      key={`${x}-${y}`}
                      type="button"
                      onClick={() => handleMazeCellClick(x, y)}
                      title={`Koordinat (${x}, ${y})`}
                      className={`aspect-square min-w-0 rounded-lg border flex items-center justify-center text-lg sm:text-xl transition-colors ${
                        isStart
                          ? 'bg-sky-500/30 border-sky-400'
                          : isTarget
                            ? 'bg-amber-400/20 border-amber-400'
                            : isObstacle
                              ? 'bg-rose-700 border-rose-500'
                              : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {isStart ? '🤖' : isTarget ? '⭐' : isObstacle ? '🧱' : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Koordinat dimulai dari (0, 0) di pojok kiri atas.{' '}
              {mazeQuestionId !== null
                ? 'Saat disimpan, misi yang dipilih akan diperbarui.'
                : 'Saat disimpan, misi baru akan ditambahkan tanpa menghapus misi lama.'}
            </p>

            <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                onClick={() => setIsMazeEditorOpen(false)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleSaveMazeMission}
                disabled={mazeSaving}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-5 py-2 text-xs font-bold text-white"
              >
                {mazeSaving
                  ? 'Menyimpan...'
                  : mazeQuestionId !== null
                    ? '💾 Simpan Perubahan'
                    : '💾 Simpan Misi Baru'}
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
