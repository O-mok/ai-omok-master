# 최소 검증 제품(MVP) AI 오목 웹 서비스 PRD

## 1. 프로젝트 개요
외부 서버 없이 브라우저에서 즉시 실행 가능한 HTML/JS/CSS 단일 페이지 애플리케이션(SPA) 기반의 오목 웹 서비스입니다. 코어 대국은 클라이언트에서 가볍게 처리하고, 대국 종료 후 OpenRouter API를 호출하여 AI 복기 결과를 시각적으로 제공합니다.

## 2. 파일 구조
복잡한 빌드 과정 없이 즉시 시연 가능하도록 3개의 파일로 구성합니다.
* `index.html`: 기본 레이아웃, 오목판 그리드 UI 및 해설 텍스트 패널
* `style.css`: 모노톤 기반의 애플 감성 미니멀 UI, 결정적 수 강조용 CSS 애니메이션(Pulse)
* `app.js`: 오목 코어 로직(상태 관리, 승패 판정), OpenRouter API 통신 및 UI 업데이트

## 3. 핵심 기능 요구사항
### 3.1 코어 게임 엔진 (로컬 처리)
* 15×15 바둑판 그리드 구현 및 클릭 이벤트 매핑
* 자유룰(5목 이상 승리) 적용 (복잡한 렌주룰/금수는 배제하여 코드 경량화)
* 대전 모드: 플레이어 vs 플레이어(로컬 2인) 또는 플레이어 vs 무작위 착수 AI

### 3.2 승패 판정 및 API 호출
* 승패 결정 시 `[{"turn": 1, "color": "B", "pos": "H8"}, ...]` 형태의 기보 배열 생성
* 종료 화면에 'AI 복기 받기' 버튼 노출
* 버튼 클릭 시 기보 배열을 OpenRouter 텍스트 모델 API로 전송

### 3.3 시각화 피드백
* API 응답 완료 시 바둑판 위 기존 돌들에 평가 색상 닷(Dot) 표시 (Good: 녹색, Normal: 회색, Bad: 적색)
* 결정적 패착/승착(criticalTurns) 돌 주변에 CSS 펄스(Pulse) 애니메이션 적용
* 특정 돌 클릭 시 하단 해설 패널에 해당 수에 대한 AI의 짧은 평가 텍스트 노출

## 4. (예시) LM 환각 방지 시스템 프롬프트
API 호출 시 `app.js` 내에 아래의 시스템 프롬프트를 포함시켜 JSON 스키마를 넣을 수도 있습니다.

```text
You are a Gomoku (Omok) expert. Analyze the provided game record.
RULES:
1. ONLY evaluate the exact coordinates provided in the user prompt. DO NOT invent new moves.
2. Return ONLY a valid JSON object matching the schema below. No markdown, no explanations.

JSON SCHEMA:
{
  "evaluations": [
    { "turn": 1, "eval": "Good", "comment": "무난한 포석입니다." },
    { "turn": 2, "eval": "Normal", "comment": "..." },
    { "turn": 15, "eval": "Bad", "comment": "상대의 3-3 공격을 허용한 패착입니다." }
  ],
  "criticalTurns": [15]
}
