import { GoogleGenAI } from '@google/genai'
import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

const IMAGE_MODEL = 'gemini-3.1-flash-image'

const styleDescriptions: Record<string, string> = {
  '3d_cartoon': 'modern polished 3D cartoon educational illustration, friendly rounded shapes, appealing colors, soft studio lighting',
  '2d_flat': 'clean simple 2D flat vector illustration, clear shapes, limited harmonious colors',
  'semi_realistic': 'semi-realistic educational illustration, natural proportions, clear details, approachable for children',
  'photo_realistic': 'realistic educational photograph style, natural lighting, accurate real-world appearance',
  'black_white': 'black-and-white worksheet line art, clean bold outlines, no grayscale shading, suitable for printing and coloring',
}

const imageTypeDescriptions: Record<string, string> = {
  auto: 'Choose the most suitable visual treatment for the question.',
  illustration: 'Create a clear explanatory illustration that helps a child understand the question.',
  object: 'Show the relevant real-world object or objects clearly, with minimal distractions.',
  diagram: 'Create a simple conceptual diagram with clear spatial relationships. Avoid all text, labels, and numbers; the teacher will verify mathematical accuracy.',
  nature: 'Create an accurate nature or science illustration, with the important parts clearly visible.',
}

function createAI() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi di server.')
  return new GoogleGenAI({ apiKey, apiVersion: 'v1beta', httpOptions: { timeout: 20000 } })
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
    const imagePrompt = typeof body.imagePrompt === 'string' ? body.imagePrompt.trim() : ''
    const style = typeof body.style === 'string' ? body.style : '3d_cartoon'
    const imageType = typeof body.imageType === 'string' ? body.imageType : 'auto'
    const customInstruction = typeof body.customInstruction === 'string' ? body.customInstruction.trim() : ''
    const aspectRatio = typeof body.aspectRatio === 'string' ? body.aspectRatio : '16:9'

    if (!imagePrompt || imagePrompt.length > 3000) {
      return NextResponse.json({ error: 'Deskripsi gambar tidak valid.' }, { status: 400 })
    }
    if (!styleDescriptions[style]) return NextResponse.json({ error: 'Gaya gambar tidak valid.' }, { status: 400 })
    if (!imageTypeDescriptions[imageType]) return NextResponse.json({ error: 'Jenis gambar tidak valid.' }, { status: 400 })
    if (!['16:9', '4:3', '1:1'].includes(aspectRatio)) return NextResponse.json({ error: 'Rasio gambar tidak valid.' }, { status: 400 })
    if (customInstruction.length > 500) return NextResponse.json({ error: 'Instruksi khusus gambar maksimal 500 karakter.' }, { status: 400 })

    const prompt = [
      'Create exactly one high-quality educational image to accompany a school question for elementary-age students.',
      'Visual brief: ' + imagePrompt,
      'Visual style: ' + styleDescriptions[style] + '.',
      'Image type: ' + imageTypeDescriptions[imageType],
      'Composition: ' + aspectRatio + ' aspect ratio, centered subject, uncluttered composition, strong visual clarity, generous safe margins.',
      'Accuracy: preserve the objects, quantities, colors, and relationships described in the visual brief. Do not invent extra objects that could change the answer.',
      'Do not include any text, letters, numbers, captions, labels, symbols that look like writing, logos, signatures, or watermarks.',
      customInstruction ? 'Additional teacher instruction: ' + customInstruction : '',
      'The image must support learning and must not reveal or hint at the answer unless the visual brief explicitly requires it.',
    ].filter(Boolean).join('\n')

    const interaction = await createAI().interactions.create({
      model: IMAGE_MODEL,
      input: prompt,
      background: true,
      response_modalities: ['image'],
    })

    if (!interaction.id) return NextResponse.json({ error: 'Gemini tidak memberikan ID proses gambar.' }, { status: 502 })
    return NextResponse.json({ success: true, interactionId: interaction.id })
  } catch (error) {
    console.error('Gemini image generation start failed:', error)
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0
    return NextResponse.json(
      { error: status === 503 ? 'Layanan gambar Gemini sedang ramai. Coba lagi beberapa saat.' : 'Gagal memulai pembuatan gambar.' },
      { status: status === 503 ? 503 : 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const id = new URL(request.url).searchParams.get('id')
    if (!id || id.length > 200) return NextResponse.json({ error: 'ID proses gambar tidak valid.' }, { status: 400 })

    const interaction = await createAI().interactions.get(id)
    if (interaction.status === 'in_progress' || interaction.status === 'requires_action') {
      return NextResponse.json({ status: interaction.status })
    }
    if (interaction.status !== 'completed') {
      return NextResponse.json({ status: interaction.status, error: 'Gemini gagal membuat gambar. Silakan coba ulangi.' }, { status: 502 })
    }

    const image = interaction.output_image
    if (!image?.data) return NextResponse.json({ error: 'Gemini selesai tetapi tidak mengembalikan data gambar.' }, { status: 502 })

    const mimeType = image.mime_type || 'image/png'
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
      return NextResponse.json({ error: 'Format gambar hasil AI tidak didukung.' }, { status: 502 })
    }

    const size = Buffer.byteLength(image.data, 'base64')
    if (size > 8 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran gambar hasil AI melebihi 8 MB.' }, { status: 502 })

    return NextResponse.json({ status: 'completed', imageBase64: image.data, mimeType })
  } catch (error) {
    console.error('Gemini image generation polling failed:', error)
    return NextResponse.json({ error: 'Tidak dapat memeriksa hasil pembuatan gambar.' }, { status: 500 })
  }
}
