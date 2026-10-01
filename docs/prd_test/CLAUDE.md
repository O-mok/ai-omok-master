# CLAUDE.md — AI 오목 마스터 (Serverless MVP + OpenRouter 복기)

## 1. 프로젝트 개요 및 핵심 설계
* 본 프로젝트는 서버 없이 브라우저에서 즉시 실행되는 React 기반 오목 웹 애플리케이션입니다[span_0](start_span)[span_0](end_span).
* 규칙 검증 및 코어 대국은 순수 함수 기반의 로컬 엔진(`src/engine/omok.ts`)이 단독 처리합니다[span_1](start_span)[span_1](end_span).
* 대국 종료 후 기보 복기 시에만 OpenRouter API를 클라이언트에서 직접 호출하여 LLM 텍스트 해설을 제공받습니다[span_2](start_span)[span_2](end_span)[span_3](start_span)[span_3](end_span).
* LLM 실패 시(타임아웃, 불법 수, JSON 파싱 오류 등)에도 복기 기능이 멈추지 않도록 엔진 판정 기반의 휴리스틱 폴백(Fallback) 해설을 제공해야 합니다[span_4](start_span)[span_4](end_span)[span_5](start_span)[span_5](end_span).
* OpenRouter API 키는 UI 환경설정을 통해 입력받고 `localStorage`에만 보관하며, 소스 코드나 깃허브(`.env`, `VITE_*` 포함)에 절대 노출하지 않습니다[span_6](start_span)[span_6](end_span)[span_7](start_span)[span_7](end_span).

## 2. 오목 규칙 및 좌표계 기준
* **판 크기:** 15×15 바둑판을 사용하며, 흑돌이 선공합니다[span_8](start_span)[span_8](end_span).
* **승리 조건:** 가로, 세로, 대각선 방향으로 연속 5개 이상의 돌을 놓으면 승리합니다(자유룰 기준 6목도 승리 인정)[span_9](start_span)[span_9](end_span).
* **좌표계:** 내부 로직은 좌상단 원점의 `0-14` 0-index `(x,y)` 좌표를 사용하고, 화면 표시 및 LLM 통신 시에는 `A1` ~ `O15` 라벨을 사용합니다[span_10](start_span)[span_10](end_span).
* **판정 범위:** 승리 및 금수 판정은 방금 착수한 돌을 기준으로 4방향을 스캔하여 결정합니다[span_11](start_span)[span_11](end_span).

## 3. 권장 디렉터리 구조
* `src/engine/`: 순수 로직 (판 렌더링, 룰 검증, 패턴 분석, 휴리스틱 평가). DOM이나 React에 의존하지 않습니다[span_12](start_span)[span_12](end_span).
* `src/ai/`: `openrouter.ts`(API 호출), `prompts.ts`(프롬프트 단일 출처), `review.ts`(JSON 검증 및 엔진 데이터와 병합 정규화)[span_13](start_span)[span_13](end_span).
* `src/components/`: `Board.tsx`(캔버스/그리드 보드), `ReviewPanel.tsx`(복기 해설 패널), `ApiSettings.tsx`(키 입력 및 관리)[span_14](start_span)[span_14](end_span).
* `src/constants/`: `config.js`(난이도, 점수 임계값), `colors.js`(분류 색상 및 기호)[span_15](start_span)[span_15](end_span).

## 4. 로직 교차 검증 및 개발 가이드라인
* **정답 단일화:** 판정 결과는 오직 하나여야 합니다(예: 흑 금수, 흑 승리, 백 승리, 무승부). 엔진 로직에 규칙 해석이 갈리지 않도록 조건을 명확히 합니다[span_16](start_span)[span_16](end_span)[span_17](start_span)[span_17](end_span).
* **최상급 표현 기준 명시:** LLM이나 로컬 AI가 제안하는 "최적의 수", "패착"은 임계값 설정이나 엔진 스캔 깊이 등 명확한 산출 기준을 프롬프트와 코드에 명시해야 합니다[span_18](start_span)[span_18](end_span)[span_19](start_span)[span_19](end_span).
* **좌표 범위 및 중복 검증:** 모든 수는 15×15 범위 내에 있어야 하며, 이미 돌이 놓인 곳에 중복 착수하는 것을 원천 차단해야 합니다[span_20](start_span)[span_20](end_span).
* **LLM 환각 및 모순 방어:** LLM이 반환한 좌표나 승패 판정이 엔진의 물리적 판정(빈 칸 여부, 규칙 등)과 모순될 경우, 반드시 엔진의 값을 우선하여 덮어씌웁니다[span_21](start_span)[span_21](end_span).

## 5. 단계별 작업 순서
* **Step 1 (코어 오목):** `src/engine/` 로직 개발 및 2인 대국/로컬 AI 난이도 대국 구현[span_22](start_span)[span_22](end_span).
* **Step 2 (API 연동):** `src/ai/`를 통해 OpenRouter 연동, 수별 분석 데이터 파싱 및 로컬 검증[span_23](start_span)[span_23](end_span).
* **Step 3 (복기 시각화):** `src/components/`를 통해 바둑판 위에 색상 오버레이 및 결정적 수 하이라이팅, 해설 패널 구성[span_24](start_span)[span_24](end_span).
