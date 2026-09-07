import {STRINGS} from '@/lib/strings'
import type {CanvasNode} from './buildGraph'

export type SearchResultKind = 'kiosk' | 'multi' | 'schedule' | 'institution'

export interface SearchResult {
  id: string
  kind: SearchResultKind
  label: string
  detail: string | null
}

/** Lower-case, accent-free, trimmed — «Agénda» finds «agenda» and vice versa. */
export const normalizeText = (value: string): string => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const KINDS = STRINGS.brands.kinds

function describe(node: CanvasNode): {kind: SearchResultKind; label: string; detail: string | null; haystack: string[]} {
  switch (node.type) {
    case 'kiosk': {
      const {data} = node
      const kind: SearchResultKind = data.type === 'MULTI' ? 'multi' : 'kiosk'
      const accounts = data.linkedUsers.flatMap((user) => [user.email, user.name])
      return {
        kind,
        label: data.location,
        detail: kind === 'multi' ? KINDS.multi : KINDS.kiosk,
        haystack: [data.location, kind === 'multi' ? KINDS.multi : KINDS.kiosk, data.status ?? '', ...accounts, ...data.examNames],
      }
    }
    case 'schedule': {
      const {data} = node
      return {
        kind: 'schedule',
        label: data.name,
        detail: data.institution?.name ?? data.specialty ?? KINDS.schedule,
        haystack: [data.name, KINDS.schedule, data.specialty ?? '', data.institution?.name ?? ''],
      }
    }
    case 'institution': {
      const {data} = node
      return {
        kind: 'institution',
        label: data.name,
        detail: STRINGS.brands.institution.schedules(data.scheduleCount),
        haystack: [data.name, KINDS.institution],
      }
    }
  }
}

/**
 * Nodes whose location / name / kind / linked accounts / exams / specialty /
 * institution contain the query. Results keep the canvas order (multis and
 * cabinas, then institutions, then agendas).
 */
export function searchNodes(nodes: CanvasNode[], query: string): SearchResult[] {
  const needle = normalizeText(query)
  if (!needle) return []

  const results: SearchResult[] = []
  for (const node of nodes) {
    const {kind, label, detail, haystack} = describe(node)
    if (haystack.some((text) => text && normalizeText(text).includes(needle))) {
      results.push({id: node.id, kind, label, detail})
    }
  }
  return results
}

/**
 * Node ids to keep lit while a search is active: the matches themselves, the
 * group around a matching agenda, and the agendas inside a matching institution.
 */
export function highlightedNodeIds(nodes: CanvasNode[], results: SearchResult[]): Set<string> {
  const lit = new Set(results.map((result) => result.id))
  if (lit.size === 0) return lit

  for (const node of nodes) {
    if (node.type !== 'schedule' || !node.parentId) continue
    if (results.some((result) => result.id === node.id)) lit.add(node.parentId)
    else if (lit.has(node.parentId) && results.some((result) => result.id === node.parentId)) lit.add(node.id)
  }
  return lit
}
