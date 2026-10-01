# 00. 서비스 기획 총괄 (5W1H)

> 서비스명(가칭): **오목 복기 마스터 (Omok Review Master)**
> 한 줄 소개: 난이도(하/중/상)별 AI 또는 친구와 오목을 두고, 대국이 끝나면 AI가 **모든 수를 색으로 채점**해서 **승부처**를 한눈에 짚어 주는 웹 서비스.

---

## 1. 5W1H

| 질문 | 답 |
|---|---|
| **Why** 왜 만드는가? | 오목은 규칙이 단순해 누구나 두지만, "내가 왜 졌는지"는 알기 어렵다. 대국 직후 자동 복기로 학습 효과를 주고, 동시에 **"정확한 엔진 + 설명하는 LLM"** 구조의 AI API 활용 사례를 시연한다. |
| **Who** 누구를 위한가? | ① 오목 입문·중급자(혼자 연습, 지는 이유를 모르는 사람) ② 친구와 한 기기에서 두는 사람 ③ 강의·발표 시연 청중(짧은 시간에 "AI API가 결합된 서비스"를 이해해야 하는 사람) |
| **What** 무엇을 만드는가? | **메인**: 15×15 오목 대국 — AI 대전(하/중/상) + 2인 로컬 대전. **서브**: AI API 기반 복기 — 수별 5단계 색상 분류, 결정적 수(★) 강조, 승률 그래프, 최선 수 표시, AI 해설. 부가: 기보 보관함·프로필·전적. |
| **When** 언제 쓰는가? | 대국 직후(결과 화면의 [AI 복기] 버튼), 그리고 이후 언제든 보관함에서 다시 열람. 한 판 5~15분, 복기 1~3분. |
| **Where** 어디서 쓰는가? | 데스크톱 브라우저 우선(≥1024px), 태블릿·모바일 반응형(≥360px). 로컬 실행(`localhost`)이 기본. 복기 API 호출에는 서버(프록시)가 필요하므로 대국만 정적 배포도 가능하나 복기는 서버 포함 배포 필요. |
| **How** 어떻게 만드는가? | React + Vite(프런트) / 순수 JS 엔진(규칙·AI·분석) / Node + Express 프록시(OpenRouter 키 보호) / OpenRouter 텍스트 모델(해설) / localStorage(보관함). 개발은 **PRD 3단계**를 순서대로 실행하는 바이브 코딩. |

---

## 2. 핵심 설계 결정 (왜 이렇게 나눴는가)

1. **대국 상대 AI는 LLM이 아니라 로컬 엔진이다.**
   LLM은 격자 좌표·보드 상태 추적에서 환각(이미 돌이 있는 칸에 두기, 존재하지 않는 좌표)이 잦고, 수마다 호출하면 느리고 무료 모델은 요청 제한이 있다. 난이도 조절도 엔진 파라미터가 훨씬 정확하다.
2. **복기는 "엔진이 판정, LLM이 설명" 하이브리드다.**
   수의 좋고 나쁨(색상 분류, 결정적 수)은 **재현 가능한 엔진 계산**으로 결정하고, LLM은 그 사실(JSON)을 받아 **사람이 읽기 좋은 해설과 총평**만 쓴다. LLM이 직접 "이 수가 패착"이라고 판정하게 하지 않는다.
3. **LLM이 실패해도 복기는 동작한다.**
   타임아웃·429·잘못된 JSON·검증 실패 시 엔진 태그 기반 **템플릿 해설**로 자동 대체하고, UI에 출처 배지("AI 해설" / "엔진 해설")를 표시한다.
4. **API 키는 서버에만 둔다.** 브라우저 코드·저장소·로그에 노출 금지(`.env`).
5. **기본 규칙은 자유룰, 렌주룰은 옵션이다.** 기본 오목 규칙을 먼저 완성하고, 금수(3-3·4-4·장목)는 옵션 토글로 제공한다(Step 1 우선순위 P2).

---

## 3. 단계 로드맵

| 단계 | 문서 | 목표 | AI API | 단계 종료 시 시연 가능한 것 |
|---|---|---|---|---|
| **1** | `PRD_STEP_01.md` | 코어 오목 + 난이도별 대국 | 사용 안 함 | 하/중/상 AI와 대국, 2인 대국, 승패 판정, 기보 기록 |
| **2** | `PRD_STEP_02.md` | OpenRouter 연동 + 수별 분석 + AI 해설 | **사용** | 대국 → [AI 복기] → 수별 분류·결정적 수·해설이 담긴 결과(간단 표) |
| **3** | `PRD_STEP_03.md` | 색상 복기 뷰어 + 보관함/프로필 + 안정화 | 사용(Step 2 재사용) | 색상 타임라인·승률 그래프·최선 수 표시, 기보 저장·전적, 데모 모드 |

> 강의 매핑: 1강 퀴즈게임 PRD(핵심 시스템 → … → 점수/순위) · 2강 냉장고 앱 PRD(이미지 인식 → 레시피 생성 → 프로필 저장)와 같은 **"3단계 점진 구현"** 형식을 그대로 따른다.

---

## 4. 데이터 흐름

```
[대국 UI] ──GameRecord──▶ [analyzeWorker: 엔진 분석]
                              │ 수별 사실(분류·승률·태그·최선수)
                              ▼
                    [POST /api/review] ──▶ [OpenRouter LLM]
                              │              (해설·총평 JSON)
                              ▼ (실패 시 템플릿 해설로 대체)
                  [ReviewResult 생성·검증]
                              ▼
        [복기 뷰어: 색상 타임라인 / 승률 그래프 / 보드 / 상세 패널]
                              ▼
                  [localStorage: 기보 보관함·전적]
```

---

## 5. 디렉터리 구조 (초안)

```
omok-review-master/
├─ CLAUDE.md                     # 프로젝트 메모리(규칙·가이드라인·명령어)
├─ README.md                     # (Step 3에서 작성) 실행법·시연 가이드
├─ .env                          # OPENROUTER_API_KEY 등 (git 제외)
├─ .env.example
├─ .gitignore
├─ package.json
├─ vite.config.js               # /api → localhost:8787 프록시
├─ index.html
├─ .claude/
│  └─ commands/
│     ├─ omok-validate.md        # /omok-validate 로직 교차 검증
│     └─ run-step.md             # /run-step 1|2|3 PRD 단계 실행
├─ docs/
│  ├─ 00_PLANNING_5W1H.md
│  ├─ GAME_RULES.md
│  ├─ PRD_STEP_01.md
│  ├─ PRD_STEP_02.md
│  ├─ PRD_STEP_03.md
│  ├─ VALIDATION_GUIDELINES.md
│  ├─ PROMPTS.md
│  └─ API_TEST_REPORT.md         # (Step 2에서 생성) 모델 테스트 결과
├─ server/
│  ├─ index.js                   # Express: /api/health, /api/review
│  ├─ openrouter.js              # fetch 래퍼(타임아웃·재시도·폴백 모델)
│  ├─ reviewPrompt.js            # 시스템/유저 프롬프트 빌더
│  └─ validateReview.js          # LLM 응답 스키마·좌표 환각 검증
├─ src/
│  ├─ main.jsx
│  ├─ App.jsx
│  ├─ engine/                    # 순수 로직 (DOM/React 의존 금지)
│  │  ├─ board.js                # 보드·좌표 유틸(toLabel/fromLabel)·착수
│  │  ├─ rules.js                # 승리·무승부 판정, (옵션) 렌주 금수
│  │  ├─ patterns.js             # 라인 패턴 분석(열린3·4 등)
│  │  ├─ evaluate.js             # 평가함수 + 승률 변환
│  │  ├─ search.js               # alpha-beta 탐색
│  │  ├─ ai.js                   # 난이도별 수 선택(easy/normal/hard)
│  │  └─ analyze.js              # 복기 분석(분류·결정적 수·태그)
│  ├─ workers/
│  │  ├─ aiWorker.js
│  │  └─ analyzeWorker.js
│  ├─ components/
│  │  ├─ Board.jsx  Stone.jsx  ModeSelect.jsx  GameHud.jsx  ResultModal.jsx
│  │  └─ review/
│  │     ├─ ReviewBoard.jsx  MoveTimeline.jsx  WinRateChart.jsx
│  │     ├─ MoveDetailPanel.jsx  FilterBar.jsx  Legend.jsx  SummaryCard.jsx
│  ├─ pages/                     # Home / Game / Review / Library
│  ├─ services/                  # reviewApi.js, storage.js
│  ├─ constants/                 # config.js(난이도·임계값), colors.js
│  └─ styles/                    # tokens.css, global.css
├─ public/
│  └─ demo-games/                # (Step 3) 시연용 기보 + 사전 계산된 복기 결과
├─ tests/
│  ├─ rules.test.js  patterns.test.js  ai.test.js
│  ├─ analyze.test.js  review.server.test.js
│  └─ fixtures/                  # 고정 기보·국면 JSON
└─ scripts/
   ├─ selfplay.js                # AI vs AI 난이도 검증
   └─ api-smoke-test.js          # OpenRouter 연결·응답 테스트
```

---

## 6. 용어

| 용어 | 뜻 |
|---|---|
| 수(move) | 한 번의 착수. 1부터 번호를 매긴다. 흑이 홀수 수, 백이 짝수 수. |
| 기보(GameRecord) | 대국의 모든 수와 결과를 담은 JSON. |
| 복기(Review) | 기보를 되짚어 수별로 평가하는 것. 결과 데이터는 `ReviewResult`. |
| 승률(wp) | 엔진 평가값을 0~1로 변환한 **흑 기준** 승리 가능성. 그래프의 y값. |
| 결정적 수(★) | 승률 변화가 크거나 승패에 직결된 수(최종 승리 수, 놓친 승리 등). |
| 분류(class) | 수별 5단계 평가: 최선 / 좋음 / 보통 / 실착 / 패착. |
