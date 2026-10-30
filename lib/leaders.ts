// 리더보드 부문·순위 (시즌별·통산 공통). 값 계산은 lib/metrics.ts 함수만 쓴다.
import { eff, fga, fgm, pct, perGame, PCT_MIN_ATTEMPTS_PER_GAME, tsPct, type QualifyRule } from "./metrics";
import type { StatLine } from "./types";

export type Mode = "avg" | "total";
export type CategoryKey =
  | "pts"
  | "reb"
  | "ast"
  | "stl"
  | "blk"
  | "threePm"
  | "oreb"
  | "eff"
  | "min"
  | "fgPct"
  | "threePct"
  | "ftPct"
  | "tsPct";

export interface Category {
  key: CategoryKey;
  label: string;
  /** 표 머리글 짧은 이름 */
  short: string;
  /** 성공률 부문이면 pct — 경기당/합계 전환과 상관없다 */
  kind: "count" | "pct" | "time";
}

export const CATEGORIES: readonly Category[] = [
  { key: "pts", label: "득점", short: "득점", kind: "count" },
  { key: "reb", label: "리바운드", short: "리바", kind: "count" },
  { key: "ast", label: "어시스트", short: "어시", kind: "count" },
  { key: "stl", label: "스틸", short: "스틸", kind: "count" },
  { key: "blk", label: "블록", short: "블록", kind: "count" },
  { key: "threePm", label: "3점슛 성공", short: "3점", kind: "count" },
  { key: "oreb", label: "공격 리바운드", short: "공리", kind: "count" },
  { key: "eff", label: "효율(EFF)", short: "EFF", kind: "count" },
  { key: "min", label: "출전 시간", short: "출전", kind: "time" },
  { key: "fgPct", label: "야투 성공률", short: "야투%", kind: "pct" },
  { key: "threePct", label: "3점 성공률", short: "3점%", kind: "pct" },
  { key: "ftPct", label: "자유투 성공률", short: "자유투%", kind: "pct" },
  { key: "tsPct", label: "TS%", short: "TS%", kind: "pct" },
];

export const categoryOf = (key: string): Category => CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[0];

export type Line = StatLine & { games: number };

function rawTotal(s: Line, key: CategoryKey): number {
  switch (key) {
    case "eff":
      return eff(s);
    case "min":
      return s.sec / 60;
    case "pts":
    case "reb":
    case "ast":
    case "stl":
    case "blk":
    case "threePm":
    case "oreb":
      return s[key];
    default:
      return 0;
  }
}

/** 부문 값: 성공률은 0~1, 출전 시간은 분, 나머지는 경기당 또는 합계 */
export function categoryValue(s: Line, key: CategoryKey, mode: Mode): number | null {
  switch (key) {
    case "fgPct":
      return pct(fgm(s), fga(s));
    case "threePct":
      return pct(s.threePm, s.threePa);
    case "ftPct":
      return pct(s.ftm, s.fta);
    case "tsPct":
      return tsPct(s);
    default: {
      const t = rawTotal(s, key);
      return mode === "avg" ? perGame(t, s.games) : t;
    }
  }
}

/** 성공률 부문 최소 시도 (경기당 기준 × 경기 수 — 시즌·통산 같은 규칙) */
function attemptsOk(s: Line, key: CategoryKey): boolean {
  const g = Math.max(1, s.games);
  if (key === "fgPct" || key === "tsPct") return fga(s) >= PCT_MIN_ATTEMPTS_PER_GAME.fg * g;
  if (key === "threePct") return s.threePa >= PCT_MIN_ATTEMPTS_PER_GAME.three * g;
  if (key === "ftPct") return s.fta >= PCT_MIN_ATTEMPTS_PER_GAME.ft * g;
  return true;
}

export interface Ranked<R> {
  row: R;
  value: number;
  rank: number;
}

/**
 * 순위: 표본 기준(경기 수)·성공률 최소 시도를 넘은 선수만, 값 큰 순. 같은 값은 같은 순위.
 * 합계 모드의 쌓이는 부문은 표본 기준을 쓰지 않는다(적게 뛰면 합계도 작다).
 */
export function rankBy<R extends Line>(rows: readonly R[], key: CategoryKey, mode: Mode, rule: QualifyRule): Ranked<R>[] {
  const cat = categoryOf(key);
  const useRule = cat.kind === "pct" || mode === "avg";
  const list: Ranked<R>[] = [];
  for (const row of rows) {
    if (useRule && row.games < rule.minGames) continue;
    if (cat.kind === "pct" && !attemptsOk(row, key)) continue;
    const v = categoryValue(row, key, mode);
    if (v === null || !Number.isFinite(v)) continue;
    list.push({ row, value: v, rank: 0 });
  }
  list.sort((a, b) => b.value - a.value);
  list.forEach((r, i) => {
    r.rank = i > 0 && Math.abs(r.value - list[i - 1].value) < 1e-9 ? list[i - 1].rank : i + 1;
  });
  return list;
}

/** 목록 앞에서 limit 개만 (나머지 수와 함께) — kbl-stats lib/leaders takeFirst 와 같다 */
export function takeFirst<T>(rows: readonly T[], limit: number): { shown: T[]; remaining: number } {
  const n = Math.max(0, Math.min(rows.length, Math.floor(limit)));
  return { shown: rows.slice(0, n), remaining: rows.length - n };
}

/** 화면에 넘길 숫자만 골라 담기 (정적 HTML 에 들어가는 데이터를 줄이려고) */
export function pickLine(s: Line): Line {
  return {
    games: s.games,
    sec: s.sec,
    twoPm: s.twoPm,
    twoPa: s.twoPa,
    threePm: s.threePm,
    threePa: s.threePa,
    ftm: s.ftm,
    fta: s.fta,
    oreb: s.oreb,
    dreb: s.dreb,
    reb: s.reb,
    ast: s.ast,
    pf: s.pf,
    stl: s.stl,
    tov: s.tov,
    blk: s.blk,
    pts: s.pts,
  };
}
