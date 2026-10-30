// 화면이 읽는 데이터 — data/processed 의 JSON 만 (원칙 1: 화면은 공홈 주소를 모른다).
// 빌드 때 서버에서만 읽는다(정적 페이지). 수집 전(파일 없음)에도 빌드가 깨지지 않게 빈 값을 돌려준다.
import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PlayerDetail, PlayerIndexRow, PlayerSeason, ProcessedGame, SeasonSummary, TeamStanding } from "./types";

const DIR = join(process.cwd(), "data", "processed");
const cache = new Map<string, unknown>();

function read<T>(rel: string, fallback: T): T {
  if (cache.has(rel)) return cache.get(rel) as T;
  const file = join(DIR, rel);
  const v = existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback;
  cache.set(rel, v);
  return v;
}

/** 시즌 목록 (최신 먼저, 일정이 있는 시즌만) */
export const getSeasons = () => read<SeasonSummary[]>("seasons.json", []);

/** 기본 시즌 = 끝난 경기가 있는 가장 최근 시즌 (개막 전이면 지난 시즌) */
export function defaultSeason(): SeasonSummary | null {
  const s = getSeasons();
  return s.find((x) => x.played > 0) ?? s[0] ?? null;
}

export const getSeason = (code: string) => getSeasons().find((s) => s.code === code) ?? null;

/** 진행 중 시즌: 맨 위 시즌이고 아직 일정이 남았다 */
export function isOngoing(code: string): boolean {
  const s = getSeasons();
  return s[0]?.code === code && s[0].played < s[0].scheduled;
}

export const getGames = (code: string) => read<ProcessedGame[]>(`${code}/games.json`, []);
export const getSeasonPlayers = (code: string) => read<PlayerSeason[]>(`${code}/players.json`, []);
export const getStandings = (code: string) => read<TeamStanding[]>(`${code}/standings.json`, []);
export const getPlayersIndex = () => read<PlayerIndexRow[]>("players.json", []);
export const getPlayer = (no: string) => read<PlayerDetail | null>(`player/${no}.json`, null);
export const getMeta = () => read<{ processedAt?: string; fetchedAt?: string | null }>("meta.json", {});

type TeamNames = Record<string, { name: string; bySeason: Record<string, string> }>;
const getTeamNames = () => read<TeamNames>("teams.json", {});

/** 팀 이름 — 그 시즌 이름(있으면), 없으면 마지막 이름 */
export function teamName(code: string, season?: string): string {
  const t = getTeamNames()[code];
  if (!t) return code;
  return (season && t.bySeason[season]) || t.name;
}

/** 그 시즌 팀당 경기 수(가장 많이 뛴 팀) — 표본 기준에 쓴다 */
export function teamGames(code: string): number {
  return getStandings(code).reduce((m, t) => Math.max(m, t.games), 0);
}
