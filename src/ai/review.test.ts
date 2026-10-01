import { describe, expect, it } from 'vitest'
import { normalizeReview } from './review.ts'
import type { Move } from '../engine/omok.ts'

const moves: Move[] = [
  { n: 1, x: 7, y: 7, player: 'B' },
  { n: 2, x: 8, y: 8, player: 'W' },
]

describe('분석 JSON 정규화', () => {
  it('범위 밖·점유 칸 best 는 버린다', () => {
    const r = normalizeReview(
      {
        summary: '총평',
        moves: [
          { n: 1, rating: 'good', key: true, comment: '중앙', best: { x: 7, y: 7 } },
          { n: 2, rating: 'nope', key: true, comment: 'ok', best: { x: 0, y: 0 } },
          { n: 99, rating: 'best', key: true, comment: 'ghost' },
        ],
      },
      moves,
      '엔진',
    )
    expect(r.by[1].best).toBe(null)
    expect(r.by[2].rating).toBe('good')
    expect(r.by[2].best).toEqual({ x: 0, y: 0 })
    expect(r.by[99]).toBeUndefined()
  })

  it('문자열 수 번호와 변형 rating 도 매핑한다', () => {
    const r = normalizeReview(
      {
        summary: '총평',
        moves: [
          { n: '1', rating: 'best|good|mistake|blunder', key: false, comment: '테스트' },
          { move: '2', rating: '패착(blunder)', key: true, comment: '놓침', best: { x: '0', y: '1' } },
        ],
      },
      moves,
      '엔진',
    )
    expect(r.by[1].rating).toBe('best')
    expect(r.by[2].rating).toBe('blunder')
    expect(r.by[2].best).toEqual({ x: 0, y: 1 })
  })

  it('moves 객체 포맷과 누락 수를 처리한다', () => {
    const r = normalizeReview(
      {
        summary: '총평',
        moves: {
          '1수': { evaluation: '실착', reason: '서두름' },
        },
      },
      moves,
      '엔진',
    )
    expect(r.by[1].rating).toBe('mistake')
    expect(r.by[1].comment).toBe('서두름')
    expect(r.by[2].rating).toBe('good')
  })

  it('영문 요약/코멘트는 한국어 기본 문구로 대체한다', () => {
    const r = normalizeReview(
      {
        summary: 'Solid game',
        moves: [{ n: 1, rating: 'good', comment: 'Solid central start' }],
      },
      moves,
      '엔진',
    )
    expect(r.summary).toBe('한국어 코멘트를 생성하지 못했습니다.')
    expect(r.by[1].comment).toBe('한국어 코멘트를 생성하지 못했습니다.')
  })
})
