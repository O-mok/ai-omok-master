import { describe, expect, it } from 'vitest'
import { B, E, Game, N, forbidden } from './omok.ts'

const mk = (blacks: Array<[number, number]>) => {
  const b = Array.from({ length: N }, () => Array(N).fill(E))
  blacks.forEach(([x, y]) => {
    b[y][x] = B
  })
  return b
}

describe('착수 검증', () => {
  it('중복·범위 밖 착수 차단', () => {
    const g = new Game()
    expect(g.play(7, 7).ok).toBe(true)
    expect(g.play(7, 7).ok).toBe(false)
    expect(g.play(15, 0).ok).toBe(false)
  })
})

describe('렌주 금수', () => {
  it('장목(6목)은 흑 금수', () => {
    expect(forbidden(mk([[3, 7], [4, 7], [5, 7], [7, 7], [8, 7]]), 6, 7)).toBe('장목')
  })

  it('정확히 5목은 금수가 아님(승리)', () => {
    expect(forbidden(mk([[3, 7], [4, 7], [5, 7], [6, 7]]), 7, 7)).toBe(null)
  })

  it('교차 삼삼 금수', () => {
    expect(forbidden(mk([[6, 7], [8, 7], [7, 6], [7, 8]]), 7, 7)).toBe('삼삼')
  })

  it('교차 사사 금수', () => {
    expect(forbidden(mk([[4, 7], [5, 7], [6, 7], [7, 4], [7, 5], [7, 6]]), 7, 7)).toBe('사사')
  })

  it('같은 줄 사사 ●.●●●.●', () => {
    expect(forbidden(mk([[5, 7], [7, 7], [8, 7], [11, 7]]), 9, 7)).toBe('사사')
  })

  it('열린 4는 사사가 아니다', () => {
    expect(forbidden(mk([[4, 7], [5, 7], [6, 7]]), 7, 7)).toBe(null)
  })
})

describe('승패·초기화', () => {
  it('흑 5목 승리 · 재시작 초기화', () => {
    const g = new Game({ renju: true })
    ;[
      [3, 3],
      [3, 9],
      [4, 3],
      [4, 9],
      [5, 3],
      [5, 9],
      [6, 3],
      [6, 9],
    ].forEach(([x, y]) => g.play(x, y))
    expect(g.play(7, 3).winner).toBe('B')
    g.reset()
    expect(g.moves.length).toBe(0)
    expect(g.winner).toBe(null)
    expect(g.turn).toBe(B)
  })

  it('백은 6목이어도 금수 없이 승리', () => {
    const g = new Game()
    const seq: Array<[number, number]> = [
      [8, 0],
      [0, 7],
      [8, 2],
      [1, 7],
      [8, 4],
      [2, 7],
      [8, 6],
      [3, 7],
      [8, 8],
      [5, 7],
      [8, 10],
      [4, 7],
    ]
    seq.forEach(([x, y]) => expect(g.play(x, y).ok).toBe(true))
    expect(g.winner).toBe('W')
  })
})
