'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

function HistoryContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [subtestStats, setSubtestStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadStudentHistory = async () => {
    const supabase = createClient()

    // 1. Cek Otentikasi User (Proteksi Halaman)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Alihkan pengguna ke halaman login jika belum autentikasi
      router.push('/login')
      return
    }

    // 2. Ambil Profil Siswa
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) setProfile(profileData)

    // 3. Ambil Sesi Ujian Siswa
    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })

    // 4. Ambil Data Seluruh Ujian untuk Di-join
    const { data: examData } = await supabase.from('exams').select('*')

    const examMap = new Map()
    if (examData) {
      examData.forEach((e) => examMap.set(e.id, e))
    }

    // Gabungkan Sesi dengan Detail Paket Ujian
    const processedHistory = (sessionData || []).map((session) => {
      const exam = examMap.get(session.exam_id) || {
        title: 'Paket Ujian',
        subtest: 'UMUM',
        duration_minutes: 15,
        show_results: true,
        show_explanations: true,
      }

      const finishDate =
        session.completed_at || session.submitted_at || session.end_time || session.created_at

      return {
        session_id: session.id,
        exam_id: session.exam_id,
        exam_title: exam.title,
        subtest: exam.subtest || 'UMUM',
        score: Math.round(Number(session.score) || 0),
        status: session.status || 'completed',
        completed_at: finishDate,
        show_results: exam.show_results ?? true,
        show_explanations: exam.show_explanations ?? true,
      }
    })

    // 5. Kalkulasi Analisis Performa per Subtes
    const subtestMap = new Map<string, { totalScore: number; count: number; maxScore: number }>()

    processedHistory.forEach((item) => {
      const stName = item.subtest.toUpperCase()
      const current = subtestMap.get(stName) || { totalScore: 0, count: 0, maxScore: 0 }

      subtestMap.set(stName, {
        totalScore: current.totalScore + item.score,
        count: current.count + 1,
        maxScore: Math.max(current.maxScore, item.score),
      })
    })

    const statsArray: any[] = []
    subtestMap.forEach((val, key) => {
      const avg = val.count > 0 ? Math.round(val.totalScore / val.count) : 0
      statsArray.push({
        subtestName: key,
        totalExams: val.count,
        averageScore: avg,
        highestScore: val.maxScore,
      })
    })

    setHistoryList(processedHistory)
    setSubtestStats(statsArray)
    setLoading(false)
  }

  useEffect(() => {
    loadStudentHistory()
  }, [])

  // Kalkulasi Statistik Keseluruhan
  const totalCompleted = historyList.length
  const totalAllScores = historyList.map((h) => h.score)
  const overallAverage =
    totalCompleted > 0
      ? Math.round(totalAllScores.reduce((a, b) => a + b, 0) / totalCompleted)
      : 0
  const overallHighest = totalCompleted > 0 ? Math.max(...totalAllScores) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 text-center text-slate-600 font-medium">
          Memeriksa otentikasi & memuat riwayat ujian...
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Header & Informasi Siswa */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              📜 Riwayat Ujian & Analytics Performa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pantau perkembangan nilai dan tingkat penguasaan subtes TKA Anda
            </p>
          </div>

          {profile && (
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3 text-xs">
              <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                {profile.full_name?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div>
                <div className="font-bold text-slate-800">{profile.full_name}</div>
                <div className="text-slate-400">
                  @{profile.username} • Kelas: <span className="font-semibold text-indigo-600">{profile.class_code || '-'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Ringkasan Kartu Performa Siswa */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">
              📝 Total Ujian Diikuti
            </span>
            <span className="text-2xl font-extrabold text-slate-800">
              {totalCompleted} <span className="text-xs font-normal text-slate-500">Sesi Ujian</span>
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">
              📈 Rata-Rata Skor Gabungan
            </span>
            <span className="text-2xl font-extrabold text-indigo-600">
              {overallAverage} <span className="text-xs font-normal text-slate-500">/ 100 Poin</span>
            </span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">
              🏆 Skor Tertinggi Saya
            </span>
            <span className="text-2xl font-extrabold text-emerald-600">
              {overallHighest} <span className="text-xs font-normal text-slate-500">/ 100 Poin</span>
            </span>
          </div>
        </div>

        {/* SECTION 1: ANALYTICS PERFORMA PER SUBTES */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>🎯</span>
              <span>Tingkat Penguasaan Per Subtes</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis rata-rata nilai berdasarkan kategori subtes TKA yang telah dikerjakan
            </p>
          </div>

          {subtestStats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {subtestStats.map((st) => (
                <div
                  key={st.subtestName}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-indigo-900 bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase">
                      {st.subtestName}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {st.totalExams} Kali Dikerjakan
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700">Rata-rata Skor: {st.averageScore} Poin</span>
                      <span className="text-emerald-600">Tertinggi: {st.highestScore} Poin</span>
                    </div>

                    <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          st.averageScore >= 75
                            ? 'bg-emerald-500'
                            : st.averageScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${st.averageScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-xs text-center py-4">
              Belum ada data subtes untuk dianalisis.
            </p>
          )}
        </div>

        {/* SECTION 2: TABEL RIWAYAT UJIAN & TOMBOL REVIEW */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-3 p-5">
          <div className="border-b pb-3 flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>📋</span>
              <span>Daftar Riwayat Ujian Saya ({historyList.length})</span>
            </h2>
            <Link
              href="/"
              className="text-xs text-indigo-600 font-bold hover:underline"
            >
              + Ikut Ujian Lainnya
            </Link>
          </div>

          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b">
                <tr>
                  <th className="p-3 text-center w-12">No</th>
                  <th className="p-3">Judul Paket Ujian</th>
                  <th className="p-3 text-center">Subtes</th>
                  <th className="p-3 text-center">Waktu Selesai</th>
                  <th className="p-3 text-center">Nilai Saya</th>
                  <th className="p-3 text-center">Aksi / Pembahasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.length > 0 ? (
                  historyList.map((item, idx) => (
                    <tr key={item.session_id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{item.exam_title}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold uppercase text-[10px]">
                          {item.subtest}
                        </span>
                      </td>
                      <td className="p-3 text-center text-slate-600">
                        {item.completed_at
                          ? new Date(item.completed_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </td>
                      <td className="p-3 text-center">
                        {item.show_results ? (
                          <span
                            className={`px-2.5 py-1 rounded-lg font-bold ${
                              item.score >= 75
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : item.score >= 50
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {item.score} / 100
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-medium text-[11px]">
                            🔒 Nilai Disembunyikan
                          </span>
                        )}
                      </td>

                      {/* TOMBOL REVIEW PEMBAHASAN */}
                      <td className="p-3 text-center">
                        <Link
                          href={`/exam/${item.exam_id}/summary?session_id=${item.session_id}`}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors inline-block shadow-sm"
                        >
                          👁️ Review Pembahasan
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Anda belum pernah menyelesaikan ujian apapun.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
          <p className="text-slate-600 font-medium">Memuat riwayat ujian...</p>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  )
}