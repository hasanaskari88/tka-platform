
'use client'

import React from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  content: string
  className?: string
}

export default function MathRenderer({
  content,
  className = '',
}: MathRendererProps) {
  if (!content) return null

  const renderFormattedContent = (text: string) => {
    try {
      // Pisahkan teks biasa dan rumus KaTeX.
      const parts = text.split(/(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$)/g)

      const processedParts = parts.map((part) => {
        // Rumus blok.
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2)

          return katex.renderToString(math, {
            displayMode: true,
            throwOnError: false,
          })
        }

        // Rumus dalam satu baris.
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1)

          return katex.renderToString(math, {
            displayMode: false,
            throwOnError: false,
          })
        }

        // Format teks tebal dan miring.
        let formatted = part
          .replace(
            /\*\*(.*?)\*\*/g,
            '<strong style="font-weight: 700;">$1</strong>'
          )
          .replace(
            /\*(.*?)\*/g,
            '<em style="font-style: italic;">$1</em>'
          )

        // Pertahankan baris baru untuk teks biasa.
        // Jangan mengubah baris baru pada konten tabel atau daftar HTML.
        if (!/<table|<blockquote|<ul|<ol/i.test(formatted)) {
          formatted = formatted.replace(/\n/g, '<br />')
        }

        return formatted
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
      className={`
        math-rendered-content min-w-0 text-inherit
        [&_*]:!text-inherit
        [&_strong]:font-bold
        [&_b]:font-bold
        [&_em]:italic
        [&_i]:italic
        [&_u]:underline
        [&_table]:my-3
        [&_table]:w-full
        [&_table]:border-collapse
        [&_table]:border
        [&_table]:border-slate-300
        [&_table]:bg-white
        [&_table]:!text-slate-800
        [&_th]:border
        [&_th]:border-slate-300
        [&_th]:bg-slate-100
        [&_th]:p-2
        [&_th]:!text-slate-800
        [&_th]:font-bold
        [&_td]:border
        [&_td]:border-slate-300
        [&_td]:p-2
        [&_td]:!text-slate-800
        [&_blockquote]:my-2
        [&_blockquote]:border-l-4
        [&_blockquote]:border-indigo-500
        [&_blockquote]:bg-slate-50
        [&_blockquote]:py-1
        [&_blockquote]:pl-3
        [&_blockquote]:italic
        ${className}
      `}
      style={{ color: 'inherit' }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
