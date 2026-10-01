export const DEFAULT_MODEL = 'openrouter/free'
export const KEY_STORAGE = 'omok.openrouter.key'
export const MODEL_STORAGE = 'omok.openrouter.model'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string }
type ChatOptions = { apiKey: string; model: string; timeoutMs?: number }

type JsonObject = Record<string, unknown>

function parseJsonObject(text: string): JsonObject | null {
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' ? (parsed as JsonObject) : null
  } catch {
    return null
  }
}

function jsonBlocks(text: string): string[] {
  const out: string[] = []
  const fenced = text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)
  for (const m of fenced) {
    const chunk = m[1]?.trim()
    if (chunk) out.push(chunk)
  }
  return out
}

function firstBalancedObject(text: string): string | null {
  const s = text.trim()
  for (let i = 0; i < s.length; i++) {
    if (s[i] !== '{') continue
    let depth = 0
    let inString = false
    let escaped = false
    for (let j = i; j < s.length; j++) {
      const c = s[j]
      if (inString) {
        if (escaped) escaped = false
        else if (c === '\\') escaped = true
        else if (c === '"') inString = false
        continue
      }
      if (c === '"') inString = true
      else if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) return s.slice(i, j + 1)
      }
    }
  }
  return null
}

function extractJson(text: string): unknown {
  const raw = text.trim()
  const tries = [raw, ...jsonBlocks(raw)]
  const balanced = firstBalancedObject(raw)
  if (balanced) tries.push(balanced)
  for (const chunk of tries) {
    const parsed = parseJsonObject(chunk)
    if (parsed) return parsed
  }
  throw new Error('모델이 유효한 JSON 객체를 반환하지 않았습니다')
}

function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (!part || typeof part !== 'object') return ''
      const text = (part as { text?: unknown }).text
      return typeof text === 'string' ? text : ''
    })
    .filter(Boolean)
    .join('\n')
}

export async function chatJson(
  messages: ChatMessage[],
  { apiKey, model, timeoutMs = 30000 }: ChatOptions,
): Promise<unknown> {
  if (!apiKey.trim()) throw new Error('OpenRouter API 키가 없습니다')
  const headers = {
    Authorization: `Bearer ${apiKey.trim()}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
    'X-Title': 'AI Omok Master',
  }
  const baseBody = {
    model: model.trim() || DEFAULT_MODEL,
    messages,
    temperature: 0.2,
  }
  const withFormat = {
    ...baseBody,
    response_format: { type: 'json_object' as const },
  }
  const parse = async (r: Response) => {
    if (!r.ok) {
      const body = await r.text().catch(() => '')
      throw new Error(`OpenRouter ${r.status}${body ? `: ${body.slice(0, 180)}` : ''}`)
    }
    return (await r.json()) as {
      choices?: Array<{
        message?: {
          content?: string | Array<{ type?: string; text?: string | null }> | null
          reasoning?: string | null
        }
      }>
    }
  }
  const req = async (body: object) =>
    fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  let data: {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string | null }> | null
        reasoning?: string | null
      }
    }>
  }
  try {
    data = await parse(await req(withFormat))
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    const unsupported =
      msg.includes('response_format') || msg.includes('json_object') || msg.includes('unsupported')
    if (!unsupported) throw e
    data = await parse(await req(baseBody))
  }
  const msg = data.choices?.[0]?.message
  const text = (contentToText(msg?.content) || msg?.reasoning || '').trim()
  if (!text) throw new Error('모델 응답이 비었습니다')
  return extractJson(text)
}

export async function pingOpenRouter({
  apiKey,
  model,
  timeoutMs = 15000,
}: {
  apiKey: string
  model: string
  timeoutMs?: number
}): Promise<string> {
  const raw = await chatJson(
    [
      {
        role: 'system',
        content: 'JSON 객체만 출력한다.',
      },
      {
        role: 'user',
        content: '연결 테스트다. {"ok":true,"message":"pong"} JSON 으로만 답해.',
      },
    ],
    { apiKey, model, timeoutMs },
  )
  const ok = raw && typeof raw === 'object' && (raw as { ok?: unknown }).ok === true
  if (!ok) throw new Error('연결 테스트 응답 형식이 올바르지 않습니다')
  const message = (raw as { message?: unknown }).message
  return typeof message === 'string' && message.trim() ? message.trim() : 'pong'
}

export function loadApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? ''
  } catch {
    return ''
  }
}

export function saveApiKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key)
}

export function loadModel() {
  try {
    return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL
  } catch {
    return DEFAULT_MODEL
  }
}

export function saveModel(model: string) {
  localStorage.setItem(MODEL_STORAGE, model)
}
