'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function HistoryPage() {
  const [sessions, setSessions] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<{
    fullName: string
    username: string
    classCode: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchHistoryAndProfile() {
      const supabase = createClient()

      // 1. Ambil user yang sedang login dari Supabase Auth
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // 2. Ambil profil dari tabel 'profiles'
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // Ambil data profil dengan fallback ke user.user_metadata jika di tabel profiles masih null
        const fullName =
          profileData?.full_name ||
          user.user_metadata?.full_name ||
          'Siswa TKA'

        const username =
          profileData?.username ||
          user.user_metadata?.username ||
          user.email?.split('@')[0] ||
          '-'

        const classCode =
          profileData?.class_code ||
          user.user_metadata?.class_code ||
          ''

        setUserInfo({
          fullName,
          username,
          classCode,
        })
      }

      // 3. Ambil Riwayat Ujian milik siswa ini
      let query = supabase
        .from('exam_sessions')
        .select(`
          id,
          status,
          score,
          start_time,
          end_time,
          exams (
            title,
            subtest
          )
        `)
        .eq('status', 'completed')
        .order('end_time', { ascending: false })

      if (user) {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query

      if (!error && data) {
        setSessions(data)
      }
      setLoading(false)
    }

    fetchHistoryAndProfile()
  }, [])

  // Hitung Ringkasan Statistik Nilai
  const totalExams = sessions.length
  const avgScore =
    totalExams > 0
      ? sessions.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / totalExams
      : 0
  const highestScore =
    totalExams > 0
      ? Math.max(...sessions.map((s) => Number(s.score) || 0))
      : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <Navbar />
        <main className="p-8 flex items-center justify-center">
          <p className="text-slate-600 font-medium">Memuat riwayat ujian...</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar Atas */}
      <Navbar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header Halaman */}
          <div className="flex justify-between items-center mb-6 border-b pb-4 border-slate-200">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Riwayat & Hasil Simulasi
              </h1>
              <p className="text-slate-600 mt-1">
                Laporan pengerjaan dan pencapaian ujian TKA
              </p>
            </div>
            <Link
              href="/"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
            >
              ← Kembali ke Beranda
            </Link>
          </div>

          {/* Kartu Identitas Siswa */}
          {userInfo && (
            <div className="bg-white p-5 rounded-xl border border-indigo-100 bg-indigo-50/40 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                  {userInfo.fullName[0]?.toUpperCase() || 'S'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {userInfo.fullName}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Username:{' '}
                    <span className="font-semibold text-slate-700">
                      {userInfo.username}
                    </span>
                  </p>
                </div>
              </div>

              {userInfo.classCode ? (
                <div className="bg-white px-4 py-2 rounded-lg border border-indigo-200 shadow-sm text-right">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Kelas / Kode Admin
                  </span>
                  <span className="text-sm font-extrabold text-indigo-600">
                    {userInfo.classCode}
                  </span>
                </div>
              ) : (
                <div className="bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 text-xs">
                  Kode kelas belum diisi
                </div>
              )}
            </div>
          )}

          {/* Ringkasan Statistik Kartu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Ujian Selesai
              </span>
              <p className="text-3xl font-extrabold text-indigo-600 mt-1">
                {totalExams} <span className="text-sm font-normal text-slate-500">Sesi</span>
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Rata-rata Skor
              </span>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                {avgScore.toFixed(1)}
              </p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Skor Tertinggi
              </span>
              <p className="text-3xl font-extrabold text-amber-500 mt-1">
                {highestScore.toFixed(1)}
              </p>
            </div>
          </div>

          {/* Daftar Riwayat Sesi Ujian */}
          <h2 className="text-xl font-semibold text-slate-700 mb-4">
            Daftar Sesi Pengerjaan:
          </h2>

          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow"
                >
                  <div>
                    <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase">
                      {session.exams?.subtest || 'TKA'}
                    </span>
                    <h3 className="text-lg font-bold text-slate-800 mt-1">
                      {session.exams?.title || 'Simulasi Ujian'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Selesai pada:{' '}
                      {new Date(session.end_time).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 font-medium block">
                      Skor Akhir
                    </span>
                    <span className="text-2xl font-extrabold text-indigo-600">
                      {Number(session.score).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
              Belum ada riwayat ujian yang diselesaikan.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}