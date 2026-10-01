import { useEffect, useRef, type MouseEvent } from 'react'
import { B, N, boardAt, type Move } from '../engine/omok.ts'

type Props = {
  moves: Move[]
  upto: number
  hint?: { x: number; y: number } | null
  disabled?: boolean
  themeMode: 'light' | 'dark'
  onPlay: (x: number, y: number) => void
}

const SIZE = 600
const PAD = 26

const BOARD_THEME = {
  light: {
    bg: '#D9B066',
    line: '#6B4A22',
    black: '#141414',
    white: '#F8F3E8',
    stoneLine: '#3E2B14',
  },
  dark: {
    bg: '#CFD8DC',
    line: '#6B7C88',
    black: '#18212B',
    white: '#FAFBFC',
    stoneLine: '#18212B',
  },
} as const

export function Board({ moves, upto, hint, disabled, themeMode, onPlay }: Props) {
  const cv = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = cv.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const S = (canvas.width - PAD * 2) / (N - 1)
    const b = boardAt(moves, upto)
    const theme = BOARD_THEME[themeMode]
    ctx.fillStyle = theme.bg
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = theme.line
    ctx.font = '12px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < N; i++) {
      const p = PAD + i * S
      ctx.fillText(String(i), p, 10)
      ctx.fillText(String(i), 10, p)
    }

    ctx.strokeStyle = theme.line
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < N; i++) {
      const p = PAD + i * S
      ctx.moveTo(p, PAD)
      ctx.lineTo(p, canvas.height - PAD)
      ctx.moveTo(PAD, p)
      ctx.lineTo(canvas.width - PAD, p)
    }
    ctx.stroke()
    b.forEach((row, y) =>
      row.forEach((c, x) => {
        if (!c) return
        ctx.beginPath()
        ctx.arc(PAD + x * S, PAD + y * S, S * 0.42, 0, 7)
        ctx.fillStyle = c === B ? theme.black : theme.white
        ctx.fill()
        ctx.strokeStyle = theme.stoneLine
        ctx.stroke()
      }),
    )
    const ring = (x: number, y: number, color: string) => {
      ctx.beginPath()
      ctx.arc(PAD + x * S, PAD + y * S, S * 0.3, 0, 7)
      ctx.strokeStyle = color
      ctx.lineWidth = 3
      ctx.stroke()
    }
    const last = moves[upto - 1]
    if (last) ring(last.x, last.y, '#E5484D')
    if (hint) ring(hint.x, hint.y, '#2F6FED')
  }, [moves, upto, hint, themeMode])

  function onClick(e: MouseEvent<HTMLCanvasElement>) {
    if (disabled) return
    const canvas = cv.current
    if (!canvas) return
    const r = canvas.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * canvas.width
    const py = ((e.clientY - r.top) / r.height) * canvas.height
    const S = (canvas.width - PAD * 2) / (N - 1)
    const x = Math.round((px - PAD) / S)
    const y = Math.round((py - PAD) / S)
    if (x < 0 || x >= N || y < 0 || y >= N) return
    onPlay(x, y)
  }

  return (
    <canvas
      ref={cv}
      width={SIZE}
      height={SIZE}
      aria-label="오목판"
      onClick={onClick}
    />
  )
}
