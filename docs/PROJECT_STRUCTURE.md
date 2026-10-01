# Project Structure Guide

Claude Code / Gemini CLI / Cursor로 작업할 때 빠르게 맥락을 잡기 위한 구조 가이드.

## 1) 최상위 디렉토리

- `src/`: 앱 소스 코드
- `docs/`: 요구사항, 검증, 운영 문서
- `public/`: 정적 파일
- `prompts/`: 실험용 프롬프트 자산(필요 시 사용)

## 2) 코드 구조 (`src/`)

- `src/engine/omok.ts`
  - 게임 규칙 단일 소스(15x15, 렌주 금수, 승패, 휴리스틱)
  - **규칙 변경은 여기만 수정**
- `src/ai/openrouter.ts`
  - OpenRouter API 호출/파싱/타임아웃 처리
- `src/ai/prompts.ts`
  - 모델 프롬프트 단일 소스
- `src/ai/review.ts`
  - 분석 JSON 정규화, 엔진 사실 우선 처리
- `src/components/*.tsx`
  - UI 컴포넌트(보드, 복기 패널, API 설정)
- `src/App.tsx`
  - 대국 흐름, 상태 전이, 화면 조합

## 3) 테스트 위치

- `src/engine/omok.test.ts`: 규칙/금수/승패
- `src/ai/review.test.ts`: 분석 정규화
- `src/ai/openrouter.test.ts`: API 파싱/오류/재시도

## 4) 문서 역할 분리

- 요구사항: `docs/PRD_STEP_01.md`~`03.md`
- 검증 체크: `docs/VALIDATE.md`
- 운영 기록: `development_history/YYYYMMDD.md`
- 유지보수 절차: `docs/MAINTENANCE_RUNBOOK.md`
- 세션 체크리스트: `docs/WORKFLOW_CHECKLIST.md`
