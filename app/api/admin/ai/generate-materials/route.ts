import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'
import { generateJsonWithFallback, AIProvidersUnavailableError } from '@/lib/ai/provider'
import { getCurriculumTopics, type CurriculumTrack } from '@/lib/ai-question/curriculum-catalog'

export const maxDuration = 60

type GeneratedMaterial = {
  subtitle: string
  learningObjectives: string[]
  introduction: string
  sections: { heading: string; content: string; examples: string[]; activities: string[] }[]
  summary: string[]
  exercises: { question: string; answer: string; explanation: string }[]
  teacherNotes: string[]
}

const materialSchema = {
  type: 'OBJECT',
  properties: {
    subtitle: { type: 'STRING' },
    learningObjectives: { type: 'ARRAY', items: { type: 'STRING' } },
    introduction: { type: 'STRING' },
    sections: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          heading: { type: 'STRING' },
          content: { type: 'STRING' },
          examples: { type: 'ARRAY', items: { type: 'STRING' } },
          activities: { type: 'ARRAY', items: { type: 'STRING' } },
        },
        required: ['heading', 'content', 'examples', 'activities'],
      },
    },
    summary: { type: 'ARRAY', items: { type: 'STRING' } },
    exercises: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          answer: { type: 'STRING' },
          explanation: { type: 'STRING' },
        },
        required: ['question', 'answer', 'explanation'],
      },
    },
    teacherNotes: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['subtitle', 'learningObjectives', 'introduction', 'sections', 'summary', 'exercises', 'teacherNotes'],
}

const groqSchema = {
  type: 'object',
  properties: {
    subtitle: { type: 'string' },
    learningObjectives: { type: 'array', items: { type: 'string' } },
    introduction: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          heading: { type: 'string' },
          content: { type: 'string' },
          examples: { type: 'array', items: { type: 'string' } },
          activities: { type: 'array', items: { type: 'string' } },
        },
        required: ['heading', 'content', 'examples', 'activities'],
        additionalProperties: false,
      },
    },
    summary: { type: 'array', items: { type: 'string' } },
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['question', 'answer', 'explanation'],
        additionalProperties: false,
      },
    },
    teacherNotes: { type: 'array', items: { type: 'string' } },
  },
  required: ['subtitle', 'learningObjectives', 'introduction', 'sections', 'summary', 'exercises', 'teacherNotes'],
  additionalProperties: false,
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateMaterial(value: unknown): value is GeneratedMaterial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  if (!isText(item.subtitle) || !isText(item.introduction)) return false
  if (!Array.isArray(item.learningObjectives) || item.learningObjectives.length < 2 || !item.learningObjectives.every(isText)) return false
  if (!Array.isArray(item.sections) || item.sections.length < 3 || item.sections.length > 8) return false
  if (!Array.isArray(item.summary) || item.summary.length < 2 || !item.summary.every(isText)) return false
  if (!Array.isArray(item.exercises) || item.exercises.length < 3 || item.exercises.length > 12) return false
  if (!Array.isArray(item.teacherNotes) || !item.teacherNotes.every(isText)) return false
  for (const section of item.sections) {
    if (!section || typeof section !== 'object' || Array.isArray(section)) return false
    const row = section as Record<string, unknown>
    if (!isText(row.heading) || !isText(row.content)) return false
    if (!Array.isArray(row.examples) || !row.examples.every(isText)) return false
    if (!Array.isArray(row.activities) || !row.activities.every(isText)) return false
  }
  return item.exercises.every((exercise) => {
    if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) return false
    const row = exercise as Record<string, unknown>
    return isText(row.question) && isText(row.answer) && isText(row.explanation)
  })
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

function listHtml(items: string[]) {
  return '<ul>' + items.map((item) => '<li>' + escapeHtml(item) + '</li>').join('') + '</ul>'
}

function materialToHtml(material: GeneratedMaterial): string {
  const sections = material.sections.map((section) => {
    const examples = section.examples.length ? '<h4>Contoh</h4>' + listHtml(section.examples) : ''
    const activities = section.activities.length ? '<h4>Aktivitas belajar</h4>' + listHtml(section.activities) : ''
    return '<h2>' + escapeHtml(section.heading) + '</h2><p>' + escapeHtml(section.content) + '</p>' + examples + activities
  }).join('')
  const exercises = material.exercises.map((exercise, index) =>
    '<li><p><strong>' + (index + 1) + '. ' + escapeHtml(exercise.question) + '</strong></p><p><strong>Jawaban:</strong> ' + escapeHtml(exercise.answer) + '</p><p><strong>Pembahasan:</strong> ' + escapeHtml(exercise.explanation) + '</p></li>'
  ).join('')
  const teacherNotes = material.teacherNotes.length ? '<h2>Catatan untuk Guru</h2>' + listHtml(material.teacherNotes) : ''
  return [
    '<h1>' + escapeHtml(material.subtitle) + '</h1>',
    '<h2>Tujuan Pembelajaran</h2>' + listHtml(material.learningObjectives),
    '<h2>Pendahuluan</h2><p>' + escapeHtml(material.introduction) + '</p>',
    sections,
    '<h2>Rangkuman</h2>' + listHtml(material.summary),
    '<h2>Latihan dan Pembahasan</h2><ol>' + exercises + '</ol>',
    teacherNotes,
  ].join('')
}

function validGrade(value: unknown): number | null {
  const grade = Number(value)
  return Number.isInteger(grade) && grade >= 1 && grade <= 12 ? grade : null
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
    const action = body?.action

    if (action === 'generate') {
      const track = body.track as CurriculumTrack
      const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
      const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : ''
      const grade = validGrade(body.grade)
      const extraInstructions = typeof body.extraInstructions === 'string' ? body.extraInstructions.trim().slice(0, 1200) : ''

      if (!['TKA', 'GRADE_6'].includes(track) || !subject || subject.length > 80 || !topicId || topicId.length > 100) {
        return NextResponse.json({ error: 'Pilihan kurikulum, mata pelajaran, atau topik tidak valid.' }, { status: 400 })
      }
      if (track === 'GRADE_6' && grade !== 6) {
        return NextResponse.json({ error: 'Jalur pembelajaran ini ditujukan untuk kelas 6.' }, { status: 400 })
      }
      const topic = getCurriculumTopics(track, subject).find((item) => item.id === topicId)
      if (!topic) return NextResponse.json({ error: 'Topik tidak ditemukan dalam katalog kurikulum.' }, { status: 400 })

      const prompt = [
        'Anda adalah ahli pengembangan bahan ajar SD di Indonesia. Buat satu materi ajar yang akurat, runtut, ramah murid, dan dapat diedit guru.',
        'Jangan mencampur jalur TKA dengan materi pembelajaran umum kelas 6.',
        'Gunakan Bahasa Indonesia yang jelas. Istilah Bahasa Jawa atau Bahasa Inggris boleh digunakan sesuai mata pelajaran.',
        'Keluaran wajib mengikuti JSON Schema. Jangan menulis HTML atau Markdown.',
        'Buat 3 sampai 6 bagian materi. Setiap bagian memiliki penjelasan substantif, contoh jika sesuai, dan aktivitas belajar jika sesuai.',
        'Sertakan sedikitnya 3 latihan dengan jawaban dan pembahasan yang benar. Periksa kembali seluruh hitungan, fakta, ejaan, dan konsistensi.',
        'Jangan mengarang kutipan atau menyatakan materi ini sebagai teks resmi pemerintah. Untuk TKA, fokus pada kompetensi yang diukur, bukan mengklaim sebagai soal resmi.',
        'Sesuaikan kedalaman dengan kelas 6 SD/Fase C bila jalur GRADE_6. Untuk jalur TKA SD, gunakan konteks dan tingkat kesulitan yang sesuai asesmen SD.',
        'Konteks kurikulum: ' + track,
        'Kelas: ' + (grade || 'Sesuai cakupan TKA SD'),
        'Mata pelajaran: ' + subject,
        'Topik: ' + topic.title,
        'Deskripsi topik: ' + topic.description,
        'Indikator: ' + topic.indicator,
        extraInstructions ? 'Arahan tambahan guru: ' + extraInstructions : '',
      ].filter(Boolean).join('\n\n')

      const generated = await generateJsonWithFallback({
        task: 'teaching_material',
        prompt,
        groqSchema,
        geminiSchema: materialSchema,
        timeoutMs: 55000,
        maxOutputTokens: 6500,
      })
      if (!validateMaterial(generated.data)) {
        return NextResponse.json({ error: 'Hasil AI belum memenuhi struktur materi yang diwajibkan. Silakan coba lagi.' }, { status: 502 })
      }
      return NextResponse.json({
        title: topic.title,
        description: generated.data.subtitle,
        contentHtml: materialToHtml(generated.data),
        provider: generated.provider,
        model: generated.model,
      })
    }

    if (action === 'save') {
      const title = typeof body.title === 'string' ? body.title.trim() : ''
      const description = typeof body.description === 'string' ? body.description.trim() : ''
      const contentHtml = typeof body.contentHtml === 'string' ? body.contentHtml : ''
      const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
      const track = body.track as CurriculumTrack
      const topicId = typeof body.topicId === 'string' ? body.topicId.trim() : ''
      const grade = validGrade(body.grade)
      const materialId = typeof body.materialId === 'string' ? body.materialId.trim() : ''
      const status = body.status === 'published' ? 'published' : 'draft'

      if (!title || title.length > 180 || !subject || subject.length > 80 || !contentHtml.trim() || contentHtml.length > 500000) {
        return NextResponse.json({ error: 'Judul, mata pelajaran, dan isi materi wajib diisi. Ukuran isi maksimal 500 KB.' }, { status: 400 })
      }
      if (!['TKA', 'GRADE_6'].includes(track) || !topicId || !getCurriculumTopics(track, subject).some((item) => item.id === topicId)) {
        return NextResponse.json({ error: 'Metadata kurikulum tidak valid.' }, { status: 400 })
      }
      if (track === 'GRADE_6' && grade !== 6) return NextResponse.json({ error: 'Kelas harus 6 untuk jalur GRADE_6.' }, { status: 400 })
      if (materialId && !/^[0-9a-f-]{36}$/i.test(materialId)) return NextResponse.json({ error: 'ID materi tidak valid.' }, { status: 400 })

      const payload = {
        title,
        description: description.slice(0, 500),
        content_html: contentHtml,
        subject,
        file_url: null,
        curriculum_track: track,
        grade: grade || 6,
        topic_id: topicId,
        status,
        updated_at: new Date().toISOString(),
        ...(typeof body.authorName === 'string' ? { author_display_name: body.authorName.trim().slice(0, 120) || null } : {}),
      }
      const query = auth.adminClient.from('study_materials')
      const result = materialId
        ? await query.update(payload).eq('id', materialId).select('id').maybeSingle()
        : await query.insert({ ...payload, created_by: auth.userId }).select('id').single()

      if (result.error) {
        console.error('AI material save failed:', result.error)
        return NextResponse.json({ error: 'Materi gagal disimpan. Periksa koneksi database dan struktur tabel.' }, { status: 500 })
      }
      if (!result.data?.id) return NextResponse.json({ error: 'Materi tidak ditemukan atau tidak dapat diperbarui.' }, { status: 404 })
      return NextResponse.json({ success: true, id: result.data.id, status })
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 })
  } catch (error) {
    if (error instanceof AIProvidersUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin teaching material API error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan saat memproses materi.' }, { status: 500 })
  }
}
