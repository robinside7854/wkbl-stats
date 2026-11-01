// 리더보드 규칙 (kbl-stats lib/leaders.ts 와 같은 구조로 맞춤 — 2026-11-01 사용자 "KBL 대시보드와 데이터 보여 주는 방식 싱크").
// 부문 정의 · 단위(경기당/30분당/합계) · 정렬(머리글 누르기, 같은 열 다시 = 반대) · 순위(상위 방향, 동점 같은 순위) ·
// 성공률 시도 기준(경기당 시도 리그 평균 이상 — KBL 과 같은 규칙) · 표기. 값 계산은 lib/metrics 함수만 쓴다.
import { eff, fga, fgm, pct, perGame, tsPct, type QualifyRule } from "./metrics";
import type { Position, StatLine } from "./types";

export type LeaderStatKey =
  | "games"
  | "minutes"
  | "pts"
  | "reb"
  | "oreb"
  | "ast"
  | "stl"
  | "blk"
  | "tov"
  | "pf"
  | "fgPct"
  | "threePm"
  | "threePct"
  | "ftPct"
  | "tsPct"
  | "eff";

/** 경기당 / 30분당(10분 쿼터 × 3 — KBL 과 같은 환산) / 시즌 합계 */
export type StatMode = "perGame" | "per30" | "total";
export type SortDir = "desc" | "asc";

export interface LeaderStatDef {
  key: LeaderStatKey;
  label: string;
  /** 표 열 제목(짧게) */
  short: string;
  /** count: 누적 → 단위 환산 / games: 경기 수 / rate: 비율 — 단위와 관계없음 */
  kind: "count" | "games" | "rate";
  /** high: 클수록 상위 / low: 작을수록 상위 (턴오버·파울) */
  better: "high" | "low";
}

export const LEADER_STATS: Record<LeaderStatKey, LeaderStatDef> = {
  games: { key: "games", label: "경기", short: "경기", kind: "games", better: "high" },
  minutes: { key: "minutes", label: "출전시간", short: "출전", kind: "count", better: "high" },
  pts: { key: "pts", label: "득점", short: "득점", kind: "count", better: "high" },
  reb: { key: "reb", label: "리바운드", short: "리바", kind: "count", better: "high" },
  oreb: { key: "oreb", label: "공격 리바운드", short: "공리", kind: "count", better: "high" },
  ast: { key: "ast", label: "어시스트", short: "어시", kind: "count", better: "high" },
  stl: { key: "stl", label: "스틸", short: "스틸", kind: "count", better: "high" },
  blk: { key: "blk", label: "블록", short: "블록", kind: "count", better: "high" },
  tov: { key: "tov", label: "턴오버", short: "턴오버", kind: "count", better: "low" },
  pf: { key: "pf", label: "파울", short: "파울", kind: "count", better: "low" },
  fgPct: { key: "fgPct", label: "야투율", short: "야투%", kind: "rate", better: "high" },
  threePm: { key: "threePm", label: "3점 성공", short: "3점", kind: "count", better: "high" },
  threePct: { key: "threePct", label: "3점 성공률", short: "3점%", kind: "rate", better: "high" },
  ftPct: { key: "ftPct", label: "자유투 성공률", short: "자유투%", kind: "rate", better: "high" },
  tsPct: { key: "tsPct", label: "TS%", short: "TS%", kind: "rate", better: "high" },
  // EFF: WKBL 공홈 "공헌도"와 식이 다르다(우리 계산, lib/metrics eff)
  eff: { key: "eff", label: "EFF", short: "EFF", kind: "count", better: "high" },
};

/** 부문 칩 첫 줄 (KBL PRIMARY_CATEGORIES 와 같은 여섯) */
export const PRIMARY_CATEGORIES: readonly LeaderStatKey[] = ["pts", "reb", "ast", "stl", "blk", "threePm"];

/** "다른 부문" 묶음 */
export const SECONDARY_GROUPS: readonly { key: string; label: string; categories: LeaderStatKey[] }[] = [
  { key: "shooting", label: "슈팅", categories: ["fgPct", "threePct", "ftPct", "tsPct"] },
  { key: "etc", label: "그 밖에", categories: ["eff", "oreb", "minutes"] },
];

export const CATEGORIES: readonly LeaderStatKey[] = [...PRIMARY_CATEGORIES, ...SECONDARY_GROUPS.flatMap((g) => g.categories)];
export const DEFAULT_CATEGORY: LeaderStatKey = "pts";

/** 표 열 순서 (KBL TABLE_COLUMNS 와 같은 순서 — USG%·PER 는 WKBL 에 없다) */
export const TABLE_COLUMNS: readonly LeaderStatKey[] = ["games", "minutes", "pts", "reb", "ast", "stl", "blk", "tov", "pf", "fgPct", "threePm", "threePct", "ftPct", "tsPct", "eff"];

export function defaultSortDir(key: LeaderStatKey): SortDir {
  return LEADER_STATS[key].better === "low" ? "asc" : "desc";
}

/** 리더보드 한 줄 재료 (시즌 합계 또는 통산 합계) */
export interface LeaderPlayer extends StatLine {
  id: string;
  nameKo: string;
  teamCode: string;
  teamName: string;
  position: Position | null;
  games: number;
}

/** 단위 환산 전 값. 성공률은 0~100(%) */
export function rawValue(p: LeaderPlayer, key: LeaderStatKey): number {
  const r = (v: number | null) => (v === null ? NaN : v * 100);
  switch (key) {
    case "games":
      return p.games;
    case "minutes":
      return p.sec / 60;
    case "fgPct":
      return r(pct(fgm(p), fga(p)));
    case "threePct":
      return r(pct(p.threePm, p.threePa));
    case "ftPct":
      return r(pct(p.ftm, p.fta));
    case "tsPct":
      return r(tsPct(p));
    case "eff":
      return eff(p);
    default:
      return p[key];
  }
}

/** 30분당 = 시즌 누적 ÷ 출전 분 × 30 (kbl-stats lib/metrics per30 과 같은 식) */
export const PER_MINUTES_BASE = 30;

/** 표시·정렬 값. count 는 단위대로 환산, 출전시간의 30분당은 의미가 없어 경기당 */
export function statValue(p: LeaderPlayer, key: LeaderStatKey, mode: StatMode): number {
  const v = rawValue(p, key);
  if (LEADER_STATS[key].kind !== "count") return v;
  if (mode === "perGame" || (mode === "per30" && key === "minutes")) return perGame(v, p.games);
  if (mode === "per30") return p.sec > 0 ? (v / (p.sec / 60)) * PER_MINUTES_BASE : NaN;
  return v;
}

export const isModeIndependent = (key: LeaderStatKey) => LEADER_STATS[key].kind !== "count";

// ─── 성공률 시도 기준 (경기당 시도 리그 평균 이상 — kbl-stats attemptThresholds 와 같은 규칙) ───

export interface AttemptThresholds {
  fga: number;
  threePa: number;
  fta: number;
}

/** 표본 기준을 넘은 선수들의 경기당 시도 평균 (합계 ÷ 경기 합). 우리 규칙 */
export function attemptThresholds(players: readonly LeaderPlayer[], rule: QualifyRule): AttemptThresholds {
  const pool = players.filter((p) => p.games >= rule.minGames && p.games > 0);
  const g = pool.reduce((s, p) => s + p.games, 0);
  if (g === 0) return { fga: 0, threePa: 0, fta: 0 };
  return {
    fga: pool.reduce((s, p) => s + fga(p), 0) / g,
    threePa: pool.reduce((s, p) => s + p.threePa, 0) / g,
    fta: pool.reduce((s, p) => s + p.fta, 0) / g,
  };
}

/** 성공률 지표는 경기당 시도가 기준 이상일 때만 순위 */
export function isRankEligible(p: LeaderPlayer, key: LeaderStatKey, t?: AttemptThresholds): boolean {
  if (!t || p.games === 0) return true;
  const per = (v: number) => v / p.games;
  if (key === "fgPct" || key === "tsPct") return per(fga(p)) >= t.fga;
  if (key === "threePct") return per(p.threePa) >= t.threePa;
  if (key === "ftPct") return per(p.fta) >= t.fta;
  return true;
}

/** 성공/시도 (성공률 열 아래 작은 글자) */
export function madeAttempts(p: LeaderPlayer, key: LeaderStatKey): { made: number; att: number } | null {
  if (key === "fgPct") return { made: fgm(p), att: fga(p) };
  if (key === "threePct") return { made: p.threePm, att: p.threePa };
  if (key === "ftPct") return { made: p.ftm, att: p.fta };
  return null;
}

export const attemptName = (key: LeaderStatKey): string | null =>
  key === "fgPct" || key === "tsPct" ? "야투" : key === "threePct" ? "3점" : key === "ftPct" ? "자유투" : null;

// ─── 필터·정렬·순위 ───

export type PositionFilter = "all" | Position;

export interface LeaderFilter {
  position: PositionFilter;
  teamCode: string | null;
  rule: QualifyRule;
}

export function filterLeaders<T extends LeaderPlayer>(players: readonly T[], f: LeaderFilter): T[] {
  return players.filter(
    (p) => (f.position === "all" || p.position === f.position) && (f.teamCode === null || p.teamCode === f.teamCode) && p.games >= f.rule.minGames,
  );
}

/**
 * 정렬 (새 배열). 동점이면 경기 수 → 한글 이름 → 번호. 값이 없으면(NaN) 방향과 관계없이 맨 뒤.
 * t 를 주면 성공률 지표의 시도 기준 미달은 기준을 넘은 선수 뒤로.
 */
export function sortLeaders<T extends LeaderPlayer>(players: readonly T[], key: LeaderStatKey, dir: SortDir, mode: StatMode, t?: AttemptThresholds): T[] {
  const sign = dir === "desc" ? -1 : 1;
  return players
    .map((p) => ({ p, v: statValue(p, key, mode), ok: isRankEligible(p, key, t) }))
    .sort((a, b) => {
      if (a.ok !== b.ok) return a.ok ? -1 : 1;
      const af = Number.isFinite(a.v);
      const bf = Number.isFinite(b.v);
      if (af !== bf) return af ? -1 : 1;
      if (af && a.v !== b.v) return sign * (a.v - b.v);
      return b.p.games - a.p.games || a.p.nameKo.localeCompare(b.p.nameKo, "ko") || a.p.id.localeCompare(b.p.id);
    })
    .map((x) => x.p);
}

/** 그 부문 순위 ("상위" 방향이 1위, 동점 같은 순위: 1,2,2,4). 시도 기준 미달·값 없음은 순위 없음 */
export function rankMap(players: readonly LeaderPlayer[], key: LeaderStatKey, mode: StatMode, t?: AttemptThresholds): Map<string, number> {
  const sorted = sortLeaders(players, key, defaultSortDir(key), mode, t).filter((p) => isRankEligible(p, key, t) && Number.isFinite(statValue(p, key, mode)));
  const out = new Map<string, number>();
  let prev = NaN;
  let rank = 0;
  sorted.forEach((p, i) => {
    const v = statValue(p, key, mode);
    if (i === 0 || v !== prev) rank = i + 1;
    prev = v;
    out.set(p.id, rank);
  });
  return out;
}

export interface LeaderEntry<T extends LeaderPlayer = LeaderPlayer> {
  player: T;
  value: number;
  rank: number;
}

/** 1~n위 (상위 방향) */
export function topLeaders<T extends LeaderPlayer>(players: readonly T[], key: LeaderStatKey, mode: StatMode, n: number, t?: AttemptThresholds): LeaderEntry<T>[] {
  const ranks = rankMap(players, key, mode, t);
  return sortLeaders(players, key, defaultSortDir(key), mode, t)
    .filter((p) => ranks.has(p.id))
    .slice(0, n)
    .map((p) => ({ player: p, value: statValue(p, key, mode), rank: ranks.get(p.id)! }));
}

// ─── 표기 ───

const NF0 = new Intl.NumberFormat("ko-KR");
const NF1 = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 경기 수·합계 누적은 정수(쉼표), 경기당·30분당·비율은 소수 1자리 */
export function formatStat(value: number, key: LeaderStatKey, mode: StatMode): string {
  if (!Number.isFinite(value)) return "–";
  const kind = LEADER_STATS[key].kind;
  if (kind === "games" || (kind === "count" && mode === "total")) return NF0.format(Math.round(value));
  return NF1.format(value);
}

export const formatMadeAttempts = (m: { made: number; att: number }) => `${NF0.format(m.made)}/${NF0.format(m.att)}`;

/** "경기당 득점" · "시즌 합계 득점" · "TS%" (scope: 통산 화면은 "통산") */
export function statTitle(key: LeaderStatKey, mode: StatMode, scope: "season" | "career" = "season"): string {
  const def = LEADER_STATS[key];
  if (def.kind !== "count") return def.label;
  if (mode === "per30" && key === "minutes") return `경기당 ${def.label}`;
  const total = scope === "career" ? "통산" : "시즌 합계";
  return `${mode === "perGame" ? "경기당" : mode === "per30" ? "30분당" : total} ${def.label}`;
}

/** 모바일 행 카드의 보조값: 경기 · 득점 · 리바 중 지금 정렬 기준을 뺀 앞 2~3개 (KBL rowSummaryKeys) */
export function rowSummaryKeys(key: LeaderStatKey): LeaderStatKey[] {
  return (["games", "pts", "reb", "ast"] as LeaderStatKey[]).filter((k) => k !== key).slice(0, 3);
}

export function formatSummaryStat(p: LeaderPlayer, key: LeaderStatKey, mode: StatMode): string {
  if (key === "games") return `${p.games}경기`;
  return `${LEADER_STATS[key].short} ${formatStat(statValue(p, key, mode), key, mode)}`;
}

/** 목록 앞에서 limit 개만 (나머지 수와 함께) — kbl-stats lib/leaders takeFirst 와 같다 */
export function takeFirst<T>(rows: readonly T[], limit: number): { shown: T[]; remaining: number } {
  const n = Math.max(0, Math.min(rows.length, Math.floor(limit)));
  return { shown: rows.slice(0, n), remaining: rows.length - n };
}

/** 리더보드 첫 화면 행 수 (KBL LEADERS_PAGE_SIZE) */
export const LEADERS_PAGE_SIZE = 25;
