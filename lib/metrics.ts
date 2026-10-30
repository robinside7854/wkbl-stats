// 지표 계산은 이 파일 한 곳에서 (원칙 5). 화면 컴포넌트 안에서 계산하지 않는다.
// WKBL 공홈은 2차 지표(TS%·eFG% 등)를 주지 않아 박스스코어 합계로 우리가 계산한다 — 식과 출처를 함수마다 적는다.
// 틀은 kbl-stats lib/metrics.ts (perGame·표본 기준·백분위) 를 줄여 옮김.
import type { StatLine } from "./types";

export const STAT_KEYS = [
  "sec",
  "twoPm",
  "twoPa",
  "threePm",
  "threePa",
  "ftm",
  "fta",
  "oreb",
  "dreb",
  "reb",
  "ast",
  "pf",
  "stl",
  "tov",
  "blk",
  "pts",
] as const satisfies readonly (keyof StatLine)[];

export function emptyLine(): StatLine {
  return { sec: 0, twoPm: 0, twoPa: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, reb: 0, ast: 0, pf: 0, stl: 0, tov: 0, blk: 0, pts: 0 };
}

/** a 에 b 를 더한다 (a 를 바꾼다) */
export function addLine(a: StatLine, b: StatLine): StatLine {
  for (const k of STAT_KEYS) a[k] += b[k];
  return a;
}

/** 야투 성공 = 2점 + 3점 */
export const fgm = (s: StatLine) => s.twoPm + s.threePm;
/** 야투 시도 = 2점 + 3점 */
export const fga = (s: StatLine) => s.twoPa + s.threePa;
/** 출전 분 */
export const minutes = (s: StatLine) => s.sec / 60;

/** 성공률(0~1). 시도가 0이면 null */
export function pct(made: number, att: number): number | null {
  return att > 0 ? made / att : null;
}

/** 경기당 값. 경기가 0이면 0 */
export function perGame(total: number, games: number): number {
  return games > 0 ? total / games : 0;
}

/**
 * TS% (True Shooting) = 득점 / (2 × (야투 시도 + 0.44 × 자유투 시도))
 * 출처: Basketball-Reference 용어집. 0.44 는 앤드원·테크니컬 자유투를 감안한 NBA 표준 계수 — WKBL 에 맞춘 값이 아니다.
 */
export function tsPct(s: StatLine): number | null {
  const d = 2 * (fga(s) + 0.44 * s.fta);
  return d > 0 ? s.pts / d : null;
}

/** eFG% = (야투 성공 + 0.5 × 3점 성공) / 야투 시도 (출처: Basketball-Reference) */
export function efgPct(s: StatLine): number | null {
  const a = fga(s);
  return a > 0 ? (fgm(s) + 0.5 * s.threePm) / a : null;
}

/**
 * EFF (효율) = 득점 + 리바 + 어시 + 스틸 + 블록 − 놓친 야투 − 놓친 자유투 − 턴오버
 * 출처: NBA.com 의 EFF. WKBL 공홈 "공헌도"와는 식이 다르다(공홈 식은 공개돼 있지 않음) — 화면에 "우리 계산" 표시.
 */
export function eff(s: StatLine): number {
  return s.pts + s.reb + s.ast + s.stl + s.blk - (fga(s) - fgm(s)) - (s.fta - s.ftm) - s.tov;
}

/** 더블더블: 득점·리바·어시·스틸·블록 중 두 부문 이상 10 이상 */
export function isDoubleDouble(s: StatLine): boolean {
  return [s.pts, s.reb, s.ast, s.stl, s.blk].filter((v) => v >= 10).length >= 2;
}

// ─── 표본 기준 (리더보드) ───

export interface QualifyRule {
  /** 최소 출전 경기 */
  minGames: number;
}

export const NO_QUALIFY: QualifyRule = { minGames: 0 };

/** 끝난 시즌 기본 기준: 팀 경기 수의 절반 이상 출전 (우리 규칙 — kbl-stats 와 같은 생각, WKBL 은 팀당 경기가 적어 비율로) */
export const QUALIFY_SHARE = 0.5;

export function seasonQualify(teamGames: number, ongoing: boolean): QualifyRule {
  // 진행 중 시즌은 기준 없음(출전 선수 전원) — kbl-stats 2026-10-03 사용자 결정과 같게
  if (ongoing || teamGames <= 0) return NO_QUALIFY;
  return { minGames: Math.ceil(teamGames * QUALIFY_SHARE) };
}

/** 성공률 부문의 경기당 최소 시도 (우리 규칙: 시도가 너무 적은 100% 를 막는다) */
export const PCT_MIN_ATTEMPTS_PER_GAME = { fg: 3, three: 1, ft: 1 } as const;

/** 리더보드 숫자 표시: 경기당 소수 1자리, 합계 정수, 성공률 % 소수 1자리 */
export function formatValue(v: number | null, kind: "avg" | "total" | "pct"): string {
  if (v === null || !Number.isFinite(v)) return "-";
  if (kind === "pct") return `${(v * 100).toFixed(1)}`;
  if (kind === "total") return Math.round(v).toLocaleString("ko-KR");
  return v.toFixed(1);
}

/** 출전 시간 "MM:SS" (합계·평균 공통) */
export function formatMinutes(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
