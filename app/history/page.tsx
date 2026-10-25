'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

// 🖼️ KOMPONEN SMART LOGO DENGAN MULTI-EXTENSION FALLBACK & REACT STATE
function SmartLogo({
  candidates,
  alt,
  fallbackText,
  className = 'w-16 h-16 object-contain shrink-0',
  fallbackClassName = 'w-16 h-16 bg-indigo-700 text-white font-black text-xl flex items-center justify-center rounded-2xl shrink-0',
}: {
  candidates: string[]
  alt: string
  fallbackText: string
  className?: string
  fallbackClassName?: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedAll, setFailedAll] = useState(false)

  const handleImgError = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setFailedAll(true)
    }
  }

  if (failedAll) {
    return <div className={fallbackClassName}>{fallbackText}</div>
  }

  return (
    <img
      src={candidates[currentIndex]}
      alt={alt}
      className={className}
      onError={handleImgError}
    />
  )
}

function HistoryContent() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [historyList, setHistoryList] = useState<any[]>([])
  const [subtestStats, setSubtestStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 🖨️ State Modal Cetak
  const [showRaporModal, setShowRaporModal] = useState(false)
  const [selectedCertSession, setSelectedCertSession] = useState<any | null>(null)

  // ⚙️ Pengaturan Standar Dokumen Cetak (Diseragamkan dengan Admin)
  const docSettings = {
    schoolName: 'SD NEGERI GETASAN',
    schoolAddress: 'Jl. P. Diponegoro Km 6, Desa Getasan, Kab. Semarang (50774)',
    certificateTitle: 'SERTIFIKAT CAPAIAN AKADEMIK',
    issuePlace: 'Getasan',
    issueDate: new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }),
    kkmTarget: 70,
    principalName: 'GIYANTO, S.Pd.',
    principalNip: '19670715 199903 1 006',
    teacherName: 'Hasan Askari, S.Pd.',
    teacherNip: '19880520 201201 1 002',
  }

  // 🖼️ Daftar Kandidat Nama File Logo di public/
  const SD_LOGO_CANDIDATES = [
    '/logo-sd-getasan.png',
    '/logo-sd-getasan.PNG',
    '/logo-sd-getasan.jpg',
    '/logo-sd-getasan.jpeg',
    '/logo-sd.png',
  ]

  const TKA_LOGO_CANDIDATES = [
    '/logo-tka.png',
    '/logo-tka.PNG',
    '/logo-tka.jpg',
    '/logo-tka.jpeg',
    '/logo-kemendikbud.png',
  ]

  const loadStudentHistory = async () => {
    const supabase = createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileData) setProfile(profileData)

    const { data: sessionData } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    const { data: examData } = await supabase.from('exams').select('*')

    const examMap = new Map()
    if (examData) {
      examData.forEach((e) => examMap.set(e.id, e))
    }

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

    const subtestMap = new Map<string, { totalScore: number; count: number; maxScore: number }>()

    processedHistory
      .filter((item) => item.status === 'completed')
      .forEach((item) => {
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

  const handleRetakeExam = (examId: string, examTitle: string) => {
    if (
      confirm(
        `Apakah Anda yakin ingin mengerjakan kembali ujian "${examTitle}"? Sesi baru akan dibuat dengan waktu awal utuh.`
      )
    ) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`cbt_temp_answers_${examId}`)
        localStorage.removeItem(`cbt_answers_${examId}`)
        localStorage.removeItem(`cbt_score_${examId}`)
      }
      router.push(`/exam/${examId}?force_new=true`)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const completedHistory = historyList.filter((h) => h.status === 'completed')
  const totalCompleted = completedHistory.length
  const totalAllScores = completedHistory.map((h) => h.score)
  const overallAverage =
    totalCompleted > 0
      ? Math.round(totalAllScores.reduce((a, b) => a + b, 0) / totalCompleted)
      : 0
  const overallHighest = totalCompleted > 0 ? Math.max(...totalAllScores) : 0

  // 🟢 KOMPONEN BLOK TANDA TANGAN KEKINIAN & ADAPTIF
  const DynamicSignatureBlock = ({ studentClass }: { studentClass?: string }) => {
    return (
      <div className="grid grid-cols-3 gap-6 text-center text-xs pt-8 border-t-2 border-slate-200">
        <div className="space-y-1">
          <p className="text-slate-500 font-medium">Orang Tua / Wali Murid,</p>
          <div className="h-16"></div>
          <p className="font-bold text-slate-800 border-b-2 border-slate-400 inline-block px-4 pb-0.5">
            ( .................................... )
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-slate-500 font-medium">Guru / Wali Kelas {studentClass || ''},</p>
          <div className="h-16"></div>
          <p className="font-bold text-slate-900 underline decoration-indigo-600 decoration-2">
            {docSettings.teacherName}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            NIP. {docSettings.teacherNip}
          </p>
        </div>

        <div className="space-y-0.5">
          <p className="text-slate-500 font-medium">
            {docSettings.issuePlace}, {docSettings.issueDate}
          </p>
          <p className="text-slate-700 font-bold uppercase tracking-wider text-[11px]">
            Kepala Sekolah,
          </p>
          <div className="h-14"></div>
          <p className="font-bold text-slate-900 underline decoration-amber-600 decoration-2">
            {docSettings.principalName}
          </p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">
            NIP. {docSettings.principalNip}
          </p>
        </div>
      </div>
    )
  }

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
      {/* CSS Khusus Cetak Browser Presisi */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-area, #printable-area * {
            visibility: visible !important;
          }
          #printable-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print, .no-print * {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print">
        <Navbar />
      </div>

      <main className="p-8 max-w-7xl mx-auto space-y-8 no-print">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b pb-4 border-slate-200 gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              📜 Riwayat Ujian & Analytics Performa
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Pantau perkembangan nilai dan tingkat penguasaan subtes TKA Anda
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {completedHistory.length > 0 && (
              <button
                onClick={() => setShowRaporModal(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5"
              >
                <span>🖨️</span>
                <span>Cetak Rapor Lengkap PDF</span>
              </button>
            )}

            {profile && (
              <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-3 text-xs">
                <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                  {profile.full_name?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <div className="font-bold text-slate-800">{profile.full_name}</div>
                  <div className="text-slate-400">
                    @{profile.username} | Kelas:{' '}
                    <span className="font-semibold text-indigo-600">
                      {profile.class_code || '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase block">
              📝 Total Ujian Selesai
            </span>
            <span className="text-2xl font-extrabold text-slate-800">
              {totalCompleted} <span className="text-xs font-normal text-slate-500">Sesi Selesai</span>
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

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b pb-3">
            <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
              <span>🎯</span>
              <span>Tingkat Penguasaan Per Subtes</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Analisis rata-rata nilai berdasarkan kategori subtes TKA yang telah diselesaikan
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
                      {st.totalExams} Sesi Selesai
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
              Belum ada data subtes yang selesai dikerjakan untuk dianalisis.
            </p>
          )}
        </div>

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
                  <th className="p-3 text-center">Waktu / Status</th>
                  <th className="p-3 text-center">Nilai Saya</th>
                  <th className="p-3 text-center">Aksi / Pembahasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyList.length > 0 ? (
                  historyList.map((item, idx) => {
                    const isOngoing = item.status === 'ongoing'

                    return (
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
                          {isOngoing ? (
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg font-bold text-[11px] inline-flex items-center space-x-1">
                              <span>⏳</span>
                              <span>Sedang Dikerjakan</span>
                            </span>
                          ) : item.completed_at ? (
                            new Date(item.completed_at).toLocaleString('id-ID', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isOngoing ? (
                            <span className="text-slate-400 font-medium italic text-[11px]">
                              Dalam Proses
                            </span>
                          ) : item.show_results ? (
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

                        <td className="p-3 text-center">
                          {isOngoing ? (
                            <Link
                              href={`/exam/${item.exam_id}`}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors inline-flex items-center space-x-1 shadow-md animate-pulse"
                            >
                              <span>▶️</span>
                              <span>Lanjutkan Ujian</span>
                            </Link>
                          ) : (
                            <div className="flex items-center justify-center space-x-1.5">
                              <Link
                                href={`/exam/${item.exam_id}/summary?session_id=${item.session_id}`}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-colors inline-flex items-center space-x-1 shadow-sm"
                                title="Review Jawaban"
                              >
                                <span>👁️ Review</span>
                              </Link>

                              <button
                                onClick={() => setSelectedCertSession(item)}
                                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg transition-colors inline-flex items-center space-x-1 shadow-sm"
                                title="Cetak Sertifikat Tes"
                              >
                                <span>📜 Sertifikat</span>
                              </button>

                              <button
                                onClick={() => handleRetakeExam(item.exam_id, item.exam_title)}
                                className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors inline-flex items-center space-x-1 shadow-sm"
                                title="Coba Lagi Ujian"
                              >
                                <span>🔄 Retake</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Anda belum memiliki riwayat ujian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* 📑 MODAL RAPOR HASIL UJIAN LENGKAP (DISERAGAMKAN DENGAN GAYA ADMIN) */}
      {showRaporModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm">🖨️ Pratinjau Rapor Hasil Ujian Siswa</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  🖨️ Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setShowRaporModal(false)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* AREA CETAK RAPOR DESAIN MODERN */}
            <div id="printable-area" className="p-8 overflow-y-auto font-sans text-slate-900 bg-white">
              {/* Kop Resmi Sekolah Minimalis Modern */}
              <div className="border-b-2 border-indigo-600 pb-3 mb-4 flex items-center justify-between text-center">
                <SmartLogo
                  candidates={SD_LOGO_CANDIDATES}
                  alt="Logo SD"
                  fallbackText="SD"
                  className="w-14 h-14 object-contain"
                />
                <div className="flex-1 px-4">
                  <span className="bg-indigo-600 text-white rounded-full px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase inline-block mb-1">
                    Laporan Capaian CBT
                  </span>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-wide">
                    {docSettings.schoolName}
                  </h2>
                  <p className="text-xs text-slate-500">{docSettings.schoolAddress}</p>
                </div>
                <SmartLogo
                  candidates={TKA_LOGO_CANDIDATES}
                  alt="Logo TKA"
                  fallbackText="TKA"
                  className="w-14 h-14 object-contain"
                />
              </div>

              <div className="text-center mb-4">
                <h3 className="text-sm font-black uppercase text-indigo-900 tracking-wider">
                  RAPOR CAPAIAN SIMULASI TKA
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Tahun Ajaran 2026/2027
                </p>
              </div>

              {/* Card Identitas Siswa */}
              <div className="grid grid-cols-2 gap-4 text-xs font-medium border border-slate-200 rounded-xl p-3.5 mb-4 bg-slate-50">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Nama Peserta</span>
                  <strong className="text-slate-900">{profile?.full_name}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kelas / Rombel</span>
                  <strong className="text-slate-900">{profile?.class_code || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NIS / Username</span>
                  <strong>@{profile?.username}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal Cetak</span>
                  <strong>{docSettings.issueDate}</strong>
                </div>
              </div>

              {/* Tabel Rekap Nilai Modern */}
              <div className="rounded-xl border border-slate-200 overflow-hidden mb-6">
                <table className="w-full border-collapse text-xs text-center">
                  <thead className="bg-slate-900 text-white font-bold">
                    <tr>
                      <th className="p-2.5 text-left pl-3">No</th>
                      <th className="p-2.5 text-left">Nama Ujian</th>
                      <th className="p-2.5 w-28">Subtes</th>
                      <th className="p-2.5 w-20">KKM</th>
                      <th className="p-2.5 w-24">Skor Siswa</th>
                      <th className="p-2.5 w-32">Status Ketuntasan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedHistory.map((h, i) => {
                      const isTuntas = h.score >= docSettings.kkmTarget
                      return (
                        <tr key={h.session_id} className="bg-white border-t border-slate-200">
                          <td className="p-2.5 text-left pl-3 font-semibold text-slate-500">{i + 1}</td>
                          <td className="p-2.5 text-left font-bold text-slate-800">{h.exam_title}</td>
                          <td className="p-2.5 uppercase font-semibold text-slate-700">{h.subtest}</td>
                          <td className="p-2.5 font-semibold text-slate-600">{docSettings.kkmTarget}</td>
                          <td className="p-2.5 font-black text-indigo-700 text-sm">{h.score}</td>
                          <td className="p-2.5 font-bold">
                            {isTuntas ? (
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                                ✓ TUNTAS
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px]">
                                ✕ BELUM TUNTAS
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Dynamic Signature Block */}
              <DynamicSignatureBlock studentClass={profile?.class_code} />
            </div>
          </div>
        </div>
      )}

      {/* 📜 MODAL SERTIFIKAT PENHARGAAN UJIAN (DISERAGAMKAN DENGAN GAYA ELEGAN ADMIN) */}
      {selectedCertSession && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center no-print">
              <span className="font-bold text-sm">📜 Pratinjau Sertifikat Kelulusan Siswa</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  🖨️ Cetak / Simpan PDF
                </button>
                <button
                  onClick={() => setSelectedCertSession(null)}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-lg transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* AREA CETAK SERTIFIKAT DESAIN ELEGANT DAN KEKINIAN */}
            <div
              id="printable-area"
              className="p-10 font-serif text-slate-900 bg-gradient-to-br from-amber-50/80 via-white to-slate-50 border-[12px] border-double border-indigo-950 rounded-xl relative m-4 text-center"
            >
              {/* Watermark Logo Transparan */}
              <img
                src="/logo-sd-getasan.png"
                alt="Watermark"
                onError={(e: any) => {
                  e.target.src =
                    'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_TUT_WURI_HANDAYANI.svg'
                }}
                className="absolute inset-0 m-auto w-72 h-72 opacity-[0.04] object-contain pointer-events-none"
              />

              {/* Aksen Sudut Geometris Emas */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-500 m-2"></div>
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-500 m-2"></div>
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-500 m-2"></div>
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-500 m-2"></div>

              <div className="relative z-10 space-y-3">
                <SmartLogo
                  candidates={SD_LOGO_CANDIDATES}
                  alt="Logo SD"
                  fallbackText="SD"
                  className="w-14 h-14 mx-auto object-contain"
                />
                <h2 className="text-xs font-sans font-black uppercase text-indigo-950 tracking-widest">
                  {docSettings.schoolName}
                </h2>
                <h1 className="text-2xl font-black tracking-widest text-slate-900 uppercase border-b-2 border-amber-500 pb-1 inline-block px-8 my-2">
                  {docSettings.certificateTitle}
                </h1>
                <p className="text-xs font-sans text-slate-500 uppercase tracking-widest">
                  Diberikan secara resmi kepada:
                </p>

                <h2 className="text-2xl font-black text-indigo-900 underline decoration-amber-500 decoration-2 uppercase my-2">
                  {profile?.full_name}
                </h2>

                <p className="text-xs font-sans text-slate-700 max-w-xl mx-auto leading-relaxed">
                  Telah menyelesaikan Ujian <strong>"{selectedCertSession.exam_title}"</strong> Subtes{' '}
                  <strong className="uppercase">{selectedCertSession.subtest}</strong> dengan Raihan Capaian Skor Resmi:
                </p>

                {/* Gold Badge Ribbon Skor */}
                <div className="my-3">
                  <div className="inline-flex items-center justify-center bg-gradient-to-r from-amber-500 to-amber-600 text-white font-sans font-black text-2xl px-8 py-2 rounded-full shadow-lg border-2 border-amber-300">
                    {selectedCertSession.score}{' '}
                    <span className="text-xs font-normal text-amber-100 ml-1">/ 100</span>
                  </div>
                </div>

                {/* Dynamic Signature Block */}
                <div className="pt-6">
                  <DynamicSignatureBlock studentClass={profile?.class_code} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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