import { DEFAULT_MODEL } from '../ai/openrouter.ts'

type Props = {
  apiKey: string
  model: string
  onApiKey: (v: string) => void
  onModel: (v: string) => void
  onTestConnection: () => void
  testingConnection: boolean
}

export function ApiSettings({
  apiKey,
  model,
  onApiKey,
  onModel,
  onTestConnection,
  testingConnection,
}: Props) {
  return (
    <details className="api">
      <summary>OpenRouter 설정 (브라우저에만 저장)</summary>
      <p className="hint">
        서버 없이 브라우저에서 OpenRouter를 호출합니다. 키는 이 기기의 localStorage에만 남고 저장소에
        커밋되지 않습니다. 기본 모델은 무료 라우터 <code>{DEFAULT_MODEL}</code>입니다.
      </p>
      <label>
        API 키
        <input
          type="password"
          autoComplete="off"
          value={apiKey}
          placeholder="sk-or-..."
          onChange={(e) => onApiKey(e.target.value)}
        />
      </label>
      <label>
        모델
        <input value={model} onChange={(e) => onModel(e.target.value)} />
      </label>
      <div className="api-actions">
        <button type="button" onClick={onTestConnection} disabled={testingConnection}>
          {testingConnection ? '연결 테스트 중…' : '연결 테스트'}
        </button>
      </div>
    </details>
  )
}
