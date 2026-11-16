import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'
import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

type QuestionType = 'multiple_choice' | 'complex_multiple_choice' | 'true_false_matrix' | 'essay'

function getQuestionSchema(questionType: QuestionType, includeImagePrompt = false) {
  const commonProperties = {
    question: { type: 'STRING' },
    explanation: { type: 'STRING' },
  }

  let itemProperties: Record<string, any>
  let required: string[]

  if (questionType === 'multiple_choice') {
    itemProperties = {
      ...commonProperties,
      options: {
        type: 'OBJECT',
        properties: { A: { type: 'STRING' }, B: { type: 'STRING' }, C: { type: 'STRING' }, D: { type: 'STRING' } },
        required: ['A', 'B', 'C', 'D'],
      },
      answer: { type: 'STRING', enum: ['A', 'B', 'C', 'D'] },
    }
    required = ['question', 'options', 'answer', 'explanation']
  } else if (questionType === 'complex_multiple_choice') {
    itemProperties = {
      ...commonProperties,
      options: {
        type: 'OBJECT',
        properties: { A: { type: 'STRING' }, B: { type: 'STRING' }, C: { type: 'STRING' }, D: { type: 'STRING' } },
        required: ['A', 'B', 'C', 'D'],
      },
      answers: { type: 'ARRAY', items: { type: 'STRING', enum: ['A', 'B', 'C', 'D'] } },
    }
    required = ['question', 'options', 'answers', 'explanation']
  } else if (questionType === 'true_false_matrix') {
    itemProperties = {
      ...commonProperties,
      statements: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { id: { type: 'STRING', enum: ['1', '2', '3', '4'] }, text: { type: 'STRING' }, answer: { type: 'STRING', enum: ['Benar', 'Salah'] } },
          required: ['id', 'text', 'answer'],
        },
      },
    }
    required = ['question', 'statements', 'explanation']
  } else {
    itemProperties = {
      ...commonProperties,
      model_answer: { type: 'STRING' },
      rubric: { type: 'STRING' },
      max_score: { type: 'NUMBER' },
    }
    required = ['question', 'model_answer', 'rubric', 'max_score', 'explanation']
  }

  if (includeImagePrompt) {
    itemProperties.image_prompt = { type: 'STRING' }
    required.push('image_prompt')
  }

  return {
    type: 'OBJECT',
    properties: {
      questions: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: itemProperties, required },
      },
    },
    required: ['questions'],
  }
}

function toGroqSchema(value: any): any {
  if (Array.isArray(value)) return value.map(toGroqSchema)
  if (!value || typeof value !== 'object') return value

  const result: Record<string, any> = {}
  for (const [key, item] of Object.entries(value)) {
    if (key === 'type' && typeof item === 'string') {
      result.type = item.toLowerCase()
    } else {
      result[key] = toGroqSchema(item)
    }
  }

  if (result.type === 'object') {
    result.additionalProperties = false
    if (result.properties && typeof result.properties === 'object') {
      result.required = Object.keys(result.properties)
    }
  }
  return result
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
    const shortAnswerCount = Number(body.shortAnswerCount ?? 10)
    const shortAnswerMaxScore = Number(body.shortAnswerMaxScore ?? 2)
    const longEssayMaxScore = Number(body.longEssayMaxScore ?? 3)
    const indicator = typeof body.indicator === 'string' ? body.indicator.trim() : ''
    const cognitiveLevel = typeof body.cognitiveLevel === 'string' ? body.cognitiveLevel : 'AUTO'
    const questionType = (typeof body.questionType === 'string' ? body.questionType : 'multiple_choice') as QuestionType
    const includeImages = body.includeImages === true
    const imageType = typeof body.imageType === 'string' ? body.imageType : 'auto'

    if (!grade || grade.length > 40) return NextResponse.json({ error: 'Kelas harus diisi.' }, { status: 400 })
    if (!subject || subject.length > 80) return NextResponse.json({ error: 'Mata pelajaran harus diisi.' }, { status: 400 })
    if (!topic || topic.length > 300) return NextResponse.json({ error: 'Materi harus diisi (maksimal 300 karakter).' }, { status: 400 })
    if (!Number.isInteger(count) || count < 1 || count > 15) return NextResponse.json({ error: 'Jumlah soal harus antara 1 sampai 15.' }, { status: 400 })
    if (questionType === 'essay' && (![shortAnswerMaxScore, longEssayMaxScore].every((score) => Number.isFinite(score) && score > 0 && score <= 100))) return NextResponse.json({ error: 'Skor maksimal harus lebih dari 0 dan tidak lebih dari 100.' }, { status: 400 })
    if (indicator.length > 200) return NextResponse.json({ error: 'Indikator maksimal 200 karakter.' }, { status: 400 })
    if (!['auto', 'illustration', 'object', 'diagram', 'nature'].includes(imageType)) return NextResponse.json({ error: 'Jenis gambar tidak valid.' }, { status: 400 })

    const allowedCognitiveLevels = ['AUTO', 'LOTS', 'MOTS', 'HOTS', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']
    if (!allowedCognitiveLevels.includes(cognitiveLevel)) return NextResponse.json({ error: 'Level kognitif tidak valid.' }, { status: 400 })
    const allowedTypes: QuestionType[] = ['multiple_choice', 'complex_multiple_choice', 'true_false_matrix', 'essay']
    if (!allowedTypes.includes(questionType)) return NextResponse.json({ error: 'Bentuk soal tidak valid.' }, { status: 400 })

    if (questionType === 'essay' && (!Number.isInteger(shortAnswerCount) || shortAnswerCount < 1 || shortAnswerCount >= count)) return NextResponse.json({ error: 'Jumlah soal isian singkat harus minimal 1 dan lebih kecil dari jumlah seluruh soal.' }, { status: 400 })
    if (questionType === 'essay' && (![shortAnswerMaxScore, longEssayMaxScore].every((score) => Number.isFinite(score) && score > 0 && score <= 100))) return NextResponse.json({ error: 'Skor maksimal harus lebih dari 0 dan tidak lebih dari 100.' }, { status: 400 })

    const typeInstruction = {
      multiple_choice: 'Setiap soal memiliki tepat 4 pilihan A, B, C, D dan tepat satu jawaban benar. Gunakan properti options sebagai objek A-D dan answer sebagai satu huruf.',
      complex_multiple_choice: 'Setiap soal memiliki tepat 4 pilihan A, B, C, D dan minimal dua jawaban benar. Gunakan properti options sebagai objek A-D dan answers sebagai array huruf jawaban yang benar.',
      true_false_matrix: 'Setiap soal memiliki 3 atau 4 pernyataan. Gunakan properti statements berupa array objek dengan id "1", "2", "3", "4" (maksimal 4), text, dan answer bernilai "Benar" atau "Salah".',
      essay: 'Buat ' + shortAnswerCount + ' soal pertama sebagai isian singkat dengan jawaban ringkas dan tepat, masing-masing skor maksimal ' + shortAnswerMaxScore + ' poin. Buat ' + (count - shortAnswerCount) + ' soal berikutnya sebagai uraian panjang yang membutuhkan penjelasan/penalaran, masing-masing skor maksimal ' + longEssayMaxScore + ' poin. Semua soal tetap bertipe essay/uraian agar kompatibel dengan CBT. Setiap soal wajib memiliki model_answer, rubric dengan kriteria dan pembagian skor yang jumlahnya tepat sesuai skor maksimal kelompoknya, serta max_score sesuai kelompok. Guru tetap menentukan nilai akhir.',
    }[questionType]

    const indicatorInstruction = indicator ? '\nIndikator yang harus diukur: ' + indicator + '.' : '\nBuat indikator soal yang relevan berdasarkan materi.'
    const cognitiveInstruction = cognitiveLevel === 'AUTO' ? 'Tentukan level kognitif yang paling sesuai dengan indikator dan materi.' : 'Gunakan level kognitif ' + cognitiveLevel + ' secara konsisten.'
    const prompt = 'Buat tepat ' + count + ' soal untuk siswa ' + grade + ', mata pelajaran ' + subject + ', dengan materi: ' + topic + '.' + indicatorInstruction +
      '\n\nLevel kognitif: ' + cognitiveInstruction +
      '\n\nKetentuan bentuk soal: ' + typeInstruction +
      '\n\nKetentuan umum:\n- Gunakan bahasa Indonesia sederhana sesuai usia siswa.\n- Pastikan soal sesuai materi dan indikator, tidak ambigu, serta memiliki jawaban yang dapat dipertanggungjawabkan.\n- Berikan pembahasan singkat dan jelas pada properti explanation.\n- Untuk LOTS, utamakan mengingat/memahami; MOTS menerapkan; HOTS menalar/menganalisis.\n- Jangan menambahkan teks di luar JSON' +
      (includeImages
        ? '\n\nKetentuan gambar penyerta:\n- Tambahkan properti image_prompt pada setiap soal.\n- Jika ilustrasi benar-benar membantu siswa memahami soal, isi image_prompt dengan deskripsi visual yang spesifik, akurat, dan siap digunakan generator gambar.\n- Jika soal tidak membutuhkan gambar, isi image_prompt dengan string kosong. Jangan memaksakan gambar pada semua soal.\n- Jenis visual yang diutamakan: ' + imageType + '.\n- Jangan meminta gambar memuat tulisan, label, angka, atau watermark. Untuk diagram matematika yang membutuhkan ukuran/angka presisi, tuliskan bentuk visual sederhana dan ingatkan bahwa guru harus memeriksa ketepatannya.'
        : '')

    const { data, provider } = await generateJsonWithFallback({
      task: 'pembuatan soal otomatis',
      prompt,
      groqSchema: toGroqSchema(getQuestionSchema(questionType, includeImages)),
      geminiSchema: getQuestionSchema(questionType, includeImages),
      timeoutMs: 50000,
      maxOutputTokens: 8000,
    })

    const result = data as { questions?: unknown }
    if (!Array.isArray(result.questions) || result.questions.length !== count) {
      return NextResponse.json({ error: 'Hasil AI belum sesuai jumlah soal yang diminta. Silakan coba lagi.' }, { status: 502 })
    }

    const generatedQuestions = questionType === 'essay'
      ? result.questions.map((question: Record<string, unknown>, index: number) => ({
          ...question,
          max_score: index < shortAnswerCount ? shortAnswerMaxScore : longEssayMaxScore,
        }))
      : result.questions

    return NextResponse.json({
      success: true,
      status: 'completed',
      provider,
      model: provider,
      questions: generatedQuestions,
    })
  } catch (error) {
    console.error('AI question generation failed:', error)
    if (error instanceof AIProvidersUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: 'Gagal membuat soal dengan AI. Silakan coba lagi.' }, { status: 500 })
  }
}
