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

  // 🟢 2. HANDLER BUKA MODAL (EDIT ATAU TAMBAH BARU)
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

  // 🟢 3. HANDLER SIMPAN PAKET LATIHAN / GAME
  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      alert('Judul kegiatan wajib diisi!')
      return
    }

    const supabase = createClient()

    if (selectedExam) {
      // Update data yang ada
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
      // Tambah kegiatan latihan baru
      const { error } = await supabase.from('exams').insert([
        {
          title: formData.title,
          subtest: formData.subtest,
          description: formData.description,
          target_mode: formData.target_mode,
          activity_type: formData.activity_type,
          is_published: formData.is_published,
          duration_minutes: 30, // Default duration untuk latihan
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

  // 🟢 4. HANDLER TOGGLE PUBLISH SEKETIKA
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

  // 🟢 5. FILTER DATA SEMENTARA
  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'ALL' || (exam.activity_type || 'QUIZ') === filterType
    return matchesSearch && matchesType
  })

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* HEADER PANEL ADMIN */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/admin"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
          >
            ← Kemball ke Admin Dashboard
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
          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="🔍 Cari nama kegiatan atau modul..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-72 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />

          {/* TAB FILTER TIPE KEGIATAN */}
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
              // Badge Activity Type
              let actBadge = { label: '📝 Quiz Pilihan Ganda', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' }
              if (exam.activity_type === 'MAZE_GAME') {
                actBadge = { label: '🌀 Coding Maze Logika', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' }
              } else if (exam.activity_type === 'FLASHCARD') {
                actBadge = { label: '🃏 Flashcard Rumus', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' }
              }

              // Badge Target Mode
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
                    {/* BADGES METADATA */}
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

                  {/* TOMBOL KONTROL EDIT & PUBLISH */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
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

                    <div className="flex items-center space-x-2">
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

      {/* 🟢 MODUL PENGATURAN KEGIATAN & VISIBILITAS */}
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
              {/* JUDUL */}
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

              {/* TIPE KEGIATAN / GAME TYPE */}
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

              {/* VISIBILITAS SELEKSI HALAMAN */}
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

              {/* SUBTEST */}
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

              {/* DESKRIPSI */}
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

              {/* TOGGLE PUBLISH */}
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

              {/* FOOTER ACTION */}
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