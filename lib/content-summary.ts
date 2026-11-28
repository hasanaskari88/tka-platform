export type SummaryMode = 'auto' | 'manual'

export function splitReadMoreContent(html: string) {
  const source = String(html || '')
  const marker = /<div\\b(?=[^>]*data-type\\s*=\\s*["']read-more["'])[^>]*>[\\s\\S]*?<\\/div>/i
  const match = marker.exec(source)
  if (!match || match.index < 0) return { summary: source, remainder: '', hasManualBreak: false }
  return {
    summary: source.slice(0, match.index),
    remainder: source.slice(match.index + match[0].length),
    hasManualBreak: true,
  }
}

export function getSummaryHtml(html: string, mode: SummaryMode = 'auto') {
  const parts = splitReadMoreContent(html)
  return mode === 'manual' && parts.hasManualBreak ? parts.summary : String(html || '')
}

export function getDetailHtml(html: string, repeatSummary = true) {
  const parts = splitReadMoreContent(html)
  return !repeatSummary && parts.hasManualBreak ? parts.remainder : String(html || '')
}

export function legacyTextToHtml(value: string) {
  return String(value || '').split(/\\r?\\n/).map((line) => {
    const safe = line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return safe.trim() ? '<p>' + safe + '</p>' : '<p></p>'
  }).join('')
}
