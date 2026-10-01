# CLAUDE.md — 오목 복기 마스터 (Omok Review Master)

난이도(하/중/상) AI 또는 친구와 오목을 두고, 대국 후 **AI API로 모든 수를 색으로 채점·해설**해 주는 웹 서비스.
개발은 `docs/PRD_STEP_01~03.md`를 **순서대로** 실행하는 바이브 코딩으로 진행한다.

## 문서 지도 (필요할 때 읽을 것)

| 문서 | 용도 |
|---|---|
| `docs/00_PLANNING_5W1H.md` | 기획 배경, 핵심 설계 결정, 디렉터리 구조 |
| `docs/GAME_RULES.md` | **규칙의 단일 기준**(자유룰/렌주룰, 좌표계, 용어) |
| `docs/PRD_STEP_01.md` | 코어 오목 + 난이도별 대국 (API 없음) |
| `docs/PRD_STEP_02.md` | OpenRouter 연동 + 수별 분석 + AI 해설 |
| `docs/PRD_STEP_03.md` | 색상 복기 뷰어 + 보관함/프로필 + 안정화 |
| `docs/VALIDATION_GUIDELINES.md` | 로직 교차 검증 가이드라인 + 필수 테스트 케이스 |
| `docs/PROMPTS.md` | 단계별 실습 프롬프트 모음 |

## 핵심 설계 결정 (임의로 바꾸지 말 것)

1. **대국 AI = 로컬 엔진**(Web Worker). LLM으로 수를 두지 않는다.
2. **복기 = 엔진이 판정(분류·결정적 수·최선 수), LLM은 설명만.** LLM이 수의 좋고 나쁨을 결정하게 하지 않는다.
3. **LLM 실패 시에도 복기는 동작**한다(템플릿 해설 폴백 + 출처 배지).
4. **API 키는 서버(`server/`)에서만** 사용. 클라이언트·로그·저장소에 노출 금지.
5. **기본 규칙은 자유룰**, 렌주룰(금수)은 옵션(P2).

## 오목 규칙 요약 (상세: `docs/GAME_RULES.md`)

- 15×15, 흑 선공, 번갈아 착수, 한 번 둔 돌은 이동 불가.
- 승리(자유룰): 가로·세로·대각선 **연속 5개 이상**(6목도 승리). 판 가득 차면 무승부(단, 마지막 수가 5목이면 승리).
- 좌표: 내부 `(x,y)` **0-index, 좌상단 원점**. 표시 라벨 `A`~`O` + `1`~`15`(행은 위→아래). `(7,7)=H8`. 수 번호는 1-index(홀수=흑, 짝수=백).
- 좌표 변환은 `engine/board.js`의 `toLabel/fromLabel`만 사용.
- 승리 판정은 **방금 둔 돌 기준 4방향 스캔**.

## 기술 스택

React + Vite(JavaScript, ES Modules) / 순수 JS 엔진(`src/engine/`) / Web Worker / Node + Express 프록시(`server/`) / OpenRouter 텍스트 모델 / localStorage / Vitest.
**차트·UI 라이브러리 추가 금지**(그래프는 SVG 직접 렌더). 새 의존성이 필요하면 먼저 이유를 설명하고 승인받는다.

## 디렉터리 구조

```
server/            Express: /api/health, /api/review (키는 여기서만)
src/engine/        순수 로직: board, rules, patterns, evaluate, search, ai, analyze  (React/DOM 의존 금지)
src/workers/       aiWorker, analyzeWorker
src/components/    UI (components/review/ = 복기 뷰어)
src/constants/     config.js(난이도·점수표·임계값), colors.js(분류 색/기호 단일 출처)
src/services/      reviewApi.js, storage.js
src/styles/        tokens.css, global.css
tests/             *.test.js + fixtures/
scripts/           selfplay.js, api-smoke-test.js
public/demo-games/ 시연용 기보 + 사전 계산된 복기 결과
```

## 명령어

```bash
npm run dev        # 클라이언트(5173) + 서버(8787) 동시 실행
npm run build      # 프로덕션 빌드
npm test           # Vitest 전체
npm run selfplay   # AI vs AI 난이도 검증
node scripts/api-smoke-test.js   # OpenRouter 연결·응답 테스트
```

커스텀 명령어: `/omok-validate [engine|ai|analysis|api|all]` — 검증 가이드라인 점검 · `/run-step [1|2|3]` — PRD 단계 실행·테스트.

## 코딩 규칙

- `src/engine/`은 **순수 함수**, 상태 불변(immutable) 갱신, DOM/React/브라우저 API 사용 금지(테스트 용이성).
- 매직 넘버 금지: 점수표·임계값·가중치·시간 제한은 `src/constants/config.js`에만 둔다.
- 분류 색/기호/라벨은 `src/constants/colors.js`에만 정의하고 컴포넌트는 CSS 변수(`--c-*`)와 이 매핑만 참조한다.
- 무작위 요소는 **대국 AI(하/중)에만** 허용. 분석 엔진은 결정적이어야 한다(같은 입력 → 같은 출력).
- AI/분석 연산은 Web Worker, 메인 스레드를 막지 않는다.
- localStorage·fetch·JSON.parse는 항상 try/catch. 실패해도 앱은 계속 동작한다.
- UI 문구는 한국어, 간결·친근하게. 주석은 한국어로 "왜"를 설명한다.
- 색만으로 의미를 전달하지 않는다(기호+텍스트 병기). 키보드 접근 가능해야 한다.
- 디자인: 미니멀한 모던 UI(애플 감성). 토큰은 `docs/PRD_STEP_01.md §1.8`.

## 작업 방식

- PRD 단계는 **순서대로**. 한 단계의 수락 기준(AC)을 모두 통과하기 전에는 다음 단계로 가지 않는다.
- 구현 순서는 각 PRD의 "구현 순서" 절을 따른다. **테스트를 먼저/함께** 작성한다.
- PRD에 없는 기능을 임의로 추가하지 않는다. 필요하면 제안만 하고 승인받는다.
- 단계가 끝나면 보고: ① 구현한 것 ② 통과한 AC ③ 미구현·알려진 문제 ④ 다음 단계 준비 사항.
- 버그 수정 시 **재현 테스트를 먼저** 추가한다.
- API 연동 코드를 쓰면 **실제 호출 테스트까지 수행하고 결과를 보고**한다(성공 / 타임아웃 / 깨진 JSON / 키 없음).

## 보안

- `.env`는 절대 커밋·출력하지 않는다. 키는 로그에 앞 6자 + `***`만 허용.
- 사용자 입력 문자열(닉네임 등)은 LLM으로 보내지 않는다.
- 모델 ID는 `.env`(`OPENROUTER_MODEL`, `OPENROUTER_FALLBACK_MODELS`)로만 지정한다. 기본값: `google/gemma-4-26b-a4b-it:free`(무료 모델은 요청 제한·변경 가능 → Step 2 스모크 테스트로 확정).
- 본 프로젝트는 **텍스트 모델만** 사용한다(이미지/영상 모델 불필요).

---

## 로직 교차 검증 가이드라인 (모든 기능 작성 시 확인)

> 전체 + 필수 테스트 케이스: `docs/VALIDATION_GUIDELINES.md`

1. **정답이 하나뿐인가?**
   - 규칙 해석이 갈릴 수 있으면 조건 명시(예: 6목 → 자유룰 승리 / 렌주룰 흑 금수). 모든 판정 함수는 `ruleset`을 인자로 받는다.
   - 기준 문서는 `docs/GAME_RULES.md`. 코드와 다르면 코드가 틀린 것.
2. **최상급·평가 표현에 기준이 있는가?**
   - "최선", "패착", "결정적 수", "난이도 상" 등은 측정 기준(엔진 버전·깊이·임계값)을 `config.js`와 문서에 명시한다.
   - "무조건 최선" 같은 단정 표현 금지. "엔진 기준 최선"처럼 쓴다.
3. **시간과 범위가 명확한가?**
   - 좌표계(0-index, 좌상단), 수 번호(1-index), 판 크기(15)를 경계에서 검증한다.
   - 변할 수 있는 정보(모델 ID, 엔진 버전)는 데이터에 기록하고 `.env`/config로 관리한다.
4. **교차 검증했는가?**
   - 의심스러운 결과는 서로 다른 방법 2가지 이상으로 확인(예: 4방향 스캔 vs 브루트포스 판정기, 단위 테스트 vs selfplay).
   - 논란 있는 규칙(렌주 금수 엣지 케이스)은 공식 렌주 규정 기준으로 하고 해석을 테스트 이름에 남긴다.
5. **LLM 출력은 믿지 않고 검증한다.**
   - JSON 파싱 → 스키마 → 허용 좌표 대조 → 사실 모순 검사. 실패 항목은 템플릿으로 대체하고 출처 배지로 알린다.

## 완료 정의 (매 단계 공통)

- [ ] 해당 PRD의 AC 전부 통과 (P2 제외)
- [ ] `npm test` 통과, 콘솔 에러·경고 없음
- [ ] `/omok-validate` 결과 ❌ 0건
- [ ] 단계 보고서 제출
