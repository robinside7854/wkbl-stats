// 경기 목록 고르기 (홈·일정). 계산 없이 고르기만.
import type { ProcessedGame } from "./types";

export const isPlayed = (g: ProcessedGame) => g.homeScore !== null && g.awayScore !== null;

/** 끝난 경기가 있는 마지막 날의 경기들 */
export function lastGameDay(games: readonly ProcessedGame[]): ProcessedGame[] {
  const played = games.filter(isPlayed);
  const last = played.at(-1)?.date;
  return last ? played.filter((g) => g.date === last) : [];
}

/** 아직 안 한 경기 중 가장 가까운 날의 경기들 */
export function nextGameDay(games: readonly ProcessedGame[]): ProcessedGame[] {
  const upcoming = games.filter((g) => !isPlayed(g));
  const first = upcoming[0]?.date;
  return first ? upcoming.filter((g) => g.date === first) : [];
}

/** 달별로 묶기 ("2025-11" → 경기들), 달 순서 유지 */
export function groupByMonth(games: readonly ProcessedGame[]): [string, ProcessedGame[]][] {
  const m = new Map<string, ProcessedGame[]>();
  for (const g of games) {
    const k = g.date.slice(0, 7);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(g);
  }
  return [...m.entries()];
}

/** 팀 하나의 경기만 */
export const teamGamesOf = (games: readonly ProcessedGame[], team: string) => games.filter((g) => g.homeCode === team || g.awayCode === team);
