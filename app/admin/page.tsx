'use client'

import { useEffect, useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import MathRenderer from '@/components/MathRenderer'

function AdminDashboardContent() {
  const [exams, setExams] = useState<any[]>([])
  const [subtests, setSubtests] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [materials, setMaterials] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // State Form Edit / Tambah Ujian
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [selectedSubtest, setSelectedSubtest] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(15)
  const [examToken, setExamToken] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isPublished, setIsPublished] = useState(true)

  // State Toggle Pengaturan CBT
  const [shuffleQuestions, setShuffleQuestions] = useState(true)
  const [shuffleOptions, setShuffleOptions] = useState(true)
  const [showResults, setShowResults] = useState(true)
  const [showExplanations, setShowExplanations] = useState(true)

  // State Modal Master Subtes
  const [isSubtestModalOpen, setIsSubtestModalOpen] = useState(false)
  const [newSubtestName, setNewSubtestName] = useState('')
  const [editingSubtestId, setEditingSubtestId] = useState<string | null>(null)
  const [editingSubtestName, setEditingSubtestName] = useState('')

  // 📢 State Modal Kelola Pengumuman & Materi
  const [isCMSModalOpen, setIsCMSModalOpen] = useState(false)
  const [cmsTab, setCmsTab] = useState<'announcement' | 'material'>('announcement')

  // Mode View Editor CMS ('split' | 'edit' | 'preview')
  const [annViewMode, setAnnViewMode] = useState<'split' | 'edit' | 'preview'>('split')
  const [matViewMode, setMatViewMode] = useState<'split' | 'edit' | 'preview'>('split')

  // Form Pengumuman
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null)
  const [annTitle, setAnnTitle] = useState('')
  const [annContent, setAnnContent] = useState('')
  const [annCategory, setAnnCategory] = useState('Penting')

  // Form Materi
  const [editingMatId, setEditingMatId] = useState<string | null>(null)
  const [matTitle, setMatTitle] = useState('')
  const [matUrl, setMatUrl] = useState('')
  const [matDesc, setMatDesc] = useState('')
  const [matSubject, setMatSubject] = useState('Umum')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const fetchData = async () => {
    const supabase = createClient()

    // 1. Subtests
    const { data: subtestData } = await supabase
      .from('subtests')
      .select('*')
      .order('name', { ascending: true })

    if (subtestData) {
      setSubtests(subtestData)
      if (subtestData.length > 0 && !selectedSubtest) {
        setSelectedSubtest(subtestData[0].name)
      }
    }

    // 2. Exams
    const { data: examData } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })

    if (examData) setExams(examData)

    // 3. Announcements (Fault-tolerant)
    try {
      const { data: annData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
      if (annData) setAnnouncements(annData)
    } catch (e) {}

    // 4. Materials (Fault-tolerant)
    try {
      const { data: matData } = await supabase
        .from('study_materials')
        .select('*')
        .order('created_at', { ascending: false })
      if (matData) setMaterials(matData)
    } catch (e) {}

    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const generateRandomToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let generated = ''
    for (let i = 0; i < 6; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setExamToken(generated)
  }

  const resetForm = () => {
    setEditingExamId(null)
    setTitle('')
    if (subtests.length > 0) setSelectedSubtest(subtests[0].name)
    setDescription('')
    setDuration(15)
    setExamToken('')
    setStartTime('')
    setEndTime('')
    setIsPublished(true)
    setShuffleQuestions(true)
    setShuffleOptions(true)
    setShowResults(true)
    setShowExplanations(true)
    setMsg(null)
  }

  const handleEditClick = (exam: any) => {
    setEditingExamId(exam.id)
    setTitle(exam.title || '')
    setSelectedSubtest(exam.subtest || (subtests[0]?.name || 'KUANTITATIF'))
    setDescription(exam.description || '')
    setDuration(exam.duration_minutes || 15)
    setExamToken(exam.token || '')
    setIsPublished(exam.is_published ?? true)
    setShuffleQuestions(exam.shuffle_questions ?? true)
    setShuffleOptions(exam.shuffle_options ?? true)
    setShowResults(exam.show_results ?? true)
    setShowExplanations(exam.show_explanations ?? true)

    if (exam.start_time) {
      const dt = new Date(exam.start_time)
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
      setStartTime(dt.toISOString().slice(0, 16))
    } else {
      setStartTime('')
    }

    if (exam.end_time) {
      const dt = new Date(exam.end_time)
      dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
      setEndTime(dt.toISOString().slice(0, 16))
    } else {
      setEndTime('')
    }

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMsg(null)

    const supabase = createClient()
    const payload = {
      title,
      subtest: selectedSubtest.toUpperCase(),
      description,
      duration_minutes: Number(duration),
      token: examToken.trim() ? examToken.trim().toUpperCase() : null,
      start_time: startTime ? new Date(startTime).toISOString() : null,
      end_time: endTime ? new Date(endTime).toISOString() : null,
      is_published: isPublished,
      shuffle_questions: shuffleQuestions,
      shuffle_options: shuffleOptions,
      show_results: showResults,
      show_explanations: showExplanations,
    }

    let error: any = null

    if (editingExamId) {
      const res = await supabase.from('exams').update(payload).eq('id', editingExamId)
      error = res.error
    } else {
      const res = await supabase.from('exams').insert([payload])
      error = res.error
    }

    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg(editingExamId ? 'Paket ujian berhasil diperbarui!' : 'Ujian baru berhasil ditambahkan!')
      resetForm()
      fetchData()
    }
    setIsSubmitting(false)
  }

  const handleDeleteExam = async (id: string, examTitle: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ujian "${examTitle}" beserta seluruh soalnya?`)) return
    const supabase = createClient()
    await supabase.from('exams').delete().eq('id', id)
    fetchData()
  }

  const handleTogglePublish = async (exam: any) => {
    const supabase = createClient()
    const newStatus = !exam.is_published
    await supabase.from('exams').update({ is_published: newStatus }).eq('id', exam.id)
    fetchData()
  }

  // --- CRUD SUBTESTS ---
  const handleAddSubtest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSubtestName.trim()) return
    const supabase = createClient()
    const { error } = await supabase.from('subtests').insert([{ name: newSubtestName.trim().toUpperCase() }])
    if (error) alert(`Gagal menambah subtes: ${error.message}`)
    else {
      setNewSubtestName('')
      fetchData()
    }
  }

  const handleUpdateSubtest = async (id: string) => {
    if (!editingSubtestName.trim()) return
    const supabase = createClient()
    const { error } = await supabase.from('subtests').update({ name: editingSubtestName.trim().toUpperCase() }).eq('id', id)
    if (error) alert(`Gagal mengubah subtes: ${error.message}`)
    else {
      setEditingSubtestId(null)
      setEditingSubtestName('')
      fetchData()
    }
  }

  const handleDeleteSubtest = async (id: string, name: string) => {
    if (!confirm(`Hapus opsi subtes "${name}"?`)) return
    const supabase = createClient()
    await supabase.from('subtests').delete().eq('id', id)
    fetchData()
  }

  // --- 📢 CRUD PENGUMUMAN (DENGAN EDIT & TOOLBAR) ---
  const resetAnnForm = () => {
    setEditingAnnId(null)
    setAnnTitle('')
    setAnnContent('')
    setAnnCategory('Penting')
  }

  const handleSaveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!annTitle.trim() || !annContent.trim()) return alert('Judul dan konten pengumuman wajib diisi!')
    const supabase = createClient()

    if (editingAnnId) {
      const { error } = await supabase
        .from('announcements')
        .update({ title: annTitle, content: annContent, category: annCategory })
        .eq('id', editingAnnId)

      if (error) alert(`Gagal memperbarui pengumuman: ${error.message}`)
      else {
        alert('✅ Pengumuman berhasil diperbarui!')
        resetAnnForm()
        fetchData()
      }
    } else {
      const { error } = await supabase.from('announcements').insert([
        { title: annTitle, content: annContent, category: annCategory, is_active: true },
      ])
      if (error) alert(`Gagal menambah pengumuman: ${error.message}`)
      else {
        resetAnnForm()
        fetchData()
      }
    }
  }

  const handleEditAnnClick = (ann: any) => {
    setEditingAnnId(ann.id)
    setAnnTitle(ann.title || '')
    setAnnContent(ann.content || '')
    setAnnCategory(ann.category || 'Penting')
  }

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Hapus pengumuman ini?')) return
    const supabase = createClient()
    await supabase.from('announcements').delete().eq('id', id)
    if (editingAnnId === id) resetAnnForm()
    fetchData()
  }

  // --- 📚 CRUD MATERI (DENGAN EDIT & TOOLBAR) ---
  const resetMatForm = () => {
    setEditingMatId(null)
    setMatTitle('')
    setMatUrl('')
    setMatDesc('')
    setMatSubject('Umum')
  }

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!matTitle.trim() || !matUrl.trim()) return alert('Judul dan URL Materi wajib diisi!')
    const supabase = createClient()

    if (editingMatId) {
      const { error } = await supabase
        .from('study_materials')
        .update({ title: matTitle, file_url: matUrl, description: matDesc, subject: matSubject })
        .eq('id', editingMatId)

      if (error) alert(`Gagal memperbarui materi: ${error.message}`)
      else {
        alert('✅ Modul materi berhasil diperbarui!')
        resetMatForm()
        fetchData()
      }
    } else {
      const { error } = await supabase.from('study_materials').insert([
        { title: matTitle, file_url: matUrl, description: matDesc, subject: matSubject },
      ])
      if (error) alert(`Gagal menambah materi: ${error.message}`)
      else {
        resetMatForm()
        fetchData()
      }
    }
  }

  const handleEditMatClick = (mat: any) => {
    setEditingMatId(mat.id)
    setMatTitle(mat.title || '')
    setMatUrl(mat.file_url || '')
    setMatDesc(mat.description || '')
    setMatSubject(mat.subject || 'Umum')
  }

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Hapus materi ini?')) return
    const supabase = createClient()
    await supabase.from('study_materials').delete().eq('id', id)
    if (editingMatId === id) resetMatForm()
    fetchData()
  }

  // Helper Sisip Teks untuk Toolbar
  const insertAnnText = (str: string) => {
    setAnnContent((prev) => prev + str)
  }

  const insertMatText = (str: string) => {
    setMatDesc((prev) => prev + str)
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navbar />

      <main className="p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between md:items-center border-b pb-4 border-slate-200 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Dashboard Admin / CMS
            </h1>
            <p className="text-slate-600 mt-1">
              Kelola paket ujian, token, pengumuman, modul materi, dan visibilitas CBT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsCMSModalOpen(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>📢</span>
              <span>Kelola Pengumuman & Materi</span>
            </button>
            <button
              onClick={() => setIsSubtestModalOpen(true)}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
              suppressHydrationWarning
            >
              <span>⚙️</span>
              <span>Kelola Dropdown Subtes</span>
            </button>
            <Link
              href="/admin/users"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              👥 Akun & Admin
            </Link>
            <Link
              href="/"
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
            >
              ← Lihat Beranda
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Buat / Edit Ujian */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit space-y-4">
            <div className="flex justify-between items-center pb-2 border-b">
              <h2 className="text-lg font-bold text-slate-800">
                {editingExamId ? '✏️ Edit Paket Ujian' : '➕ Tambah Ujian Baru'}
              </h2>
              {editingExamId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-semibold transition-colors"
                  suppressHydrationWarning
                >
                  ✕ Batal Edit
                </button>
              )}
            </div>

            {msg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  msg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleSaveExam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Judul Ujian / Paket
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Simulasi TKA Kuantitatif - Sesi 2"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
              </div>

              {/* Select Option Subtes Dinamis */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Pilihan Subtes
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSubtestModalOpen(true)}
                    className="text-[11px] text-amber-600 font-bold hover:underline"
                    suppressHydrationWarning
                  >
                    + Edit Opsi Subtes
                  </button>
                </div>
                <select
                  value={selectedSubtest}
                  onChange={(e) => setSelectedSubtest(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-indigo-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                >
                  {subtests.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Durasi (Menit)
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
              </div>

              {/* Status Visibilitas ke Siswa */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1">
                <label className="block text-xs font-bold text-indigo-900 uppercase">
                  👁 Status Tampilan di Layar Siswa
                </label>
                <select
                  value={isPublished ? 'published' : 'hidden'}
                  onChange={(e) => setIsPublished(e.target.value === 'published')}
                  className="w-full px-3 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold text-indigo-800 bg-white"
                  suppressHydrationWarning
                >
                  <option value="published">🟢 Tampilkan di Layar Siswa (Published)</option>
                  <option value="hidden">🔴 Sembunyikan dari Siswa (Draft / Hidden)</option>
                </select>
              </div>

              {/* Token Ujian */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Token Ujian (Dapat Diubah)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Kosongkan jika bebas"
                    value={examToken}
                    onChange={(e) => setExamToken(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono font-bold uppercase text-indigo-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={generateRandomToken}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border transition-colors shrink-0"
                    title="Acak Token Baru"
                    suppressHydrationWarning
                  >
                    🎲 Acak
                  </button>
                </div>
              </div>

              {/* Jadwal Buka & Tutup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Jadwal Buka
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Jadwal Tutup
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    suppressHydrationWarning
                  />
                </div>
              </div>

              {/* Toggle Pengaturan Fitur CBT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <span className="block text-xs font-bold text-slate-800 uppercase">
                  ⚙️ Pengaturan Fitur Ujian
                </span>

                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded text-indigo-600"
                    suppressHydrationWarning
                  />
                  <span className="font-medium text-slate-700">🔀 Acak Urutan Soal</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={(e) => setShuffleOptions(e.target.checked)}
                    className="rounded text-indigo-600"
                    suppressHydrationWarning
                  />
                  <span className="font-medium text-slate-700">🔀 Acak Pilihan Opsi (A/B/C/D)</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showResults}
                    onChange={(e) => setShowResults(e.target.checked)}
                    className="rounded text-indigo-600"
                    suppressHydrationWarning
                  />
                  <span className="font-medium text-slate-700">📊 Tampilkan Nilai Setelah Selesai</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={(e) => setShowExplanations(e.target.checked)}
                    className="rounded text-indigo-600"
                    suppressHydrationWarning
                  />
                  <span className="font-medium text-slate-700">💡 Tampilkan Kunci & Pembahasan</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Deskripsi / Petunjuk
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Latihan soal aljabar dan geometri dasar."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  suppressHydrationWarning
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-2.5 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50 ${
                  editingExamId
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
                suppressHydrationWarning
              >
                {isSubmitting
                  ? 'Menyimpan...'
                  : editingExamId
                  ? 'Simpan Perubahan Paket Ujian'
                  : 'Simpan Ujian Baru'}
              </button>
            </form>
          </div>

          {/* Daftar Ujian Aktif */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold text-slate-800">
              📋 Daftar Ujian Terdaftar ({exams.length})
            </h2>

            {loading ? (
              <p className="text-slate-500 text-sm">Memuat daftar ujian...</p>
            ) : exams.length > 0 ? (
              exams.map((exam) => (
                <div
                  key={exam.id}
                  className={`bg-white p-5 rounded-xl border shadow-sm space-y-3 ${
                    exam.is_published ? 'border-slate-200' : 'border-amber-300 bg-amber-50/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                          {exam.subtest}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleTogglePublish(exam)}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer transition-colors ${
                            exam.is_published
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                          title="Klik untuk mengubah status visibilitas siswa"
                          suppressHydrationWarning
                        >
                          {exam.is_published ? '🟢 Tampil pada Siswa' : '🔴 Sembunyi dari Siswa'}
                        </button>

                        <span className="text-xs text-slate-400">
                          ⏱ {exam.duration_minutes} Menit
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-800 mt-1">
                        {exam.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {exam.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleEditClick(exam)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-xs font-bold rounded-lg transition-colors"
                        suppressHydrationWarning
                      >
                        ✏️ Edit
                      </button>
                      <Link
                        href={`/admin/exam/${exam.id}/results`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        📊 Rekap Nilai
                      </Link>
                      <Link
                        href={`/admin/exam/${exam.id}/monitor`}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        👁️ Pengawasan Live
                      </Link>
                      {/* TOMBOL NAVIGASI PENGATURAN MODE LATIHAN & GAME */}
                      <Link
                        href="/admin/practice"
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-2"
                      >
                        <span>🎮 Kelola Mode Latihan & Game Edukatif →</span>
                      </Link>
                      <Link
                        href={`/admin/exam/${exam.id}`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        Kelola Soal →
                      </Link>
                      <button
                        onClick={() => handleDeleteExam(exam.id, exam.title)}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                        suppressHydrationWarning
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[11px] pt-2 border-t border-slate-100">
                    {exam.token ? (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-mono font-bold">
                        🔑 Token: {exam.token}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-semibold">
                        🔓 Tanpa Token
                      </span>
                    )}

                    {exam.shuffle_questions && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-medium">
                        🔀 Soal Diacak
                      </span>
                    )}

                    {exam.shuffle_options && (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded font-medium">
                        🔀 Opsi Diacak
                      </span>
                    )}

                    {exam.show_results ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-medium">
                        📊 Tampil Nilai
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-medium">
                        🚫 Nilai Sembunyi
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                Belum ada paket ujian.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 📢 MODAL HIGH-TECH CMS PENGUMUMAN & MATERI (DENGAN DUAL VIEW & RICH TOOLBAR) */}
      {isCMSModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-xs">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col overflow-hidden">
            {/* HEAD MODAL */}
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-extrabold text-slate-800 flex items-center space-x-2">
                <span>📢</span>
                <span>CMS Pengumuman & Modul Materi Siswa</span>
              </h3>
              <button
                onClick={() => {
                  setIsCMSModalOpen(false)
                  resetAnnForm()
                  resetMatForm()
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-base"
                suppressHydrationWarning
              >
                ✕
              </button>
            </div>

            {/* TAB NAVIGASI MODAL */}
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setCmsTab('announcement')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  cmsTab === 'announcement' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                📢 Pengumuman Sekolah ({announcements.length})
              </button>
              <button
                type="button"
                onClick={() => setCmsTab('material')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                  cmsTab === 'material' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600'
                }`}
              >
                📚 Link Materi & Modul ({materials.length})
              </button>
            </div>

            {/* KONTEN TAB 1: PENGUMUMAN */}
            {cmsTab === 'announcement' && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* FORM INPUT / EDIT PENGUMUMAN DENGAN DUAL VIEW */}
                <form onSubmit={handleSaveAnnouncement} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-900 uppercase text-xs">
                        {editingAnnId ? '✏️ Edit Pengumuman' : '➕ Tambah Pengumuman Baru'}
                      </span>
                      {editingAnnId && (
                        <button
                          type="button"
                          onClick={resetAnnForm}
                          className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold hover:bg-rose-200"
                        >
                          ✕ Batal Edit
                        </button>
                      )}
                    </div>

                    {/* SWITCHER VIEW MODE */}
                    <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setAnnViewMode('edit')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          annViewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        ✏️ Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnViewMode('split')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          annViewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        🌓 Dual View
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnnViewMode('preview')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          annViewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        👁️ Live Preview
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">JUDUL PENGUMUMAN</label>
                      <input
                        type="text"
                        required
                        placeholder="Misal: Ujian Sekolah Dimulai Tanggal 28 Oktober..."
                        value={annTitle}
                        onChange={(e) => setAnnTitle(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">KATEGORI</label>
                      <select
                        value={annCategory}
                        onChange={(e) => setAnnCategory(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        <option value="Penting">Penting</option>
                        <option value="Informasi">Informasi</option>
                        <option value="Jadwal">Jadwal Ujian</option>
                        <option value="Instruksi">Instruksi Guru</option>
                      </select>
                    </div>
                  </div>

                  {/* TOOLBAR FORMATTING TEKS / FORMAT / TABEL / RUMUS */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">KONTEN PENGUMUMAN & DESKRIPSI</label>

                    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-200/80 rounded-xl border border-slate-300">
                      <button
                        type="button"
                        onClick={() => insertAnnText('**Teks Tebal**')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-slate-800"
                        title="Teks Tebal"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText('*Teks Miring*')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded italic font-bold text-[10px] text-slate-800"
                        title="Teks Miring"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText('<u>Teks Garis Bawah</u>')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded underline font-bold text-[10px] text-slate-800"
                        title="Garis Bawah"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText('~~Teks Coret~~')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded line-through font-bold text-[10px] text-slate-800"
                        title="Coret"
                      >
                        S
                      </button>

                      <div className="w-px h-4 bg-slate-300 mx-1 self-center" />

                      <button
                        type="button"
                        onClick={() => insertAnnText('\n<div align="center">\nTeks Rata Tengah\n</div>\n')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-slate-800"
                        title="Rata Tengah"
                      >
                        ↔ Tengah
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText('\n<div align="right">\nTeks Rata Kanan\n</div>\n')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-slate-800"
                        title="Rata Kanan"
                      >
                        ➡️ Kanan
                      </button>

                      <div className="w-px h-4 bg-slate-300 mx-1 self-center" />

                      <button
                        type="button"
                        onClick={() => insertAnnText('\n| Judul 1 | Judul 2 |\n|---|---|\n| Baris 1 | Data 1 |\n')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-indigo-700"
                        title="Sisipkan Tabel"
                      >
                        📊 Tabel
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText(' $\\frac{a}{b}$ ')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-purple-700"
                        title="Rumus Pecahan"
                      >
                        𝝅 Pecahan
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText(' $\\sqrt{x}$ ')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-purple-700"
                        title="Rumus Akar"
                      >
                        √ Akar
                      </button>
                      <button
                        type="button"
                        onClick={() => insertAnnText('\n![Gambar](https://url-gambar.com/foto.jpg)\n')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-emerald-700"
                        title="Sisipkan Gambar"
                      >
                        🖼️ Gambar
                      </button>
                    </div>
                  </div>

                  {/* AREA PENULISAN & LIVE PREVIEW DUAL VIEW */}
                  {annViewMode === 'edit' && (
                    <textarea
                      rows={6}
                      required
                      placeholder="Tuliskan isi pengumuman lengkap di sini..."
                      value={annContent}
                      onChange={(e) => setAnnContent(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                    />
                  )}

                  {annViewMode === 'preview' && (
                    <div className="p-4 bg-white border border-slate-300 rounded-xl min-h-[140px] text-slate-900">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block border-b pb-1 mb-2">
                        👁️ Live Preview Tampilan Siswa:
                      </span>
                      <MathRenderer content={annContent || '*Belum ada isi pengumuman...*'} />
                    </div>
                  )}

                  {annViewMode === 'split' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <textarea
                        rows={6}
                        required
                        placeholder="Tuliskan isi pengumuman lengkap di sini..."
                        value={annContent}
                        onChange={(e) => setAnnContent(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                      />
                      <div className="p-3 bg-white border border-slate-300 rounded-xl min-h-[140px] max-h-[180px] overflow-y-auto text-slate-900">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block border-b pb-1 mb-2">
                          👁️ Live Preview Tampilan Siswa:
                        </span>
                        <MathRenderer content={annContent || '*Belum ada isi pengumuman...*'} />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`w-full py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm ${
                      editingAnnId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {editingAnnId ? '💾 Perbarui Pengumuman' : '+ Simpan Pengumuman'}
                  </button>
                </form>

                {/* DAFTAR PENGUMUMAN DENGAN TOMBOL EDIT & HAPUS */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    Daftar Pengumuman Sekolah ({announcements.length}):
                  </span>

                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-3 rounded-xl border flex justify-between items-start gap-3 transition-colors ${
                        editingAnnId === ann.id ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded uppercase">
                            📌 {ann.category || 'Penting'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs">{ann.title}</h4>
                        <div className="text-[11px] text-slate-600 line-clamp-2">
                          <MathRenderer content={ann.content} />
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditAnnClick(ann)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KONTEN TAB 2: MATERI */}
            {cmsTab === 'material' && (
              <div className="space-y-4 overflow-y-auto pr-1 flex-1">
                {/* FORM INPUT / EDIT MATERI DENGAN DUAL VIEW */}
                <form onSubmit={handleSaveMaterial} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-indigo-900 uppercase text-xs">
                        {editingMatId ? '✏️ Edit Link Materi' : '➕ Tambah Link Materi Baru'}
                      </span>
                      {editingMatId && (
                        <button
                          type="button"
                          onClick={resetMatForm}
                          className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold hover:bg-rose-200"
                        >
                          ✕ Batal Edit
                        </button>
                      )}
                    </div>

                    {/* SWITCHER VIEW MODE */}
                    <div className="flex items-center space-x-1 bg-white p-0.5 rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setMatViewMode('edit')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          matViewMode === 'edit' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        ✏️ Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatViewMode('split')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          matViewMode === 'split' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        🌓 Dual View
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatViewMode('preview')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded ${
                          matViewMode === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        👁️ Live Preview
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">JUDUL MATERI / MODUL</label>
                      <input
                        type="text"
                        required
                        placeholder="Misal: Modul Belajar Matematika Sesi 1 (PDF)..."
                        value={matTitle}
                        onChange={(e) => setMatTitle(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">SUBJEK / TOPIK</label>
                      <input
                        type="text"
                        placeholder="Misal: Matematika"
                        value={matSubject}
                        onChange={(e) => setMatSubject(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">URL / LINK MATERI (GOOGLE DRIVE / PDF / YOUTUBE)</label>
                    <input
                      type="text"
                      required
                      placeholder="https://drive.google.com/file/d/..."
                      value={matUrl}
                      onChange={(e) => setMatUrl(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  {/* TOOLBAR FORMATTING DESKRIPSI MATERI */}
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">DESKRIPSI RINGKAS MATERI</label>
                    <div className="flex flex-wrap gap-1 p-1.5 bg-slate-200/80 rounded-xl border border-slate-300">
                      <button
                        type="button"
                        onClick={() => insertMatText('**Teks Tebal**')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-slate-800"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMatText('*Teks Miring*')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded italic font-bold text-[10px] text-slate-800"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertMatText(' $\\frac{a}{b}$ ')}
                        className="px-2 py-1 bg-white hover:bg-indigo-50 border rounded font-bold text-[10px] text-purple-700"
                      >
                        𝝅 Pecahan
                      </button>
                    </div>
                  </div>

                  {/* AREA PENULISAN & LIVE PREVIEW DUAL VIEW */}
                  {matViewMode === 'edit' && (
                    <textarea
                      rows={3}
                      placeholder="Tuliskan deskripsi materi untuk siswa..."
                      value={matDesc}
                      onChange={(e) => setMatDesc(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-xl font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                    />
                  )}

                  {matViewMode === 'preview' && (
                    <div className="p-3 bg-white border border-slate-300 rounded-xl min-h-[80px] text-slate-900">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase block border-b pb-1 mb-1">
                        👁️ Live Preview Deskripsi:
                      </span>
                      <MathRenderer content={matDesc || '*Belum ada deskripsi...*'} />
                    </div>
                  )}

                  {matViewMode === 'split' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <textarea
                        rows={3}
                        placeholder="Tuliskan deskripsi materi untuk siswa..."
                        value={matDesc}
                        onChange={(e) => setMatDesc(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl font-medium bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 shadow-inner"
                      />
                      <div className="p-3 bg-white border border-slate-300 rounded-xl min-h-[80px] max-h-[120px] overflow-y-auto text-slate-900">
                        <span className="text-[10px] font-bold text-indigo-600 uppercase block border-b pb-1 mb-1">
                          👁️ Live Preview Deskripsi:
                        </span>
                        <MathRenderer content={matDesc || '*Belum ada deskripsi...*'} />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`w-full py-2.5 text-white font-bold rounded-xl transition-colors shadow-sm ${
                      editingMatId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {editingMatId ? '💾 Perbarui Modul Materi' : '+ Simpan Link Materi'}
                  </button>
                </form>

                {/* DAFTAR MATERI DENGAN TOMBOL EDIT & HAPUS */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">
                    Daftar Materi & Modul Belajar ({materials.length}):
                  </span>

                  {materials.map((mat) => (
                    <div
                      key={mat.id}
                      className={`p-3 rounded-xl border flex justify-between items-start gap-3 transition-colors ${
                        editingMatId === mat.id ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-400' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold rounded uppercase inline-block">
                          📖 {mat.subject || 'Umum'}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs">{mat.title}</h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">{mat.file_url}</p>
                        <div className="text-[11px] text-slate-600 line-clamp-1">
                          <MathRenderer content={mat.description || '-'} />
                        </div>
                      </div>

                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditMatClick(mat)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded transition-colors"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 border-t text-right">
              <button
                type="button"
                onClick={() => {
                  setIsCMSModalOpen(false)
                  resetAnnForm()
                  resetMatForm()
                }}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
                suppressHydrationWarning
              >
                Tutup Modal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KELOLA MASTER SUBTES */}
      {isSubtestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans text-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-base font-bold text-slate-800">
                ⚙️ Kelola Pilihan Dropdown Subtes
              </h3>
              <button
                onClick={() => setIsSubtestModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                suppressHydrationWarning
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubtest} className="flex space-x-2">
              <input
                type="text"
                required
                placeholder="Nama Subtes Baru (cth: BIOLOGI)"
                value={newSubtestName}
                onChange={(e) => setNewSubtestName(e.target.value)}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                suppressHydrationWarning
              />
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shrink-0"
                suppressHydrationWarning
              >
                + Tambah
              </button>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {subtests.map((st) => (
                <div
                  key={st.id}
                  className="flex justify-between items-center p-2.5 bg-slate-50 border rounded-lg text-xs"
                >
                  {editingSubtestId === st.id ? (
                    <div className="flex items-center space-x-1 flex-1 mr-2">
                      <input
                        type="text"
                        value={editingSubtestName}
                        onChange={(e) => setEditingSubtestName(e.target.value)}
                        className="px-2 py-1 border rounded text-xs uppercase font-bold flex-1 bg-white text-slate-900"
                        suppressHydrationWarning
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateSubtest(st.id)}
                        className="px-2 py-1 bg-emerald-600 text-white font-bold rounded"
                        suppressHydrationWarning
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSubtestId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded"
                        suppressHydrationWarning
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-slate-800">{st.name}</span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSubtestId(st.id)
                            setEditingSubtestName(st.name)
                          }}
                          className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded"
                          suppressHydrationWarning
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtest(st.id, st.name)}
                          className="px-2 py-1 bg-red-50 text-red-600 font-bold rounded"
                          suppressHydrationWarning
                        >
                          Hapus
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t text-right">
              <button
                type="button"
                onClick={() => setIsSubtestModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                suppressHydrationWarning
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat dashboard admin...</p>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  )
}