export const N = 15
export const E = 0
export const B = 1
export const W = 2

export type Cell = 0 | 1 | 2
export type Stone = typeof B | typeof W
export type Player = 'B' | 'W'
export type Winner = 'B' | 'W' | 'D' | null
export type ForbiddenKind = '장목' | '사사' | '삼삼'
export type Move = { n: number; x: number; y: number; player: Player }

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

export const at = (b: Cell[][], x: number, y: number): number =>
  x >= 0 && y >= 0 && x < N && y < N ? b[y][x] : -1

const isEmpty = (b: Cell[][], x: number, y: number) => at(b, x, y) === E

function run(b: Cell[][], x: number, y: number, dx: number, dy: number) {
  const c = b[y][x]
  let n = 1
  let a = 1
  let s = 1
  while (at(b, x + dx * a, y + dy * a) === c) {
    n++
    a++
  }
  while (at(b, x - dx * s, y - dy * s) === c) {
    n++
    s++
  }
  return {
    n,
    e1: [x + dx * a, y + dy * a] as const,
    e2: [x - dx * s, y - dy * s] as const,
  }
}

function posKey(x: number, y: number) {
  return `${x},${y}`
}

/** 한 방향에서 서로 다른 흑 4점 집합을 갖는 4목 개수(열린 4의 양 끝은 1개로 침) */
function foursOnRay(b: Cell[][], x: number, y: number, dx: number, dy: number): number {
  const seen = new Set<string>()
  for (let off = -4; off <= 0; off++) {
    const blacks: string[] = []
    let empties = 0
    let ok = true
    for (let k = 0; k < 5; k++) {
      const cx = x + dx * (off + k)
      const cy = y + dy * (off + k)
      const v = at(b, cx, cy)
      if (v === B) blacks.push(posKey(cx, cy))
      else if (v === E) {
        empties++
        if (empties > 1) {
          ok = false
          break
        }
      } else {
        ok = false
        break
      }
    }
    if (ok && blacks.length === 4 && empties === 1) seen.add(blacks.slice().sort().join('|'))
  }
  return seen.size
}

function isOpenFour(b: Cell[][], x: number, y: number, dx: number, dy: number): boolean {
  const r = run(b, x, y, dx, dy)
  return r.n === 4 && isEmpty(b, r.e1[0], r.e1[1]) && isEmpty(b, r.e2[0], r.e2[1])
}

/** 한 방향의 열린 3목 개수(서로 다른 확장 칸) */
function openThreesOnRay(b: Cell[][], x: number, y: number, dx: number, dy: number): number {
  const seen = new Set<string>()
  for (let k = -4; k <= 4; k++) {
    if (k === 0) continue
    const ex = x + dx * k
    const ey = y + dy * k
    if (at(b, ex, ey) !== E) continue
    b[ey][ex] = B
    if (run(b, ex, ey, dx, dy).n >= 6) {
      b[ey][ex] = E
      continue
    }
    if (isOpenFour(b, x, y, dx, dy) || isOpenFour(b, ex, ey, dx, dy)) {
      seen.add(posKey(ex, ey))
    }
    b[ey][ex] = E
  }
  return seen.size
}

/** 흑이 (x,y)에 두면 금수인가? → null | '장목' | '사사' | '삼삼' */
export function forbidden(b: Cell[][], x: number, y: number): ForbiddenKind | null {
  if (at(b, x, y) !== E) return null
  b[y][x] = B
  const runs = DIRS.map(([dx, dy]) => run(b, x, y, dx, dy).n)
  let r: ForbiddenKind | null = null
  if (runs.includes(5)) r = null
  else if (runs.some((n) => n >= 6)) r = '장목'
  else {
    let fours = 0
    let threes = 0
    for (const [dx, dy] of DIRS) {
      const f = foursOnRay(b, x, y, dx, dy)
      fours += f
      if (f === 0 && openThreesOnRay(b, x, y, dx, dy) > 0) threes += 1
    }
    if (fours >= 2) r = '사사'
    else if (threes >= 2) r = '삼삼'
  }
  b[y][x] = E
  return r
}

export class Game {
  renju: boolean
  board: Cell[][] = []
  moves: Move[] = []
  turn: Stone = B
  winner: Winner = null

  constructor({ renju = true }: { renju?: boolean } = {}) {
    this.renju = renju
    this.reset()
  }

  reset() {
    this.board = Array.from({ length: N }, () => Array<Cell>(N).fill(E))
    this.moves = []
    this.turn = B
    this.winner = null
  }

  clone(): Game {
    const g = new Game({ renju: this.renju })
    g.board = this.board.map((row) => row.slice())
    g.moves = this.moves.map((m) => ({ ...m }))
    g.turn = this.turn
    g.winner = this.winner
    return g
  }

  play(x: number, y: number): { ok: boolean; reason?: string; winner: Winner } {
    if (this.winner) return { ok: false, reason: '대국이 끝났습니다', winner: this.winner }
    const cell = at(this.board, x, y)
    if (cell !== E) {
      return {
        ok: false,
        reason: cell === -1 ? '판 밖입니다' : '이미 돌이 있습니다',
        winner: this.winner,
      }
    }
    if (this.renju && this.turn === B) {
      const f = forbidden(this.board, x, y)
      if (f) return { ok: false, reason: `금수(${f})입니다`, winner: this.winner }
    }
    this.board[y][x] = this.turn
    this.moves.push({
      n: this.moves.length + 1,
      x,
      y,
      player: this.turn === B ? 'B' : 'W',
    })
    const win = DIRS.some(([dx, dy]) => {
      const n = run(this.board, x, y, dx, dy).n
      return this.turn === B ? n === 5 : n >= 5
    })
    if (win) this.winner = this.turn === B ? 'B' : 'W'
    else if (this.moves.length === N * N) this.winner = 'D'
    this.turn = this.turn === B ? W : B
    return { ok: true, winner: this.winner }
  }
}

/** 복기용: 앞에서 upto 수까지만 둔 판 (규칙 검사 없음) */
export function boardAt(moves: Move[], upto: number): Cell[][] {
  const b = Array.from({ length: N }, () => Array<Cell>(N).fill(E))
  moves.slice(0, upto).forEach((m) => {
    b[m.y][m.x] = m.player === 'B' ? B : W
  })
  return b
}

/** 로컬 휴리스틱 AI. noise 가 클수록 약함 */
export function heuristicMove(g: Game, noise = 0): { x: number; y: number } {
  if (!g.moves.length) return { x: 7, y: 7 }
  const me = g.turn
  const op: Stone = me === B ? W : B
  let best: { x: number; y: number } | null = null
  let bs = -1
  const near = (x: number, y: number) => {
    for (let j = -2; j <= 2; j++) {
      for (let i = -2; i <= 2; i++) {
        if (at(g.board, x + i, y + j) > 0) return true
      }
    }
    return false
  }
  const score = (x: number, y: number, c: Stone) => {
    g.board[y][x] = c
    const s = DIRS.reduce((a, [dx, dy]) => a + 10 ** run(g.board, x, y, dx, dy).n, 0)
    g.board[y][x] = E
    return s
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (g.board[y][x] !== E || !near(x, y)) continue
      if (g.renju && me === B && forbidden(g.board, x, y)) continue
      const s = score(x, y, me) + 0.9 * score(x, y, op) + Math.random() * noise
      if (s > bs) {
        bs = s
        best = { x, y }
      }
    }
  }
  return best || { x: 7, y: 7 }
}

export function winnerLabel(w: Winner): string {
  if (w === 'B') return '흑 승리'
  if (w === 'W') return '백 승리'
  if (w === 'D') return '무승부'
  return ''
}
