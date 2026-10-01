# PRD Step 2 — OpenRouter 연동 (AI 상대 + 수순 분석)

서버를 두지 않는다. 키가 브라우저에 있으므로 **시연·로컬 전용**. 공개 배포 시에는 프록시를 다시 검토한다.

## 기능
1. API 환경: UI에서 `OPENROUTER` 키와 모델 ID를 입력, `localStorage`에만 저장. 기본 모델 `openrouter/free`.
2. AI 수: `movePrompt(moves, level)` → `{x,y}`. 클라이언트가 `Game.play`로 합법 수인지 검증하고, 아니면 휴리스틱 대체. **easy는 API를 쓰지 않음.**
3. 분석: `analyzePrompt(moves, winner)` → `{summary, moves:[{n, rating, key, comment, best}]}`
   - rating: best / good / mistake / blunder
   - key: 승부처(최대 5개)
   - best: 더 나은 좌표 또는 null (범위·점유 칸이면 폐기)
4. 프롬프트는 `src/ai/prompts.ts` 한 곳. 응답은 JSON만 허용. 파싱 실패는 오류 → 폴백.

## 수용 기준
- [x] 난이도별 AI가 합법 수만 둔다 (불법 수는 play 거절 후 휴리스틱)
- [x] 종료 시 분석 시도, 실패해도 수순 탐색 가능
- [x] 키 없음/타임아웃에서도 대국이 계속된다

## Step 2에서 확인한 것
무료 모델 ID는 자주 사라진다. 고정 ID 대신 `openrouter/free`를 기본값으로 둔다. 사고형 모델은 `content`가 비고 `reasoning`에 답이 올 수 있어 둘 다 읽는다.
