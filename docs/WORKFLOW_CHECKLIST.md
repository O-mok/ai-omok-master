# Workflow Checklist (Claude Code Friendly)

## 작업 시작 체크

- [ ] 관련 PRD 단계 문서 확인 (`docs/PRD_STEP_01~03.md`)
- [ ] 영향 범위 식별 (engine / ai / ui)
- [ ] 기존 테스트 파일 위치 확인

## 구현 체크

- [ ] 규칙 로직은 `src/engine/omok.ts`에만 반영
- [ ] AI 프롬프트는 `src/ai/prompts.ts` 단일 수정
- [ ] API 예외/응답 편차는 `src/ai/openrouter.ts`, `src/ai/review.ts`에서 처리
- [ ] UI 텍스트/레이아웃 변경은 컴포넌트 책임 분리 유지

## 검증 체크

- [ ] `npm test`
- [ ] `npm run build`
- [ ] 수동 검증(`docs/VALIDATE.md`) 주요 항목 확인

## 종료 체크

- [ ] `development_history/YYYYMMDD.md` 파일 생성/업데이트
- [ ] 추가/제거 사항을 `+` / `-` 형식으로 기록
- [ ] 문서 링크 누락 여부(`README.md`) 확인
