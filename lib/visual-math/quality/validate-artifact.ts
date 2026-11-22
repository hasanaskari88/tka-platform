import type { RenderArtifact, RendererQualityResult } from '../renderers/types'

/** Rejects empty or internally inconsistent renderer output before upload. */
export function validateRenderArtifact(artifact: RenderArtifact): RendererQualityResult {
  if (!(artifact.blob instanceof Blob) || artifact.blob.size <= 0) {
    return { status: 'rejected', reasonCode: 'BLOB_EMPTY', message: 'Hasil gambar kosong.' }
  }
  if (artifact.mimeType !== 'image/png' || artifact.blob.type !== 'image/png') {
    return { status: 'rejected', reasonCode: 'INVALID_MIME_TYPE', message: 'Format gambar bukan PNG.' }
  }
  if (
    !Number.isSafeInteger(artifact.width) ||
    !Number.isSafeInteger(artifact.height) ||
    artifact.width < 1 ||
    artifact.height < 1 ||
    artifact.width > 4096 ||
    artifact.height > 4096
  ) {
    return { status: 'rejected', reasonCode: 'INVALID_DIMENSIONS', message: 'Ukuran gambar tidak valid.' }
  }
  if (!Number.isSafeInteger(artifact.elementCount) || artifact.elementCount < 1) {
    return { status: 'rejected', reasonCode: 'INVALID_ELEMENT_COUNT', message: 'Jumlah elemen visual tidak valid.' }
  }
  if (
    !Array.isArray(artifact.representedValues) ||
    artifact.representedValues.length < 1 ||
    artifact.representedValues.some((value) => typeof value !== 'string' || !value.trim())
  ) {
    return {
      status: 'rejected',
      reasonCode: 'MISSING_REPRESENTED_VALUES',
      message: 'Metadata nilai yang digambarkan tidak lengkap.',
    }
  }
  return { status: 'accepted', artifact }
}
