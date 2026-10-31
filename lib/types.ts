// 수집(scripts/)과 화면(app/)이 함께 쓰는 데이터 모양.
// WKBL 공홈 HTML 의 표 머리글(2PM-A, OFF 등)은 scripts/parse.ts 에서 한 번만 우리 이름(twoPm, oreb)으로 바꾼다.
// 화면에는 공홈 원본 이름이 나오지 않게 한다 (CLAUDE.md 코딩 규칙).

export type Position = "G" | "F" | "C";

/** 시즌 목록 한 줄 (공홈 일정 화면의 시즌 선택 상자에서) */
export interface SeasonInfo {
  /** 공홈 시즌 코드 3자리 문자열, 예: "046" */
  code: string;
  /** 공홈 표기 그대로, 예: "2025-2026", "2003여름" */
  label: string;
}

/** 경기 일정·결과 한 경기 (월별 일정 HTML 에서) */
export interface ScheduleGame {
  seasonCode: string;
  /** 공홈 경기 번호 (정규리그 안에서 1부터) */
  gameNo: number;
  /** YYYY-MM-DD (한국 날짜) */
  date: string;
  /** HH:MM, 없으면 "" */
  time: string;
  venue: string;
  /** 홈 팀 — 공홈 일정 표에서 왼쪽(먼저 나오는) 팀. 경기장으로 확인함(2026-10-30, docs/data-notes.md) */
  homeCode: string;
  homeName: string;
  awayCode: string;
  awayName: string;
  /** 경기 전이면 null */
  homeScore: number | null;
  awayScore: number | null;
}

/** 박스스코어 선수 한 줄의 숫자 기록 (한 경기 또는 시즌 합계 공통) */
export interface StatLine {
  /** 출전 시간(초) */
  sec: number;
  twoPm: number;
  twoPa: number;
  threePm: number;
  threePa: number;
  ftm: number;
  fta: number;
  oreb: number;
  dreb: number;
  reb: number;
  ast: number;
  pf: number;
  stl: number;
  tov: number;
  blk: number;
  pts: number;
}

/** 박스스코어 선수 한 줄 */
export interface BoxPlayerLine extends StatLine {
  playerNo: string;
  nameKo: string;
  nameEn: string;
  position: Position | null;
}

/** 박스스코어 한 팀 */
export interface BoxTeam {
  /** 공홈 팀 이름 그대로 (h4 제목) */
  teamName: string;
  players: BoxPlayerLine[];
  /** 표 아래 "팀합계" 줄 (팀 리바운드 등이 들어가 선수 합과 다를 수 있다) */
  total: StatLine | null;
}

/** 박스스코어 한 경기 (경기 결과 HTML 에서) — teams[0] 이 홈 */
export interface BoxScore {
  teams: BoxTeam[];
}

// ─── data/processed 모양 ───

/** 한 경기 선수 기록 (가공본, 선수 상세 경기 기록·한 경기 최다에 쓴다) */
export interface GameLogLine extends StatLine {
  gameNo: number;
  date: string;
  teamCode: string;
  oppCode: string;
  home: boolean;
  /** 우리 팀 점수 - 상대 점수 */
  margin: number;
}

/** 선수의 한 시즌 합계 (박스스코어를 더한 것) */
export interface PlayerSeason extends StatLine {
  playerNo: string;
  nameKo: string;
  nameEn: string;
  /** 그 시즌 가장 많이 나온 포지션 */
  position: Position | null;
  /** 마지막 경기 팀 (시즌 중 이적하면 마지막 팀) */
  teamCode: string;
  /** 그 시즌 뛴 팀들 (순서대로) */
  teamCodes: string[];
  games: number;
  /** 한 경기 최다 득점 */
  highPts: number;
  /** 더블더블 경기 수 */
  dd: number;
}

export interface TeamStanding {
  teamCode: string;
  teamName: string;
  games: number;
  wins: number;
  losses: number;
  pct: number;
  /** 1위와의 승차 */
  gamesBehind: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  pointsFor: number;
  pointsAgainst: number;
  /** 최근 5경기, 앞이 가장 최근 ("W" | "L") */
  last5: ("W" | "L")[];
  /** 연승·연패, 예: "3연승" */
  streak: string;
  rank: number;
}

/** data/processed/seasons.json 한 줄 */
export interface SeasonSummary extends SeasonInfo {
  /** 일정에 있는 정규리그 경기 수 */
  scheduled: number;
  /** 끝난 경기 수 */
  played: number;
  /** 박스스코어를 읽은 경기 수 */
  withBox: number;
  /** 뛴 선수 수 */
  players: number;
  /** 마지막 경기 날짜 (없으면 "") */
  lastDate: string;
}

/** data/processed/{시즌}/games.json 한 경기 */
export interface ProcessedGame extends ScheduleGame {
  /** 박스스코어를 읽었으면 true */
  hasBox: boolean;
  /** 양 팀 득점 1위 [홈, 원정] (박스스코어가 있을 때) */
  topScorers?: [TopScorer | null, TopScorer | null];
}

export interface TopScorer {
  playerNo: string;
  nameKo: string;
  pts: number;
  reb: number;
  ast: number;
}

/** data/processed/players.json 한 줄 — 선수 목록·검색·통산 */
export interface PlayerIndexRow {
  playerNo: string;
  nameKo: string;
  nameEn: string;
  position: Position | null;
  /** 마지막 시즌의 팀 */
  teamCode: string;
  firstSeason: string;
  lastSeason: string;
  seasons: number;
  career: StatLine & { games: number };
  /** 공홈 프로필 (아직 안 받았으면 null) */
  profile: PlayerProfile | null;
}

/** data/processed/player/{번호}.json — 선수 상세 */
export interface PlayerDetail {
  playerNo: string;
  nameKo: string;
  nameEn: string;
  position: Position | null;
  seasons: (PlayerSeason & { seasonCode: string })[];
  career: StatLine & { games: number };
  /** 정규리그 한 경기 최다 (부문별 1경기) */
  highs: CareerHigh[];
  /** 마지막 시즌의 경기 기록 */
  recentGames: GameLogLine[];
  recentSeason: string;
  profile: PlayerProfile | null;
}

export interface CareerHigh {
  key: "pts" | "reb" | "ast" | "stl" | "blk" | "threePm";
  value: number;
  seasonCode: string;
  gameNo: number;
  date: string;
  oppCode: string;
}

/** data/codes/teams.json 한 팀 */
export interface TeamCode {
  code: string;
  /** 지금(또는 마지막) 이름 */
  name: string;
  /** 대체 디자인에 쓰는 짧은 글자 (최대 2글자) */
  mark: string;
  primary: string;
  text: string;
  /** 지금 리그에 있는 팀이면 true */
  active: boolean;
}

export interface TeamColor {
  primary: string;
  text: string;
}

/** 선수 프로필 (공홈 선수 상세 화면 — 현역 detail.asp / 은퇴 detail2.asp) */
export interface PlayerProfile {
  /** 등번호 (공홈 "No.23" — 지금 또는 마지막 팀 기준) */
  backNumber: string | null;
  /** 공홈 표기 팀 이름, 예: "우리은행 우리WON" */
  teamLabel: string | null;
  position: Position | null;
  heightCm: number | null;
  /** YYYY-MM-DD */
  birthDate: string | null;
  school: string | null;
  draft: DraftInfo | null;
}

export interface DraftInfo {
  year: number;
  round: number | null;
  pick: number | null;
  /** 전체 순위 */
  overall: number | null;
  /** 뽑은 팀(공홈 표기) */
  team: string | null;
  /** 원문 한 줄 */
  text: string;
}
