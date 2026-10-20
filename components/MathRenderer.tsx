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
          // Teks Biasa: Render Markdown Tebal (**teks**), Miring (*teks*), dan Baris Baru (\n)
          return part
            .replace(/\*\*(.*?)\*\*/g, '<strong style="font-weight: 700;">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em style="font-style: italic;">$1</em>')
            .replace(/\n/g, '<br/>')
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
      className={`math-rendered-content [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}