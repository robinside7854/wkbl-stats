# wkbl-stats

WKBL(여자프로농구) 정규리그 기록을 보기 쉽게 보여 주는 비영리 팬 프로젝트. 형제 프로젝트: [kbl-stats](https://github.com/robinside7854/kbl-stats).

- 기록 출처: WKBL 공식 홈페이지 · 비영리 팬 프로젝트 (선수 사진·팀 로고는 쓰지 않습니다)
- 작업 규칙은 `CLAUDE.md`, 범위는 `SCOPE.md`

```bash
npm install
npm run dev          # 화면 (data/processed 를 읽음)
npm test             # 공홈 표본 읽기·계산 확인
npm run process      # data/raw → data/processed
```

수집(`npm run fetch`)은 GitHub Actions "WKBL 기록 수집"에서만 돈다.
