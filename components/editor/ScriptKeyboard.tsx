'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'

type ScriptKeyboardProps = { editor: Editor; showLatinConversion?: boolean }

const javaneseRows = [
  ['ꦲ', 'ꦤ', 'ꦕ', 'ꦫ', 'ꦏ', 'ꦢ', 'ꦠ', 'ꦱ', 'ꦮ', 'ꦭ'],
  ['ꦥ', 'ꦝ', 'ꦗ', 'ꦪ', 'ꦚ', 'ꦩ', 'ꦒ', 'ꦧ', 'ꦛ', 'ꦔ'],
]
const javaneseVowels = ['ꦄ', 'ꦆ', 'ꦈ', 'ꦌ', 'ꦎ']
const javanesePasangan = [
  ['ꦲ', 'Ha'], ['ꦤ', 'Na'], ['ꦕ', 'Ca'], ['ꦫ', 'Ra'], ['ꦏ', 'Ka'],
  ['ꦢ', 'Da'], ['ꦠ', 'Ta'], ['ꦱ', 'Sa'], ['ꦮ', 'Wa'], ['ꦭ', 'La'],
  ['ꦥ', 'Pa'], ['ꦝ', 'Dha'], ['ꦗ', 'Ja'], ['ꦪ', 'Ya'], ['ꦚ', 'Nya'],
  ['ꦩ', 'Ma'], ['ꦒ', 'Ga'], ['ꦧ', 'Ba'], ['ꦛ', 'Tha'], ['ꦔ', 'Nga'],
] as const
const javaneseMarks = ['ꦶ', 'ꦸ', 'ꦺ', 'ꦼ', 'ꦴ', 'ꦁ', 'ꦂ', 'ꦃ', '꧀']
const javanesePunctuation = ['꧈', '꧉', '꧊', '꧋', '꧌', '꧍', '꧇']

const arabicLetters = [
  'ء', 'آ', 'أ', 'ؤ', 'إ', 'ئ', 'ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ',
  'د', 'ذ', 'ر', 'ز', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع', 'غ',
  'ف', 'ق', 'ك', 'ل', 'م', 'ن', 'ه', 'و', 'ي', 'ة', 'ى', 'لا',
]
const arabicMarks = ['َ', 'ِ', 'ُ', 'ْ', 'ّ', 'ً', 'ٍ', 'ٌ', 'ٰ', 'ٓ', 'ٔ', 'ٱ']

// Konversi dasar berbasis suku kata terbuka. Untuk ejaan khusus, pasangan,
// sandhangan, dan kata serapan, hasil tetap perlu diperiksa oleh guru.
const consonants: Record<string, string> = {
  ng: 'ꦔ', ny: 'ꦚ', th: 'ꦛ', dh: 'ꦝ',
  h: 'ꦲ', n: 'ꦤ', c: 'ꦕ', r: 'ꦫ', k: 'ꦏ',
  d: 'ꦢ', t: 'ꦠ', s: 'ꦱ', w: 'ꦮ', l: 'ꦭ',
  p: 'ꦥ', j: 'ꦗ', y: 'ꦪ', m: 'ꦩ', g: 'ꦒ', b: 'ꦧ',
}
const vowelMarks: Record<string, string> = { a: '', i: 'ꦶ', u: 'ꦸ', e: 'ꦺ', é: 'ꦺ', ê: 'ꦼ', 'ě': 'ꦼ', o: 'ꦺꦴ' }
const independentVowels: Record<string, string> = { a: 'ꦄ', i: 'ꦆ', u: 'ꦈ', e: 'ꦌ', é: 'ꦌ', ê: 'ꦌ', 'ě': 'ꦌ', o: 'ꦎ' }

function latinToJavanese(input: string): string {
  // Aksara Jawa ditulis berurutan; spasi dari input Latin dihilangkan.
  let rest = input.toLowerCase().normalize('NFC').replace(/\s+/g, '')
  let output = ''

  while (rest.length > 0) {
    const vowel = rest.match(/^(a|i|u|e|é|ê|ě|o)/)
    if (vowel) {
      output += independentVowels[vowel[0]]
      rest = rest.slice(vowel[0].length)
      continue
    }

    const onset = Object.keys(consonants).sort((a, b) => b.length - a.length)
      .find((key) => rest.startsWith(key))
    if (onset) {
      const base = consonants[onset]
      rest = rest.slice(onset.length)
      const nextVowel = rest.match(/^(a|i|u|e|é|ê|ě|o)/)
      if (nextVowel) {
        output += base + vowelMarks[nextVowel[0]]
        rest = rest.slice(nextVowel[0].length)
      } else if (rest.length > 0) {
        if (onset === 'ng') output += 'ꦁ'
        else if (onset === 'r') output += 'ꦂ'
        else if (onset === 'h') output += 'ꦃ'
        else output += base + '꧀'
      } else {
        // Pangkon hanya untuk konsonan mati di akhir seluruh rangkaian.
        if (onset === 'ng') output += 'ꦁ'
        else if (onset === 'r') output += 'ꦂ'
        else if (onset === 'h') output += 'ꦃ'
        else output += base + '꧀'
      }
      continue
    }

    output += rest[0]
    rest = rest.slice(1)
  }

  return output
}

export default function ScriptKeyboard({ editor, showLatinConversion = true }: ScriptKeyboardProps) {
  const [language, setLanguage] = useState<'jv' | 'ar'>('jv')
  const [javaneseTab, setJavaneseTab] = useState<'aksara' | 'pasangan' | 'sandhangan' | 'swara' | 'tanda'>('aksara')
  const [latin, setLatin] = useState('')

  const insert = (value: string, lang: 'jv' | 'ar' = language) => {
    if (lang === 'jv') {
      editor.chain().focus().setFontFamily('Nyk Ngayogyan Jejeg').setTextAlign('left').insertContent(value).run()
    } else {
      editor.chain().focus().setFontFamily('Noto Arabic Local').setTextAlign('right').insertContent(value).run()
    }
  }

  const javaneseKeys =
    javaneseTab === 'aksara' ? javaneseRows.flat()
      : javaneseTab === 'pasangan' ? javanesePasangan.map(([character]) => character)
      : javaneseTab === 'sandhangan' ? javaneseMarks
        : javaneseTab === 'swara' ? javaneseVowels
          : javanesePunctuation

  return (
    <section className="border-t border-slate-200 bg-white p-3" aria-label="Keyboard virtual">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setLanguage('jv')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${language === 'jv' ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600'}`}>
          ꦗꦮ Aksara Jawa
        </button>
        <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setLanguage('ar')}
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${language === 'ar' ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-600'}`}>
          عربي Arab
        </button>
      </div>

      {language === 'jv' ? (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {([
              ['aksara', 'Aksara nglegena'],
              ['pasangan', 'Pasangan'],
              ['sandhangan', 'Sandhangan'],
              ['swara', 'Aksara swara'],
              ['tanda', 'Tanda baca'],
            ] as const).map(([value, label]) => (
              <button key={value} type="button" onMouseDown={(event) => event.preventDefault()}
                onClick={() => setJavaneseTab(value)}
                className={`rounded border px-2 py-1 text-xs ${javaneseTab === value ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}>
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
              Spasi Latin diabaikan agar rangkaian aksara tersambung. Huruf e memakai taling; gunakan ê atau ě untuk pepet. Periksa kembali pasangan dan ejaan sebelum menyimpan soal.
            </p>
          </div>
          )}
        </>
      ) : (
        <>
          <p className="mb-2 text-xs text-slate-500">Pilih huruf hijaiyah atau harakat. Harakat akan disisipkan setelah huruf yang dipilih.</p>
          <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
            {arabicLetters.map((character, index) => (
              <button key={character + index} type="button" onMouseDown={(event) => event.preventDefault()}
                onClick={() => insert(character, 'ar')}
                className="min-h-11 rounded-md border border-slate-200 bg-slate-50 text-2xl text-slate-800 hover:border-amber-300 hover:bg-amber-50"
                style={{ fontFamily: 'Noto Arabic Local' }} dir="rtl">
                {character}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-6 gap-1 sm:grid-cols-12">
            {arabicMarks.map((character, index) => (
              <button key={character + index} type="button" title={character}
                onMouseDown={(event) => event.preventDefault()} onClick={() => insert(character, 'ar')}
                className="min-h-10 rounded-md border border-amber-100 bg-amber-50 text-xl text-slate-800 hover:bg-amber-100"
                style={{ fontFamily: 'Noto Arabic Local' }} dir="rtl">
                {character}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
