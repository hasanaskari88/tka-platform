import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

export const maxDuration = 60

function createAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi di server.')
  return new GoogleGenAI({ apiKey, httpOptions: { timeout: 45000 } })
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const body = await request.json()
    const context = {
      grade: cleanText(body.grade, 40),
      subject: cleanText(body.subject, 80),
      topic: cleanText(body.topic, 300),
      indicator: cleanText(body.indicator, 200),
      questionType: cleanText(body.questionType, 40),
      question: cleanText(body.question, 3000),
      options: body.options && typeof body.options === 'object' ? body.options : undefined,
      answer: cleanText(body.answer, 100),
      answers: Array.isArray(body.answers) ? body.answers.slice(0, 4) : undefined,
      statements: Array.isArray(body.statements) ? body.statements.slice(0, 4) : undefined,
      explanation: cleanText(body.explanation, 2000),
      modelAnswer: cleanText(body.modelAnswer, 2000),
      teacherImageBrief: cleanText(body.teacherImageBrief, 3000),
      imageType: cleanText(body.imageType, 30) || 'auto',
      customInstruction: cleanText(body.customInstruction, 500),
    }

    if (!context.grade || !context.subject || !context.topic || !context.question) {
      return NextResponse.json({ error: 'Konteks kelas, mata pelajaran, materi, dan soal wajib dikirim.' }, { status: 400 })
    }
    if (!['auto', 'illustration', 'object', 'diagram', 'nature'].includes(context.imageType)) {
      return NextResponse.json({ error: 'Jenis gambar tidak valid.' }, { status: 400 })
    }

    const prompt = `Anda adalah perancang ilustrasi pembelajaran sekolah dasar yang sangat teliti. Tugas Anda bukan membuat gambar, melainkan menulis SATU brief visual yang akan diberikan kepada model pembuat gambar.

KONTEKS PEMBELAJARAN:
${JSON.stringify(context, null, 2)}

TUJUAN:
Rancang ilustrasi yang benar-benar membantu siswa memahami situasi, mengamati informasi, membandingkan, mengelompokkan, menghitung, atau menyimpulkan sesuai kompetensi yang diuji. Ilustrasi bukan dekorasi.

ATURAN PRESISI WAJIB:
1. Jadikan teks soal, materi, indikator, pilihan, kunci, dan pembahasan sebagai satu kesatuan konteks. Jika ada informasi yang bertentangan, jangan menebak; buat brief yang aman dan tidak menambahkan fakta baru.
2. Tentukan secara eksplisit objek apa yang harus terlihat, jumlah setiap objek, ciri pembeda, susunan/posisi, hubungan antarobjek, latar, dan bagian yang harus kosong.
3. Untuk Matematika: tuliskan kuantitas dan relasi secara eksplisit. Contoh: "tepat 6 apel utuh dan tepat 2 potongan setengah apel; kedua potongan setengah berasal dari satu apel yang sama; jangan tambahkan apel lain". Jangan mengubah jumlah, pecahan, pola, urutan, ukuran, atau hubungan.
4. Untuk Bahasa Indonesia: visual harus menggambarkan tokoh, tindakan, latar, urutan kejadian, atau informasi yang benar-benar disebut/dibutuhkan dalam teks; jangan memberi petunjuk jawaban yang tidak ada di teks.
5. Untuk IPAS: jaga ketepatan bagian tubuh, organ, makhluk hidup, habitat, proses alam, alat, dan hubungan sebab-akibat. Jangan mencampur spesies atau proses yang berbeda.
6. Untuk PPKn, IPS, Seni, dan mata pelajaran lain: gunakan konteks budaya, sosial, benda, simbol, dan tindakan yang relevan serta tidak menyesatkan.
7. Kunci jawaban hanya dipakai untuk memeriksa konsistensi rancangan, bukan untuk ditampilkan sebagai tulisan, angka, label, atau petunjuk jawaban pada gambar.
8. Sesuaikan kerumitan visual dengan usia/kelas. Utamakan objek besar, jelas, mudah dibedakan, dan latar sederhana.
9. Jangan menambahkan objek, orang, simbol, pola, atau detail yang dapat mengubah tafsir atau jawaban.
10. Jangan meminta teks, huruf, angka, label, watermark, logo, atau tanda tangan di dalam gambar.
11. Jika visual tidak sungguh membantu menjawab soal, kembalikan brief kosong.
12. Instruksi guru: ${context.customInstruction || 'Tidak ada instruksi tambahan.'}
13. Jenis visual yang diminta: ${context.imageType}.

KELUARAN:
Balas hanya dengan JSON valid berbentuk {"imagePrompt":"..."}.
Isi imagePrompt dengan brief visual yang konkret, terukur, tidak ambigu, dan siap diberikan ke generator gambar. Maksimal 2500 karakter. Jangan menulis kunci jawaban atau penjelasan untuk guru di dalam brief gambar.`

    const response = await createAI().models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        thinkingConfig: { thinkingLevel: 'MEDIUM' },
      },
    })

    const outputText = response.text?.trim()
    if (!outputText) {
      return NextResponse.json({ error: 'Gemini tidak menghasilkan rancangan ilustrasi.' }, { status: 502 })
    }

    const result = JSON.parse(outputText) as { imagePrompt?: unknown }

    const imagePrompt = cleanText(result.imagePrompt, 2500)
    if (!imagePrompt) {
      return NextResponse.json({ error: 'Gemini menilai soal ini tidak membutuhkan ilustrasi yang aman dan relevan.' }, { status: 422 })
    }

    return NextResponse.json({ success: true, imagePrompt })
  } catch (error) {
    console.error('Gemini question image planning failed:', error)
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0
    return NextResponse.json(
      { error: status === 503 ? 'Gemini sedang sibuk merancang ilustrasi. Silakan coba lagi.' : 'Gemini gagal merancang ilustrasi. Silakan coba lagi.' },
      { status: status === 503 ? 503 : 500 }
    )
  }
}
