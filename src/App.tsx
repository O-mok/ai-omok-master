import { useCallback, useEffect, useState } from 'react'
import {
  chatJson,
  loadApiKey,
  loadModel,
  pingOpenRouter,
  saveApiKey,
  saveModel,
} from './ai/openrouter.ts'
import { analyzePrompt, movePrompt } from './ai/prompts.ts'
import { fallbackReview, normalizeReview, type Review } from './ai/review.ts'
import { ApiSettings } from './components/ApiSettings.tsx'
import { Board } from './components/Board.tsx'
import { ReviewPanel } from './components/ReviewPanel.tsx'
import { B, Game, heuristicMove, winnerLabel } from './engine/omok.ts'

type Mode = 'ai' | 'pvp'
type Level = 'easy' | 'normal' | 'hard'
type ThemeMode = 'light' | 'dark'
const ANALYZE_TIMEOUT_MS = 90000
const ANALYZE_RETRY_TIMEOUT_MS = 150000
const THEME_STORAGE = 'omok.theme'

function loadThemeMode(): ThemeMode {
  try {
    return localStorage.getItem(THEME_STORAGE) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function isTimeoutError(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  const m = e.message.toLowerCase()
  return m.includes('timeout') || m.includes('timed out') || m.includes('aborted')
}

export default function App() {
  const [game] = useState(() => new Game({ renju: true }))
  const [, bump] = useState(0)
  const redraw = () => bump((n) => n + 1)

  const [mode, setMode] = useState<Mode>('ai')
  const [level, setLevel] = useState<Level>('normal')
  const [status, setStatus] = useState('흑 차례입니다. 흑은 삼삼·사사·장목에 둘 수 없습니다.')
  const [busy, setBusy] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [onlyKey, setOnlyKey] = useState(false)
  const [review, setReview] = useState<Review>({ summary: '', by: {} })
  const [apiKey, setApiKey] = useState(() => loadApiKey())
  const [model, setModel] = useState(() => loadModel())
  const [testingConn, setTestingConn] = useState(false)
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadThemeMode())

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
    try {
      localStorage.setItem(THEME_STORAGE, themeMode)
    } catch {
      /* no-op */
    }
  }, [themeMode])

  const start = useCallback(() => {
    game.reset()
    setBusy(false)
    setShowReview(false)
    setOnlyKey(false)
    setReview({ summary: '', by: {} })
    setCursor(0)
    setStatus('흑 차례입니다. 흑은 삼삼·사사·장목에 둘 수 없습니다.')
    redraw()
  }, [game])

  const analyzeGame = useCallback(
    async (g: Game) => {
      const w = winnerLabel(g.winner)
      const engineSummary = `엔진 판정: ${w || '진행 중'}. 총 ${g.moves.length}수.`
      setShowReview(false)
      setReview(fallbackReview(engineSummary))
      redraw()
      try {
        let raw: unknown
        try {
          raw = await chatJson(analyzePrompt(g.moves, g.winner), {
            apiKey,
            model,
            timeoutMs: ANALYZE_TIMEOUT_MS,
          })
        } catch (e) {
          if (!isTimeoutError(e)) throw e
          raw = await chatJson(analyzePrompt(g.moves, g.winner), {
            apiKey,
            model,
            timeoutMs: ANALYZE_RETRY_TIMEOUT_MS,
          })
        }
        setReview(normalizeReview(raw, g.moves, engineSummary))
        setCursor(g.moves.length)
        setShowReview(true)
        return { ok: true as const, error: '' }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '알 수 없는 오류'
        setReview(
          fallbackReview(
            `${engineSummary} AI 분석을 불러오지 못했습니다: ${msg}`,
          ),
        )
        setCursor(g.moves.length)
        setShowReview(true)
        return { ok: false as const, error: msg }
      }
    },
    [apiKey, model],
  )

  const finish = useCallback(
    async (g: Game) => {
      const w = winnerLabel(g.winner)
      setStatus(`${w} — AI가 기보를 분석하는 중… 잠시만 기다려 주세요.`)
      const result = await analyzeGame(g)
      setStatus(result.ok ? w : `${w} (분석 실패: ${result.error})`)
    },
    [analyzeGame],
  )

  const aiTurn = useCallback(
    async (g: Game) => {
      setBusy(true)
      setStatus('AI가 수를 고르는 중…')
      let placed = false
      if (level !== 'easy' && apiKey.trim()) {
        try {
          const raw = await chatJson(movePrompt(g.moves, level), { apiKey, model })
          const x = Number((raw as { x?: unknown }).x)
          const y = Number((raw as { y?: unknown }).y)
          if (Number.isInteger(x) && Number.isInteger(y) && g.play(x, y).ok) placed = true
        } catch {
          /* 로컬 폴백 */
        }
      }
      if (!placed) {
        const h = heuristicMove(g, level === 'easy' ? 5000 : 0)
        g.play(h.x, h.y)
      }
      setBusy(false)
      redraw()
      if (g.winner) await finish(g)
      else setStatus('흑 차례입니다.')
    },
    [apiKey, finish, level, model],
  )

  const testConnection = useCallback(async () => {
    if (!apiKey.trim()) {
      setStatus('OpenRouter API 키를 먼저 입력해 주세요.')
      return
    }
    setTestingConn(true)
    setStatus('OpenRouter 연결 테스트 중…')
    try {
      const pong = await pingOpenRouter({ apiKey, model })
      setStatus(`OpenRouter 연결 성공: ${pong}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '연결 실패'
      setStatus(`OpenRouter 연결 실패: ${msg}`)
    }
    setTestingConn(false)
  }, [apiKey, model])

  async function onPlay(x: number, y: number) {
    if (game.winner || busy) return
    if (mode === 'ai' && game.turn !== B) return
    const res = game.play(x, y)
    if (!res.ok) {
      setStatus(res.reason || '둘 수 없습니다')
      return
    }
    redraw()
    if (game.winner) {
      await finish(game)
      return
    }
    if (mode === 'ai') await aiTurn(game)
    else setStatus(game.turn === B ? '흑 차례입니다.' : '백 차례입니다.')
  }

  const hint = showReview ? review.by[cursor]?.best ?? null : null
  const upto = showReview ? cursor : game.moves.length

  return (
    <main>
      <button
        type="button"
        className="theme-fab"
        aria-label={themeMode === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
        title={themeMode === 'light' ? '다크 모드' : '라이트 모드'}
        onClick={() => setThemeMode((v) => (v === 'light' ? 'dark' : 'light'))}
      >
        {themeMode === 'light' ? '🌙' : '☀️'}
      </button>

      <header className="hero">
        <h1>AI Omok Master</h1>
        <p className="sub">렌주룰로 두면, AI가 승부처를 짚어 드립니다.</p>
      </header>

      <section className="board-wrap">
        <Board
          moves={game.moves}
          upto={upto}
          hint={hint}
          themeMode={themeMode}
          disabled={busy || !!game.winner}
          onPlay={onPlay}
        />
      </section>

      <section className="bottom-panels">
        <aside className="panel">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              start()
            }}
          >
            <label>
              상대
              <select value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
                <option value="ai">AI와 대국</option>
                <option value="pvp">둘이서 대국</option>
              </select>
            </label>
            <label>
              AI 난이도
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                <option value="easy">쉬움 (로컬)</option>
                <option value="normal">보통</option>
                <option value="hard">어려움</option>
              </select>
            </label>
            <button type="submit">새 대국</button>
          </form>
          <ApiSettings
            apiKey={apiKey}
            model={model}
            testingConnection={testingConn}
            onApiKey={(v) => {
              setApiKey(v)
              saveApiKey(v)
            }}
            onModel={(v) => {
              setModel(v)
              saveModel(v)
            }}
            onTestConnection={testConnection}
          />
          <p id="status" role="status">
            {status}
          </p>
        </aside>

        <section className="panel">
          {showReview ? (
            <ReviewPanel
              moves={game.moves}
              cursor={cursor}
              review={review}
              onlyKey={onlyKey}
              onOnlyKey={setOnlyKey}
              onGoto={(n) => setCursor(Math.max(0, Math.min(game.moves.length, n)))}
            />
          ) : (
            <p id="comment">대국 종료 후 기보 분석이 표시됩니다.</p>
          )}
        </section>
      </section>
    </main>
  )
}
