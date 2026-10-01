import { N, type Move } from '../engine/omok.ts'

export const RATINGS = ['best', 'good', 'mistake', 'blunder'] as const
export type Rating = (typeof RATINGS)[number]

export type MoveReview = {
  rating: Rating | ''
  key: boolean
  comment: string
  best: { x: number; y: number } | null
}

export type Review = {
  summary: string
  by: Record<number, MoveReview>
}

const occupied = (moves: Move[]) => new Set(moves.map((m) => `${m.x},${m.y}`))

function asInt(v: unknown): number | null {
  if (typeof v === 'number' && Number.isInteger(v)) return v
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return Number(v.trim())
  return null
}

function extractMoveNo(v: unknown): number | null {
  const n = asInt(v)
  if (n !== null) return n
  if (typeof v !== 'string') return null
  const m = v.match(/\d+/)
  return m ? Number(m[0]) : null
}

function parseRating(v: unknown): Rating | '' {
  if (typeof v !== 'string') return ''
  const s = v.trim().toLowerCase()
  if (RATINGS.includes(s as Rating)) return s as Rating
  if (s.includes('best')) return 'best'
  if (s.includes('good')) return 'good'
  if (s.includes('mistake')) return 'mistake'
  if (s.includes('blunder')) return 'blunder'
  if (s.includes('최선')) return 'best'
  if (s.includes('무난')) return 'good'
  if (s.includes('실착')) return 'mistake'
  if (s.includes('패착')) return 'blunder'
  return ''
}

function normalizeKoreanText(v: unknown): string {
  const s = String(v ?? '').trim()
  if (!s) return ''
  if (/[가-힣]/.test(s)) return s
  return '한국어 코멘트를 생성하지 못했습니다.'
}

export function normalizeReview(
  raw: unknown,
  moves: Move[],
  engineSummary: string,
): Review {
  const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const taken = occupied(moves)
  const by: Record<number, MoveReview> = {}
  const source =
    (obj.moves as unknown) ??
    (obj.analysis as unknown) ??
    (obj.reviews as unknown) ??
    (obj.by as unknown) ??
    (obj.byMove as unknown)
  const list = Array.isArray(source)
    ? source.map((item) => ({ item, key: null as string | null }))
    : source && typeof source === 'object'
      ? Object.entries(source as Record<string, unknown>).map(([key, item]) => ({ item, key }))
      : []
  for (const row of list) {
    const item = row.item
    if (!item || typeof item !== 'object') continue
    const m = item as Record<string, unknown>
    const n = extractMoveNo(m.n ?? m.move ?? m.turn ?? m.index ?? m.no ?? m.step ?? row.key)
    if (n === null || n < 1 || n > moves.length) continue
    const rating = parseRating(m.rating ?? m.eval ?? m.evaluation ?? m.grade ?? m.label)
    let best: { x: number; y: number } | null = null
    const bestRaw =
      (m.best as unknown) ??
      (m.bestMove as unknown) ??
      (m.suggestion as unknown) ??
      (m.recommend as unknown)
    if (bestRaw && typeof bestRaw === 'object') {
      const bx = asInt((bestRaw as { x?: unknown }).x)
      const byv = asInt((bestRaw as { y?: unknown }).y)
      if (
        bx !== null &&
        byv !== null &&
        bx >= 0 &&
        byv >= 0 &&
        bx < N &&
        byv < N &&
        !taken.has(`${bx},${byv}`)
      ) {
        best = { x: bx, y: byv }
      }
    }
    by[n] = {
      rating,
      key: Boolean(m.key ?? m.critical ?? m.isKey),
      comment: normalizeKoreanText(m.comment ?? m.reason ?? m.analysis ?? m.text),
      best,
    }
  }

  for (const m of moves) {
    const cur = by[m.n]
    if (!cur) {
      by[m.n] = { rating: 'good', key: false, comment: '', best: null }
      continue
    }
    if (!cur.rating) cur.rating = 'good'
  }

  const keys = Object.values(by).filter((v) => v.key)
  if (keys.length > 5) {
    let left = 5
    for (const m of moves) {
      if (!by[m.n]?.key) continue
      if (left <= 0) by[m.n].key = false
      else left--
    }
  }
  const summary = normalizeKoreanText(obj.summary) || engineSummary
  return { summary, by }
}

export function fallbackReview(engineSummary: string): Review {
  return { summary: engineSummary, by: {} }
}
