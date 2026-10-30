// WKBL 공홈 HTML 조각 → 우리 데이터 모양 (lib/types.ts).
// 공홈은 JSON 이 아니라 ASP 가 그린 HTML 을 준다. 표를 정규식으로 읽으므로 공홈 화면이 바뀌면 여기가 깨진다 —
// 그래서 머리글 순서를 먼저 확인하고(checkBoxHeader), 다르면 조용히 틀린 숫자를 만들지 않고 예외를 던진다.
// 수집(fetch.ts)과 가공(process.ts)이 같이 쓴다. 표본: tests/fixtures (2026-10-30 GitHub Actions 조사 응답).
import type { BoxPlayerLine, BoxScore, BoxTeam, Position, ScheduleGame, SeasonInfo, StatLine } from "../lib/types";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function decodeHtml(s: string): string {
  return s
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (m, e: string) => {
      if (ENTITIES[e]) return ENTITIES[e];
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return m;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]*>/g, " "));
}

/** "35:02" → 2102초. 빈 칸·"-" 는 0 */
export function minutesToSec(s: string): number {
  const m = s.trim().match(/^(\d+):(\d{1,2})$/);
  if (!m) return 0;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** "5-10" → [5, 10] */
function madeAttempt(s: string): [number, number] {
  const m = s.trim().match(/^(\d+)\s*-\s*(\d+)$/);
  if (!m) return [0, 0];
  return [Number(m[1]), Number(m[2])];
}

function num(s: string): number {
  const n = Number(s.trim());
  return Number.isFinite(n) ? n : 0;
}

// ─── 시즌·달 선택 상자 (일정 화면 /game/sch/schedule1.asp) ───

/** 시즌 선택 상자의 시즌 목록 (공홈 순서 그대로: 최신 먼저) */
export function parseSeasonOptions(html: string): { seasons: SeasonInfo[]; selected: string | null } {
  const seasons: SeasonInfo[] = [];
  let selected: string | null = null;
  for (const m of html.matchAll(/<option\s+value="(\d{3})"(\s+selected)?[^>]*>([^<]+)<\/option>/g)) {
    if (seasons.some((s) => s.code === m[1])) continue;
    seasons.push({ code: m[1], label: decodeHtml(m[3]) });
    if (m[2]) selected = m[1];
  }
  return { seasons, selected };
}

/** 달 선택 상자의 달 목록 ("202511" …). 플레이오프("p")는 뺀다 */
export function parseMonthOptions(html: string): string[] {
  const out: string[] = [];
  for (const m of html.matchAll(/<option\s+value="(\d{6})"/g)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** 정규리그 시즌인지 (퓨처스리그는 뺀다 — 2군 성격, 박스스코어 범위도 다르다) */
export function isRegularLeague(s: SeasonInfo): boolean {
  return !/퓨처스/.test(s.label);
}

// ─── 월별 일정 (/game/sch/inc_list_1_new.asp) ───

export const REGULAR_GAME_TYPE = "01";

interface TeamCell {
  code: string;
  name: string;
  score: number | null;
}

function parseTeamCell(block: string): TeamCell | null {
  const code = block.match(/teamlogo_(\d+)\./)?.[1];
  const name = block.match(/class="team_name[^"]*"[^>]*>([^<]*)</)?.[1];
  if (!code || name === undefined) return null;
  const scoreText = block.match(/class="txt_score"[^>]*>([^<]*)</)?.[1]?.trim() ?? "";
  return { code, name: decodeHtml(name), score: /^\d+$/.test(scoreText) ? Number(scoreText) : null };
}

/**
 * 월별 일정 표 → 경기 목록.
 * - 줄마다 <tr id="YYYYMMDD"> 로 날짜가 붙어 있다.
 * - 두 팀 칸의 class 는 away/home 이지만, **먼저 나오는 팀이 홈**이다(경기장이 그 팀 홈 체육관 — 2026-10-30 표본 6경기 확인).
 * - 경기 번호는 "경기기록" 링크의 game_no, 없으면 goTodayGame('01', N) / goLive('01', N).
 * - 정규리그(game_type 01)만 돌려준다.
 */
export function parseSchedule(html: string, seasonCode: string): ScheduleGame[] {
  const out: ScheduleGame[] = [];
  const parts = html.split(/<tr\s+id="(\d{8})"[^>]*>/);
  for (let i = 1; i < parts.length; i += 2) {
    const ymd = parts[i];
    const row = parts[i + 1].split(/<\/tr>/)[0];
    const teamBlocks = row.split(/<div class="info_team/).slice(1);
    if (teamBlocks.length < 2) continue;
    const first = parseTeamCell(teamBlocks[0]);
    const second = parseTeamCell(teamBlocks[1]);
    if (!first || !second) continue;
    // 경기 종류: 01 = 정규리그. 올스타전(10)도 같은 달 일정에 경기 번호 1로 끼어 있어(2026-10-30 확인) 뺀다
    const gameType = row.match(/game_type=(\d+)/)?.[1] ?? row.match(/go(?:TodayGame|Live)\('(\d+)'/)?.[1] ?? REGULAR_GAME_TYPE;
    if (gameType !== REGULAR_GAME_TYPE) continue;
    const gameNo = Number(
      row.match(/game_no=(\d+)/)?.[1] ?? row.match(/go(?:TodayGame|Live)\('\d+',\s*(\d+)\)/)?.[1] ?? 0,
    );
    const venue = row.match(/<td class="language" data-kr="([^"]*)"/)?.[1] ?? "";
    const time = row.match(/<td>\s*(\d{1,2}:\d{2})\s*<\/td>/)?.[1] ?? "";
    out.push({
      seasonCode,
      gameNo,
      date: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`,
      time,
      venue: decodeHtml(venue),
      homeCode: first.code,
      homeName: first.name,
      awayCode: second.code,
      awayName: second.name,
      homeScore: first.score,
      awayScore: second.score,
    });
  }
  return out;
}

// ─── 경기 박스스코어 (POST /game/ajax/ajax_game_result_2.asp) ───

/** 박스스코어 표 머리글 순서 (선수 칸 다음부터). 바뀌면 checkBoxHeader 가 멈춘다 */
const BOX_HEADER = ["POS", "MIN", "2PM-A", "3PM-A", "FTM-A", "REBOUNDS", "AST", "PF", "ST", "TO", "BS", "PTS", "OFF", "DEF", "TOT"];

function checkBoxHeader(thead: string) {
  const heads = [...thead.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => stripTags(m[1])).slice(1);
  if (heads.join(",") !== BOX_HEADER.join(",")) {
    throw new Error(`박스스코어 머리글이 바뀌었다: ${heads.join(",")}`);
  }
}

function cells(row: string): string[] {
  return [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]);
}

/** 칸 14개(MIN ~ PTS) → 숫자 기록 */
function statFrom(c: string[]): StatLine {
  const [twoPm, twoPa] = madeAttempt(stripTags(c[1]));
  const [threePm, threePa] = madeAttempt(stripTags(c[2]));
  const [ftm, fta] = madeAttempt(stripTags(c[3]));
  const n = (i: number) => num(stripTags(c[i]));
  return {
    sec: minutesToSec(stripTags(c[0])),
    twoPm,
    twoPa,
    threePm,
    threePa,
    ftm,
    fta,
    oreb: n(4),
    dreb: n(5),
    reb: n(6),
    ast: n(7),
    pf: n(8),
    stl: n(9),
    tov: n(10),
    blk: n(11),
    pts: n(12),
  };
}

function toPosition(s: string): Position | null {
  const p = s.trim().toUpperCase()[0];
  return p === "G" || p === "F" || p === "C" ? p : null;
}

function parseBoxTeam(chunk: string): BoxTeam | null {
  const teamName = chunk.match(/^[^>]*data-kr="([^"]*)"/)?.[1];
  const table = chunk.match(/<table>([\s\S]*?)<\/table>/)?.[1];
  if (!teamName || !table) return null;
  const thead = table.match(/<thead>([\s\S]*?)<\/thead>/)?.[1] ?? "";
  checkBoxHeader(thead);
  const tbody = table.match(/<tbody>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
  const players: BoxPlayerLine[] = [];
  for (const rm of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const c = cells(rm[1]);
    if (c.length < 15) continue;
    const link = c[0];
    const playerNo = link.match(/pno=(\d+)/)?.[1] ?? "";
    const nameKo = decodeHtml(link.match(/data-kr="([^"]*)"/)?.[1] ?? stripTags(link));
    const nameEn = decodeHtml(link.match(/data-en="([^"]*)"/)?.[1] ?? "");
    players.push({ playerNo, nameKo, nameEn, position: toPosition(stripTags(c[1])), ...statFrom(c.slice(2)) });
  }
  const tfoot = table.match(/<tfoot>([\s\S]*?)<\/tfoot>/)?.[1] ?? "";
  const fc = cells(tfoot);
  // 팀합계 줄: 첫 칸이 colspan=2 라 칸이 14개
  const total = fc.length >= 14 ? statFrom(fc.slice(1)) : null;
  return { teamName: decodeHtml(teamName), players, total };
}

/** 경기 결과 HTML → 두 팀 박스스코어 (먼저 나오는 팀이 홈). 경기 기록이 없으면 null */
export function parseBoxScore(html: string): BoxScore | null {
  const chunks = html.split(/<h4 class="tit_area/).slice(1);
  const teams = chunks.map(parseBoxTeam).filter((t): t is BoxTeam => t !== null);
  if (teams.length !== 2) return null;
  if (teams.every((t) => t.players.length === 0)) return null;
  return { teams };
}
