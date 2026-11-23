import { createClient } from '@supabase/supabase-js'
import type { HomepageSurface } from './types'

export function createHomepagePinsAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error('Konfigurasi service-role Supabase belum lengkap.')
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function getItemId(surface: HomepageSurface, pin: any): string {
  if (surface === 'cbt' || surface === 'practice') return String(pin.exam_id || '')
  if (surface === 'material') return String(pin.material_id || '')
  return String(pin.announcement_id || '')
}

function buildSourceQuery(adminClient: any, surface: HomepageSurface, ids?: string[]) {
  if (ids && ids.length === 0) return null

  let query: any
  if (surface === 'cbt' || surface === 'practice') {
    query = adminClient
      .from('exams')
      .select('id,title,description,subtest,is_published,target_mode,show_results,activity_type,created_at')
      .order('created_at', { ascending: false })
  } else if (surface === 'material') {
    query = adminClient
      .from('study_materials')
      .select('id,title,description,subject,status,created_at')
      .order('created_at', { ascending: false })
  } else {
    query = adminClient
      .from('announcements')
      .select('id,title,content,category,is_active,created_at')
      .order('created_at', { ascending: false })
  }

  if (ids) query = query.in('id', ids)
  return query
}

/**
 * Eligibility intentionally mirrors the existing student-facing page filters.
 * Pin metadata must never make unpublished/inactive content visible.
 */
export function isSurfaceItemEligible(surface: HomepageSurface, item: any): boolean {
  if (surface === 'cbt') {
    return item.is_published === true &&
      (!item.target_mode || item.target_mode === 'CBT_ONLY' || item.target_mode === 'BOTH')
  }

  if (surface === 'practice') {
    return item.is_published === true &&
      item.show_results !== false &&
      (!item.target_mode || item.target_mode === 'PRACTICE_ONLY' || item.target_mode === 'BOTH')
  }

  if (surface === 'material') return item.status === 'published'
  return item.is_active === true
}

export async function getSurfaceSourceRows(
  adminClient: any,
  surface: HomepageSurface,
  ids?: string[],
) {
  const query = buildSourceQuery(adminClient, surface, ids)
  if (!query) return []

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getPublicPinOrder(
  adminClient: any,
  surface: HomepageSurface,
): Promise<Array<{ id: string; sort_order: number }>> {
  const { data: pins, error } = await adminClient
    .from('homepage_content_pins')
    .select('scope,category_key,exam_id,material_id,announcement_id,sort_order')
    .eq('surface', surface)
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!pins?.length) return []

  const itemPins = pins.filter((pin: any) => (pin.scope || 'item') === 'item')
  const ids = itemPins.map((pin: any) => getItemId(surface, pin)).filter(Boolean)
  const rows = await getSurfaceSourceRows(adminClient, surface, ids)
  const eligibleIds = new Set(
    rows
      .filter((row: any) => isSurfaceItemEligible(surface, row))
      .map((row: any) => String(row.id)),
  )

  const publicItems = itemPins.map((pin: any) => ({ scope: 'item', id: getItemId(surface, pin), sort_order: Number(pin.sort_order) })).filter((pin: any) => eligibleIds.has(pin.id))
  const publicCategories = (surface === 'cbt' || surface === 'practice' ? pins : []).filter((pin: any) => pin.scope === 'category' && String(pin.category_key || '').trim()).map((pin: any) => ({ scope: 'category', category_key: String(pin.category_key), sort_order: Number(pin.sort_order) }))
  return [...publicItems, ...publicCategories]
}

export async function getAdminSurfaceData(
  adminClient: any,
  surface: HomepageSurface,
) {
  const [pinsResult, rows] = await Promise.all([
    adminClient
      .from('homepage_content_pins')
      .select('scope,category_key,exam_id,material_id,announcement_id,sort_order')
      .eq('surface', surface)
      .order('sort_order', { ascending: true }),
    getSurfaceSourceRows(adminClient, surface),
  ])

  if (pinsResult.error) throw pinsResult.error

  const allPins = pinsResult.data || []
  const pinnedIds = allPins.filter((pin: any) => (pin.scope || 'item') === 'item').map((pin: any) => getItemId(surface, pin)).filter(Boolean)
  const pinnedCategoryKeys = allPins.filter((pin: any) => pin.scope === 'category').map((pin: any) => String(pin.category_key || '')).filter(Boolean)

  const items = rows.map((row: any) => {
    let meta = ''
    if (surface === 'cbt') meta = row.subtest || 'Tanpa subtes'
    if (surface === 'practice') meta = [row.activity_type || 'QUIZ', row.subtest || 'Umum'].join(' • ')
    if (surface === 'material') meta = row.subject || 'Umum'
    if (surface === 'announcement') meta = row.category || 'Penting'

    return {
      id: String(row.id),
      title: String(row.title || '(Tanpa judul)'),
      description: surface === 'announcement'
        ? String(row.content || '').replace(/<[^>]*>/g, ' ').slice(0, 180)
        : row.description || null,
      meta,
      created_at: row.created_at || null,
      eligible: isSurfaceItemEligible(surface, row),
    }
  })

  const categoryMap = new Map<string, { key: string; label: string; count: number }>()
  if (surface === 'cbt' || surface === 'practice') rows.filter((row: any) => isSurfaceItemEligible(surface, row)).forEach((row: any) => {
    const label = String(row.subtest || '').trim() || 'UMUM'; const key = label.toLocaleLowerCase('id'); const existing = categoryMap.get(key)
    if (existing) existing.count += 1; else categoryMap.set(key, { key, label, count: 1 })
  })
  const categories = Array.from(categoryMap.values()).sort((a, b) => a.label.localeCompare(b.label, 'id'))
  for (const key of pinnedCategoryKeys) if (!categoryMap.has(key)) categories.push({ key, label: key, count: 0 })
  return { surface, items, pinnedIds, categories, pinnedCategoryKeys }
}
