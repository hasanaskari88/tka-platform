# Arsip Sesi — Audit dan QA AI Terpadu
Tanggal: 23 November 2026 (WIB)
Status: DIJEDA — menunggu penyelesaian masalah lain yang akan disampaikan pengguna.

## Tujuan sesi
Melanjutkan audit perkembangan AI TKA Platform dari kode aktif, build Production, konfigurasi Supabase, log penggunaan, roadmap, dan catatan percakapan. Tahap berikutnya yang disepakati adalah QA AI terpadu. Belum ada perubahan kode atau konfigurasi Production untuk QA ini.

## Baseline kode dan deployment
- Repository: https://github.com/hasanaskari88/tka-platform
- Branch: main
- Commit baseline yang diperiksa: 2cff8cc22f8128d5e477221facbd4a02afa839ac
- Deployment Vercel: dpl_BwfzieqQ7EKhpWEBrf8dN66eTX79
- Project: grisan
- Target: production
- Status saat diperiksa: READY
- URL produksi: https://grisan.vercel.app
- Catatan: deployment READY dan build berhasil tidak membuktikan semua alur AI lulus uji end-to-end.

## Endpoint AI yang ditemukan pada kode/build
- /api/admin/ai/generate-questions
- /api/admin/ai/grade-essay
- /api/admin/ai/analyze-question
- /api/admin/ai/analyze-visual-intent
- /api/admin/ai/plan-question-image
- /api/admin/ai/generate-question-image
- /api/admin/ai/generate-materials

Halaman/komponen terkait:
- app/admin/asisten-ai/page.tsx — generator soal
- app/admin/materi-ai/page.tsx — generator materi
- app/admin/exam/[id]/analysis/page.tsx — analisis butir
- app/admin/exam/[id]/results/page.tsx — rekomendasi nilai uraian
- app/admin/pusat-layanan/page.tsx — pengaturan provider/pemantauan layanan
- lib/ai/provider.ts — provider dan fallback
- lib/visual-math/ — fondasi Visual Math
- docs/ai-visual-math-architecture.md
- docs/ai-visual-math-engine.md
- scripts/test-visual-math.cjs
- ROADMAP.md

## Konfigurasi provider yang diperiksa
Urutan provider aktif dari platform_service_settings:
1. Groq — aktif, utama.
2. Gemini akun kedua — aktif, fallback pertama.
3. Gemini akun utama — aktif, fallback kedua.

Kode fallback tersedia di lib/ai/provider.ts. Log yang diperiksa belum membuktikan Gemini benar-benar digunakan. Jangan menguji fallback dengan mematikan provider di Production secara sembarangan.

Provider gambar:
- Cloudflare Workers AI / FLUX.1 Schnell
- Model: @cf/black-forest-labs/flux-1-schnell

## Bukti penggunaan dari ai_usage_logs
Query agregat 30 hari yang diperiksa menghasilkan 43 percobaan sukses tercatat:
- generate_questions: 28 sukses, provider Groq.
- analyze_visual_intent (batch): 10 sukses, provider Groq.
- generate_materials: 4 sukses, provider Groq.
- grade_essay: 1 sukses, provider Groq.

Catatan interpretasi:
- Angka di atas adalah catatan penggunaan, bukan penilaian kualitas hasil.
- Tidak ditemukan catatan Gemini pada hasil agregat yang diperiksa; ini bukan bukti fallback gagal.
- Tidak ditemukan catatan keberhasilan pembuatan gambar FLUX pada hasil yang diperiksa. Perlu pengujian alur generate, upload, dan read-back serta verifikasi pencatatannya.
- Belum ada bukti penggunaan pada hasil log yang diperiksa untuk analisis butir.
- Pemeriksaan runtime Vercel rentang 30 menit terakhir tidak menemukan error/fatal; retensi log yang tersedia terbatas, sehingga tidak dapat dipakai untuk menyimpulkan seluruh fitur sehat.

## Area fitur dan status QA
| Area | Kondisi berdasarkan kode/log | Status QA |
|---|---|---|
| Generator soal | Implementasi tersedia; 28 catatan sukses Groq | Perlu audit kualitas isi dan alur UI |
| Generator materi | Implementasi tersedia; 4 catatan sukses Groq | Perlu QA topik tunggal, multi-topik, pilih semua, kegagalan parsial, simpan draf |
| Analisis visual intent | Implementasi tersedia; 10 catatan sukses Groq | Perlu cek integrasi ke Visual Math |
| Visual Math | Dokumentasi, library, dan regression script tersedia | Belum dijalankan pada sesi ini |
| FLUX gambar | Endpoint perencanaan dan generator tersedia | Belum terbukti end-to-end; periksa upload, penyimpanan, baca ulang, usage log |
| Analisis butir | Endpoint dan halaman analisis tersedia | Belum ada bukti penggunaan di log yang diperiksa; perlu QA |
| Penilaian uraian | Endpoint dan UI rekomendasi tersedia; 1 catatan sukses | Perlu QA akurasi, rubrik, dan batas skor |
| Gemini fallback | Kode dan konfigurasi tersedia | Belum terbukti dipanggil melalui log |

## Catatan risiko/hal yang perlu diverifikasi
1. Format pecahan: pastikan keluaran AI tetap benar setelah masuk editor, disimpan, dimuat ulang, dan ditampilkan di halaman baca.
2. FLUX: verifikasi timeout, kuota, kegagalan provider, upload/penyimpanan media, akses ulang gambar, dan pencatatan penggunaan.
3. Penilaian uraian: route menetapkan skor minimum 1 untuk jawaban terisi pada soal dengan skor maksimal >= 3. Kebijakan ini perlu ditinjau bersama pengguna sebelum dianggap benar; jangan mengubahnya tanpa persetujuan.
4. Analisis butir: pastikan AI hanya memberi rekomendasi dan tidak otomatis mengubah kunci atau mekanisme nilai.
5. Fallback: uji dengan metode terkendali di lingkungan aman/staging bila tersedia; jangan mengubah provider Production hanya untuk memaksa fallback.
6. Visual Math: jalankan scripts/test-visual-math.cjs dan uji kasus ambigu, relasi antarangka, satuan, validitas fakta, serta konsistensi diagram. Renderer harus menolak/menahan diagram bila fakta matematika tidak dapat divalidasi.

## Rencana QA terpadu yang telah disepakati
Tahap 1 — Generator soal:
- Buka /admin/asisten-ai.
- Pilih jalur TKA SD, kelas VI, Matematika, topik pecahan.
- Buat 2 soal pilihan ganda.
- Matikan opsi pembuatan gambar untuk tes awal.
- Jangan simpan hasil ke bank soal sebelum diperiksa.
- Kirim tangkapan layar hasil untuk menilai ketepatan pertanyaan, opsi, kunci, pembahasan, format pecahan, dan tingkat kesulitan TKA SD.

Tahap 2 — Generator materi:
- Uji satu topik, beberapa topik, pilih semua, dan kegagalan di tengah proses.
- Periksa hasil editor, penyimpanan draf, muat ulang, dan halaman baca.

Tahap 3 — Gambar AI:
- Uji plan-question-image dan generate-question-image.
- Uji FLUX, timeout/kuota, upload media, baca ulang gambar, dan usage log.

Tahap 4 — Gemini fallback:
- Uji fallback secara terkendali, jangan mengganggu Production.
- Verifikasi provider/model yang tercatat dan hasil respons.

Tahap 5 — Analisis butir dan penilaian uraian:
- Pastikan rekomendasi analisis tidak mengubah kunci otomatis.
- Uji rubrik, batas skor, jawaban kosong/tidak relevan, dan keputusan akhir tetap di tangan guru.

Tahap 6 — Visual Math:
- Jalankan scripts/test-visual-math.cjs.
- Uji pecahan, angka, satuan, kalimat ambigu, relasi antarangka, dan kesesuaian gambar dengan fakta matematika.

## Status saat sesi dihentikan
- Pengguna menyetujui melanjutkan QA AI terpadu.
- Audit awal kode, deployment, roadmap, konfigurasi provider, dan agregat log telah dilakukan.
- Belum ada tes UI end-to-end yang dijalankan pada sesi ini.
- Belum ada kode atau konfigurasi Production yang diubah untuk pekerjaan QA.
- Sesi dihentikan sementara karena pengguna akan menyampaikan masalah lain yang perlu diselesaikan terlebih dahulu.

## Titik lanjut
Saat pengguna kembali ke pekerjaan AI, lanjutkan dari Tahap 1 — tes generator soal pecahan, dua soal pilihan ganda, tanpa gambar, jangan simpan ke bank soal dahulu. Minta pengguna mengirim tangkapan layar hasil. Jangan mengulang audit awal kecuali baseline main/deployment sudah berubah.
