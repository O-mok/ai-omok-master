import { afterEach, describe, expect, it, vi } from 'vitest'
import { chatJson, pingOpenRouter } from './openrouter.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('OpenRouter 호출', () => {
  it('코드펜스 JSON 응답을 파싱한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '```json\n{"summary":"ok","moves":[]}\n```' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const out = await chatJson(
      [{ role: 'user', content: 'test' }],
      { apiKey: '  sk-test  ', model: 'openrouter/free' },
    )

    expect(out).toEqual({ summary: 'ok', moves: [] })
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'openrouter/free',
      response_format: { type: 'json_object' },
    })
  })

  it('배열 content 응답으로 연결 테스트를 통과한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: [{ type: 'text', text: '{"ok":true,"message":"pong"}' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(pingOpenRouter({ apiKey: 'sk-test', model: 'openrouter/free' })).resolves.toBe('pong')
  })

  it('HTTP 실패를 오류로 보여준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('bad request', { status: 400, headers: { 'Content-Type': 'text/plain' } }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      chatJson([{ role: 'user', content: 'test' }], { apiKey: 'sk-test', model: 'openrouter/free' }),
    ).rejects.toThrow('OpenRouter 400')
  })

  it('response_format 미지원이면 포맷 없이 재시도한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'response_format is unsupported for this model' } }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"summary":"ok","moves":[]}' } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    const out = await chatJson(
      [{ role: 'user', content: 'test' }],
      { apiKey: 'sk-test', model: 'openrouter/free' },
    )
    expect(out).toEqual({ summary: 'ok', moves: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const first = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body))
    const second = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit).body))
    expect(first.response_format).toEqual({ type: 'json_object' })
    expect(second.response_format).toBeUndefined()
  })
})
