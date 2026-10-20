'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function HomePage() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchExams() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('exams').select('*')

        if (error) {
          setError(error.message)
        } else {
          setExams(data || [])
        }
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan saat memuat data.')
      } finally {
        setLoading(false)
      }
    }

    fetchExams()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <p className="text-slate-600 font-medium">Memuat data ujian...</p>
      </main>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Navbar Atas */}
      <Navbar />

      <main className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 border-b pb-4 border-slate-200">
            <h1 className="text-3xl font-bold text-slate-800">
              Platform Tes Kemampuan Akademik (TKA)
            </h1>
            <p className="text-slate-600 mt-1">Sistem Simulasi & Latihan Ujian Online</p>
          </div>

          <h2 className="text-xl font-semibold text-slate-700 mb-4">Daftar Ujian Tersedia:</h2>

          <div className="grid gap-4">
            {exams && exams.length > 0 ? (
              exams.map((exam) => (
                <div
                  key={exam.id}
                  className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold text-indigo-600">{exam.title}</h3>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase">
                      {exam.subtest}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">{exam.description}</p>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      Durasi: {exam.duration_minutes} Menit
                    </span>
                    <Link
                      href={`/exam/${exam.id}`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors inline-block"
                    >
                      Mulai Ujian
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">Belum ada ujian yang dipublikasikan.</p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}