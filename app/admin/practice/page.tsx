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

  // 🟢 1. FETCH SEMUA PAKET UJIAN / LATIHAN
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

  // 🟢 2. HANDLER AUTO GENERATOR SOAL OTOMATIS
  const handleAutoGenerateQuestions = async (exam: any) => {
    const confirmGen = confirm(
      `Apakah Anda ingin membuat 5 soal/konten otomatis untuk "${exam.title}" (${exam.activity_type || 'QUIZ'})?`
    )
    if (!confirmGen) return

    const supabase = createClient()
    let generatedQuestions: any[] = []

    if (exam.activity_type === 'QUIZ' || !exam.activity_type) {
      // Template Soal Matematika / TKA Pilihan Ganda
      generatedQuestions = [
        {
          exam_id: exam.id,
          question_text: 'Berapakah hasil perpangkatan dari $2^3 \\times 2^2$?',
          options: [
            { key: 'A', text: '16' },
            { key: 'B', text: '32' },
            { key: 'C', text: '64' },
            { key: 'D', text: '128' },
          ],
          correct_option: 'B',
          explanation: 'Sifat eksponen: $a^m \\times a^n = a^{m+n}$, maka $2^{3+2} = 2^5 = 32$.',
        },
        {
          exam_id: exam.id,
          question_text: 'Jika $x + 5 = 12$, berapakah nilai dari $2x - 3$?',
          options: [
            { key: 'A', text: '11' },
            { key: 'B', text: '14' },
            { key: 'C', text: '17' },
            { key: 'D', text: '21' },
          ],
          correct_option: 'A',
          explanation: '$x = 12 - 5 = 7$. Maka $2(7) - 3 = 14 - 3 = 11$.',
        },
        {
          exam_id: exam.id,
          question_text: 'Sebuah persegi memiliki panjang sisi $8\\text{ cm}$. Berapakah luas persegi tersebut?',
          options: [
            { key: 'A', text: '$32\\text{ cm}^2$' },
            { key: 'B', text: '$48\\text{ cm}^2$' },
            { key: 'C', text: '$64\\text{ cm}^2$' },
            { key: 'D', text: '$81\\text{ cm}^2$' },
          ],
          correct_option: 'C',
          explanation: 'Luas persegi = $\\text{sisi} \\times \\text{sisi} = 8 \\times 8 = 64\\text{ cm}^2$.',
        },
        {
          exam_id: exam.id,
          question_text: 'Berapakah kelipatan persekutuan terkecil (KPK) dari bilangan 6 dan 8?',
          options: [
            { key: 'A', text: '12' },
            { key: 'B', text: '18' },
            { key: 'C', text: '24' },
            { key: 'D', text: '48' },
          ],
          correct_option: 'C',
          explanation: 'Kelipatan 6: 6, 12, 18, 24... Kelipatan 8: 8, 16, 24... KPK = 24.',
        },
        {
          exam_id: exam.id,
          question_text: 'Hasil dari penjumlahan pecahan $\\frac{3}{4} + \\frac{1}{2}$ adalah...',
          options: [
            { key: 'A', text: '$\\frac{4}{6}$' },
            { key: 'B', text: '$\\frac{5}{4}$' },
            { key: 'C', text: '$\\frac{3}{8}$' },
            { key: 'D', text: '$\\frac{7}{4}$' },
          ],
          correct_option: 'B',
          explanation: 'Disamakan penyebutnya: $\\frac{3}{4} + \\frac{2}{4} = \\frac{5}{4} = 1\\frac{1}{4}$.',
        },
      ]
    } else if (exam.activity_type === 'FLASHCARD') {
      // Template Kartu Memori Rumus KaTeX
      generatedQuestions = [
        {
          exam_id: exam.id,
          question_text: 'Apa rumus Luas Lingkaran?',
          options: [],
          correct_option: 'A',
          explanation: 'Rumus Luas Lingkaran: $L = \\pi \\times r^2$ (dengan $\\pi = \\frac{22}{7}$ atau $3.14$).',
        },
        {
          exam_id: exam.id,
          question_text: 'Apa rumus Keliling Persegi Panjang?',
          options: [],
          correct_option: 'A',
          explanation: 'Rumus Keliling Persegi Panjang: $K = 2 \\times (p + l)$.',
        },
        {
          exam_id: exam.id,
          question_text: 'Bagaimana rumus Teorema Pythagoras untuk segitiga siku-siku?',
          options: [],
          correct_option: 'A',
          explanation: 'Rumus Pythagoras: $c^2 = a^2 + b^2$, di mana $c$ adalah sisi miring (hipotenusa).',
        },
      ]
    } else if (exam.activity_type === 'MAZE_GAME') {
      // Template Misi Game Labirin Coding
      generatedQuestions = [
        {
          exam_id: exam.id,
          question_text: 'Bantu Robot Maskot mencapai Bintang di titik (3, 3) pada Papan Grid!',
          options: [],
          correct_option: 'FORWARD',
          explanation: 'Susunan langkah: Maju 3x, Belok Kanan, Maju 3x.',
        },
      ]
    }

    const { error } = await supabase.from('questions').insert(generatedQuestions)

    if (error) {
      alert(`Gagal generate soal: ${error.message}`)
    } else {
      alert(
        `🎉 Berhasil membuat ${generatedQuestions.length} soal/konten otomatis! Silakan buka kembali halaman latihan.`
      )
      fetchExams()
    }
  }

  // 🟢 3. HANDLER BUKA MODAL (EDIT ATAU TAMBAH BARU)
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

  // 🟢 4. HANDLER SIMPAN PAKET LATIHAN / GAME
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

  // 🟢 5. HANDLER TOGGLE PUBLISH
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

  // 🟢 6. FILTER DATA SEMENTARA
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
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{exam.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {exam.description || 'Tidak ada deskripsi kegiatan.'}
                    </p>
                  </div>

                  {/* TOMBOL AKSI MANAJEMEN SOAL & AUTO GENERATOR */}
                  <div className="space-y-2 pt-3 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleAutoGenerateQuestions(exam)}
                        className="w-full py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
                        title="Buat 5 soal otomatis ke database"
                      >
                        <span>⚡ Auto Generate</span>
                      </button>

                      <Link
                        href={`/admin/exams/${exam.id}/questions`}
                        className="w-full py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold rounded-xl transition-all flex items-center justify-center space-x-1"
                      >
                        <span>✏️ Bank Soal</span>
                      </Link>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => handleTogglePublish(exam)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                          exam.is_published
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                        }`}
                      >
                        {exam.is_published ? '🟢 Dipublikasi' : '🔴 Diberhentikan'}
                      </button>

                      <button
                        onClick={() => handleOpenModal(exam)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
                      >
                        ⚙️ Pengaturan
                      </button>
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
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-sm"
              >
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
                <label className="block text-xs font-bold text-slate-300 mb-1">Kategori / Subtes</label>
                <input
                  type="text"
                  value={formData.subtest}
                  onChange={(e) => setFormData({ ...formData, subtest: e.target.value })}
                  placeholder="Matematika, Penalaran Logis, dll."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
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