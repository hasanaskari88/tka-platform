'use client'

import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  content: string
  className?: string
}

export default function MathRenderer({ content, className = '' }: MathRendererProps) {
  if (!content) return null

  const renderFormattedContent = (text: string) => {
    try {
      // 1. Pisahkan teks berdasarkan rumus KaTeX ($...$ atau $$...$$)
      const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)

      const processedParts = parts.map((part) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          // Rumus Blok (Display Math)
          const math = part.slice(2, -2)
          return katex.renderToString(math, { displayMode: true, throwOnError: false })
        } else if (part.startsWith('$') && part.endsWith('$')) {
          // Rumus Baris (Inline Math)
          const math = part.slice(1, -1)
          return katex.renderToString(math, { displayMode: false, throwOnError: false })
        } else {
          // Teks Biasa: Render Markdown Tebal (**teks**), Miring (*teks*)
          let formatted = part
            .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')

          // 🟢 PENCEGAHAN BUG: Jika teks TIDAK mengandung tabel/elemen HTML blok, ubah \n menjadi <br/>
          if (!/<table|<blockquote|<ul|<ol/i.test(formatted)) {
            formatted = formatted.replace(/\n/g, '<br/>')
          }

          return formatted
        }
      })

      return processedParts.join('')
    } catch (err) {
      console.error('MathRenderer Error:', err)
      return text
    }
  }

  const htmlContent = renderFormattedContent(content)

  return (
    <div
      /* 🟢 PENAMBAHAN CLASS STYLING TAILWIND UNTUK TABEL & KUTIPAN */
      className={`math-rendered-content 
        [&_strong]:font-bold [&_b]:font-bold 
        [&_em]:italic [&_i]:italic 
        [&_u]:underline 
        [&_table]:w-full [&_table]:border-collapse [&_table]:my-3 [&_table]:border [&_table]:border-slate-300
        [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-bold
        [&_td]:border [&_td]:border-slate-300 [&_td]:p-2
        [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-500 [&_blockquote]:pl-3 [&_blockquote]:py-1 [&_blockquote]:italic [&_blockquote]:my-2 [&_blockquote]:bg-slate-50
        ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}