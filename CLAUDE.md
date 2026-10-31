# WKBL 스탯 (가제, 2026-10-30 시작)

> Claude Code 가 이 프로젝트에서 작업할 때 매 세션 자동으로 읽는 "프로젝트 기억"이다.
> 세션 시작 시 이 파일과 `SCOPE.md` 를 먼저 읽고, 세션 종료 시 하단 세션 로그에 한 줄 남긴다.
> 형제 프로젝트: `robinside7854/kbl-stats`(KBL 사이트). 화면·계산·규칙은 거기서 옮겨 왔다 — 막히면 그쪽 CLAUDE.md 를 참고한다.

## 이 프로젝트는 무엇인가
- WKBL(여자프로농구) 공홈 기록은 표+숫자뿐이라 읽기 어렵다 → KBL 사이트와 같은 디자인·방향의 팬 대시보드.
- 사용자 결정(2026-10-30): **먼저 만들어 보고, WKBL 승인은 그 뒤에 받는다.** 승인 전에는 검색 노출 막기·외부 홍보 안 하기.
- 단계: 비영리 팬 프로젝트 → (WKBL 승인) → 공개. 영리 전환은 하지 않는다(아래 법적 제약).

## 데이터 소스 (2026-10-30 GitHub Actions 조사 — kbl-stats `docs/wkbl-feasibility-2026-10-30.md`)
WKBL 공홈 `https://www.wkbl.or.kr` 은 JSON 이 아니라 **ASP 가 그린 HTML 조각**을 준다. 표를 정규식으로 읽으므로(`scripts/parse.ts`) 공홈 화면이 바뀌면 깨질 수 있다 — 머리글 순서를 확인해 다르면 멈춘다.
- **작업 환경(Claude 클라우드)은 wkbl.or.kr 이 막혀 있다** → 수집은 GitHub Actions(`fetch.yml`)에서만. 이 세션에서 공홈을 직접 열 수 없다
- 시즌 목록·달 목록: `GET /game/sch/schedule1.asp?gun=1&season_gu={시즌}&viewType=1` 의 선택 상자
- 월별 일정·결과: `GET /game/sch/inc_list_1_new.asp?season_gu=&ym=YYYYMM&viewType=1&gun=1` — 줄마다 `<tr id="YYYYMMDD">`, 팀 코드는 로고 파일 이름(`teamlogo_XX`), 경기 번호는 "경기기록" 링크 `game_no`
  - ⚠️ 두 팀 칸의 class 는 away/home 이지만 **먼저 나오는 팀이 홈**(경기장이 그 팀 체육관 — 표본 6경기 + 박스스코어의 `home team11` 로 확인)
  - ⚠️ **올스타전(game_type 10)이 같은 달 일정에 경기 번호 1로 끼어 있다** → parseSchedule 이 정규리그(01)만 돌려준다
- 경기 박스스코어: `POST /game/ajax/ajax_game_result_2.asp` (season_gu, game_type=01, game_no, ym=) — **2003 여름리그(시즌 013)부터**. 열: 선수(링크 pno)·POS·MIN·2PM-A·3PM-A·FTM-A·OFF·DEF·TOT·AST·PF·ST·TO·BS·PTS + 팀합계. 먼저 나오는 팀이 홈
  - 2024-25·2025-26 전 경기에서 선수 득점 합 = 일정 점수 (2026-10-30 가공 경고 0건)
- 시즌 코드: 013(2003 여름) … 046 = 2025-26, 047 = 2026-27. 2007-08 전에는 여름·겨울 리그가 따로. 퓨처스리그(2군)는 뺀다. 팀 6개, 정규리그 팀당 30경기
- 시즌 전체 선수 기록 API 는 없다(부문별 상위 약 30명뿐) → **박스스코어를 더해서 시즌 합계를 만든다**. 2차 지표(TS%·EFF)도 우리가 계산
- **선수 프로필**(2026-10-31): `GET /player/detail.asp?player_group=12&tcode=&pno=`(현역), 없으면 `/player/detail2.asp?player_group=11&…`(은퇴) — 프로필 상자(현역 `profile_view`, 은퇴 `profile_view01 retired`)의 등번호("No.23")·팀 표기·포지션·신장·생년월일·출신학교·드래프트 한 줄("2008 WKBL 신입선수 선발회 / 1라운드 / 2순위 (전체 2순위) / 금호생명 레드윙스"). ⚠️ 주석 안에 옛 `txt_team` 태그가 있어 주석을 먼저 지우고 읽는다(`parseProfile`). raw `data/raw/profiles/{번호}.html.gz`, 받은 날 `_fetched.json` — 처음 보는 선수만, 지금 시즌 선수는 30일마다(`PROFILE_REFRESH_DAYS`), 대상은 가공본 선수 목록(새 선수는 다음 날)
- 아직 안 쓴 것(2차 범위): 문자중계 `/live11/path_live_sms.asp?season_gu0=&game_type0=01&game_no0=&quarter_gu0=Q4&seq0=0`(2025-26 확인, 옛 시즌 미확인) → 클러치·위닝샷 / 슛 위치 `POST /player/ajax/ajax_shooting.asp`(지난 시즌 미확인) / 개인 최고 기록 `POST /player/ajax/ajax_detail_personal.asp` / 플레이오프(달 선택 "p")
- 선수 번호(pno)는 **팀을 옮겨도 그대로**(2026-10-30 백필 확인: 한 번호로 여러 팀에서 뛴 선수 167명). 같은 이름 다른 번호 22쌍은 다른 사람(예: 김단비 095104 우리은행 / 095226 삼성생명 — 같은 시즌에 함께 뜀). 2003 무렵 번호는 팀 코드로 시작(005xxx), 요즘 095xxx
- 팀 코드: 01 KB · 03 삼성생명 · 05 우리은행 · 07 신한은행(2005겨울~) · 09 하나은행(2020-21~) · 11 BNK(2019-20~) / 옛 팀 02 금호생명 · 04 신세계 · 06 현대 · 08 KDB생명(2010-11~) · 10 OK저축은행(2018-19 한 시즌) — 매각마다 새 코드
- 백필 결과(2026-10-30): 27시즌·약 2,400경기·선수 471명, raw 17MB·processed 5MB. 득점 합 경고 1건(2004겨울 #8 삼성생명 62 ≠ 64 — 공홈 박스스코어 쪽 누락)

## 능력치·등급 (2026-10-31 사용자 "숫자 중심 → 직관적으로", `lib/grades.ts` — 우리 규칙)
- 비교 집단 = 그 시즌 팀 경기의 절반 이상 뛴 선수(진행 중 시즌도 같게, 5명 미만이면 등급 없음). 가공(`process.ts`) 때 계산해 `PlayerSeason.grade`
- 6축 = 공격(경기당 득점·야투 성공) · 슈팅(3점 성공·3점%·자유투% — 성공률은 경기당 시도 1개 이상) · 리바운드(공격·수비) · 리딩(어시스트·어시/턴오버 — 경기당 어시 1 이상) · 수비(스틸·블록) · 효율(TS% — 경기당 야투 3개 이상, 경기당 EFF). 구성 요소 백분위(mid-rank) 평균 → 집단 안 다시 백분위
- 등급: 축 S 90 · A 75 · B 55 · C 35 · D 15, 종합(6축 평균의 백분위) S 95(상위 5%) · A 80 · B 55 · C 30 · D 10. 점수 = 백분위 1~99
- 유형: 5축 이상 70+ 올라운더, 아니면 60 넘는 축 중 가장 높은 축(득점원·슈터·리바운더·플레이메이커·수비수·피니셔), 없으면 롤플레이어. 25-26: 올라운더 5·슈터 14·플레이메이커 12·롤 14 / 60명
- 색: S 금색 · A 팀 색 · B 팀 색 옅게 · C~F 회색 (`gradeStyle`), 백분위 막대 파랑(낮음)–회색–빨강(높음) (`percentileFill`)

## 기술 스택 / 제약
- TypeScript(Node) 하나로 수집·화면. 화면은 **Next.js(App Router) + Tailwind CSS**, 차트는 **Recharts 하나만**, 배포는 Vercel(사용자가 새 프로젝트로 연결 예정)
- 데이터 저장: 레포 안 파일. `data/raw/`(공홈 응답 **그대로 gzip** — 풀면 원본과 같다, 박스스코어 약 2,500개가 저장소를 키우지 않게), `data/processed/`(화면이 읽는 JSON)
- DB·로그인·알림·푸시·숏폼·54-0·하이라이트: KBL 전용이라 처음엔 가져오지 않는다

## 아키텍처 원칙 (kbl-stats 원칙 1~6 그대로)
1. **수집과 화면 분리** — `scripts/` 만 공홈 주소를 안다(`scripts/config.ts` 한 곳), `app/`·`lib/` 은 `data/processed/*.json` 만 읽는다
2. **원본은 그대로 저장, 가공은 따로** — `data/raw/{시즌}/schedule/{YYYYMM}.html.gz`, `box/{번호}.html.gz`. 가공(`npm run process`)은 매번 processed 를 지우고 처음부터 다시 만든다
3. **공홈 호출은 서버 쪽(Actions)에서만**
4. **하루 1회** — 끝난 경기의 박스스코어는 다시 받지 않는다(최근 3일 경기만 다시). 시즌 목록·일정은 매번
5. **지표 계산은 `lib/metrics.ts` 한 곳** (순위는 `lib/leaders.ts`, 팀 순위 `lib/standings.ts`, 능력치 6축·등급 `lib/grades.ts`) — 식과 출처 주석 필수
6. **출처 표기** — 모든 화면 하단 "기록 출처: WKBL 공식 홈페이지 · 비영리 팬 프로젝트" (`SourceFooter`)

## 법적 제약 (2026-10-30 조사)
- **WKBL robots.txt 는 `Disallow: /`(모든 자동 수집 거부)** — KBL 과 가장 큰 차이. 그래서: 요청 간격 1.5초 이상(`REQUEST_GAP_MS`), 하루 1회, 이미 받은 것은 다시 받지 않기, User-Agent 에 비영리 팬 프로젝트임을 밝힌다
- **공식 사진·팀 로고 쓰지 않는다** — 공홈 모든 화면 하단: 구단 로고·선수 사진 무단 사용 시 상표법·저작권법 위반. 팀 색 + 글자(`TeamBadge`), 선수 이니셜 원(`PlayerAvatar`)만. 팀 색은 우리가 고른 대략의 색(`data/codes/teams.json`)
- 이용약관: 영리 목적 복제·배포 금지 + "게시물이 다른 사이트에서 사용 또는 인용되는 것은 금지". → 광고·유료화 절대 금지
- **승인 전 검색 노출 막기**: `data/codes/site.json indexable: false` → robots.txt `Disallow: /`, 모든 페이지 noindex 메타 + `X-Robots-Tag` 헤더. 승인을 받으면 `true` 로 (사용자 확인 후)
- 사용자가 할 일: WKBL 홈페이지 CONTACT US 로 비영리 사용 승인 요청

## 수집 실행 (GitHub Actions `fetch.yml`)
- 매일 23:40 KST 예약 — **GitHub 예약은 main 브랜치에 있는 파일만 돈다**
- Claude 세션은 Run workflow 버튼을 못 누르므로: `data/fetch-request.txt` 첫 줄을 바꿔 푸시하면 그 브랜치에서 돈다(비움 = 지금 시즌, `all` = 전체 백필, `046 045` = 고른 시즌)
- 백필은 시즌마다 받은 즉시 커밋·푸시(끊겨도 이어서) → 마지막에 가공 커밋. 결과는 Actions 로그와 `data/raw/fetch-log.json`
- 첫 백필: 2026-10-30 `claude/dreamy-planck-ktpksu` 브랜치에서 완료(27시즌, 약 1시간). 그 뒤 `data/fetch-request.txt` 는 비워 둠(푸시하면 지금 시즌만)

## 폴더 구조
```
scripts/  config.ts(공홈 주소·raw 위치·요청 간격) http.ts(간격 지키는 요청·gzip 저장) parse.ts(HTML 읽기) fetch.ts(수집) process.ts(가공) build-search-index.ts(prebuild)
lib/      types.ts metrics.ts leaders.ts standings.ts games.ts teams.ts format.ts glossary.ts data.ts(화면용 읽기, server-only) analytics.ts
app/      page.tsx(홈) players/ player/[no]/ records/(통산) season/[code]/{leaders,standings,schedule}/ glossary/ robots.ts
app/components/  2026-10-31 그림 중심: PlayerHero(팀 색 띠·유니폼 등번호·프로필)·PlayerCard(6축 레이더·세부 능력치 막대)·GradeBadge·LeaderCover(리더보드 1~3위)·HomeHero(득점 1위 표지)·StandingsCards·TopGraded / kbl-stats 에서 옮김: RowList·HelpPopover·ChipRow·Segmented·Skeleton·icons·track·Analytics·useMedia·webFont / 새로: SiteNav(줄임)·PageShell·SourceFooter·TeamBadge·PlayerAvatar·GameCard·StandingsTable·LeadersView·PlayersView·SeasonTable·CareerTrend·ScheduleView·PlayerSearch(줄임)
data/codes/  teams.json(팀 색) site.json(indexable·officialSite)
tests/    parse.test.ts(공홈 표본 fixtures — 박스스코어·일정·프로필) metrics.test.ts grades.test.ts
```

## 배포 규칙 (kbl-stats 와 같게 — Vercel 연결 뒤부터)
- **작업이 끝나면 main 에 반영한다**(Vercel 은 main 만 배포 — `vercel.json`). 순서: 작업 브랜치 커밋·푸시 → `npm run typecheck && npm test && npm run build` → `git fetch origin main` → main 에 ff merge → push. Actions 데이터 커밋이 먼저 들어와 있을 수 있으니 merge 전에 반드시 fetch
- Vercel 무료 플랜: 배포 24시간 100회, 저장공간 10GB — `.vercelignore` 가 `data/raw/`·`docs/`·`tests/` 를 뺀다. main 푸시는 요청 단위로 묶는다
- **운영 주소 https://wkbl-stats.vercel.app** (Vercel 프로젝트 wkbl-stats, 2026-10-30 사용자 연결·첫 main 반영). 프로젝트가 README 만 있을 때 만들어져 프레임워크가 비어 있었다 → `vercel.json framework: nextjs` 로 고정

## 방문 통계 규칙 (kbl-stats 와 같게)
- GA4 는 **새 측정 ID**(KBL 것과 섞지 않는다). Vercel 환경변수 `NEXT_PUBLIC_GA_ID` + 운영 배포일 때만 켜진다(`lib/analytics.ts`). 아직 ID 없음 → 꺼짐
- **새 메뉴·화면·기능은 GA4 이벤트를 먼저 정하고 같은 커밋에** (`app/components/track.ts` `trackEvent`·`trackFilters`). 매개변수는 개인을 알아볼 수 없는 값만(검색어·이름 입력 원문 금지)
- 지금 이벤트

  | 이벤트 | 매개변수 | 언제 |
  |---|---|---|
  | page_view | (GA 자동) | 화면 열기 |
  | nav_click | menu, place(top/bottom) | 상단·하단 메뉴 |
  | filter_change | screen, filter, value | 시즌 선택(season) · 리더보드 category·mode·position(screen=leaders/records) · 기록 탭(screen=records filter=tab) · 선수 탭 scope·position·team · 일정 team · 선수 추이 trend_metric |
  | filter_reset | screen | 선수 탭 필터 초기화 |
  | help_open | topic | ⓘ 도움말 |
  | search_select | player_no, mode(go) | 상단 검색에서 선수 고르기 |
  | filter_change (선수 카드) | screen=player filter=card_season value=시즌 코드 | 선수 상세 시즌 능력치 카드의 시즌 칩 (2026-10-31) |

## 업데이트 소식 규칙
- KBL 사이트의 업데이트 게시판(`lib/updates.ts`)은 아직 옮기지 않았다 — 공개(승인) 전에는 쓰지 않는다. 공개할 때 게시판을 옮기고 그때부터 "화면 기능을 바꾸면 같은 커밋에 글 하나" 규칙을 따른다

## 코딩 규칙 (kbl-stats 와 같게)
- 파일·변수 이름은 영어, 주석·커밋 메시지는 한국어. 공홈 표 머리글(2PM-A 등)은 `scripts/parse.ts` 에서 한 번만 우리 이름으로
- 수집은 실패한 시즌·경기를 건너뛰고 계속, 마지막에 실패 목록 출력
- 화면은 모바일 우선. 새 화면은 `SCOPE.md` IN 목록 확인 — 없으면 사용자에게 묻는다
- 새 지표는 계산식·출처 주석 필수, 화면에는 "우리 계산" + ⓘ
- 디자인 토큰은 kbl-stats 그대로(`app/globals.css`): Pretendard 하나, 글자 `text-h1/h2/body/sub/caption`, 반경 `rounded-container/card/control`, 표면 `surface-card`, 색은 토큰 + 팀 색 + `--series-1` 만, 누르는 것 40px 이상, 바로 가기 링크 `link-shortcut` + `IconChevronRight`, 설명은 ⓘ(HelpPopover)에만

## 보안 설정
- 보안 헤더는 `next.config.mjs` 한 곳(운영 빌드만 CSP). 새 외부 출처를 쓰면 CSP 에 더한다. Actions `uses:` 는 SHA 고정. 비밀 값은 GitHub Secrets 에만. `npm audit` 0 유지(2026-10-30 Next 15.5.28)

## 하지 말 것
- 화면에서 공홈 호출 · raw 직접 수정 · 시즌/팀 코드 하드코딩(코드표·일정에서 읽는다) · 공식 사진·로고 · 간격 없는 반복 요청 · 차트 라이브러리 추가 · 승인 전 검색 노출·외부 홍보

## 후속 할 일
- 2차: 문자중계 옛 시즌 범위 → 클러치·위닝샷(kbl-stats `lib/clutch` 규칙), 슛 좌표 지난 시즌 → 슛 차트, 플레이오프
- GA4 새 측정 ID(원하면) → Vercel 환경변수 `NEXT_PUBLIC_GA_ID`

## 세션 로그
- 2026-10-30: 시작. kbl-stats 틀(디자인 토큰·공통 컴포넌트) 옮김, 수집(일정·박스스코어 raw gzip)·가공·Actions 백필, 화면 1차(홈·선수·선수 상세·기록 시즌별/통산·팀 순위·일정·용어). 올스타전이 일정에 경기 번호 1로 끼는 것 발견 → 정규리그만. 전 시즌 백필(경고 1건 — 공홈 쪽), 선수 번호는 이적해도 그대로 확인, 옛 팀 색 추가
- 2026-10-30 (main 첫 반영): 사용자 요청으로 main 에 ff 반영 → Vercel 운영 배포 성공(https://wkbl-stats.vercel.app, 선수 471쪽·시즌 27개). site.json siteUrl·vercel.json framework 고정. 같은 날 수집 워크플로 두 번(run 3·4)이 러너를 못 받고 4초 만에 실패 — 단계가 하나도 안 돌아 코드 문제 아님, GitHub Actions 쪽(결제·한도 등) 확인을 사용자에게 요청
- 2026-10-31: Actions 멈춤 원인 = GitHub 결제(비공개 저장소 무료 시간 소진 — "recent account payments have failed or your spending limit"). kbl-stats 매일 수집도 10-30 저녁부터 같은 이유로 멈춰 있었다. 사용자가 wkbl-stats·kbl-stats 를 **공개 저장소로 전환**(공개 저장소 Actions 는 무료·무제한) → fetch-request 047 로 수집 재확인
- 2026-10-31 (그림 중심 개편): 사용자 "선수 프로필 필수, 숫자 중심 → KBL 처럼 직관적으로". 공홈 선수 상세에서 프로필 수집(현역·은퇴 화면 둘 다), 시즌 능력치 6축·S~F 등급·유형(lib/grades), 화면: 선수 머리말(팀 색 띠 + 사진 대신 유니폼 등번호 + 나이·키·출신교·드래프트) · 시즌 능력치 카드(레이더·세부 능력치 막대) · 리더보드 1~3위 팀 색 카드 · 홈 득점 1위 표지·팀 순위 카드·능력치 상위 · 선수 목록 등급 배지. 사진·로고는 계속 안 씀
