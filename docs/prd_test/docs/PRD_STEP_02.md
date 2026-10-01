# PRD STEP 02 — OpenRouter 연동 + 수별 분석 엔진 + AI 해설

> 선행 조건: Step 1 완료(GameRecord 생성 가능). 선행 문서: `CLAUDE.md`, `docs/VALIDATION_GUIDELINES.md`

## 목표

대국이 끝난 기보(`GameRecord`)를 받아 **모든 수를 분석**하고, 그 결과를 **OpenRouter 텍스트 모델**에 넘겨 사람이 읽기 좋은 **수별 해설과 총평**을 만든다. 결과는 `ReviewResult`로 정리해 간단한 표로 확인한다(고급 색상 뷰어는 Step 3).

핵심 원칙 — **엔진이 판정하고, LLM이 설명한다.**

| 역할 | 담당 | 이유 |
|---|---|---|
| 수의 분류(최선~패착), 결정적 수 선정, 최선 수 후보, 승률 | **로컬 분석 엔진** | 재현 가능·검증 가능·무료·빠름 |
| 해설 문장, 총평, 개선 팁 | **LLM (OpenRouter)** | 자연스러운 한국어 설명 |
| LLM 실패 시 해설 | **템플릿 문장** | 서비스 중단 방지 |

## 범위

| 포함 (In) | 제외 (Out) |
|---|---|
| `.env` 키 관리, Express 프록시, `/api/health`, `/api/review` | 스트리밍 응답, 채팅형 Q&A (Step 3 P2) |
| **API 스모크 테스트와 모델 선정 보고서** | 이미지/영상 모델 사용 (본 프로젝트는 텍스트 모델만) |
| 수별 분석 엔진(Web Worker), 분류·결정적 수·태그 | 색상 타임라인·승률 그래프 (Step 3) |
| LLM 프롬프트·응답 검증·폴백·캐시 | 기보 영구 저장 (Step 3) |
| 결과 모달 [AI 복기] 활성화 + 간단 결과 표 | |

---

## 1. 구현 내용

### 1.1 API 환경 설정 (P0)

`.env` (저장소 제외, 서버만 읽음):

```
OPENROUTER_API_KEY=            # 필수. 값은 사용자가 직접 입력
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it:free
OPENROUTER_FALLBACK_MODELS=    # 쉼표 구분, 모델 실패 시 순차 시도 (T4 테스트로 채움)
PORT=8787
REVIEW_TIMEOUT_MS=30000
```

- `.env.example`에는 **키 이름만** 둔다. `.gitignore`에 `.env` 포함 여부를 재확인한다.
- 키는 **서버 코드에서만** 읽는다. 클라이언트 번들·콘솔·에러 응답·로그에 키가 나오면 안 된다(로그에는 앞 6자 + `***`).
- `vite.config.js`: 개발 서버에서 `/api` → `http://localhost:8787` 프록시.
- `npm run dev`는 클라이언트+서버를 동시에 실행(`concurrently`).
- 모델 ID는 코드에 하드코딩하지 말고 `.env` → `config`로만 참조한다. (무료 모델은 바뀌거나 제한이 걸릴 수 있다.)

### 1.2 API 스모크 테스트 — `scripts/api-smoke-test.js` (P0, **반드시 먼저 수행**)

"준비된 API가 실제로 작동하는지"를 **본 기능 구현 전에** 확인한다. 이 프로젝트에서 중요한 것은 LLM의 **환각·오류·제멋대로 응답** 여부다.

| # | 테스트 | 방법 | 합격 기준 |
|---|---|---|---|
| T-1 | 연결·인증 | 짧은 프롬프트("OK만 답해") | HTTP 200, 응답 텍스트 존재 |
| T-2 | 한국어 응답 | "오목 규칙을 한 문장으로" | 한글 응답, 3초~20초 내 |
| T-3 | JSON 전용 응답 | "JSON만 출력" 지시 + 스키마 | 코드펜스 제거 후 `JSON.parse` 성공 (10회 중 ≥ 9회) |
| T-4 | **좌표 환각 검사** | 고정 샘플(5수짜리 국면 + 허용 좌표 목록)로 해설 요청 | 응답에 **허용 목록 밖 좌표 0건** (5회 반복) |
| T-5 | **사실 왜곡 검사** | 엔진 사실(`class=blunder`)을 주고 해설 요청 | 해설이 "좋은 수"처럼 **사실과 반대되는 평가 0건** (5회) |
| T-6 | 오류 처리 | 잘못된 키/빈 키 / 아주 짧은 타임아웃 / 존재하지 않는 모델 | 서버가 죽지 않고 정의된 에러 코드 반환 |
| T-7 | 지연 시간 | 12개 수 해설 요청 | 중앙값 ≤ 20초 (초과 시 모델 후보 교체 검토) |

- 결과는 `docs/API_TEST_REPORT.md`에 표로 저장한다: 모델명 / 테스트별 통과 여부 / 지연(ms) / 실패 사례 / 최종 채택 여부.
- **기본 모델이 합격하지 못하면** OpenRouter에서 사용 가능한 다른 **무료 텍스트 모델 후보**를 3개 이상 조사해 위 표로 비교하고, 가장 적합한 모델을 채택해 `.env`의 `OPENROUTER_MODEL`과 `OPENROUTER_FALLBACK_MODELS`를 갱신한다. 채택 이유를 보고서에 남긴다.
- 무료 모델은 요청 제한(429)이 있다. 테스트 사이 간격을 두고, 429는 실패가 아니라 **재시도 대상**으로 기록한다.

### 1.3 수별 분석 엔진 — `engine/analyze.js`, `workers/analyzeWorker.js` (P0)

**입력** `GameRecord` → **출력** `MoveAnalysis[]` (수당 1개).

**알고리즘 (수 k = 1…N):**

1. 국면 `P(k-1)`(k번째 수를 두기 전)을 재현한다.
2. **고정 탐색**(Step 1의 `search.js` 재사용, 깊이 3, 수당 최대 600ms, **무작위 요소 없음**)으로 모든 후보의 평가값을 구해 `bestMove`와 `topCandidates`(상위 3개: 좌표 + 승률)를 얻는다.
3. 실제로 둔 수의 평가값을 같은 탐색으로 얻는다.
4. 평가값을 **흑 기준 승률** `wp ∈ [0,1]`로 변환: `wp = 1 / (1 + e^(−s / S))` (`S`는 `config.WP_SCALE`, 기본 20000 — 열린 4 확보 시 wp > 0.9가 되도록 튜닝).
5. 손실 `loss = (최선 수의 wp − 실제 수의 wp)`를 **둔 사람 관점**으로 계산(흑이 두면 흑 기준, 백이 두면 `1−wp` 기준).
6. 분류와 태그를 결정한다(아래).

**분류 임계값** (`config.CLASS_THRESHOLDS`, 승률 %p 기준 `loss`):

| 분류 | 코드 | 조건 |
|---|---|---|
| 최선 | `best` | 엔진 1순위 수이거나 `loss ≤ 0.02` |
| 좋음 | `good` | `loss ≤ 0.05` |
| 보통 | `ok` | `loss ≤ 0.10` |
| 실착 | `mistake` | `loss ≤ 0.20` |
| 패착 | `blunder` | `loss > 0.20` |

**하드 규칙 (임계값보다 우선):**
- 5목을 완성하는 수 → `best` + 태그 `WINNING_MOVE`
- 내가 5목을 만들 수 있었는데 다른 수를 둠 → `blunder` + `MISSED_WIN`
- 상대의 5목 위협(막힌 4/열린 4)을 방치 → `blunder` + `MISSED_BLOCK` (단, 내 수가 5목을 완성하면 해당 없음)
- 초반 5수 이내는 `loss`를 절반으로 보정(정석 다양성 존중), 태그 `OPENING`

**태그 사전** (`MoveAnalysis.tags`, LLM·템플릿 해설의 근거):

`WINNING_MOVE`, `MISSED_WIN`, `MISSED_BLOCK`, `OPEN_THREE_IGNORED`(상대 열린 3 방치), `MADE_OPEN_FOUR`, `MADE_OPEN_THREE`, `MADE_FOUR_THREE`(4-3), `MADE_DOUBLE_THREE`(쌍삼), `BLOCKED_FOUR`(상대 4 차단), `BLOCKED_OPEN_THREE`(상대 열린 3 차단), `PASSIVE`(공격 기회가 있었는데 의미 없는 수), `OPENING`.

**결정적 수(★) 선정** (`isKey`):

1. 후보 점수 `swing_k = |wp(P_k) − wp(P_{k−1})|` (흑 기준 승률 변화량)
2. 상위 `K = clamp(ceil(N/12), 3, 6)`개를 고른다(단 `swing ≥ 0.10`인 수만).
3. 다음은 **무조건 포함**: 최종 승리 수, `MISSED_WIN` 수, 승률이 처음으로 0.8 이상(또는 0.2 이하)이 된 **전환점 수**.
4. 중복 제거 후 수 번호 오름차순 정렬. 흑·백 각각 최소 1개가 되도록 보정(해당 색에 `swing`이 있는 수가 있을 때).

**성능·결정론:**
- Web Worker에서 실행, 진행률 이벤트(`{done, total}`) 전송, 취소 가능.
- 60수 기준 **총 40초 이내** (수당 600ms 상한).
- **동일 GameRecord → 동일 결과** (무작위·시간 의존 금지). 테스트로 고정.

**출력 `MoveAnalysis`:**

```jsonc
{
  "n": 17, "color": "W", "x": 8, "y": 6, "coord": "I7",
  "class": "blunder",             // best | good | ok | mistake | blunder
  "isKey": true,
  "wpBefore": 0.48, "wpAfter": 0.81,     // 흑 기준
  "loss": 0.31,                         // 둔 사람 관점 손실
  "tags": ["MISSED_BLOCK", "OPEN_THREE_IGNORED"],
  "bestAlt": [ { "coord": "G8", "wp": 0.52 }, { "coord": "J5", "wp": 0.49 } ],
  "nearby": ["....", "...."]              // 선택: 해당 수 주변 7×7 문자열(.XO)
}
```

### 1.4 LLM 해설 파이프라인 — `server/` (P0)

**해설 대상 선정** (토큰·요청 제한 절약): 결정적 수(★) 전부 + `mistake/blunder` 중 `loss` 큰 순 최대 8개 + `best` 중 `swing` 큰 2개 → **최대 12개** (`config.MAX_COMMENT_MOVES`). 나머지 수는 템플릿 해설.

**호출 방식:** 1판당 `/api/review` 1회(+재시도). OpenRouter `POST https://openrouter.ai/api/v1/chat/completions`, `Authorization: Bearer <KEY>`, `temperature: 0.3`, `max_tokens: 1800`. 모델이 `response_format: { type: "json_object" }`를 지원하면 사용하되, **지원 여부와 무관하게 응답은 직접 파싱·검증**한다.

**프롬프트 설계 (`server/reviewPrompt.js`):**

시스템 프롬프트(요지):
```
너는 친절한 오목 해설가다. 입력 JSON의 사실(facts)만 근거로 해설한다.
규칙:
1. 분류(class), 승률(wp), 태그(tags), 추천 수(bestAlt)는 이미 확정된 사실이다. 바꾸거나 반박하지 마라.
2. 좌표는 입력에 등장한 좌표만 사용한다. 새로운 좌표를 만들지 마라.
3. 각 수 해설은 한국어 1~2문장, 100자 이내. 훈계하지 말고 코칭 톤으로.
4. 확실하지 않으면 일반적인 조언만 하고 구체적 주장을 하지 마라.
5. 반드시 아래 JSON 스키마만 출력한다. 코드펜스·설명문 금지.
```
출력 스키마:
```json
{
  "comments": [ { "n": 17, "text": "..." } ],
  "summary": {
    "headline": "40자 이내 한 줄 총평",
    "strengths": ["최대 2개"],
    "weaknesses": ["최대 2개"],
    "tips": ["최대 3개"]
  }
}
```
유저 프롬프트: 대국 메타(규칙, 결과, 총 수, 각 플레이어가 사람/AI 및 난이도), 해설 대상 수의 `facts` 배열, `allowedCoords` 목록(게임에서 실제 둔 좌표 + 모든 `bestAlt` 좌표). **닉네임은 전송하지 않는다**(흑/백으로만 표기).

**응답 검증 (`server/validateReview.js`) — 통과해야 사용:**

| 검증 | 실패 시 |
|---|---|
| JSON 파싱(코드펜스·앞뒤 설명문 제거 후) | 1회 재시도 → 실패 시 전체 템플릿 폴백 |
| 스키마(필드·타입·길이: 해설 ≤ 120자, headline ≤ 40자) | 해당 항목 폐기 |
| `n`이 요청한 대상 수 집합에 속함 | 해당 항목 폐기 |
| 텍스트에 등장하는 좌표(`[A-O](1[0-5]\|[1-9])`)가 `allowedCoords`에 포함 | **해당 코멘트만 폐기** → 템플릿 |
| 사실 모순(예: `class=blunder`인데 "훌륭한 수" 등 긍정 표현) | 해당 코멘트 폐기 → 템플릿 |

**재시도·폴백:** 1차 모델 실패(타임아웃·429·5xx·파싱 불가) → 같은 모델 1회(온도 0.2) → `OPENROUTER_FALLBACK_MODELS` 순차 → 모두 실패 시 **템플릿 해설 + 템플릿 총평**. 각 코멘트에 `source: "llm" | "template"`을 기록하고, 응답 `meta.llmStatus`를 `ok | partial | fallback`으로 표시.

**템플릿 해설 예 (`tags` → 문장):**
`MISSED_BLOCK` → "상대의 4를 막지 못해 흐름을 내줬어요." / `WINNING_MOVE` → "5목을 완성해 대국을 마무리한 결정적인 수예요." / `MADE_FOUR_THREE` → "4와 3을 동시에 만들어 승기를 잡은 수예요." (분류별 기본 문장도 준비)

**비용·안전:** 요청 본문 ≤ 32KB, IP당 분당 10회 제한, 같은 `(gameId, engineVersion, model)`은 **클라이언트 캐시**에서 재사용(재호출 금지), 에러 응답에 상위 서버 원문·키 포함 금지.

### 1.5 서버 API 명세 (P0)

| 메서드 경로 | 설명 |
|---|---|
| `GET /api/health` | `{ ok: true, model: "...", hasKey: true }` (키 값은 절대 반환 금지) |
| `POST /api/review` | 요청: `{ meta, facts[], allowedCoords[] }` → 응답: `{ comments[], summary, meta:{ model, llmStatus, latencyMs } }` |

에러 응답 형식 `{ error: { code, message } }`:

| HTTP | code | 상황 | 클라이언트 동작 |
|---|---|---|---|
| 400 | `INVALID_INPUT` | 스키마/크기 위반 | 오류 안내 |
| 429 | `RATE_LIMIT` | 서버 또는 상위 제한 | "잠시 후 다시" + 템플릿 해설 표시 |
| 500 | `NO_API_KEY` | 키 미설정 | 설정 안내 + 템플릿 해설 |
| 502 | `UPSTREAM_ERROR` | 상위 API 오류 | 템플릿 해설 |
| 504 | `TIMEOUT` | 타임아웃 | 템플릿 해설 |

> LLM 출력 검증 실패(422 상당)는 에러로 올리지 않고 **서버 내부에서 폴백**해 항상 200 + `llmStatus`로 알린다.

### 1.6 클라이언트 연동·최소 UI (P0)

- 결과 모달의 **[AI 복기]** 활성화 → 복기 화면으로 이동.
- **진행 표시:** `1/2 엔진 분석 중 (23/41수)` → `2/2 AI 해설 생성 중…` → 완료. [취소] 가능.
- **간단 결과 화면:**
  - 총평 카드: headline, 강점·약점·팁
  - 수별 표: 수 번호 · 색 · 좌표 · 분류 배지(색+텍스트) · 승률 변화(`48% → 81%`) · 태그 · 해설 · 출처 배지(`AI 해설`/`엔진 해설`)
  - ★ 결정적 수 행 강조
- 실패 UI: 서버 연결 실패 → "엔진 분석만으로 복기합니다" 안내 + 템플릿 해설. [다시 시도] 버튼.
- `services/reviewApi.js`: 요청 타임아웃(35초), 중복 클릭 방지, 결과 캐시(메모리 → Step 3에서 영구화).

### 1.7 `ReviewResult` 스키마 (Step 3로 넘기는 계약, 변경 금지·필드 추가만 허용)

```jsonc
{
  "version": 1,
  "gameId": "g_20261001_a1b2",
  "engine": { "version": "1.0.0", "depth": 3, "wpScale": 20000 },
  "model": "google/gemma-4-26b-a4b-it:free",
  "llmStatus": "ok",                      // ok | partial | fallback
  "moves": [ /* MoveAnalysis + comment{ text, source } */ ],
  "keyMoves": [17, 22, 31],               // 결정적 수 번호
  "stats": {
    "B": { "best": 5, "good": 6, "ok": 3, "mistake": 2, "blunder": 1, "accuracy": 0.65 },
    "W": { "best": 3, "good": 5, "ok": 4, "mistake": 3, "blunder": 2, "accuracy": 0.47 }
  },
  "summary": { "headline": "", "strengths": [], "weaknesses": [], "tips": [] },
  "createdAt": "2026-10-01T09:12:00.000Z"
}
```
`accuracy = (best + good) / 해당 색의 총 수`.

---

## 2. 구현 순서

1. `.env`·서버 골격·`/api/health` → `scripts/api-smoke-test.js` 실행 → **`API_TEST_REPORT.md` 작성, 모델 확정** (여기서 막히면 다음 단계로 가지 않는다)
2. `analyze.js` + Worker + **단위 테스트**(고정 국면에서 분류·태그·결정적 수 기대값)
3. `reviewPrompt.js`·`openrouter.js`·`validateReview.js` + 서버 테스트(모킹된 LLM 응답: 정상/깨진 JSON/환각 좌표/모순 평가)
4. 클라이언트 연동·진행 표시·간단 결과 표
5. 폴백 경로 수동 확인(키 제거, 네트워크 차단, 잘못된 모델)

---

## 3. 수락 기준

| ID | 기준 | 검증 |
|---|---|---|
| AC-2-01 | `.env` 키가 클라이언트 번들·응답·로그 어디에도 노출되지 않는다 | 빌드 산출물 grep + 수동 |
| AC-2-02 | 스모크 테스트 T-1~T-7이 실행되고 `API_TEST_REPORT.md`에 결과·채택 모델이 기록된다 | 문서 |
| AC-2-03 | 5목 완성 수는 항상 `best` + `WINNING_MOVE` | 자동 |
| AC-2-04 | 즉시 승리를 놓친 수는 `blunder` + `MISSED_WIN`, 상대 4 방치는 `MISSED_BLOCK` | 자동(고정 국면) |
| AC-2-05 | 같은 기보를 두 번 분석하면 결과가 **완전히 동일** | 자동 |
| AC-2-06 | `keyMoves`에 최종 승리 수가 항상 포함되고, 개수는 3~6개(짧은 판은 예외 허용) | 자동 |
| AC-2-07 | 60수 기보 분석이 40초 이내, 분석 중 UI가 멈추지 않으며 취소 가능 | 수동+측정 |
| AC-2-08 | LLM 응답에 허용 목록 밖 좌표가 있으면 그 코멘트는 사용되지 않고 템플릿으로 대체된다 | 서버 테스트 |
| AC-2-09 | 깨진 JSON/빈 응답/타임아웃/429/키 없음 모두에서 **복기 화면이 정상 표시**된다(템플릿 해설) | 서버 테스트+수동 |
| AC-2-10 | 모든 해설에 출처 배지(`AI 해설`/`엔진 해설`)가 표시된다 | 수동 |
| AC-2-11 | 한 판의 복기에 LLM 호출은 정상 시 1회, 재시도 포함 최대 3회 | 서버 로그 |
| AC-2-12 | 같은 기보 재복기 시 캐시를 사용해 API를 다시 호출하지 않는다 | 수동 |

## 4. 테스트 시나리오 (구현 후 `메인 애플리케이션을 실행해서 2단계 결과 테스트`)

고정 기보 3개(`tests/fixtures/games/`)로 반복 확인한다.

1. **짧은 승부(약 15수)**: 흑의 4-3으로 끝나는 기보 → ★ 최종 승리 수·상대의 `MISSED_BLOCK` 확인
2. **역전 승부(약 40수)**: 중반에 승률이 뒤집히는 기보 → 전환점 수가 ★에 포함되는지
3. **장기전(약 80수)**: 시간 한도(40초)·진행 표시·캐시 확인
4. **폴백**: `.env` 키를 비우고 재시작 → 템플릿 해설로 복기 완료, 배지 `엔진 해설`
5. **환각 방어**: 서버 테스트에서 일부러 `Z99` 같은 좌표가 담긴 가짜 LLM 응답 → 해당 코멘트만 템플릿으로 대체

## 5. 완료 정의

- [ ] AC-2-01 ~ AC-2-12 통과
- [ ] `docs/API_TEST_REPORT.md` 작성(채택 모델·후보 비교·실패 사례 포함)
- [ ] `npm test` 통과, `/omok-validate analysis`와 `/omok-validate api` ❌ 없음
- [ ] 키 노출 점검 결과를 보고에 포함
- [ ] 작업 요약(구현 / 미구현·알려진 문제 / Step 3 준비 사항) 보고

## 6. 3단계로 넘기는 인터페이스

`ReviewResult`(§1.7), 분류 코드와 `config.CLASS_THRESHOLDS`, 태그 사전, `services/reviewApi.js`, `analyzeWorker` 진행률 이벤트.
