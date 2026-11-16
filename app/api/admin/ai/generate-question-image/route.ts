import { NextResponse } from 'next/server'
import { requireTrustedAdmin } from '@/lib/supabase/trusted-admin'

const IMAGE_MODEL = '@cf/black-forest-labs/flux-1-schnell'

export const maxDuration = 60

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

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (!origin || origin !== new URL(request.url).origin) {
      return NextResponse.json({ error: 'Permintaan lintas situs ditolak.' }, { status: 403 })
    }

    const auth = await requireTrustedAdmin()
    if (!auth.authorized) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !apiToken) {
      console.error('Cloudflare Workers AI configuration is incomplete.')
      return NextResponse.json({ error: 'Konfigurasi layanan gambar Cloudflare belum lengkap di server.' }, { status: 503 })
    }

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
      'Create exactly one high-quality educational image for an elementary-school question.',
      'Visual brief: ' + imagePrompt,
      'Visual style: ' + styleDescriptions[style] + '.',
      'Image type: ' + imageTypeDescriptions[imageType],
      'Composition: ' + aspectRatio + ' aspect ratio, centered subject, uncluttered composition, strong visual clarity, generous safe margins.',
      'Accuracy: preserve the objects, quantities, colors, and relationships described. Do not invent extra objects that could change the answer.',
      'Do not include text, letters, numbers, captions, labels, logos, signatures, or watermarks.',
      customInstruction ? 'Teacher instruction: ' + customInstruction : '',
      'Do not reveal or hint at the answer unless the visual brief explicitly requires it.',
    ].filter(Boolean).join('\n').slice(0, 2048)

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${IMAGE_MODEL}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, steps: 4 }),
        signal: AbortSignal.timeout(55000),
      }
    )

    const payload = await response.json() as {
      success?: boolean
      result?: { image?: string }
      errors?: Array<{ message?: string; code?: number }>
    }

    if (!response.ok || !payload.success || !payload.result?.image) {
      console.error('Cloudflare Workers AI image generation failed:', {
        httpStatus: response.status,
        errors: payload.errors?.map((item) => ({ code: item.code, message: item.message })),
      })
      return NextResponse.json(
        { error: response.status === 429
          ? 'Batas penggunaan Cloudflare Workers AI tercapai. Silakan coba lagi nanti.'
          : 'Cloudflare belum berhasil membuat gambar. Periksa konfigurasi atau coba lagi.' },
        { status: response.status === 429 ? 429 : 502 }
      )
    }

    const imageBase64 = payload.result.image
    const size = Buffer.byteLength(imageBase64, 'base64')
    if (size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran gambar hasil AI melebihi 8 MB.' }, { status: 502 })
    }

    return NextResponse.json({ success: true, imageBase64, mimeType: 'image/jpeg' })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('Cloudflare Workers AI image generation request failed:', { message })
    return NextResponse.json(
      { error: message.includes('timed out') || message.includes('Timeout')
        ? 'Cloudflare terlalu lama membuat gambar. Silakan coba lagi.'
        : 'Gagal menghubungi layanan gambar Cloudflare.' },
      { status: 500 }
    )
  }
}
