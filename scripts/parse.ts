// WKBL 공홈 HTML 조각 → 우리 데이터 모양 (lib/types.ts).
// 공홈은 JSON 이 아니라 ASP 가 그린 HTML 을 준다. 표를 정규식으로 읽으므로 공홈 화면이 바뀌면 여기가 깨진다 —
// 그래서 머리글 순서를 먼저 확인하고(checkBoxHeader), 다르면 조용히 틀린 숫자를 만들지 않고 예외를 던진다.
// 수집(fetch.ts)과 가공(process.ts)이 같이 쓴다. 표본: tests/fixtures (2026-10-30 GitHub Actions 조사 응답).
import type { AwardEntry, AwardKey, BoxPlayerLine, BoxScore, BoxTeam, DraftInfo, PlayerProfile, Position, ScheduleGame, SeasonInfo, StatLine } from "../lib/types";

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
  // 로고 파일 이름에 꼬리가 붙는 옛 시즌이 있다: 2012-13~2018-19 하나 "teamlogo_09_old.png", 2019-20 "teamlogo_09_old2.png"
  // (2026-11-01 발견 — 전에는 이 팀 경기를 통째로 놓쳤다)
  const code = block.match(/teamlogo_(\d+)(?:_[a-z0-9]+)?\./i)?.[1];
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

// ─── 선수 프로필 (GET /player/detail.asp — 현역, /player/detail2.asp — 은퇴) ───

/** 프로필 항목 한 줄: <li><span …>포지션</span> - F</li> */
function profileItem(block: string, labelKo: string): string | null {
  const m = block.match(new RegExp(`data-kr="${labelKo}"[^>]*>[^<]*</span>\\s*-\\s*([^<]*)<`));
  const v = m ? decodeHtml(m[1]) : "";
  return v && v !== "-" ? v : null;
}

/**
 * "2008 WKBL 신입선수 선발회 / 1라운드 / 2순위 (전체 2순위) / 금호생명 레드윙스" → 연도·라운드·순위·전체 순위·팀.
 * 형식이 다르면 읽을 수 있는 것만 채우고 원문은 text 에 남긴다.
 */
export function parseDraft(text: string): DraftInfo | null {
  const t = text.replace(/\s+/g, " ").trim();
  const year = Number(t.match(/^(\d{4})/)?.[1]);
  if (!t || !Number.isFinite(year)) return null;
  const n = (re: RegExp) => {
    const v = t.match(re)?.[1];
    return v ? Number(v) : null;
  };
  const parts = t.split("/").map((s) => s.trim());
  const last = parts.length >= 3 ? parts[parts.length - 1] : null;
  return {
    year,
    round: n(/(\d+)\s*라운드/),
    pick: n(/\/\s*(\d+)\s*순위/),
    overall: n(/전체\s*(\d+)\s*순위/),
    team: last && !/순위|라운드/.test(last) ? last : null,
    text: t,
  };
}

/** 선수 상세 화면 → 프로필. 프로필 상자가 없으면 null (그 번호가 다른 화면에 있을 수 있다 — 현역 detail ↔ 은퇴 detail2) */
export function parseProfile(html: string): PlayerProfile | null {
  // 주석 안의 옛 태그(<!-- <span class="txt_team">[]</span> -->)를 먼저 지운다. 현역은 profile_view, 은퇴는 profile_view01 retired
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const start = clean.search(/class="profile_view(01)?[ "]/);
  const view = start >= 0 ? clean.slice(start, start + 8000) : null;
  if (!view || !/tit_name/.test(view)) return null;
  const title = view.match(/class="tit_name">([\s\S]*?)<\/h3>/)?.[1] ?? "";
  const backNumber = title.match(/No\.\s*(\d+)/)?.[1] ?? null;
  const teamLabel = decodeHtml(title.match(/class="txt_team[^"]*"[^>]*>\[([^\]]*)\]/)?.[1] ?? "") || null;
  const pos = profileItem(view, "포지션");
  const height = profileItem(view, "신장");
  const birth = profileItem(view, "생년월일");
  const draftText = view.match(/data-kr="드래프트"[^>]*>[^<]*<\/span>\s*<br\s*\/?>([\s\S]*?)<\/li>/)?.[1];
  const birthM = birth?.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  const heightN = Number(height?.match(/(\d{3})/)?.[1]);
  return {
    backNumber,
    teamLabel,
    position: pos ? toPosition(pos) : null,
    heightCm: Number.isFinite(heightN) && heightN > 100 ? heightN : null,
    birthDate: birthM ? `${birthM[1]}-${birthM[2]}-${birthM[3]}` : null,
    school: profileItem(view, "출신학교"),
    draft: draftText ? parseDraft(decodeHtml(draftText.replace(/<[^>]*>/g, " "))) : null,
  };
}

// ─── 역대 수상 (2026-11-01 조사: /history/awards.asp · awards_statistics.asp · awards_vote.asp) ───
// 세 화면 모두 이름만 있고 선수 번호가 없다 → 번호는 process.ts 가 그 시즌 명단에서 찾는다.

/** "2025~2026" · "2025-2026" · "2007 겨울" → "2025-2026" · "2007겨울" (우리 시즌 라벨과 같은 모양) */
export function normalizeAwardSeason(s: string): string {
  return stripTags(s).replace("~", "-").replace(/\s+/g, "");
}

/** 칸 → 이름 (첫 <br> 앞, "-" 면 null). 공백은 그대로 — 번호 찾을 때 공백을 무시한다 */
function awardName(cell: string): string | null {
  const head = cell.split(/<br\s*\/?>/i)[0];
  const n = stripTags(head);
  return n && n !== "-" ? n : null;
}

const VOTE_HEADERS: Record<string, AwardKey> = {
  "정규리그 MVP": "mvp",
  "챔피언전 MVP": "finalsMvp",
  "아시아쿼터 선수상": "asia",
  "외국인 선수상": "foreign",
  "신인 선수상": "rookie",
  "우수수비 선수상": "defense",
  "식스우먼상": "sixth",
  "모범 선수상": "fairPlay",
  "포카리스웨트 MIP": "mip",
};

const STAT_HEADERS: Record<string, AwardKey> = {
  득점상: "scoring",
  "3점 득점상": "threePm",
  "3점 야투상": "threePct",
  "2점 야투상": "twoPct",
  자유투상: "ftPct",
  리바운드상: "rebounds",
  어시스트상: "assists",
  스틸상: "steals",
  블록상: "blocks",
  "윤덕주상 최고공헌도": "contribution",
};

/** 머리글 칸 글자 */
function headerText(th: string): string {
  return stripTags(th);
}

function awardTables(html: string): string[] {
  // data-kr·data-en 속성 값 안에 <br>·<span> 이 들어 있어 태그 경계가 깨진다 → 속성째 지운다 (칸 글자 = data-kr 과 같다)
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\sdata-(?:kr|en)="[^"]*"/g, "").match(/<table[\s\S]*?<\/table>/gi) ?? [];
}
function awardRows(table: string): string[] {
  return table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
}
function awardCells(tr: string): string[] {
  return [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
}

/**
 * 투표 수상 화면: 시즌 표(구분) 한 개 + 상 표 두 개(같은 줄 순서). 머리글을 이름으로 맞추고 모르는 상(지도상·심판상 등)은 버린다.
 * 시즌 표의 줄 수와 상 표의 줄 수가 다르면 화면이 바뀐 것 → 예외
 */
export function parseAwardsVote(html: string): AwardEntry[] {
  const ts = awardTables(html);
  const seasonTable = ts.find((t) => /<th[^>]*>\s*구분\s*<\/th>/.test(t) && !/정규리그 MVP/.test(t));
  if (!seasonTable) throw new Error("수상(투표): 시즌 표를 찾지 못했다");
  const seasons = awardRows(seasonTable).map(awardCells).filter((c) => c.length === 1).map((c) => normalizeAwardSeason(c[0]));
  const out: AwardEntry[] = [];
  for (const t of ts) {
    const heads = [...t.matchAll(/<th[\s\S]*?<\/th>/gi)].map((m) => headerText(m[0]));
    if (!heads.some((h) => VOTE_HEADERS[h])) continue;
    const body = awardRows(t).map(awardCells).filter((c) => c.length > 0);
    if (body.length !== seasons.length) throw new Error(`수상(투표): 시즌 ${seasons.length}줄인데 상 표는 ${body.length}줄`);
    body.forEach((cs, i) => {
      heads.forEach((h, j) => {
        const key = VOTE_HEADERS[h];
        const name = key && cs[j] !== undefined ? awardName(cs[j]) : null;
        if (key && name) out.push({ season: seasons[i], key, name, team: null, value: null });
      });
    });
  }
  return out;
}

/** 기록 부문 수상 화면: 첫 칸 시즌, 나머지 칸 "이름<br>(값)" */
export function parseAwardsStats(html: string): AwardEntry[] {
  const t = awardTables(html).find((x) => /득점상/.test(x));
  if (!t) throw new Error("수상(기록): 표를 찾지 못했다");
  const heads = [...t.matchAll(/<th[\s\S]*?<\/th>/gi)].map((m) => headerText(m[0]));
  if (heads[0] !== "구분") throw new Error(`수상(기록): 첫 머리글이 "${heads[0]}"`);
  const out: AwardEntry[] = [];
  for (const tr of awardRows(t)) {
    const cs = awardCells(tr);
    if (cs.length < 2) continue;
    const season = normalizeAwardSeason(cs[0]);
    cs.slice(1).forEach((c, j) => {
      const key = STAT_HEADERS[heads[j + 1]];
      const name = key ? awardName(c) : null;
      if (!key || !name) return;
      const v = stripTags(c.split(/<br\s*\/?>/i)[1] ?? "").replace(/^\(|\)$/g, "");
      out.push({ season, key, name, team: null, value: v || null });
    });
  }
  return out;
}

/** BEST5 화면: 첫 칸 시즌, 둘째 칸 "이름(팀)" 다섯 개 (한 줄에 둘이 붙은 칸도 있어 이름(팀) 꼴을 모두 찾는다) */
export function parseAwardsBest5(html: string): AwardEntry[] {
  const t = awardTables(html).find((x) => /BEST5/.test(x));
  if (!t) throw new Error("수상(BEST5): 표를 찾지 못했다");
  const out: AwardEntry[] = [];
  for (const tr of awardRows(t)) {
    const cs = awardCells(tr);
    if (cs.length < 2) continue;
    const season = normalizeAwardSeason(cs[0]);
    const text = stripTags(cs[1].replace(/<\/p>/gi, " | "));
    for (const m of text.matchAll(/([^|()]+?)\s*\(([^()]+)\)+/g)) {
      const name = m[1].replace(/^[\s|]+/, "").trim();
      if (name && name !== "-") out.push({ season, key: "best5", name, team: m[2].trim(), value: null });
    }
  }
  return out;
}
