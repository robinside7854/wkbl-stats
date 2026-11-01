// 수집 설정 — WKBL 공홈 주소는 여기에만 둔다 (원칙 1: 화면 코드에는 공홈 주소가 나오지 않는다).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// 테스트는 WKBL_DATA_DIR 로 다른 폴더를 쓴다 (tests/process.test.ts)
export const DATA_DIR = process.env.WKBL_DATA_DIR || join(ROOT, "data");
export const RAW_DIR = join(DATA_DIR, "raw");
export const PROCESSED_DIR = join(DATA_DIR, "processed");

export const WKBL = "https://www.wkbl.or.kr";

/** 일정 화면 — 시즌·달 선택 상자가 들어 있다 (시즌을 비우면 지금 시즌) */
export const schedulePageUrl = (season?: string) =>
  season ? `${WKBL}/game/sch/schedule1.asp?gun=1&season_gu=${season}&viewType=1` : `${WKBL}/game/sch/schedule1.asp?gun=1`;

/** 월별 일정 표 (HTML 조각) */
export const scheduleListUrl = (season: string, ym: string) =>
  `${WKBL}/game/sch/inc_list_1_new.asp?season_gu=${season}&ym=${ym}&viewType=1&gun=1`;

/** 경기 박스스코어 (POST, HTML 조각). game_type 01 = 정규리그 */
export const BOX_URL = `${WKBL}/game/ajax/ajax_game_result_2.asp`;
export const boxBody = (season: string, gameNo: number) => `season_gu=${season}&game_type=01&game_no=${gameNo}&ym=`;

/**
 * 요청 사이 최소 간격(ms). WKBL robots.txt 는 모든 자동 수집을 거부한다(2026-10-30 확인) —
 * 승인 전이라도 서버 부담을 최소로: 1.5초 이상, 하루 1회, 이미 받은 끝난 경기는 다시 받지 않는다.
 */
export const REQUEST_GAP_MS = 1500;

/** 선수 상세 화면 — 현역(player_group 12)은 detail.asp, 은퇴(11)는 detail2.asp. 어느 쪽인지 몰라 현역부터 본다 */
export const profileUrls = (pno: string) => [
  `${WKBL}/player/detail.asp?player_group=12&tcode=&pno=${pno}`,
  `${WKBL}/player/detail2.asp?player_group=11&tcode=&pno=${pno}`,
];

/** 현역 선수 프로필을 다시 받는 간격(일) — 이적·등번호 바뀜을 따라가려고. 은퇴 선수는 한 번만 */
export const PROFILE_REFRESH_DAYS = 30;

/** 박스스코어가 있는 첫 시즌 (2003 여름리그). 이전 시즌은 경기 기록 화면이 비어 있다 */
export const FIRST_BOX_SEASON = "013";

export const USER_AGENT = "wkbl-stats fan project (non-commercial; github.com/robinside7854/wkbl-stats)";

// ─── raw 파일 위치 (data/raw — 받은 응답 그대로, gzip) ───
export const rawPath = {
  seasons: () => join(RAW_DIR, "seasons.html.gz"),
  schedulePage: (season: string) => join(RAW_DIR, season, "schedule-page.html.gz"),
  scheduleMonth: (season: string, ym: string) => join(RAW_DIR, season, "schedule", `${ym}.html.gz`),
  box: (season: string, gameNo: number) => join(RAW_DIR, season, "box", `${String(gameNo).padStart(3, "0")}.html.gz`),
  fetchLog: () => join(RAW_DIR, "fetch-log.json"),
  profile: (pno: string) => join(RAW_DIR, "profiles", `${pno}.html.gz`),
  /** 프로필을 받은 날짜 {선수 번호: "YYYY-MM-DD"} — 파일 시각은 checkout 때 바뀌어 믿을 수 없어서 따로 적는다 */
  profileLog: () => join(RAW_DIR, "profiles", "_fetched.json"),
  /** 역대 수상 화면 3개 (vote 투표 수상 · stats 기록 부문 · best5) */
  award: (name: AwardPage) => join(RAW_DIR, "awards", `${name}.html.gz`),
  /** 수상 화면을 받은 날짜 {화면: "YYYY-MM-DD"} */
  awardLog: () => join(RAW_DIR, "awards", "_fetched.json"),
};

// ─── 역대 수상 (2026-11-01 조사 — 공홈 히스토리 → 역대 부문별 수상자) ───
export type AwardPage = "vote" | "stats" | "best5";
export const AWARD_URLS: Record<AwardPage, string> = {
  vote: `${WKBL}/history/awards_vote.asp`,
  stats: `${WKBL}/history/awards_statistics.asp`,
  best5: `${WKBL}/history/awards.asp`,
};
/** 수상 표는 시즌이 끝날 때만 바뀐다 → 7일에 한 번만 다시 받는다 */
export const AWARD_REFRESH_DAYS = 7;
