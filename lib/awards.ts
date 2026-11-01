// 역대 수상 규칙 (2026-11-01 사용자 "우승·MVP 기록을 선수 페이지에서 보기 쉽게" — kbl-stats 수상 경력과 같은 생각).
// 재료: 공홈 히스토리 → 역대 부문별 수상자(투표·기록·BEST5) — 이름만 있다 → 그 시즌 명단에서 번호를 찾는다(matchAwards).
// 우승 팀: 공홈 표에 따로 없어서 "챔피언전 MVP 의 그 시즌 팀"으로 판정한다(우리 규칙 — 챔피언전 MVP 는 우승 팀에서 나온다).
import type { AwardEntry, AwardKey, PlayerAward } from "./types";

export const AWARD_LABELS: Record<AwardKey, string> = {
  mvp: "정규리그 MVP",
  finalsMvp: "챔피언결정전 MVP",
  best5: "BEST 5",
  rookie: "신인 선수상",
  defense: "우수수비 선수상",
  sixth: "식스우먼상",
  mip: "MIP",
  foreign: "외국인 선수상",
  asia: "아시아쿼터 선수상",
  fairPlay: "모범 선수상",
  contribution: "윤덕주상(최고 공헌도)",
  scoring: "득점상",
  threePm: "3점 득점상",
  threePct: "3점 야투상",
  twoPct: "2점 야투상",
  ftPct: "자유투상",
  rebounds: "리바운드상",
  assists: "어시스트상",
  steals: "스틸상",
  blocks: "블록상",
};

/** 화면 순서 (types AwardKey 순서와 같다) */
export const AWARD_ORDER = Object.keys(AWARD_LABELS) as AwardKey[];

/** 기록 부문(시즌 1위로 받는 상) — 수상 경력 표에서 아래 묶음 */
export const STAT_AWARD_KEYS: AwardKey[] = ["contribution", "scoring", "threePm", "threePct", "twoPct", "ftPct", "rebounds", "assists", "steals", "blocks"];

/** 선수 머리말 금색 칩으로 보이는 상 (우승은 따로) */
export const HONOR_CHIP_KEYS: AwardKey[] = ["mvp", "finalsMvp", "best5", "rookie"];

/** 이름 비교용: 공백·점 무시 ("진 안" = "진안", "A. 토마스") */
export const normName = (s: string) => s.replace(/[\s.·]/g, "");

export interface RosterPlayer {
  playerNo: string;
  nameKo: string;
  /** 그 시즌 팀 이름 (마지막 팀) */
  teamName: string;
  teamCode: string;
  games: number;
  /** 그 시즌 득점 합 — 동명이인 가르기(상은 대개 주전이 받는다) */
  pts: number;
}

/**
 * 공홈 수상 줄 → 선수 번호.
 * 1) 그 시즌 명단에서 이름이 같은 선수(공백 무시) 2) 여럿이면 BEST5 팀 표기와 팀 이름 앞 두 글자가 같은 선수, 그래도 여럿이면 그 시즌 득점이 많은 선수
 *    (2022-23 챔피언전 MVP 김단비: 우리은행 515점 ↔ 삼성생명 192점 — 투표 화면엔 팀이 없다)
 * 3) 없으면 이름 끝 글자들이 같은 선수 하나("토마스" → "앨리사 토마스" 처럼 표기가 다른 외국 선수)
 * 시즌이 우리 데이터에 없으면(2003 여름 전) 건너뛴다.
 */
export function matchAwards(
  entries: readonly AwardEntry[],
  seasonCodeOf: (label: string) => string | null,
  rosterOf: (code: string) => readonly RosterPlayer[],
): { byPlayer: Map<string, PlayerAward[]>; matched: { entry: AwardEntry; playerNo: string; seasonCode: string }[]; unmatched: AwardEntry[]; outOfRange: number } {
  const byPlayer = new Map<string, PlayerAward[]>();
  const matched: { entry: AwardEntry; playerNo: string; seasonCode: string }[] = [];
  const unmatched: AwardEntry[] = [];
  let outOfRange = 0;
  for (const e of entries) {
    const code = seasonCodeOf(e.season);
    if (!code) {
      outOfRange++;
      continue;
    }
    const roster = rosterOf(code);
    // "김단비 (KEB하나은행)" 처럼 이름 뒤에 팀이 붙은 칸 → 팀 표기로 쓴다
    const paren = e.name.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    const team = e.team ?? paren?.[2] ?? null;
    const n = normName(paren ? paren[1] : e.name);
    let cands = roster.filter((p) => normName(p.nameKo) === n);
    if (cands.length === 0 && n.length >= 2) {
      const tail = roster.filter((p) => normName(p.nameKo).endsWith(n) || n.endsWith(normName(p.nameKo).slice(-3)));
      if (tail.length === 1) cands = tail;
    }
    if (cands.length > 1 && team) {
      const t = normName(team).slice(0, 2);
      const byTeam = cands.filter((p) => normName(p.teamName).startsWith(t));
      if (byTeam.length > 0) cands = byTeam;
    }
    const pick = [...cands].sort((a, b) => b.pts - a.pts || b.games - a.games)[0];
    if (!pick) {
      unmatched.push(e);
      continue;
    }
    matched.push({ entry: e, playerNo: pick.playerNo, seasonCode: code });
    const list = byPlayer.get(pick.playerNo) ?? [];
    list.push({ key: e.key, seasonCode: code, value: e.value });
    byPlayer.set(pick.playerNo, list);
  }
  return { byPlayer, matched, unmatched, outOfRange };
}

/** 상 키별 횟수 */
export function awardCounts(awards: readonly PlayerAward[]): Partial<Record<AwardKey, number>> {
  const out: Partial<Record<AwardKey, number>> = {};
  for (const a of awards) out[a.key] = (out[a.key] ?? 0) + 1;
  return out;
}

/** 수상 경력 표 줄: 상마다 시즌 목록 (화면 순서) */
export function awardRows(awards: readonly PlayerAward[]): { key: AwardKey; seasons: { code: string; value: string | null }[] }[] {
  return AWARD_ORDER.map((key) => ({
    key,
    seasons: awards
      .filter((a) => a.key === key)
      .map((a) => ({ code: a.seasonCode, value: a.value }))
      .sort((x, y) => x.code.localeCompare(y.code)),
  })).filter((r) => r.seasons.length > 0);
}

/** 선수 머리말 금색 칩: 우승 → 정규리그 MVP → 챔피언결정전 MVP → BEST5 → 신인상 (있는 것만) */
export function honorChips(awards: readonly PlayerAward[], championships: number): { key: string; label: string }[] {
  const n = awardCounts(awards);
  const chips: { key: string; label: string }[] = [];
  if (championships > 0) chips.push({ key: "champion", label: `우승 ${championships}회` });
  const short: Partial<Record<AwardKey, string>> = { mvp: "정규리그 MVP", finalsMvp: "챔프전 MVP", best5: "BEST 5", rookie: "신인상" };
  for (const k of HONOR_CHIP_KEYS) {
    const c = n[k] ?? 0;
    if (c > 0) chips.push({ key: k, label: k === "rookie" ? short[k]! : `${short[k]} ${c}회` });
  }
  return chips;
}
