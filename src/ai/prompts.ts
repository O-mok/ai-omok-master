import type { Move, Winner } from '../engine/omok.ts'

const SYS =
  '너는 렌주룰 오목 해설가다. 판은 15x15, 좌표는 (x,y)=(열,행) 0~14. 흑만 삼삼·사사·장목이 금수다. 흑은 정확히 5목만 승리, 백은 5목 이상 승리. 반드시 JSON 객체 하나만 출력한다. 최적의 수 기준: 즉시 승리, 상대의 즉시 승리 차단, 열린 4목 만들기, 상대 열린 3·4 차단 순이다. summary와 comment는 반드시 자연스러운 한국어로만 작성하고 영어 문장을 쓰지 마라.'

const fmt = (moves: Move[]) =>
  moves.map((m) => `${m.n}.${m.player === 'B' ? '흑' : '백'}(${m.x},${m.y})`).join(' ')

const winnerText = (winner: Winner) => {
  if (winner === 'B') return '흑 승리'
  if (winner === 'W') return '백 승리'
  if (winner === 'D') return '무승부'
  return '진행 중'
}

export const analyzePrompt = (moves: Move[], winner: Winner) => [
  { role: 'system' as const, content: SYS },
  {
    role: 'user' as const,
    content: `기보: ${fmt(moves)}\n결과: ${winnerText(winner)}\n아래 JSON 객체 하나만 출력해.\n{"summary":"총평 2문장","moves":[{"n":1,"rating":"good","key":false,"comment":"한 줄","best":{"x":0,"y":0}}]}\n- summary와 comment는 한국어만 사용 (영어 금지)\n- rating 은 정확히 하나만: best | good | mistake | blunder\n- moves에는 코멘트가 필요한 수만 넣어라(중요 수·실수 위주, 최대 40개)\n- key=true 는 승부를 가른 핵심 수 최대 5개\n- best 는 더 나은 수가 있을 때만 (이미 놓인 칸 금지, 0~14), 없으면 null`,
  },
]

const LEVEL: Record<string, string> = {
  normal: '무난하게 두되 상대의 3목·4목을 막아라.',
  hard: '공격 기회를 먼저 찾고, 상대 열린 3목·4목은 반드시 막아라. 즉시 이길 수 있으면 그 수를 둬라.',
}

export const movePrompt = (moves: Move[], level: string) => [
  { role: 'system' as const, content: SYS },
  {
    role: 'user' as const,
    content: `기보: ${fmt(moves)}\n다음은 백(AI) 차례. ${LEVEL[level] || LEVEL.normal}\n빈 칸 하나를 {"x":0,"y":0} 형태 JSON 으로만 답해. 이미 돌이 있는 칸과 판 밖은 금지.`,
  },
]
