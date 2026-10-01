# CLAUDE.md — AI Omok Master (렌주룰 + OpenRouter 복기)

시연용 React 웹앱. **서버 없음.** 규칙은 `src/engine/omok.ts` 한 곳, AI는 브라우저에서 OpenRouter를 직접 호출한다.

기획서: `docs/PRD_STEP_01.md` ~ `docs/PRD_STEP_03.md`  
검증: `docs/VALIDATE.md`  
운영/유지보수: `docs/PROJECT_STRUCTURE.md`, `docs/MAINTENANCE_RUNBOOK.md`, `docs/WORKFLOW_CHECKLIST.md`

## 구조
- `src/engine/omok.ts` 유일한 규칙 구현 (15×15, 렌주 금수, 승패, 휴리스틱)
- `src/ai/openrouter.ts` Chat Completions + JSON 추출
- `src/ai/prompts.ts` 프롬프트 단일 출처
- `src/ai/review.ts` 분석 JSON 검증·엔진 우선 정규화
- `src/components/Board.tsx` 캔버스 보드 · `ReviewPanel.tsx` 복기 · `ApiSettings.tsx` 키
- `src/App.tsx` 대국 흐름
- `src/**/*.test.ts` Vitest

## 명령어
`npm install` → `npm test` → `npm run dev` (http://localhost:5173)

OpenRouter 키는 UI에 입력한다. 키는 `localStorage`에만 저장한다. **커밋·로그·번들에 넣지 말 것.** Vite `VITE_*` 로 키를 넣지 않는다(빌드에 포함됨).

기본 모델: `openrouter/free` (무료 모델 라우터). 품질이 들쭉날쭉하면 특정 `:free` 모델로 바꿔 테스트한다.

## 규칙
- 규칙 로직은 engine에만. UI/AI 레이어에 승패·금수를 다시 구현하지 않는다.
- AI 응답은 JSON 검증 후 사용. 실패·타임아웃·불법 수는 휴리스틱 폴백.
- AI 코멘트가 엔진 판정(승패, 좌표 범위, 점유 칸)과 모순되면 엔진 값을 쓴다.
- 작업은 PRD 1→2→3 순서. 단계마다 `npm test` 후 다음 단계.
- 개발 히스토리는 루트 `development_history/` 폴더에 `YYYYMMDD.md` 파일로 관리하고, 작업 세션마다 `+ 추가` / `- 제거` 항목을 누적 업데이트한다.

## 오목 로직 교차 검증 가이드라인
1. 판정이 하나뿐인가? 흑만 금수 / 흑 정확히 5목 승 / 백 5목 이상 승 / 판이 가득 차면 무승부.
2. "최적의 수"에 기준이 있는가? 즉시 승리 → 상대 즉시 승리 차단 → 열린 4 → 상대 열린 3·4 차단. 프롬프트에 명시.
3. 범위가 명확한가? 15×15, 좌표 0~14 (x=열, y=행), 중복 착수 금지.
4. 교차 검증했는가? 금수는 교차 삼삼·교차 사사·장목·같은 줄 사사(●.●●●.●)·열린 4≠사사 테스트를 유지한다. 삼삼은 방향당 최대 1회로 세어 열린 3의 양 끝을 사사/삼삼으로 오인하지 않는다. 의심 케이스는 테스트부터 추가한다.
