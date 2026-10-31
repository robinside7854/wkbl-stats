// 시즌 능력치 6축·등급 (kbl-stats lib/metrics 의 레이더·등급 생각을 WKBL 데이터에 맞게 줄임 — 2026-10-31 사용자 요청 "숫자 중심 → 직관적으로").
// 모두 "우리 규칙"이다(공홈 등급 아님): 화면에 ⓘ 로 기준을 알린다.
//  1) 그 시즌 표본 기준(팀 경기 절반 이상)을 넘은 선수만 줄 세운다(비교 집단)
//  2) 구성 요소마다 집단 안 백분위(mid-rank) → 축 = 구성 요소 백분위 평균 → 그 평균을 다시 집단 안 백분위로
//  3) 축 등급 S~F(90/75/55/35/15), 종합 = 6축 평균의 집단 안 백분위 → S~F(95/80/55/30/10 — S 는 상위 5%)
//  4) 유형 라벨 = 가장 높은 축(60 이상일 때만). 5축 이상이 70 이상이면 올라운더, 강점 축이 없으면 롤플레이어
// 경기당 값만 쓴다(박스스코어 합계 ÷ 경기). WKBL 공홈엔 2차 지표가 없어 USG%·PER 같은 축은 없다.
import { eff, fga, fgm, pct, perGame, tsPct } from "./metrics";
import type { StatLine } from "./types";

export const AXES = ["offense", "shooting", "rebound", "playmaking", "defense", "efficiency"] as const;
export type Axis = (typeof AXES)[number];

export const AXIS_LABELS: Record<Axis, string> = {
  offense: "공격",
  shooting: "슈팅",
  rebound: "리바운드",
  playmaking: "리딩",
  defense: "수비",
  efficiency: "효율",
};

export type ComponentKey = "ppg" | "fgmPg" | "tpmPg" | "tpPct" | "ftPct" | "orebPg" | "drebPg" | "apg" | "astTo" | "spg" | "bpg" | "ts" | "effPg";

export interface ComponentDef {
  label: string;
  /** 값 표기: 경기당 소수 1자리 / 성공률 % / 비율 소수 2자리 */
  kind: "perGame" | "pct" | "ratio";
}

export const COMPONENTS: Record<ComponentKey, ComponentDef> = {
  ppg: { label: "경기당 득점", kind: "perGame" },
  fgmPg: { label: "경기당 야투 성공", kind: "perGame" },
  tpmPg: { label: "경기당 3점 성공", kind: "perGame" },
  tpPct: { label: "3점 성공률", kind: "pct" },
  ftPct: { label: "자유투 성공률", kind: "pct" },
  orebPg: { label: "경기당 공격 리바운드", kind: "perGame" },
  drebPg: { label: "경기당 수비 리바운드", kind: "perGame" },
  apg: { label: "경기당 어시스트", kind: "perGame" },
  astTo: { label: "어시스트/턴오버", kind: "ratio" },
  spg: { label: "경기당 스틸", kind: "perGame" },
  bpg: { label: "경기당 블록", kind: "perGame" },
  ts: { label: "TS%", kind: "pct" },
  effPg: { label: "경기당 EFF", kind: "perGame" },
};

export const AXIS_COMPONENTS: Record<Axis, readonly ComponentKey[]> = {
  offense: ["ppg", "fgmPg"],
  shooting: ["tpmPg", "tpPct", "ftPct"],
  rebound: ["orebPg", "drebPg"],
  playmaking: ["apg", "astTo"],
  defense: ["spg", "bpg"],
  efficiency: ["ts", "effPg"],
};

/** 성공률·비율 구성 요소의 경기당 최소 시도 (적게 던진 100% 가 1등이 되지 않게 — 우리 규칙) */
const MIN_PER_GAME = { tpa: 1, fta: 1, fga: 3, ast: 1 } as const;

export type Line = StatLine & { games: number };

/** 구성 요소 값 (자격이 없으면 null — 그 요소는 축 평균에서 빠진다) */
export function componentValue(s: Line, key: ComponentKey): number | null {
  const g = Math.max(1, s.games);
  switch (key) {
    case "ppg":
      return perGame(s.pts, s.games);
    case "fgmPg":
      return perGame(fgm(s), s.games);
    case "tpmPg":
      return perGame(s.threePm, s.games);
    case "tpPct":
      return s.threePa >= MIN_PER_GAME.tpa * g ? pct(s.threePm, s.threePa) : null;
    case "ftPct":
      return s.fta >= MIN_PER_GAME.fta * g ? pct(s.ftm, s.fta) : null;
    case "orebPg":
      return perGame(s.oreb, s.games);
    case "drebPg":
      return perGame(s.dreb, s.games);
    case "apg":
      return perGame(s.ast, s.games);
    case "astTo":
      return s.ast >= MIN_PER_GAME.ast * g ? s.ast / Math.max(1, s.tov) : null;
    case "spg":
      return perGame(s.stl, s.games);
    case "bpg":
      return perGame(s.blk, s.games);
    case "ts":
      return fga(s) >= MIN_PER_GAME.fga * g ? tsPct(s) : null;
    case "effPg":
      return perGame(eff(s), s.games);
  }
}

/**
 * 백분위 (mid-rank): 나보다 작은 값 수 + 같은 값 수의 절반, ÷ 전체 × 100. 0~100.
 * kbl-stats lib/metrics percentileRank 와 같은 식.
 */
export function percentileRank(value: number, reference: readonly number[]): number {
  if (reference.length === 0) return 50;
  let below = 0;
  let equal = 0;
  for (const r of reference) {
    if (r < value) below++;
    else if (r === value) equal++;
  }
  return ((below + equal / 2) / reference.length) * 100;
}

export type Grade = "S" | "A" | "B" | "C" | "D" | "F";

const AXIS_CUTS: [Grade, number][] = [
  ["S", 90],
  ["A", 75],
  ["B", 55],
  ["C", 35],
  ["D", 15],
];
const OVERALL_CUTS: [Grade, number][] = [
  ["S", 95],
  ["A", 80],
  ["B", 55],
  ["C", 30],
  ["D", 10],
];

export function gradeOf(p: number, overall = false): Grade {
  for (const [g, cut] of overall ? OVERALL_CUTS : AXIS_CUTS) if (p >= cut) return g;
  return "F";
}

/** 화면에 쓰는 점수 1~99 (백분위 반올림) */
export const score99 = (p: number) => Math.max(1, Math.min(99, Math.round(p)));

export type PlayerTypeKey = Axis | "allround" | "role";

export const PLAYER_TYPE_LABELS: Record<PlayerTypeKey, string> = {
  offense: "득점원",
  shooting: "슈터",
  rebound: "리바운더",
  playmaking: "플레이메이커",
  defense: "수비수",
  efficiency: "피니셔",
  allround: "올라운더",
  role: "롤플레이어",
};

/** 강점 축 문턱 (백분위) — 이보다 낮으면 그 축은 강점이 아니다 */
export const TYPE_STRENGTH_MIN = 60;
/** 올라운더: ALLROUND_MIN 이상인 축이 이만큼 이상 (주전은 여러 축이 같이 높아서 문턱을 높게 — 2026-10-31 25-26 에서 60·4축이면 60명 중 22명) */
export const TYPE_ALLROUND_AXES = 5;
export const TYPE_ALLROUND_MIN = 70;

export function playerTypeOf(axes: Record<Axis, number>): PlayerTypeKey {
  if (AXES.filter((a) => axes[a] >= TYPE_ALLROUND_MIN).length >= TYPE_ALLROUND_AXES) return "allround";
  const strong = AXES.filter((a) => axes[a] >= TYPE_STRENGTH_MIN);
  if (strong.length === 0) return "role";
  return strong.reduce((best, a) => (axes[a] > axes[best] ? a : best), strong[0]);
}

export interface SeasonGrade {
  /** 축 백분위 0~100 (집단 안 다시 매긴 값) */
  axes: Record<Axis, number>;
  /** 구성 요소 백분위 (자격 없으면 null) — 선수 페이지 "세부 능력치" 막대 */
  parts: Record<ComponentKey, number | null>;
  /** 종합 백분위 0~100 */
  overall: number;
  overallGrade: Grade;
  type: PlayerTypeKey;
  /** 비교 집단 인원 */
  poolSize: number;
}

/**
 * 한 시즌 선수들의 등급. qualified 를 넘은 선수만 계산하고, 나머지는 결과에 없다(화면은 "표본 부족").
 * 반환: 선수 키 → 등급
 */
export function gradeSeason<T extends Line>(players: readonly T[], keyOf: (p: T) => string, minGames: number): Map<string, SeasonGrade> {
  const pool = players.filter((p) => p.games >= Math.max(1, minGames));
  const out = new Map<string, SeasonGrade>();
  if (pool.length < 5) return out;
  const keys = Object.keys(COMPONENTS) as ComponentKey[];
  const values = new Map<ComponentKey, (number | null)[]>();
  for (const k of keys) values.set(k, pool.map((p) => componentValue(p, k)));
  const refs = new Map<ComponentKey, number[]>();
  for (const k of keys) refs.set(k, values.get(k)!.filter((v): v is number => v !== null && Number.isFinite(v)));

  const parts = pool.map((_, i) => {
    const r = {} as Record<ComponentKey, number | null>;
    for (const k of keys) {
      const v = values.get(k)![i];
      r[k] = v === null || !Number.isFinite(v) ? null : percentileRank(v, refs.get(k)!);
    }
    return r;
  });
  // 축 = 구성 요소 백분위 평균 (자격 있는 요소만, 하나도 없으면 0)
  const rawAxes = parts.map((pt) => {
    const r = {} as Record<Axis, number>;
    for (const a of AXES) {
      const vs = AXIS_COMPONENTS[a].map((k) => pt[k]).filter((v): v is number => v !== null);
      r[a] = vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : 0;
    }
    return r;
  });
  const axisRefs = Object.fromEntries(AXES.map((a) => [a, rawAxes.map((r) => r[a])])) as Record<Axis, number[]>;
  const axes = rawAxes.map((r) => Object.fromEntries(AXES.map((a) => [a, percentileRank(r[a], axisRefs[a])])) as Record<Axis, number>);
  const avg = axes.map((a) => AXES.reduce((s, k) => s + a[k], 0) / AXES.length);
  pool.forEach((p, i) => {
    const overall = percentileRank(avg[i], avg);
    out.set(keyOf(p), {
      axes: axes[i],
      parts: parts[i],
      overall,
      overallGrade: gradeOf(overall, true),
      type: playerTypeOf(axes[i]),
      poolSize: pool.length,
    });
  });
  return out;
}

// ─── 화면 표기 (계산 없음) ───

/** 구성 요소 값 표기: 경기당 "12.3", 성공률 "45.6%", 비율 "2.10" */
export function componentText(v: number | null, key: ComponentKey): string {
  if (v === null || !Number.isFinite(v)) return "–";
  const kind = COMPONENTS[key].kind;
  if (kind === "pct") return `${(v * 100).toFixed(1)}%`;
  if (kind === "ratio") return v.toFixed(2);
  return v.toFixed(1);
}

/**
 * 등급 색 (kbl-stats lib/teams gradeTone 규칙을 CSS 로): S 금색 · A 팀 색 · B 팀 색을 옅게 · C~F 회색 단계.
 * 색은 globals.css 토큰(--grade-*)과 팀 색만.
 */
export function gradeStyle(grade: Grade, team: { primary: string; text: string }): { background: string; color: string; borderColor: string } {
  switch (grade) {
    case "S":
      return { background: "var(--grade-s)", color: "var(--grade-s-ink)", borderColor: "color-mix(in oklab, var(--grade-s) 70%, black)" };
    case "A":
      return { background: team.primary, color: team.text, borderColor: team.primary };
    case "B":
      return { background: `color-mix(in oklab, ${team.primary} 26%, var(--surface))`, color: "var(--ink)", borderColor: team.primary };
    case "C":
      return { background: "var(--grade-c)", color: "var(--grade-c-ink)", borderColor: "var(--grade-c)" };
    case "D":
      return { background: "var(--grade-d)", color: "var(--grade-d-ink)", borderColor: "var(--grade-d)" };
    default:
      return { background: "var(--grade-f)", color: "var(--grade-f-ink)", borderColor: "var(--grade-f)" };
  }
}

/** 백분위 막대 색: 낮음 파랑 · 50 회색 · 높음 빨강 (dataviz 발산형 — kbl-stats PercentileBars 와 같다) */
export function percentileFill(p: number): string {
  const t = Math.max(-1, Math.min(1, (p - 50) / 50));
  if (Math.abs(t) < 0.04) return "var(--div-mid)";
  const end = t > 0 ? "var(--div-hot)" : "var(--div-cold)";
  return `color-mix(in oklab, ${end} ${Math.round(Math.abs(t) * 100)}%, var(--div-mid))`;
}

/** 만 나이 (기준일 YYYY-MM-DD) */
export function ageOn(birth: string, today: string): number | null {
  const b = birth.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = today.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!b || !t) return null;
  let age = Number(t[1]) - Number(b[1]);
  if (`${t[2]}${t[3]}` < `${b[2]}${b[3]}`) age--;
  return age;
}
