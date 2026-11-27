'use client'

import { useEffect, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { chainCommands, deleteSelection, joinBackward, selectNodeBackward } from '@tiptap/pm/commands'

type ScriptKeyboardProps = { editor: Editor; showLatinConversion?: boolean; initialLanguage?: 'jv' | 'ar'; onLanguageChange?: (language: 'jv' | 'ar') => void }

const javaneseRows = [
  ['ꦲ', 'ꦤ', 'ꦕ', 'ꦫ', 'ꦏ', 'ꦢ', 'ꦠ', 'ꦱ', 'ꦮ', 'ꦭ'],
  ['ꦥ', 'ꦝ', 'ꦗ', 'ꦪ', 'ꦚ', 'ꦩ', 'ꦒ', 'ꦧ', 'ꦛ', 'ꦔ'],
]
const javaneseVowels = [
  { character: 'ꦄ', label: 'A' },
  { character: 'ꦆ', label: 'I' },
  { character: 'ꦈ', label: 'U' },
  { character: 'ꦌ', label: 'E' },
  { character: 'ꦎ', label: 'O' },
  { character: 'ꦉ', label: 'Pa Cerek' },
  { character: 'ꦊ', label: 'Nga Lelet' },
]
const javanesePasangan = [
  ['ꦲ', 'Ha'], ['ꦤ', 'Na'], ['ꦕ', 'Ca'], ['ꦫ', 'Ra'], ['ꦏ', 'Ka'],
  ['ꦢ', 'Da'], ['ꦠ', 'Ta'], ['ꦱ', 'Sa'], ['ꦮ', 'Wa'], ['ꦭ', 'La'],
  ['ꦥ', 'Pa'], ['ꦝ', 'Dha'], ['ꦗ', 'Ja'], ['ꦪ', 'Ya'], ['ꦚ', 'Nya'],
  ['ꦩ', 'Ma'], ['ꦒ', 'Ga'], ['ꦧ', 'Ba'], ['ꦛ', 'Tha'], ['ꦔ', 'Nga'],
] as const
const javaneseMarks = [
  { character: 'ꦶ', label: 'Wulu' },
  { character: 'ꦸ', label: 'Suku' },
  { character: 'ꦺ', label: 'Taling' },
  { character: 'ꦺꦴ', label: 'Taling Tarung' },
  { character: 'ꦼ', label: 'Pepet' },
  { character: 'ꦁ', label: 'Cecak' },
  { character: 'ꦂ', label: 'Layar' },
  { character: 'ꦃ', label: 'Wignyan (h)' },
  { character: 'ꦿ', label: 'Cakra' },
  { character: 'ꦽ', label: 'Keret' },
  { character: 'ꦾ', label: 'Pengkal' },
  { character: '꧀', label: 'Pangkon' },
]
const javanesePunctuation = ['꧈', '꧉', '꧊', '꧋', '꧌', '꧍', '꧇']

const arabicLetters = [
  'ء', 'آ', 'أ', 'ؤ', 'إ', 'ئ', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ',
  'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ة', 'ى', 'لا',
]
const arabicMarks = [
  { mark: 'َ', preview: 'بَ', name: 'Fathah' },
  { mark: 'ِ', preview: 'بِ', name: 'Kasrah' },
  { mark: 'ُ', preview: 'بُ', name: 'Dammah' },
  { mark: 'ْ', preview: 'بْ', name: 'Sukun' },
  { mark: 'ّ', preview: 'بّ', name: 'Syaddah' },
  { mark: 'ً', preview: 'بً', name: 'Fathatain' },
  { mark: 'ٍ', preview: 'بٍ', name: 'Kasratain' },
  { mark: 'ٌ', preview: 'بٌ', name: 'Dammatain' },
  { mark: 'ٰ', preview: 'بٰ', name: 'Alif khanjariyah' },
  { mark: 'ٓ', preview: 'بٓ', name: 'Maddah' },
  { mark: 'ٔ', preview: 'بٔ', name: 'Hamzah di atas' },
  { mark: 'ٱ', preview: 'ٱ', name: 'Alif washal' },
]

// Konversi Latin ke Aksara Jawa sederhana.
// Gunakan é/è untuk taling dan ê/ě untuk pepet. Huruf e biasa tetap
// diasumsikan taling karena bunyi e tidak dapat ditentukan dari ejaan Latin saja.
const consonants: Record<string, string> = {
  ng: 'ꦔ', ny: 'ꦚ', th: 'ꦛ', dh: 'ꦝ',
  h: 'ꦲ', n: 'ꦤ', c: 'ꦕ', r: 'ꦫ', k: 'ꦏ',
  d: 'ꦢ', t: 'ꦠ', s: 'ꦱ', w: 'ꦮ', l: 'ꦭ',
  p: 'ꦥ', j: 'ꦗ', y: 'ꦪ', m: 'ꦩ', g: 'ꦒ', b: 'ꦧ',
}
const vowelMarks: Record<string, string> = {
  a: '', i: 'ꦶ', u: 'ꦸ',
  e: 'ꦺ', é: 'ꦺ', è: 'ꦺ', ê: 'ꦼ', 'ě': 'ꦼ',
  o: 'ꦺꦴ',
}
const independentVowels: Record<string, string> = {
  a: 'ꦄ', i: 'ꦆ', u: 'ꦈ',
  e: 'ꦌ', é: 'ꦌ', è: 'ꦌ',
  // Pepet di awal kata ditulis dengan aksara ha + sandhangan pepet,
  // bukan aksara swara E.
  ê: 'ꦲꦼ', 'ě': 'ꦲꦼ',
  o: 'ꦎ',
}
const vowelPattern = /^(a|i|u|e|é|è|ê|ě|o)/

function convertJavaneseWord(word: string): string {
  let rest = word.toLowerCase().normalize('NFC')
  let output = ''

  while (rest.length > 0) {
    const vowel = rest.match(vowelPattern)
    if (vowel) {
      output += independentVowels[vowel[0]] ?? vowel[0]
      rest = rest.slice(vowel[0].length)
      continue
    }

    const onset = Object.keys(consonants).sort((a, b) => b.length - a.length)
      .find((key) => rest.startsWith(key))

    if (!onset) {
      output += rest[0]
      rest = rest.slice(1)
      continue
    }

    const base = consonants[onset]
    rest = rest.slice(onset.length)
    const nextVowel = rest.match(vowelPattern)

    if (nextVowel) {
      output += base + vowelMarks[nextVowel[0]]
      rest = rest.slice(nextVowel[0].length)
      continue
    }

    // Konsonan tanpa vokal diikuti konsonan berikutnya membentuk
    // rangkaian pangkon + aksara berikut (pasangan dalam font yang mendukung).
    if (rest.length > 0) {
      output += base + '꧀'
      continue
    }

    // Sandhangan panyigeg wanda untuk konsonan penutup tertentu.
    if (onset === 'ng') output += 'ꦁ'
    else if (onset === 'r') output += 'ꦂ'
    else if (onset === 'h') output += 'ꦃ'
    else output += base + '꧀'
  }

  return output
}

function latinToJavanese(input: string): string {
  // Pertahankan spasi antarkata; jangan gabungkan dua kata menjadi satu.
  return input
    .normalize('NFC')
    .split(/(\\s+)/)
    .map((part) => /^\\s+$/.test(part) ? part : convertJavaneseWord(part))
    .join('')
}

export default function ScriptKeyboard({ editor, showLatinConversion = true, initialLanguage = 'jv', onLanguageChange }: ScriptKeyboardProps) {
  const [language, setLanguage] = useState<'jv' | 'ar'>(initialLanguage)
  useEffect(() => {
    setLanguage(initialLanguage)
  }, [initialLanguage])

  const [javaneseTab, setJavaneseTab] = useState<'aksara' | 'pasangan' | 'sandhangan' | 'swara' | 'tanda'>('aksara')
  const [latin, setLatin] = useState('')
  const [numbersOpen, setNumbersOpen] = useState(false)

  const selectLanguage = (nextLanguage: 'jv' | 'ar') => {
    setLanguage(nextLanguage)
    onLanguageChange?.(nextLanguage)
    if (nextLanguage === 'jv') {
      editor.chain().focus().setFontFamily('Nyk Ngayogyan Jejeg').setTextAlign('left').run()
    } else {
      editor.chain().focus().setFontFamily('Noto Naskh Arabic Local').setTextAlign('right').run()
    }
  }

  const insert = (value: string, lang: 'jv' | 'ar' = language) => {
    if (lang === 'jv') {
      editor.chain().focus().setFontFamily('Nyk Ngayogyan Jejeg').setTextAlign('left').insertContent(value).run()
    } else {
      editor.chain().focus().setFontFamily('Noto Naskh Arabic Local').setTextAlign('right').insertContent(value).run()
    }
  }

  const javaneseKeys =
    javaneseTab === 'aksara' ? javaneseRows.flat()
      : javaneseTab === 'pasangan' ? javanesePasangan.map(([character]) => character)
      : javaneseTab === 'sandhangan' ? []
        : javaneseTab === 'swara' ? javaneseVowels.map(({ character }) => character)
          : javanesePunctuation

  return (
    <section className="border-t border-slate-200 bg-white p-3" aria-label="Keyboard virtual">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLanguage('jv')}
          className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${language === 'jv' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
          ꦗꦮ Aksara Jawa
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectLanguage('ar')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${language === 'ar' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}>
          عربي Arab
        </button>
      </div>

      {language === 'jv' ? (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {([
              ['aksara', 'Nglegena'],
              ['pasangan', 'Pasangan'],
              ['sandhangan', 'Sandhangan'],
              ['swara', 'Swara'],
              ['tanda', 'Tanda baca'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onMouseDown={(event) => event.preventDefault()}
                onClick={() => setJavaneseTab(value)}
                className={`rounded border px-2 py-1 text-[11px] leading-tight ${javaneseTab === value ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
          {javaneseTab === 'pasangan' ? (
            <>
              <p className="mb-2 text-xs leading-relaxed text-slate-600">
                Letakkan kursor tepat setelah aksara induk, lalu pilih pasangan yang diperlukan. Contoh tampilan di bawah memakai aksara Ka sebagai induk.
              </p>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {javanesePasangan.map(([character, label]) => (
                  <button key={character} type="button" title={'Pasangan ' + label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => insert('꧀' + character, 'jv')}
                    className="flex min-h-14 flex-col items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50">
                    <span className="text-2xl" style={{ fontFamily: 'Nyk Ngayogyan Jejeg' }}>{'ꦏ꧀' + character}</span>
                    <span className="text-[10px] text-slate-500">{'Pasangan ' + label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : javaneseTab === 'sandhangan' ? (
            <div className="grid grid-cols-5 gap-1.5">
              {javaneseMarks.map(({ character, label }) => (
                <button key={label} type="button" title={label} aria-label={label}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => insert(character, 'jv')}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1 py-1 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="text-xl leading-tight" style={{ fontFamily: 'Nyk Ngayogyan Jejeg' }}>{character}</span>
                  <span className="text-[10px] leading-tight text-slate-500">{label}</span>
                </button>
              ))}
            </div>
          ) : javaneseTab === 'swara' ? (
            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
              {javaneseVowels.map(({ character, label }) => (
                <button key={character} type="button" title={label} aria-label={label}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => insert(character, 'jv')}
                  className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border border-slate-200 bg-slate-50 px-1 py-1 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50">
                  <span className="text-2xl leading-tight" style={{ fontFamily: 'Nyk Ngayogyan Jejeg' }}>{character}</span>
                  <span className="text-[10px] leading-tight text-slate-500">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {javaneseKeys.map((character, index) => (
                <button key={character + index} type="button" title={character}
                  onMouseDown={(event) => event.preventDefault()} onClick={() => insert(character, 'jv')}
                  className="min-h-11 rounded-md border border-slate-200 bg-slate-50 text-2xl text-slate-800 hover:border-emerald-300 hover:bg-emerald-50"
                  style={{ fontFamily: 'Nyk Ngayogyan Jejeg' }}>
                  {character}
                </button>
              ))}
            </div>
          )}
          {showLatinConversion && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Ketik Latin, lalu ubah ke Aksara Jawa (konversi dasar)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={latin} onChange={(event) => setLatin(event.target.value)}
                placeholder="Contoh: mangan sega" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" disabled={!latin.trim()} onMouseDown={(event) => event.preventDefault()}
                onClick={() => { insert(latinToJavanese(latin), 'jv'); setLatin('') }}
                className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                Ubah & sisipkan
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Spasi antarkata dipertahankan. Huruf e biasa diasumsikan taling; gunakan é atau è untuk taling yang jelas dan ê atau ě untuk pepet. Bunyi e harus diperiksa karena ejaan Latin biasa tidak selalu membedakannya. Periksa kembali pasangan dan ejaan sebelum menyimpan soal.
            </p>
          </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">Pilih huruf hijaiyah atau harakat. Harakat akan disisipkan setelah huruf yang dipilih.</p>
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
            {arabicLetters.map((character, index) => (
              <button key={character + index} type="button" title={character}
                aria-label={'Sisipkan huruf ' + character}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(character, 'ar')}
                className="flex min-h-11 w-full items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-1 py-0 text-center text-2xl font-normal leading-none text-slate-800 hover:border-amber-300 hover:bg-amber-50 active:scale-95"
                style={{ fontFamily: 'Noto Naskh Arabic Local' }} dir="rtl">
                <span className="inline-block text-center">{character}</span>
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">Harakat dan tanda baca</p>
              <p className="text-xs text-slate-500">Contoh memakai huruf ب agar posisi tanda terlihat jelas</p>
            </div>
            <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
              {arabicMarks.map(({ mark, preview, name }) => (
                <button key={mark} type="button" title={'Sisipkan ' + name}
                  aria-label={'Sisipkan harakat ' + name}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => insert(mark, 'ar')}
                  className="flex min-h-11 w-full items-center justify-center overflow-visible rounded-md border border-amber-200 bg-amber-50 px-1 py-0 text-center text-slate-900 transition hover:border-amber-400 hover:bg-amber-100 active:scale-95"
                  style={{ fontFamily: 'Noto Naskh Arabic Local' }} dir="rtl">
                  <span className="inline-block whitespace-nowrap text-center text-[1.75rem] leading-[1.25]">{preview}</span>
                  <span className="sr-only">{name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {numbersOpen && (
        <div className="mb-3 grid grid-cols-5 gap-1.5 sm:grid-cols-10" aria-label="Tombol angka">
          {'1234567890'.split('').map((number) => (
            <button key={number} type="button" onMouseDown={(event) => event.preventDefault()}
              onClick={() => insert(number)}
              className="min-h-11 rounded-md border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-800 hover:border-blue-300 hover:bg-blue-50">
              {number}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-1 border-t border-slate-200 pt-3 sm:grid-cols-7" aria-label="Tombol fungsi editor">
        <button type="button" title="Hapus karakter sebelum kursor" aria-label="Backspace"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            const { state, view } = editor
            const { selection } = state

            // Jika ada teks yang dipilih, hapus seluruh pilihan.
            if (!selection.empty) {
              view.dispatch(state.tr.deleteSelection())
              view.focus()
              return
            }

            const { $from, from } = selection

            // Di tengah paragraf, hapus satu karakter/grup aksara tepat sebelum kursor.
            if ($from.parentOffset > 0) {
              const textBefore = $from.parent.textBetween(0, $from.parentOffset, '', '')
              let previousLength = 1

              if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
                const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
                const segments = Array.from(segmenter.segment(textBefore))
                const previous = segments[segments.length - 1]?.segment
                if (previous) previousLength = previous.length
              } else {
                const previous = Array.from(textBefore).pop()
                if (previous) previousLength = previous.length
              }

              view.dispatch(state.tr.delete(Math.max($from.start(), from - previousLength), from))
              view.focus()
              return
            }

            // Jika kursor di awal paragraf, gabungkan dengan paragraf sebelumnya.
            if (!joinBackward(state, view.dispatch)) {
              selectNodeBackward(state, view.dispatch)
            }
            view.focus()
          }}
          className="min-h-9 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-100">
          ⌫ Backspace
        </button>
        <button type="button" title="Sisipkan spasi" aria-label="Spasi"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => insert(' ')}
          className="min-h-9 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-100">
          ␣ Spasi
        </button>
        <button type="button" title="Buat baris baru" aria-label="Enter"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().splitBlock().run()}
          className="min-h-9 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-100">
          ↵ Enter
        </button>
        <button type="button" title="Tampilkan atau sembunyikan tombol angka" aria-label="Angka"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setNumbersOpen((open) => !open)}
          aria-expanded={numbersOpen}
          className={`min-h-9 rounded-md border px-1.5 py-1 text-[10px] font-semibold leading-tight ${numbersOpen ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'}`}>
          123 Angka
        </button>
        <button type="button" title="Batalkan perubahan terakhir" aria-label="Undo"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          className="min-h-9 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-100">
          ↶ Undo
        </button>
        <button type="button" title="Ulangi perubahan yang dibatalkan" aria-label="Redo"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          className="min-h-9 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-700 hover:bg-slate-100">
          ↷ Redo
        </button>
        <button type="button" title="Hapus teks atau objek yang sedang dipilih" aria-label="Hapus pilihan"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().deleteSelection().run()}
          className="min-h-9 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-rose-700 hover:bg-rose-100">
          ⌦ Hapus
        </button>
      </div>
    </section>
  )
}
