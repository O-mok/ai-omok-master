# Maintenance Runbook

일상 개발/유지보수 시 바로 따라할 최소 절차.

## 1) 시작 전

1. `CLAUDE.md`와 `docs/VALIDATE.md`를 먼저 확인
2. 변경 범위가 규칙인지(UI/AI인지) 구분
3. 규칙 변경이면 `src/engine/omok.ts` + 관련 테스트부터 수정

## 2) 변경 중

1. 엔진/AI/UI 역할 분리 유지
2. OpenRouter 키는 UI(localStorage)만 사용
3. 모델 응답은 `review.ts` 정규화 경유 후 화면 반영

## 3) 변경 후 필수 검증

```bash
npm test
npm run build
```

수동 점검:

1. normal/hard 대국에서 API 호출 성공/실패 동작
2. 대국 종료 후 분석 패널(슬라이더/수순/코멘트) 노출
3. 좌표/승패/금수 메시지 이상 여부

## 4) 장애 대응 빠른 가이드

- **분석 실패(timeout)**: 모델을 다른 `:free` 모델로 교체 후 재시도
- **평가/코멘트 비정상**: `src/ai/review.ts` 정규화 키 매핑 확인
- **AI 착수 이상**: `src/ai/openrouter.ts` 응답 파싱 및 `g.play()` 유효성 확인

## 5) 작업 기록

작업 종료 시 루트 `development_history/YYYYMMDD.md` 파일에 아래 형식 기록:

- `+ 추가된 부분`
- `- 제거/변경된 부분`
