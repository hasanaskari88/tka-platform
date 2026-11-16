import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

const QUESTION_SCHEMA = { type: 'OBJECT', properties: { questions: { type: 'ARRAY', items: { type: 'OBJECT', properties: { question: { type: 'STRING' }, options: { type: 'OBJECT', properties: { A: { type: 'STRING' }, B: { type: 'STRING' }, C: { type: 'STRING' }, D: { type: 'STRING' } }, required: ['A', 'B', 'C', 'D'] }, answer: { type: 'STRING', enum: ['A', 'B', 'C', 'D'] }, explanation: { type: 'STRING' } }, required: ['question', 'options', 'answer', 'explanation'] } } }, required: ['questions'] }

function createAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi di server.')
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: 20000 } })
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const body = await request.json()
    const grade = typeof body.grade === 'string' ? body.grade.trim() : ''
    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const topic = typeof body.topic === 'string' ? body.topic.trim() : ''
    const count = Number(body.count)
    if (!grade || grade.length > 40) return NextResponse.json({ error: 'Kelas harus diisi.' }, { status: 400 })
    if (!subject || subject.length > 80) return NextResponse.json({ error: 'Mata pelajaran harus diisi.' }, { status: 400 })
    if (!topic || topic.length > 300) return NextResponse.json({ error: 'Materi harus diisi (maksimal 300 karakter).' }, { status: 400 })
    if (!Number.isInteger(count) || count < 1 || count > 10) return NextResponse.json({ error: 'Jumlah soal harus antara 1 sampai 10.' }, { status: 400 })
    const prompt = 'Buat tepat ' + count + ' soal pilihan ganda untuk siswa ' + grade + ', mata pelajaran ' + subject + ', dengan materi: ' + topic + '.\n\nKetentuan:\n- Gunakan bahasa Indonesia sederhana sesuai usia siswa.\n- Setiap soal memiliki tepat 4 pilihan A, B, C, D.\n- Hanya satu jawaban benar.\n- Hindari soal ambigu.\n- Berikan pembahasan singkat dan jelas.\n- Jangan menambahkan teks di luar JSON.'
    const interaction = await createAI().interactions.create({ model: 'gemini-4-hydrogen', input: prompt, background: true, generation_config: { thinking_level: 'low' }, response_format: QUESTION_SCHEMA })
    if (!interaction.id) return NextResponse.json({ error: 'Gemini tidak memberikan ID proses.' }, { status: 502 })
    return NextResponse.json({ success: true, interactionId: interaction.id })
  } catch (error) {
    console.error('Gemini background generation start failed:', error)
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0
    return NextResponse.json({ error: status === 503 ? 'Layanan Gemini sedang ramai. Tunggu sebentar lalu coba lagi.' : 'Gagal memulai proses Gemini. Silakan coba lagi.' }, { status: status === 503 ? 503 : 500 })
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const params = new URL(request.url).searchParams
    const id = params.get('id')
    const count = Number(params.get('count'))
    if (!id || id.length > 200 || !Number.isInteger(count) || count < 1 || count > 10) return NextResponse.json({ error: 'Parameter proses tidak valid.' }, { status: 400 })
    const interaction = await createAI().interactions.get(id)
    if (interaction.status === 'in_progress' || interaction.status === 'requires_action') return NextResponse.json({ status: interaction.status })
    if (interaction.status !== 'completed') return NextResponse.json({ status: interaction.status, error: 'Gemini gagal menyelesaikan pembuatan soal. Silakan coba lagi.' }, { status: 502 })
    if (!interaction.output_text) return NextResponse.json({ error: 'Gemini selesai tetapi tidak memberikan hasil teks.' }, { status: 502 })
    const result = JSON.parse(interaction.output_text)
    if (!Array.isArray(result.questions) || result.questions.length !== count) return NextResponse.json({ error: 'Hasil AI belum sesuai jumlah soal yang diminta.' }, { status: 502 })
    return NextResponse.json({ status: 'completed', success: true, model: 'gemini-4-hydrogen', questions: result.questions })
  } catch (error) {
    console.error('Gemini background generation polling failed:', error)
    return NextResponse.json({ error: 'Tidak dapat memeriksa hasil Gemini. Silakan coba lagi.' }, { status: 500 })
  }
}