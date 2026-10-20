'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

function ExamResultsContent() {
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('ALL')

  useEffect(() => {
    if (!examId) return

    async function loadResults() {
      const supabase = createClient()

      // 1. Ambil Info Ujian
      const { data: examData } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single()

      if (examData) setExam(examData)

      // 2. Ambil Sesi Ujian yang 'completed' beserta data Profil Siswa
      const { data: sessionData, error } = await supabase
        .from('exam_sessions')
        .select(`
          id,
          score,
          start_time,
          end_time,
          status,
          user_id,
          profiles:user_id (
            full_name,
            username,
            class_code
          )
        `)
        .eq('exam_id', examId)
        .eq('status', 'completed')
        .order('score', { ascending: false })

      if (!error && sessionData) {
        setResults(sessionData)
      }

      setLoading(false)
    }

    loadResults()
  }, [examId])

  // Ambil daftar unik kode kelas untuk filter dropdown
  const classOptions = Array.from(
    new Set(
      results
        .map((r) => r.profiles?.class_code)
        .filter((c) => c && c.trim() !== '')
    )
  )

  // Filter hasil berdasarkan nama/username dan kode kelas
  const filteredResults = results.filter((r) => {
    const fullName = r.profiles?.full_name?.toLowerCase() || ''
    const username = r.profiles?.username?.toLowerCase() || ''
    const classCode = r.profiles?.class_code || ''

    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      username.includes(searchTerm.toLowerCase())

    const matchesClass =
      selectedClass === 'ALL' || classCode === selectedClass

    return matchesSearch && matchesClass
  })

  // Perhitungan Ringkasan Statistik
  const totalParticipants = results.length
  const avgScore =
    totalParticipants > 0
      ? results.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) /
        totalParticipants
      : 0
  const highestScore =
    totalParticipants > 0
      ? Math.max(...results.map((r) => Number(r.score) || 0))
      : 0
  const lowestScore =
    totalParticipants > 0
      ? Math.min(...results.map((r) => Number(r.score) || 0))
      : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">
          Memuat rekap nilai siswa...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="p-8 max-w-6xl mx-auto">
        {/* Header Halaman */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4 border-slate-200">
          <div>
            <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full uppercase">
              {exam?.subtest}
            </span>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              Rekap Nilai Siswa: {exam?.title}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Durasi: {exam?.duration_minutes} Menit
            </p>
          </div>
          <Link
            href="/admin"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors w-fit"
          >
            ← Kembali ke Admin CMS
          </Link>
        </div>

        {/* Ringkasan Statistik Kartu */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Total Peserta Selesai
            </span>
            <p className="text-3xl font-extrabold text-indigo-600 mt-1">
              {totalParticipants} <span className="text-xs font-normal text-slate-500">Siswa</span>
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Rata-Rata Nilai
            </span>
            <p className="text-3xl font-extrabold text-emerald-600 mt-1">
              {avgScore.toFixed(1)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Nilai Tertinggi
            </span>
            <p className="text-3xl font-extrabold text-amber-500 mt-1">
              {highestScore.toFixed(1)}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Nilai Terendah
            </span>
            <p className="text-3xl font-extrabold text-rose-500 mt-1">
              {lowestScore.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Panel Filter dan Pencarian */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="🔍 Cari nama siswa atau username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Filter Kelas:
            </span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">Semua Kelas</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabel Rekap Nilai */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {filteredResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-bold w-12 text-center">Peringkat</th>
                    <th className="p-4 font-bold">Nama Lengkap & Username</th>
                    <th className="p-4 font-bold text-center">Kode Kelas</th>
                    <th className="p-4 font-bold text-center">Waktu Selesai</th>
                    <th className="p-4 font-bold text-right">Skor Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResults.map((r, idx) => {
                    const fullName = r.profiles?.full_name || 'Siswa Tanpa Nama'
                    const username = r.profiles?.username || '-'
                    const classCode = r.profiles?.class_code || '-'
                    const formattedDate = new Date(r.end_time).toLocaleString(
                      'id-ID',
                      {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }
                    )

                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-center font-extrabold text-slate-500">
                          {idx === 0 ? '🥇 1' : idx === 1 ? '🥈 2' : idx === 2 ? '🥉 3' : idx + 1}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-slate-800">{fullName}</div>
                          <div className="text-xs text-slate-400">@{username}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold rounded-lg">
                            {classCode}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-slate-500">
                          {formattedDate}
                        </td>
                        <td className="p-4 text-right">
                          <span className="text-lg font-extrabold text-indigo-600">
                            {Number(r.score).toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              {results.length === 0
                ? 'Belum ada siswa yang menyelesaikan ujian ini.'
                : 'Tidak ada siswa yang cocok dengan filter pendaftaran/pencarian.'}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function ExamResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat rekap nilai...</p>
        </div>
      }
    >
      <ExamResultsContent />
    </Suspense>
  )
}