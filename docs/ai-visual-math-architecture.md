# Rancangan Arsitektur AI Visual Math Engine

Status: rancangan target berdasarkan audit kode pada `main`  
Baseline audit: `9698185be101d4e46f16545dd95c3073b15460eb`  
Keputusan: `main` adalah satu-satunya sumber kerja. Tidak ada branch kerja, preview deployment, atau perubahan skema database untuk pekerjaan fondasi ini.

## 1. Sasaran sistem

Membangun mesin visual matematika yang menerima soal dalam bahasa alami, memahami struktur matematikanya, memeriksa fakta dan relasinya, menghitung dengan algoritma deterministik, lalu menghasilkan diagram yang konsisten dengan data. Mesin harus dapat ditambah jenis soal dan renderer baru tanpa memperbesar satu file pusat atau mengubah alur soal lama.

AI berfungsi sebagai pembaca/penafsir bahasa dan pengusul fakta. AI bukan kalkulator, bukan validator final, dan bukan sumber kebenaran diagram.

Prinsip keselamatan:
- Tidak ada diagram matematika jika fakta, relasi, satuan, atau maksud pertanyaan belum dapat dipastikan.
- Tidak ada fallback ke gambar AI dekoratif ketika analisis matematika gagal.
- Nilai hasil hitung berasal dari kode deterministik.
- Bukti kutipan hanya salah satu pemeriksaan; bukti harus diikuti validasi relasi semantik.
- Kegagalan satu visual tidak boleh menggagalkan pembuatan atau penyimpanan soal lain.
- Skema database, penilaian CBT, dan format soal lama tetap kompatibel.

## 2. Hasil audit kondisi `main`

### Yang sudah tersedia dan dipertahankan

- Kontrak intent dasar di `lib/visual-math/types.ts`.
- Operasi rasional berbasis `BigInt`, parser pecahan/desimal/persen, dan parser quantity.
- Ekstraksi deterministik terbatas untuk beberapa pola bahasa Indonesia.
- Pembangun intent AI dengan bukti kutipan.
- Validasi struktur intent dan kalkulator deterministik.
- Pemeriksaan kesetaraan opsi angka dan validasi kunci untuk pola yang didukung.
- Endpoint admin `analyze-visual-intent`.
- Renderer Canvas untuk tujuh kelompok intent.
- Integrasi halaman Asisten AI, generator gambar nonmatematika, dan endpoint upload media.
- Regression test `scripts/test-visual-math.cjs`.

### Kesenjangan dan risiko yang ditemukan

1. **Pemeriksaan bukti belum membuktikan relasi.** `build-ai-intent.ts` mengecek keberadaan angka/label dan beberapa kata pemicu. Contohnya, untuk pembagian sama rata, jumlah objek dan jumlah kelompok dapat sama-sama ditemukan pada kutipan tanpa membuktikan bahwa keduanya berelasi sebagai total dan kelompok pembagi.
2. **Pola deterministik rentan salah memilih angka.** Ekstraksi berbasis regex mengambil kecocokan angka dan kata benda tertentu; kalimat dengan beberapa jumlah, konteks negasi, atau pertanyaan multi-langkah berpotensi salah ditafsirkan.
3. **Model intent belum memuat struktur relasi yang cukup.** Beberapa intent hanya berisi angka akhir yang diekstrak, tanpa peran semantik/sumber fakta. Validator struktur tidak dapat memeriksa apakah fakta berasal dari klausa yang benar.
4. **Geometri hanya memvalidasi label dan nilai.** Belum ada validasi jumlah ukuran wajib per bangun, kesesuaian satuan, atau hubungan sisi. Renderer memakai dimensi gambar tetap; diagram bukan gambar berskala. Ini harus dinyatakan sebagai skema ilustratif, bukan representasi ukuran presisi.
5. **Piktograf membulatkan simbol ke atas.** Implementasi menggunakan `Math.ceil(value / unit)`; hasil dapat menyiratkan kuantitas lebih besar dari data. Piktograf harus memakai unit yang membagi semua nilai secara tepat atau menyatakan pecahan simbol secara eksplisit; jika tidak, renderer menolak.
6. **Renderer satu file besar.** `renderers/canvas.ts` berisi gambar semua intent. Penambahan diagram meningkatkan risiko regresi dan menyulitkan pengujian terisolasi.
7. **Kalkulator dan validator belum sepenuhnya memiliki kontrak satuan/operasi.** Hasil diagram dan hasil hitung dibedakan secara implisit melalui `value: null`; perlu hasil perhitungan bertipe yang menjelaskan apakah operasi menghasilkan nilai, relasi, atau hanya data siap gambar.
8. **Deteksi kebutuhan matematika di UI memakai kata kunci.** `isMathematicsVisual` menggabungkan subject/topic/question/explanation dan regex. Ini dapat salah klasifikasi. Keputusan visual matematika harus datang dari analisis server, bukan tebakan UI.
9. **Alur analisis dan render tersebar.** Halaman mengatur analisis, pemilihan renderer, upload, dan status. Orkestrasi ini sulit diuji tanpa browser dan dapat menimbulkan status yang tidak konsisten.
10. **Hasil analisis tidak mempunyai kontrak visual yang lengkap.** Trace tahap tersedia, tetapi belum menjelaskan versi parser, sumber fakta, relasi yang diverifikasi, hasil renderer, dan alasan abstain dengan format konsisten.
11. **Test sekarang terutama menguji fungsi dan mock Canvas.** Belum cukup untuk menguji kalimat adversarial, hubungan antar fakta, ketepatan nilai visual, ukuran proporsional, dan integrasi API/upload.

Catatan: temuan ini adalah hasil pembacaan kode sumber di `main`, bukan klaim bahwa seluruh skenario runtime telah diuji.

## 3. Arsitektur target

Alur tunggal:

```text
Question + options + answer + explanation + context
                    |
                    v
          Input Normalizer
                    |
                    v
        Intent Candidate Extractor
          /                   \
 deterministic rules       AI semantic adapter
          \                   /
                    v
          Canonical Fact Graph
                    |
                    v
       Evidence & Semantic Validator
                    |
          +---------+---------+
          |                   |
       rejected             accepted
          |                   |
          v                   v
     Abstain result      Math Operation Planner
                              |
                              v
                    Deterministic Math Engine
                              |
                              v
                    Visual Specification
                              |
                              v
                       Renderer Registry
                              |
                              v
                   Render Quality Gate
                              |
                              v
                     Media Upload Adapter
                              |
                              v
                VisualMathResult + trace + URL
```

### Layer responsibilities

1. **Input Normalizer**: membersihkan HTML aman, mempertahankan simbol matematika, menggabungkan teks soal dan konteks secara terpisah. Jangan menggabungkan pembahasan/kunci ke bukti soal.
2. **Intent Candidate Extractor**: menjalankan aturan deterministik yang eksplisit lebih dahulu; bila belum terjawab, meminta AI menghasilkan kandidat JSON. Kedua jalur harus menghasilkan kontrak kandidat yang sama.
3. **Canonical Fact Graph**: menyimpan fakta dengan ID, nilai, label, satuan, peran, dan rentang sumber. Relasi menyatakan hubungan seperti `part_of`, `total_of`, `divided_into`, `selected_from`, `compared_with`, `measured_by`, dan `belongs_to_category`.
4. **Evidence & Semantic Validator**: memeriksa bukti sumber, peran fakta, konsistensi relasi, batas domain, satuan, kelengkapan, dan apakah pertanyaan benar-benar meminta operasi tersebut. Validator mengembalikan accepted/rejected/needs_teacher_review dengan kode alasan.
5. **Math Operation Planner**: mengubah graph tervalidasi menjadi operasi eksplisit. Tidak menginferensikan operasi hanya dari tipe diagram.
6. **Deterministic Math Engine**: melakukan operasi eksak menggunakan rational/BigInt dan konversi satuan yang didefinisikan. Tidak menerima hasil hitung dari AI.
7. **Visual Specification**: deskripsi netral renderer tentang objek, jumlah, kelompok, label, relasi, ukuran kanvas, dan aturan representasi. Visual spec harus dapat dibandingkan dengan graph dan hasil kalkulasi.
8. **Renderer Registry**: memilih renderer berdasarkan `intent.type` dan versi renderer. Tiap renderer berada di file terpisah dan mengembalikan artefak beserta metadata kualitas.
9. **Render Quality Gate**: memeriksa bahwa renderer menghasilkan blob nonkosong, dimensi valid, seluruh elemen wajib tergambar, tidak ada kuantitas yang dibulatkan diam-diam, dan metadata sesuai visual spec.
10. **Media Upload Adapter**: menggunakan endpoint upload media yang sudah ada; tidak mengubah strategi penyimpanan atau tabel log.
11. **Orchestrator**: satu fungsi server-side mengelola seluruh tahapan dan trace. UI hanya mengirim input dan menampilkan hasil.

## 4. Struktur folder target

Struktur berikut adalah target bertahap. Modul yang sudah ada dipindah/diadaptasi, bukan diduplikasi dengan dua implementasi aktif.

```text
lib/visual-math/
  contracts/
    input.ts
    facts.ts
    intent.ts
    result.ts
    visual-spec.ts
  normalize/
    normalize-question.ts
    normalize-math-text.ts
  extraction/
    extract-candidates.ts
    deterministic/
      index.ts
      number-comparison.ts
      equal-sharing.ts
      fraction-partition.ts
      category-total.ts
      number-line.ts
      geometry.ts
      chart-table.ts
    ai/
      prompt.ts
      parse-response.ts
  semantic/
    fact-graph.ts
    validate-evidence.ts
    validate-relations.ts
    validate-units.ts
    validate-question-goal.ts
    validate-candidate.ts
  math/
    rational.ts
    quantity.ts
    operations/
      fraction.ts
      sharing.ts
      comparison.ts
      number-line.ts
      geometry.ts
      statistics.ts
    plan-operation.ts
    calculate.ts
  visual/
    build-spec.ts
    validate-spec.ts
  renderers/
    types.ts
    registry.ts
    canvas/
      shared/
      category-total.ts
      equal-sharing.ts
      fraction-partition.ts
      number-comparison.ts
      number-line.ts
      geometry.ts
      chart-table.ts
  quality/
    validate-artifact.ts
  pipeline/
    analyze-question.ts
    create-visual.ts
  diagnostics/
    reason-codes.ts
    trace.ts

app/api/admin/ai/analyze-visual-intent/route.ts
  -> validasi request/auth + panggil pipeline; tidak menyimpan logika domain

app/admin/asisten-ai/page.tsx
  -> kirim input, tampilkan status/trace, minta gambar, tampilkan hasil
```

## 5. Kontrak data inti

### 5.1 Input

```ts
type VisualAnalysisInput = {
  question: string
  subject?: string
  topic?: string
  grade?: string
  options?: Record<string, string>
  answer?: string | string[]
  explanation?: string
}
```

Pembahasan, kunci, dan opsi boleh menjadi konteks pemeriksaan konsistensi, tetapi bukti angka/relasi harus ditautkan ke teks sumber yang benar. Sistem harus membedakan `source: 'question'`, `'option'`, `'answer'`, dan `'explanation'`.

### 5.2 Fact graph

```ts
type SourceRef = {
  source: 'question' | 'option' | 'answer' | 'explanation'
  start: number
  end: number
  quote: string
}

type FactValue =
  | { kind: 'integer'; value: number }
  | { kind: 'rational'; value: RationalValue }
  | { kind: 'text'; value: string }
  | { kind: 'quantity'; value: RationalValue; unit: string }

type SemanticFact = {
  id: string
  role: string
  value: FactValue
  source: SourceRef
}

type SemanticRelation = {
  type: string
  from: string
  to: string
  source: SourceRef
}

type FactGraph = {
  facts: SemanticFact[]
  relations: SemanticRelation[]
  requestedGoal: string
}
```

Setiap fakta harus memiliki sumber dan peran. Fakta tanpa sumber, sumber yang tidak cocok, atau relasi yang tidak didukung membuat kandidat ditolak/ditandai perlu ditinjau guru.

### 5.3 Pipeline result

```ts
type PipelineStatus =
  | 'ready'
  | 'unsupported'
  | 'ambiguous'
  | 'invalid'
  | 'needs_teacher_review'

type PipelineStage = {
  stage: string
  status: 'ok' | 'skipped' | 'failed'
  reasonCode?: VisualReasonCode
  details?: Record<string, string | number | boolean>
}

type VisualMathResultV2 = {
  version: 2
  status: PipelineStatus
  intent: VisualIntent | null
  calculatedValue: RationalValue | null
  visualSpec: VisualSpec | null
  reasonCode: VisualReasonCode | null
  explanation: string
  trace: {
    traceId: string
    stages: PipelineStage[]
  }
}
```

Untuk kompatibilitas, respons V2 harus tetap menyediakan properti V1 yang sekarang dipakai halaman. Jangan mengubah bentuk V1 secara mendadak; buat adapter `toLegacyVisualMathResult` sampai seluruh pemanggil lama telah dipindahkan.

## 6. Aturan semantik per intent

Validasi bukan sekadar mengecek angka muncul dalam kutipan. Setiap intent memiliki aturan domain yang wajib dipenuhi.

| Intent | Fakta wajib | Relasi wajib | Operasi deterministik |
|---|---|---|---|
| category_of_total | kategori, jumlah tiap kategori, target | tiap kategori bagian dari satu total; target termasuk kategori | target / jumlah seluruh kategori |
| equal_sharing | total benda, jumlah kelompok, kelompok yang ditanya | total dibagikan sama rata ke kelompok; kelompok yang ditanya bagian dari kelompok total | total × kelompok terpilih / kelompok total |
| fraction_partition | satu keseluruhan, total bagian sama, bagian terpilih/dihapus/tersisa | bagian sama besar; selected/removed/remaining tidak tertukar | bagian relevan / total bagian |
| number_comparison | dua nilai rasional, relasi yang diminta | dua nilai adalah objek yang dibandingkan; arah pertanyaan jelas | compare eksak |
| number_line | batas minimum/maksimum, titik | semua titik berada dalam rentang; label unik atau aturan duplikasi eksplisit | pemetaan nilai ke posisi |
| geometry | jenis bangun, ukuran, satuan | label ukuran sesuai sisi/radius/diameter; ukuran wajib tersedia | hanya hitung jika pertanyaan meminta dan data cukup |
| chart_table | kategori, nilai | kategori unik; setiap nilai berasal dari data yang sama; skala representasi eksak | agregasi hanya bila diminta |

Contoh penolakan wajib:
- "Ada 12 kelereng, 3 kotak, dan 4 anak" tidak cukup untuk menyimpulkan 12 kelereng dibagi ke 3 kotak.
- "Sebuah pizza dipotong 8 bagian, 3 dimakan" tidak boleh menampilkan 3 bagian sebagai sisa.
- "Panjang 8 cm dan lebar 4 cm" tidak boleh menghasilkan luas kecuali pertanyaan meminta luas; bila diminta, rumus dan satuannya harus eksplisit didukung.
- Diagram batang tidak boleh mengubah nilai kategori atau menghilangkan kategori.
- Piktograf hanya boleh dibuat jika satu simbol merepresentasikan satu unit yang tepat membagi seluruh nilai, atau bila renderer mendukung pecahan simbol secara eksplisit.

## 7. Aturan khusus visual dan renderer

### Renderer contract

```ts
type RenderContext = {
  width: number
  height: number
  locale: 'id-ID'
}

type RenderArtifact = {
  blob: Blob
  mimeType: 'image/png'
  width: number
  height: number
  elementCount: number
  representedValues: string[]
  rendererId: string
  rendererVersion: number
}

type VisualRenderer<TIntent extends VisualIntent = VisualIntent> = {
  id: string
  version: number
  supports(intent: VisualIntent): intent is TIntent
  render(intent: TIntent, context: RenderContext): Promise<RenderArtifact>
}
```

Registry harus menolak bila tidak ada renderer yang cocok. Jangan menggunakan renderer default yang menggambar bentuk lain.

### Ketentuan gambar

- Kuantitas harus sama persis dengan data.
- Piktograf tidak boleh memakai pembulatan tersembunyi.
- Label tidak boleh terpotong tanpa mekanisme layout/abstain.
- Garis bilangan harus menempatkan titik pada koordinat proporsional berdasarkan nilai rasional; label tidak boleh saling menimpa tanpa penanganan.
- Perbandingan pecahan harus memakai nilai rasional eksak, bukan float untuk menentukan urutan.
- Geometri harus diberi keterangan bahwa sketsa tidak berskala bila dimensi gambar tidak merepresentasikan ukuran sebenarnya.
- Setiap renderer menguji data batas minimum/maksimum dan menghasilkan alasan kegagalan terstruktur.

## 8. Orkestrasi dan tanggung jawab endpoint

Endpoint `analyze-visual-intent` tetap menjadi pintu masuk yang memeriksa origin, autentikasi admin, ukuran payload, dan jumlah soal. Setelah itu endpoint memanggil `analyzeQuestionVisual(input)`.

Fungsi pipeline menjalankan:
1. normalisasi input;
2. ekstraksi deterministik;
3. AI extraction jika belum dikenali;
4. parsing kandidat dan fact graph;
5. bukti dan relasi semantik;
6. intent validation;
7. operation planning dan kalkulasi;
8. visual spec;
9. renderer registry dan quality gate saat gambar diminta;
10. trace hasil.

Pembuatan ilustrasi nonmatematika tetap melalui `plan-question-image` dan `generate-question-image`. Jalur ini hanya dipakai setelah pipeline menyimpulkan soal bukan visual matematika atau tidak memerlukan diagram matematika. Jika analisis matematika ambigu/invalid, sistem abstain; jangan dialihkan ke generator gambar bebas.

Upload tetap melalui `/api/media/upload` karena sudah mendukung provider storage terkonfigurasi. Upload dilakukan hanya setelah quality gate lulus. Jika upload gagal, hasil analisis dan trace tetap disimpan di state UI sebagai gagal upload, bukan mengubah intent menjadi invalid.

## 9. Integrasi halaman Asisten AI

Halaman tidak lagi menentukan jenis matematika menggunakan `isMathematicsVisual` sebagai otoritas. Alur baru:
- Setelah soal terbentuk, kirim seluruh soal ke endpoint analisis.
- Server mengembalikan `status` dan `requiresMathRenderer` secara eksplisit.
- Jika `ready` dan visualSpec tersedia, client meminta/menjalankan renderer sesuai rancangan yang diputuskan (pilih client renderer atau endpoint render setelah keputusan teknis final).
- Jika `unsupported`, `ambiguous`, atau `needs_teacher_review`, tampilkan alasan dan jangan membuat gambar matematika.
- Jika `not_math_visual`, baru izinkan pipeline ilustrasi umum sesuai pengaturan guru.
- Setiap item soal memiliki status sendiri: analysis, render, upload. Kegagalan satu item tidak menghapus gambar item lain.
- Trace ringkas ditampilkan untuk guru, detail teknis tetap di log server.

Keputusan teknis yang harus dipastikan sebelum implementasi: renderer Canvas saat ini berjalan di client karena memakai `document`. Untuk mengurangi orkestrasi dan memastikan quality gate server, ada dua pilihan:
A. tetap render di browser dengan kontrak artifact/quality gate client yang ketat; atau
B. pindahkan render ke server menggunakan library Canvas yang kompatibel dengan runtime Vercel.  
Pilihan B tidak boleh dipilih tanpa memeriksa kompatibilitas dependency dan biaya runtime. Implementasi fondasi pertama mempertahankan client renderer agar tidak menambah dependency/native binary.

## 10. Rencana migrasi kode

Migrasi dilakukan dalam satu rangkaian perubahan terencana langsung pada `main`, dengan commit logis yang tidak memerlukan merge branch. Tidak mengubah database.

### Tahap A — kontrak dan validator
- Tambahkan kontrak fact graph, source refs, semantic relations, V2 result, visual spec.
- Buat validator evidence dan relation per intent.
- Adaptasikan `build-ai-intent.ts` agar menghasilkan kandidat graph, bukan langsung intent yang dianggap benar.
- Pertahankan `validateVisualIntent` sebagai validasi struktur kedua.

### Tahap B — operation planner dan kalkulator
- Pisahkan perencanaan operasi dari renderer.
- Pastikan setiap intent memiliki operasi dan output eksplisit.
- Tambahkan pemeriksaan satuan dan aturan domain.
- Pertahankan `rational.ts` dan `quantity.ts` sebagai dasar aritmetika yang telah ada.

### Tahap C — renderer registry
- Pecah `canvas.ts` menjadi renderer per intent.
- Tambahkan kontrak renderer dan registry.
- Perbaiki piktograf, skala garis bilangan, label, dan geometri.
- Pertahankan export `createVisualMathImage` sebagai adapter kompatibilitas sementara.

### Tahap D — pipeline dan API
- Buat `analyzeQuestionVisual` sebagai satu orchestrator.
- Jadikan route API tipis.
- Trace merekam versi parser, validator, operation, renderer, dan upload.
- Tambahkan batas input, timeout, dan penanganan partial results yang konsisten.

### Tahap E — integrasi UI
- Hapus peran otoritatif regex `isMathematicsVisual`.
- UI menampilkan status pipeline dari server.
- Pertahankan generator ilustrasi nonmatematika dan upload storage yang sudah ada.
- Jangan mengubah alur simpan soal, CBT, skor, atau format data lama.

## 11. Strategi pengujian sebelum dinyatakan selesai

Tes tidak boleh hanya memeriksa bahwa fungsi mengembalikan Blob. Setiap contoh harus memeriksa fakta, operasi, dan nilai yang digambar.

### Unit
- Rational: pecahan, campuran, desimal, persen, Unicode, negatif, pembagi nol, input ekstrem.
- Quantity: satuan kompatibel, beda dimensi, konversi yang diizinkan, konversi yang ditolak.
- Semantic relations: fakta terhubung benar, angka ada tetapi relasi salah, negasi, multi-klausa, angka pengalih.
- Intent: batas data, field hilang, duplikasi kategori/label, titik di luar rentang.
- Calculator: expected exact value dan relation.

### Adversarial bahasa Indonesia
- Angka yang sama muncul di beberapa klausa dengan peran berbeda.
- Angka pada pembahasan tidak boleh dianggap bukti dari soal.
- Kata "sisa", "dimakan", "diwarnai", "dibagikan", "masing-masing", dan "seluruhnya" harus diuji dalam konteks positif/negatif.
- Bilangan angka dan kata bilangan harus menghasilkan fakta sama.
- Kalimat dengan negasi atau perbandingan arah terbalik harus abstain bila ambigu.
- Soal multi-langkah tidak boleh dipaksa menjadi satu intent sederhana.

### Renderer
- Verifikasi elementCount dan representedValues sesuai visual spec.
- Piktograf: nilai 5 dan 7 tidak boleh digambarkan sebagai simbol penuh dengan unit 3 tanpa menyatakan pecahan.
- Garis bilangan: posisi titik proporsional, nilai batas, pecahan, dan label bertumpuk.
- Geometri: setiap ukuran dan satuan tepat, label tidak menyiratkan skala yang tidak dibuat.
- Diagram batang/tabel: data, kategori, urutan, dan nilai sama dengan input.

### Integrasi
- Respons lengkap untuk setiap index soal, termasuk hasil AI parsial.
- Provider AI gagal: pola deterministik tetap dapat berjalan, sisanya abstain.
- Upload gagal: trace menunjukkan upload gagal; intent tidak diubah.
- Soal nonmatematika: jalur ilustrasi umum tetap bekerja.
- Soal matematika ambigu: tidak pernah fallback ke gambar AI bebas.
- Tipe soal lama, opsi, kunci, skor, dan simpan soal tidak berubah.

### Gate akhir
- `npm run test:visual-math`
- lint pada seluruh file yang berubah
- `npm run build`
- pemeriksaan diff dan kompatibilitas API
- tidak ada deployment preview/produksi sebagai bagian dari pekerjaan ini.

## 12. Kriteria selesai

Fondasi dinyatakan selesai hanya jika:
1. semua fakta intent memiliki sumber dan peran;
2. relasi semantik diverifikasi oleh kode;
3. semua hasil hitung berasal dari kalkulator deterministik;
4. visual spec dapat diaudit terhadap fact graph;
5. registry memilih renderer yang tepat dan renderer tidak membulatkan/mengubah data diam-diam;
6. quality gate memblokir artefak yang tidak sesuai;
7. API dan UI memakai satu pipeline, bukan aturan klasifikasi terpisah;
8. jalur nonmatematika, upload, penyimpanan, CBT, dan soal lama tetap kompatibel;
9. seluruh gate otomatis lulus pada kode `main`.

## 13. Keputusan yang sudah ditetapkan

- `main` satu-satunya sumber kerja.
- Tidak membuat branch, PR, preview deployment, atau deployment produksi.
- Tidak mengubah skema database untuk fondasi Visual Math Engine.
- Tidak meminta guru menguji setiap tambalan kecil.
- Analisis dan kontrak diselesaikan dahulu; setelah itu implementasi dilakukan sebagai satu rangkaian perubahan yang koheren.
- Bila fakta tidak cukup, sistem harus abstain dan menjelaskan alasannya, bukan membuat gambar berdasarkan tebakan.
