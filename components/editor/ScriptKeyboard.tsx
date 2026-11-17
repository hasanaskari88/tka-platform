'use client'

import { useState } from 'react'
import type { Editor } from '@tiptap/react'

type ScriptKeyboardProps = { editor: Editor }

const javaneseRows = [
  ['ꦲ', 'ꦤ', 'ꦕ', 'ꦫ', 'ꦏ', 'ꦢ', 'ꦠ', 'ꦱ', 'ꦮ', 'ꦭ'],
  ['ꦥ', 'ꦝ', 'ꦗ', 'ꦪ', 'ꦚ', 'ꦩ', 'ꦒ', 'ꦧ', 'ꦛ', 'ꦔ'],
]
const javaneseVowels = ['ꦄ', 'ꦆ', 'ꦈ', 'ꦌ', 'ꦎ']
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
const syllables: Record<string, string> = {
  nga: 'ꦔ', nya: 'ꦚ', tha: 'ꦛ', dha: 'ꦝ',
  ha: 'ꦲ', na: 'ꦤ', ca: 'ꦕ', ra: 'ꦫ', ka: 'ꦏ',
  da: 'ꦢ', ta: 'ꦠ', sa: 'ꦱ', wa: 'ꦮ', la: 'ꦭ',
  pa: 'ꦥ', ja: 'ꦗ', ya: 'ꦪ', ma: 'ꦩ', ga: 'ꦒ', ba: 'ꦧ',
}
const vowelMarks: Record<string, string> = { a: '', i: 'ꦶ', u: 'ꦸ', e: 'ꦺ', é: 'ꦺ', o: 'ꦴ' }

function latinToJavanese(input: string): string {
  const words = input.toLowerCase().trim().split(/(\s+)/)
  return words.map((word) => {
    if (!word.trim()) return word
    let result = ''
    let rest = word.normalize('NFC')
    while (rest.length) {
      const digraph = ['nga', 'nya', 'tha', 'dha'].find((part) => rest.startsWith(part))
      if (digraph) {
        result += syllables[digraph]
        rest = rest.slice(digraph.length)
        continue
      }
      const consonant = ['ha', 'na', 'ca', 'ra', 'ka', 'da', 'ta', 'sa', 'wa', 'la', 'pa', 'ja', 'ya', 'ma', 'ga', 'ba']
        .find((part) => rest.startsWith(part))
      if (consonant) {
        result += syllables[consonant]
        rest = rest.slice(consonant.length)
        continue
      }
      const vowel = rest.match(/^(a|i|u|e|é|o)/)
      if (vowel) {
        const independent: Record<string, string> = { a: 'ꦄ', i: 'ꦆ', u: 'ꦈ', e: 'ꦌ', é: 'ꦌ', o: 'ꦎ' }
        result += independent[vowel[0]]
        rest = rest.slice(vowel[0].length)
        continue
      }
      const finalConsonant = rest.match(/^(ng|ny|th|dh|[bcdfghjklmnpqrstvwxyz])/)
      if (finalConsonant) {
        const finals: Record<string, string> = { ng: 'ꦁ', r: 'ꦂ', h: 'ꦃ' }
        result += finals[finalConsonant[0]] || '꧀'
        rest = rest.slice(finalConsonant[0].length)
        continue
      }
      result += rest[0]
      rest = rest.slice(1)
    }
    return result
  }).join('')
}

export default function ScriptKeyboard({ editor }: ScriptKeyboardProps) {
  const [language, setLanguage] = useState<'jv' | 'ar'>('jv')
  const [javaneseTab, setJavaneseTab] = useState<'aksara' | 'sandhangan' | 'swara' | 'tanda'>('aksara')
  const [latin, setLatin] = useState('')

  const insert = (value: string, lang: 'jv' | 'ar' = language) => {
    editor.chain().focus().insertContent(value).run()
    if (lang === 'jv') editor.chain().focus().setFontFamily('Nyk Ngayogyan Jejeg').setTextAlign('left').run()
    else editor.chain().focus().setFontFamily('Noto Arabic Local').setTextAlign('right').run()
  }

  const javaneseKeys =
    javaneseTab === 'aksara' ? javaneseRows.flat()
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
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Ketik Latin, lalu ubah ke Aksara Jawa (konversi dasar)</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={latin} onChange={(event) => setLatin(event.target.value)}
                placeholder="Contoh: basa jawa" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button type="button" disabled={!latin.trim()} onMouseDown={(event) => event.preventDefault()}
                onClick={() => { insert(latinToJavanese(latin), 'jv'); setLatin('') }}
                className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">
                Ubah & sisipkan
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Konversi awal mendukung suku kata sederhana seperti ha, na, ca, ra, ka, nga, nya, tha, dan dha. Periksa kembali pasangan, sandhangan khusus, dan ejaan sebelum menyimpan soal.
            </p>
          </div>
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
