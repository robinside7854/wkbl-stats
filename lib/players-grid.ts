// 선수 탭 카드 격자 규칙 (kbl-stats lib/cardview buildGridEntries·sortGridBy·filterGridEntries 와 같은 생각 — 2026-11-01 싱크).
// 시즌 하나의 선수 카드: 등급 · 포지션 · 경기당 득점·리바·어시. 정렬 = 등급순·득점순·키순·나이순, 같은 버튼 다시 = 반대 순서.
// 값이 없는 선수(표본 미달·키/생년월일 없음)는 방향과 관계없이 맨 뒤.
import type { Grade } from "./grades";
import type { Position } from "./types";

/** public/season-players/{시즌}.json 한 줄 (짧은 키 — 파일 크기) */
export interface GridPlayer {
  /** 선수 번호 */
  id: string;
  ko: string;
  team: string;
  teamName: string;
  pos: Position | null;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  /** 종합 등급·점수(1~99) — 표본 미달이면 null */
  grade: { g: Grade; s: number } | null;
  /** 키 cm */
  h: number | null;
  /** 생년월일 YYYY-MM-DD */
  b: string | null;
}

export interface SeasonPlayersFile {
  season: string;
  players: GridPlayer[];
}

export type GridSort = "grade" | "ppg" | "height" | "age";

export const GRID_SORTS: readonly { value: GridSort; label: string }[] = [
  { value: "grade", label: "등급순" },
  { value: "ppg", label: "득점순" },
  { value: "height", label: "키순" },
  { value: "age", label: "나이순" },
];

/** 정렬 값 (클수록 앞이 기본 방향). 나이순 기본 = 나이 많은 순 → 생년월일이 이른 쪽이 큰 값 */
function sortValue(p: GridPlayer, by: GridSort): number | null {
  switch (by) {
    case "grade":
      return p.grade ? p.grade.s : null;
    case "ppg":
      return p.ppg;
    case "height":
      return p.h;
    case "age":
      return p.b ? -Date.parse(`${p.b}T00:00:00Z`) : null;
  }
}

/** 정렬 (새 배열). asc = 반대 방향. 같은 값은 경기당 득점 → 이름 */
export function sortGrid(list: readonly GridPlayer[], by: GridSort, asc = false): GridPlayer[] {
  const sign = asc ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = sortValue(a, by);
    const vb = sortValue(b, by);
    if ((va === null) !== (vb === null)) return va === null ? 1 : -1;
    if (va !== null && vb !== null && va !== vb) return sign * (va - vb);
    return b.ppg - a.ppg || a.ko.localeCompare(b.ko, "ko");
  });
}

export interface GridFilter {
  grade: Grade | null;
  position: "all" | Position;
  team: string | null;
}

export const DEFAULT_GRID_FILTER: GridFilter = { grade: null, position: "all", team: null };

export function filterGrid(list: readonly GridPlayer[], f: GridFilter): GridPlayer[] {
  return list.filter(
    (p) => (f.grade === null || p.grade?.g === f.grade) && (f.position === "all" || p.pos === f.position) && (f.team === null || p.team === f.team),
  );
}

/** 등급별 인원 (필터 칩에 숫자) */
export function gradeCounts(list: readonly GridPlayer[]): Map<Grade, number> {
  const m = new Map<Grade, number>();
  for (const p of list) if (p.grade) m.set(p.grade.g, (m.get(p.grade.g) ?? 0) + 1);
  return m;
}

export const seasonPlayersUrl = (season: string) => `/season-players/${season}.json`;

/** 시즌 선수 합계 + 프로필 → 카드 줄 (빌드 스크립트·선수 탭 첫 화면 공용) */
export function toGridPlayers(
  players: readonly import("./types").PlayerSeason[],
  profileOf: (id: string) => import("./types").PlayerProfile | null,
  teamNameOf: (code: string) => string,
): GridPlayer[] {
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return players.map((p) => {
    const prof = profileOf(p.playerNo);
    const g = Math.max(1, p.games);
    return {
      id: p.playerNo,
      ko: p.nameKo,
      team: p.teamCode,
      teamName: teamNameOf(p.teamCode),
      pos: prof?.position ?? p.position,
      games: p.games,
      ppg: r1(p.pts / g),
      rpg: r1(p.reb / g),
      apg: r1(p.ast / g),
      grade: p.grade ? { g: p.grade.overallGrade, s: Math.max(1, Math.min(99, Math.round(p.grade.overall))) } : null,
      h: prof?.heightCm ?? null,
      b: prof?.birthDate ?? null,
    };
  });
}
