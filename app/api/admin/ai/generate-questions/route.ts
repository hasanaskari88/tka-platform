import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'


function rejectCrossOriginMutation(request: Request) {
  const origin = request.headers.get('origin')

  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { error: 'Permintaan lintas situs ditolak.' },
      { status: 403 }
    )
  }

  return null
}

export async function POST(request: Request) {
  try {
    const originError = rejectCrossOriginMutation(request)
    if (originError) return originError

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY belum dikonfigurasi di server.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const grade = typeof body.grade === 'string' ? body.grade.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const count = Number(body.count)

    if (!grade || grade.length > 40) {
      return NextResponse.json({ error: 'Kelas harus diisi.' }, { status: 400 })
    }
    if (!subject || subject.length > 80) {
      return NextResponse.json({ error: 'Mata pelajaran harus diisi.' }, { status: 400 })
    }
    if (!topic || topic.length > 300) {
      return NextResponse.json(
        { error: 'Materi harus diisi (maksimal 300 karakter).' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(count) || count < 1 || count > 10) {
      return NextResponse.json(
        { error: 'Jumlah soal harus antara 1 sampai 10.' },
        { status: 400 }
      )
    }

    const ai = new GoogleGenAI({
      apiKey,
      // Jangan biarkan permintaan ke Gemini menggantung tanpa batas.
      httpOptions: { timeout: 55_000 },
    })
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Buat tepat ${count} soal pilihan ganda untuk siswa ${grade}, mata pelajaran ${subject}, dengan materi: ${topic}.

Ketentuan:
- Gunakan bahasa Indonesia yang sederhana, sesuai usia siswa.
- Setiap soal memiliki tepat 4 pilihan jawaban A, B, C, dan D.
- Hanya ada satu jawaban benar untuk setiap soal.
- Hindari soal ambigu dan pilihan jawaban yang menyesatkan.
- Pembahasan singkat, jelas, dan membantu siswa memahami jawaban.
- Jangan menambahkan pengantar atau teks di luar data JSON.`,
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  options: {
                    type: 'object',
                    properties: {
                      A: { type: 'string' },
                      B: { type: 'string' },
                      C: { type: 'string' },
                      D: { type: 'string' },
                    },
                    required: ['A', 'B', 'C', 'D'],
                  },
                  answer: {
                    type: 'string',
                    enum: ['A', 'B', 'C', 'D'],
                  },
                  explanation: { type: 'string' },
                },
                required: ['question', 'options', 'answer', 'explanation'],
              },
            },
          },
          required: ['questions'],
        },
      },
    })

    const text = response.text
    if (!text) {
      return NextResponse.json(
        { error: 'Gemini tidak mengembalikan hasil. Silakan coba lagi.' },
        { status: 502 }
      )
    }

    const result = JSON.parse(text)
    if (!Array.isArray(result.questions) || result.questions.length !== count) {
      return NextResponse.json(
        { error: 'Hasil AI belum sesuai jumlah soal yang diminta. Silakan coba lagi.' },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      model: 'gemini-3.8-flash',
      questions: result.questions,
    })
  } catch (error) {
    console.error('Gemini AI test failed:', error)
    const message = error instanceof Error ? error.message.toLowerCase() : ''
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : 0
    const timedOut = status === 504 || message.includes('timeout') || message.includes('timed out') || message.includes('abort')
    const overloaded = status === 503 || message.includes('high demand') || message.includes('unavailable')
    const invalidKey = status === 401 || status === 403
    const userMessage = timedOut
      ? 'Gemini terlalu lama merespons. Silakan coba lagi. Jika berulang, kemungkinan layanan AI sedang lambat.'
      : overloaded
        ? 'Layanan Gemini sedang ramai atau kelebihan beban. Tunggu sebentar lalu coba lagi.'
        : invalidKey
          ? 'Kunci API Gemini ditolak. Admin perlu memeriksa GEMINI_API_KEY di Vercel.'
          : 'Terjadi kendala saat menghubungi Gemini. Silakan coba lagi beberapa saat.'
    return NextResponse.json(
      { error: userMessage },
      { status: timedOut ? 504 : overloaded ? 503 : invalidKey ? status : 500 }
    )
  }
}
