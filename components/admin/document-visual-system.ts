import type { CSSProperties } from 'react'
import type { VisualPreset } from './DocumentVisualSettings'

export const DOCUMENT_THEME_TOKENS: Record<string, {
  accent: string
  accentSoft: string
  ink: string
  gold: string
  paper: string
  border: string
}> = {
  school: { accent: '#17345f', accentSoft: '#edf2f8', ink: '#172b4d', gold: '#b58b36', paper: '#ffffff', border: '#cbd5e1' },
  candy: { accent: '#a21caf', accentSoft: '#fdf4ff', ink: '#581c87', gold: '#d97706', paper: '#fffafd', border: '#e9d5ff' },
  rainbow: { accent: '#6d28d9', accentSoft: '#f5f3ff', ink: '#312e81', gold: '#d97706', paper: '#fffefe', border: '#ddd6fe' },
  sunny: { accent: '#c2410c', accentSoft: '#fff7ed', ink: '#7c2d12', gold: '#b7791f', paper: '#fffdf7', border: '#fed7aa' },
  mint: { accent: '#047857', accentSoft: '#ecfdf5', ink: '#064e3b', gold: '#b7791f', paper: '#fbfffd', border: '#a7f3d0' },
  sky: { accent: '#0369a1', accentSoft: '#f0f9ff', ink: '#0c4a6e', gold: '#b58b36', paper: '#fbfdff', border: '#bae6fd' },
}

export const DOCUMENT_PATTERN_REGISTRY: Record<string, { asset: string; tile: string }> = {
  'cartoon3d-dot': { asset: '/patterns/titik-ceria.svg', tile: '52px 52px' },
  'cartoon3d-stars': { asset: '/patterns/bintang-ceria.svg', tile: '76px 76px' },
  'batik-kawung': { asset: '/patterns/kawung.svg', tile: '60px 60px' },
  'batik-mega-mendung': { asset: '/patterns/mega-mendung.svg', tile: '90px 50px' },
  'batik-parang': { asset: '/patterns/parang.svg', tile: '72px 72px' },
  'modern-geometric': { asset: '/patterns/geometric.svg', tile: '56px 56px' },
}

export function getDocumentVisualStyle(preset: VisualPreset): CSSProperties {
  const tokens = DOCUMENT_THEME_TOKENS[preset.themeEnabled ? preset.theme : 'school'] || DOCUMENT_THEME_TOKENS.school
  return {
    '--doc-accent': tokens.accent,
    '--doc-accent-soft': tokens.accentSoft,
    '--doc-ink': tokens.ink,
    '--doc-gold': tokens.gold,
    '--doc-paper': tokens.paper,
    '--doc-border': tokens.border,
    '--pattern-opacity': preset.patternEnabled ? preset.patternOpacity / 100 : 0,
  } as CSSProperties
}
