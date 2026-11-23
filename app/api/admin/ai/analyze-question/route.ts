import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'
import { isSameOriginRequest } from '@/lib/security/request-origin'
import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'

export const maxDuration = 60

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const question = body.question && typeof body.question === 'object' ? body.question : null
    const statistics = body.statistics && typeof body.statistics === 'object' ? body.statistics : null
    if (!question || !statistics) {
      return NextResponse.json({ error: 'Data soal dan statistik analisis wajib dikirim.' }, { status: 400 })
    }

    const questionData = {
      type: cleanText(question.type, 40),
      text: cleanText(question.text, 5000),
      options: question.options && typeof question.options === 'object' ? question.options : null,
      answerKey: question.answerKey ?? null,
      explanation: cleanText(question.explanation, 3000),
    }
    if (!questionData.text) return NextResponse.json({ error: 'Teks soal tidak tersedia.' }, { status: 400 })

    const statsData = {
      participants: Number(statistics.participants) || 0,
      correct: Number(statistics.correct) || 0,
      wrong: Number(statistics.wrong) || 0,
      accuracyPercent: Number(statistics.accuracyPercent) || 0,
      difficultyLabel: cleanText(statistics.difficultyLabel, 40),
      discriminationPercent: Number(statistics.discriminationPercent) || 0,
      discriminationLabel: cleanText(statistics.discriminationLabel, 60),
      distractorCounts: statistics.distractorCounts && typeof statistics.distractorCounts === 'object' ? statistics.distractorCounts : {},
      topDistractor: cleanText(statistics.topDistractor, 40),
      gradedEssayCount: Number(statistics.gradedEssayCount) || 0,
      ungradedEssayCount: Number(statistics.ungradedEssayCount) || 0,
      essayAverage: Number(statistics.essayAverage) || 0,
      essayHighest: Number(statistics.essayHighest) || 0,
      essayLowest: Number(statistics.essayLowest) || 0,
    }

    const isEssay = questionData.type === 'essay' || questionData.type === 'uraian'
    const prompt = [
      'Anda adalah ahli evaluasi pembelajaran dan analisis butir soal untuk sekolah dasar di Indonesia.',
      'Analisis kualitas soal berdasarkan isi soal dan statistik respons yang diberikan. Jangan mengarang data atau menyimpulkan sebab yang tidak didukung data.',
      'Untuk soal pilihan ganda, perhatikan kesesuaian soal-kunci, tingkat kesukaran, daya beda, dan fungsi pengecoh. Daya beda negatif adalah sinyal kuat untuk memeriksa kunci, redaksi, atau kemungkinan soal ambigu, bukan bukti otomatis bahwa kunci salah.',
      'Untuk soal uraian, jangan menafsirkan indeks kesukaran atau daya beda objektif. Gunakan jumlah jawaban yang sudah/belum dinilai dan sebaran skor uraian.',
      'Pertimbangkan jumlah peserta. Jika peserta sedikit, nyatakan bahwa kesimpulan statistik masih sementara.',
      'Berikan penilaian praktis untuk guru: pertahankan, tinjau, atau revisi. Jangan mengubah kunci jawaban secara otomatis.',
      '',
      'DATA SOAL:',
      JSON.stringify(questionData, null, 2),
      '',
      'STATISTIK HASIL SISWA:',
      JSON.stringify(statsData, null, 2),
      '',
      'Keluarkan JSON saja dengan properti verdict (salah satu "pertahankan", "tinjau", "revisi"), summary, strengths, concerns, recommendation. Setiap properti teks harus ringkas dan spesifik. Jangan mengulang angka tanpa menjelaskan maknanya.',
    ].join('\n')

    const { data, provider } = await generateJsonWithFallback({
      task: 'analisis kualitas butir soal',
      prompt,
      timeoutMs: 45000,
      maxOutputTokens: 1400,
      groqSchema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['pertahankan', 'tinjau', 'revisi'] },
          summary: { type: 'string' },
          strengths: { type: 'string' },
          concerns: { type: 'string' },
          recommendation: { type: 'string' },
        },
        required: ['verdict', 'summary', 'strengths', 'concerns', 'recommendation'],
        additionalProperties: false,
      },
      geminiSchema: {
        type: 'OBJECT',
        properties: {
          verdict: { type: 'STRING', enum: ['pertahankan', 'tinjau', 'revisi'] },
          summary: { type: 'STRING' },
          strengths: { type: 'STRING' },
          concerns: { type: 'STRING' },
          recommendation: { type: 'STRING' },
        },
        required: ['verdict', 'summary', 'strengths', 'concerns', 'recommendation'],
      },
    })

    const verdict = String(data.verdict || '')
    if (!['pertahankan', 'tinjau', 'revisi'].includes(verdict)) {
      return NextResponse.json({ error: 'Hasil analisis AI tidak memiliki kategori yang valid.' }, { status: 502 })
    }

    return NextResponse.json({
      success: true,
      provider,
      verdict,
      summary: cleanText(data.summary, 1200),
      strengths: cleanText(data.strengths, 1200),
      concerns: cleanText(data.concerns, 1200),
      recommendation: cleanText(data.recommendation, 1200),
    })
  } catch (error) {
    console.error('AI question analysis failed:', error)
    if (error instanceof AIProvidersUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Gagal menganalisis butir soal dengan AI. Silakan coba lagi.' }, { status: 500 })
  }
}
