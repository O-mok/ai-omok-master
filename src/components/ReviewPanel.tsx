import type { Review } from '../ai/review.ts'
import type { Move } from '../engine/omok.ts'

const LABEL: Record<string, string> = {
  best: '최선',
  good: '무난',
  mistake: '실착',
  blunder: '패착',
}

type Props = {
  moves: Move[]
  cursor: number
  review: Review
  onlyKey: boolean
  onOnlyKey: (v: boolean) => void
  onGoto: (n: number) => void
}

export function ReviewPanel({ moves, cursor, review, onlyKey, onOnlyKey, onGoto }: Props) {
  const a = cursor ? review.by[cursor] : undefined
  const chips = moves.filter((m) => !onlyKey || review.by[m.n]?.key)
  const comment = cursor ? a?.comment || '코멘트가 없습니다.' : review.summary

  return (
    <section className="review">
      <p id="comment">{comment}</p>
      <div className="ctl">
        <button type="button" onClick={() => onGoto(0)}>
          처음
        </button>
        <button type="button" onClick={() => onGoto(cursor - 1)}>
          이전
        </button>
        <input
          type="range"
          min={0}
          max={moves.length}
          value={cursor}
          aria-label="수순"
          onChange={(e) => onGoto(Number(e.target.value))}
        />
        <button type="button" onClick={() => onGoto(cursor + 1)}>
          다음
        </button>
        <button type="button" onClick={() => onGoto(moves.length)}>
          끝
        </button>
      </div>
      <label className="chk">
        <input type="checkbox" checked={onlyKey} onChange={(e) => onOnlyKey(e.target.checked)} />
        핵심 수만 보기
      </label>
      <p className="legend">
        <i className="best" />
        최선 <i className="good" />
        무난 <i className="mistake" />
        실착 <i className="blunder" />
        패착 · 굵은 테두리는 핵심 수
      </p>
      <div className="moves">
        {chips.map((m) => {
          const r = review.by[m.n]
          return (
            <button
              key={m.n}
              type="button"
              className={`chip ${r?.rating || ''} ${r?.key ? 'key' : ''} ${cursor === m.n ? 'on' : ''}`}
              title={LABEL[r?.rating || ''] || ''}
              onClick={() => onGoto(m.n)}
            >
              {m.n}
            </button>
          )
        })}
      </div>
    </section>
  )
}
