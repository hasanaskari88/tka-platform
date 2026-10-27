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

  // State Modal Form Editor
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<any>(null)

  // State Form Input Adaptif
  const [formData, setFormData] = useState({
    // Umum / Quiz
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_option: 'A',
    explanation: '',
    image_url: '',
    // Maze Game Specific
    target_x: 3,
    target_y: 3,
  })

  // 🟢 1. FETCH DATA EXAM & SOAL/KONTEN GAME
  const fetchExamAndQuestions = async () => {
    if (!examId) return
    setLoading(true)
    const supabase = createClient()

    // Fetch detail exam
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

    // Fetch daftar soal / kartu / level
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

  // 🟢 2. HANDLER BUKA MODAL FORM ADAPTIF
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

  // 🟢 3. HANDLER SIMPAN ITEM / LEVEL GAME
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

  // 🟢 4. HANDLER HAPUS ITEM
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
      {/* HEADER ADAPTIF */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
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
                ? '🌀 KELOLA LEVEL CODING MAZE'
                : actType === 'FLASHCARD'
                ? '🃏 KELOLA KARTU FLASHCARD'
                : '📝 BANK SOAL QUIZ'}
            </span>
            <h1 className="text-lg font-black mt-0.5">
              {exam?.title} ({questions.length} {actType === 'QUIZ' ? 'Soal' : actType === 'FLASHCARD' ? 'Kartu' : 'Level'})
            </h1>
          </div>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all flex items-center space-x-2"
        >
          <span>
            ➕ Tambah {actType === 'QUIZ' ? 'Soal Manual' : actType === 'FLASHCARD' ? 'Kartu Baru' : 'Level Misi'}
          </span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* RINGKASAN MODUL */}
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex justify-between items-center text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 font-bold block">Detail Modul Kegiatan:</span>
            <p className="text-white font-bold">
              {exam?.title} — Subtes: {exam?.subtest || 'Umum'}
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
                      {actType === 'QUIZ' ? `Soal #${idx + 1}` : actType === 'FLASHCARD' ? `Kartu Memori #${idx + 1}` : `Misi Labirin #${idx + 1}`}
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

                  {/* TEKS UTAMA */}
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

                  {/* TAMPILAN KHUSUS QUIZ */}
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

                  {/* TAMPILAN KHUSUS FLASHCARD */}
                  {actType === 'FLASHCARD' && (
                    <div className="bg-amber-500/10 p-3.5 rounded-xl border border-amber-500/30 text-xs space-y-1">
                      <span className="font-bold text-amber-300 block">💡 Kartu Sisi Belakang (Pembahasan / Solusi):</span>
                      <div className="text-slate-200 leading-relaxed">
                        <MathRenderer content={q.explanation || q.pembahasan || 'Belum ada penjelasan.'} />
                      </div>
                    </div>
                  )}

                  {/* TAMPILAN KHUSUS MAZE GAME */}
                  {actType === 'MAZE_GAME' && (
                    <div className="bg-emerald-500/10 p-3.5 rounded-xl border border-emerald-500/30 text-xs space-y-1">
                      <span className="font-bold text-emerald-300 block">🎯 Koordinat Bintang Target:</span>
                      <p className="font-mono text-white">X: {q.target_x ?? 3}, Y: {q.target_y ?? 3}</p>
                    </div>
                  )}

                  {/* PEMBAHASAN UNTUK QUIZ */}
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
            <button
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md"
            >
              ➕ Tambah Item Pertama
            </button>
          </div>
        )}
      </main>

      {/* 🟢 MODAL FORM INPUT ADAPTIF BERDASARKAN activity_type */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-950 border border-slate-800 max-w-xl w-full rounded-3xl p-6 space-y-4 text-white shadow-2xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold flex items-center space-x-2">
                <span>⚙️</span>
                <span>
                  {editingQuestion ? 'Edit Data' : 'Tambah Baru'} (Mode:{' '}
                  {actType === 'MAZE_GAME' ? 'Coding Maze' : actType === 'FLASHCARD' ? 'Flashcard' : 'Quiz'})
                </span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-sm">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              {/* INPUT FORM ADAPTIF 1: QUIZ */}
              {actType === 'QUIZ' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Teks Pertanyaan (Mendukung Formula KaTeX)</label>
                    <textarea
                      rows={3}
                      required
                      value={formData.question_text}
                      onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                      placeholder="Contoh: Berapakah hasil dari $2^3 \times 2^2$?"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-2 pt-1 border-t border-slate-800">
                    <span className="block text-xs font-bold text-slate-300">Pilihan Jawaban (A-D):</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input type="text" value={formData.option_a} onChange={(e) => setFormData({ ...formData, option_a: e.target.value })} placeholder="Opsi A" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_b} onChange={(e) => setFormData({ ...formData, option_b: e.target.value })} placeholder="Opsi B" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_c} onChange={(e) => setFormData({ ...formData, option_c: e.target.value })} placeholder="Opsi C" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                      <input type="text" value={formData.option_d} onChange={(e) => setFormData({ ...formData, option_d: e.target.value })} placeholder="Opsi D" className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Kunci Jawaban Benar</label>
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

              {/* INPUT FORM ADAPTIF 2: FLASHCARD */}
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

              {/* INPUT FORM ADAPTIF 3: MAZE GAME */}
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

              {/* URL GAMBAR (OPSIONAL DENGAN CONTOH) */}
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