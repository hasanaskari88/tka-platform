'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Form State Tambah Ujian Baru
  const [title, setTitle] = useState('')
  const [subtest, setSubtest] = useState('KUANTITATIF')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(15)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const fetchExams = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setExams(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchExams()
  }, [])

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMsg(null)

    const supabase = createClient()
    const { error } = await supabase.from('exams').insert([
      {
        title,
        subtest: subtest.toUpperCase(),
        description,
        duration_minutes: Number(duration),
      },
    ])

    if (error) {
      setMsg(`Error: ${error.message}`)
    } else {
      setMsg('Ujian baru berhasil ditambahkan!')
      setTitle('')
      setDescription('')
      fetchExams()
    }
    setIsSubmitting(false)
  }

  const handleDeleteExam = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus ujian ini beserta seluruh soalnya?')) return

    const supabase = createClient()
    await supabase.from('exams').delete().eq('id', id)
    fetchExams()
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="p-8 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b pb-4 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Dashboard Admin / CMS
            </h1>
            <p className="text-slate-600 mt-1">
              Kelola ujian, subtes, dan butir soal TKA
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
          >
            ← Lihat Beranda Utama
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Buat Ujian Baru (1 Kolom) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
            <h2 className="text-lg font-bold text-slate-800 mb-4 pb-2 border-b">
              ➕ Tambah Ujian Baru
            </h2>

            {msg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium mb-4 ${
                  msg.startsWith('Error')
                    ? 'bg-red-50 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {msg}
              </div>
            )}

            <form onSubmit={handleCreateExam} className="space-y-4">
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Subtes
                </label>
                <select
                  value={subtest}
                  onChange={(e) => setSubtest(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  <option value="KUANTITATIF">KUANTITATIF</option>
                  <option value="PENALARAN">PENALARAN</option>
                  <option value="LITERASI">LITERASI</option>
                  <option value="BAHASA INGGRIS">BAHASA INGGRIS</option>
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Deskripsi / Petunjuk
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Contoh: Latihan soal aljabar dan geometri dasar."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Simpan...' : 'Simpan Ujian'}
              </button>
            </form>
          </div>

          {/* Daftar Ujian Aktif (2 Kolom) */}
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
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
                        {exam.subtest}
                      </span>
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
                    {/* Tombol Baru: Rekap Nilai */}
                    <Link
                      href={`/admin/exam/${exam.id}/results`}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      📊 Rekap Nilai
                    </Link>
                    <Link
                      href={`/admin/exam/${exam.id}`}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Kelola Soal →
                    </Link>
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
                Belum ada paket ujian. Silakan buat ujian baru di formulir sebelah kiri.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}