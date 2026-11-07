# Inventaris Pengembangan Rich Text Editor

Branch pengembangan: `editor-test`  
Branch produksi: `main` (tidak diubah selama pengujian)

## Fitur yang telah diuji pengguna

| Fitur | Status |
|---|---|
| Upload gambar dari komputer ke Google Drive | Berhasil diuji |
| Galeri gambar Google Drive | Berhasil diuji |
| Sisipkan gambar melalui URL langsung | Berhasil diuji |
| Ekstraksi URL gambar dari halaman hasil Yahoo Images | Berhasil diuji |
| Salin-tempel gambar dari pencarian Yahoo ke editor | Berhasil diuji |
| Ubah ukuran gambar dengan pegangan resize | Berhasil diuji |
| Posisi kiri, tengah, dan kanan | Berhasil diuji |
| Bungkus teks di sisi kiri/kanan gambar | Berhasil diuji |
| Rotasi 90 derajat kiri/kanan dan reset | Berhasil diuji |
| Autosave konten laboratorium editor ke localStorage | Berhasil diuji |
| Build Vercel Preview untuk endpoint proxy gambar Drive | Berhasil setelah menghapus deklarasi `runtime` yang tidak kompatibel dengan `cacheComponents` |

## Implementasi terbaru — crop gambar

### Perbaikan CORS untuk gambar Google Drive
- Ditemukan bahwa thumbnail `drive.google.com` dapat ditampilkan tetapi tidak selalu dapat dibaca oleh browser canvas karena header CORS.
- Ditambahkan `app/api/google-drive/image/[id]/route.ts` sebagai proxy same-origin yang mengambil file gambar melalui Google Drive API setelah memeriksa hak admin.
- Build awal gagal karena deklarasi `export const runtime = 'nodejs'` tidak kompatibel dengan `nextConfig.cacheComponents`. Deklarasi tersebut dihapus; Node.js Runtime merupakan default Route Handler. Setelah perubahan ini, deployment Preview berhasil.
- `ImageCropDialog.tsx` mengenali URL thumbnail Drive dan mengambil byte gambar melalui endpoint proxy tersebut sebelum memotong.
- URL gambar eksternal non-Drive tetap diproses langsung dan tetap bergantung pada izin CORS dari situs asal.

File baru:
- `components/editor/ImageCropDialog.tsx`: dialog pemilihan area crop, pratinjau, pemrosesan canvas, dan upload hasil PNG ke endpoint Google Drive.
- `app/api/google-drive/image/[id]/route.ts`: endpoint proxy gambar Drive yang memeriksa admin, membaca token terenkripsi, lalu mengambil byte gambar dari Drive API. Sudah lolos build Preview; fungsi crop melalui endpoint ini masih menunggu uji pengguna.

File diperbarui:
- `components/editor/ResizableImage.tsx`: tombol crop pada toolbar gambar; hasil crop mengganti sumber gambar di dokumen dan mereset rotasi.

Alur crop:
1. Pilih gambar dan tekan tombol crop.
2. Tarik pada gambar untuk memilih area.
3. Tekan **Potong dan Simpan ke Drive**.
4. Hasil potongan diunggah sebagai file PNG baru melalui `/api/google-drive/upload`.
5. Node gambar di editor diarahkan ke file baru; file asli di Google Drive tidak dihapus.

Batasan yang perlu diuji:
- Crop dinonaktifkan ketika gambar masih berotasi. Reset rotasi terlebih dahulu.
- Beberapa host gambar eksternal tidak mengizinkan pemrosesan canvas lintas domain (CORS). Jika gagal, upload gambar ke Google Drive terlebih dahulu, lalu crop dari galeri.
- Alur crop dasar sebelumnya berhasil pada sebagian gambar eksternal yang mengizinkan CORS. Perbaikan proxy untuk gambar Google Drive sudah lolos build Preview, tetapi belum dikonfirmasi melalui uji crop langsung di Preview.

## Inventaris file editor

| File | Fungsi |
|---|---|
| `components/editor/RichTextEditor.tsx` | Mesin editor Tiptap dan daftar extension |
| `components/editor/EditorToolbar.tsx` | Toolbar utama editor |
| `components/editor/ImageDialog.tsx` | Upload, galeri Drive, dan URL gambar |
| `components/editor/ResizableImage.tsx` | Resize, alignment, text wrapping, rotasi, dan pemanggilan dialog crop |
| `components/editor/ImageCropDialog.tsx` | Pemilihan dan penyimpanan hasil crop |
| `components/editor/editor.css` | Tampilan editor dan kontrol gambar |
| `app/api/google-drive/upload/route.ts` | Validasi dan upload file gambar ke Google Drive |
| `app/api/google-drive/images/route.ts` | Daftar gambar dari folder galeri Google Drive |
| `app/font-test/page.tsx` | Laboratorium pengujian font, konten, dan autosave lokal |
| `components/MathRenderer.tsx` | Renderer matematika yang tetap dipakai pada tampilan lama |

## Roadmap berikutnya

1. Uji crop di Vercel Preview: seleksi area, pratinjau, upload hasil ke Drive, dan pastikan gambar asli tetap ada.
2. Uji crop pada gambar portrait/landscape dan gambar dari Drive serta URL eksternal.
3. Uji kombinasi crop dengan resize, alignment, wrapping, dan rotasi.
4. Integrasikan RichTextEditor ke halaman pengelolaan soal.
5. Pastikan kompatibilitas HTML soal lama, rumus matematika, Arab, Aksara Jawa, dan sistem penilaian.
6. Lakukan QA Preview menyeluruh. Jangan merge/promosikan ke `main` sebelum ada persetujuan eksplisit pengguna.
