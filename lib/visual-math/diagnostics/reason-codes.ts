import type { VisualReasonCode } from '../types'

export const VISUAL_REASON_MESSAGES: Record<VisualReasonCode, string> = {
  INTENT_NOT_RECOGNIZED: 'Maksud matematika soal belum dapat dikenali.',
  FACTS_INCOMPLETE: 'Informasi angka atau objek pada soal belum lengkap.',
  FACTS_CONFLICT: 'Informasi pada soal saling bertentangan.',
  INVALID_NUMBER: 'Ada angka yang tidak valid untuk perhitungan.',
  DIVISION_BY_ZERO: 'Perhitungan tidak dapat dilakukan karena pembagi bernilai nol.',
  MATH_VALIDATION_FAILED: 'Hasil perhitungan tidak lolos pemeriksaan.',
  EQUIVALENT_OPTIONS: 'Ada dua atau lebih pilihan jawaban yang nilainya sama.',
  ANSWER_KEY_MISMATCH: 'Kunci jawaban tidak sesuai dengan hasil perhitungan.',
  UNIT_MISMATCH: 'Satuan pada nilai yang dibandingkan tidak sama.',
  RENDERER_NOT_SUPPORTED: 'Jenis diagram ini belum didukung.',
  RENDER_FAILED: 'Diagram gagal dibuat.',
  IMAGE_BLOB_EMPTY: 'Hasil gambar kosong.',
  UPLOAD_FAILED: 'Gambar gagal disimpan.',
  AI_RESPONSE_INVALID: 'Respons AI tidak sesuai struktur yang dibutuhkan.',
  NEEDS_TEACHER_REVIEW: 'Soal perlu diperiksa oleh guru sebelum digunakan.',
}

export function getVisualReasonMessage(code: VisualReasonCode): string {
  return VISUAL_REASON_MESSAGES[code]
}
