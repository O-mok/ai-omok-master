# AI Omok Master

렌주룰 오목 + OpenRouter 복기. React(Vite)만 쓰고 서버는 없다.

## 실행
```bash
npm install
npm test
npm run dev
```

브라우저에서 OpenRouter API 키를 입력한다. 기본 모델은 `openrouter/free`.

키는 localStorage에만 저장된다. 저장소나 `.env`에 넣지 말 것.

## GitHub Pages 배포
1. 저장소 **Settings → Pages → Build and deployment** 에서 **Source = GitHub Actions** 로 설정
2. `main` 또는 `master` 브랜치에 푸시하면 `.github/workflows/deploy-pages.yml` 이 `dist/`를 배포
3. 프로젝트 페이지 경로(`/ai-omok-master/`)에 맞춰 Vite `base`가 빌드 시 자동 설정됨

## 문서
- [CLAUDE.md](./CLAUDE.md)
- [PRD Step 1](./docs/PRD_STEP_01.md)
- [PRD Step 2](./docs/PRD_STEP_02.md)
- [PRD Step 3](./docs/PRD_STEP_03.md)
- [검증](./docs/VALIDATE.md)
- [개발 히스토리 폴더](./development_history/)
- [프로젝트 구조 가이드](./docs/PROJECT_STRUCTURE.md)
- [유지보수 런북](./docs/MAINTENANCE_RUNBOOK.md)
- [작업 체크리스트](./docs/WORKFLOW_CHECKLIST.md)
