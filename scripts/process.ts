// data/raw(공홈 HTML 원본) → data/processed(화면이 읽는 JSON). 원본은 건드리지 않고 매번 처음부터 다시 만든다 (원칙 2·4).
// 사용: npm run process
// 만드는 것:
//   seasons.json                     시즌 목록 (최신 먼저)
//   teams.json                       팀 코드 → 마지막 이름 (+ 시즌별 이름)
//   {시즌}/games.json                 일정·결과 (+ 양 팀 득점 1위)
//   {시즌}/players.json               선수 시즌 합계 (박스스코어를 더한 것)
//   {시즌}/standings.json             팀 순위 (경기 결과로 센 것)
//   players.json                     선수 목록·통산 (검색·선수 탭·통산 기록)
//   player/{번호}.json                선수 상세 (시즌별·커리어 하이·마지막 시즌 경기 기록)
//   meta.json                        가공·수집 시각
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PROCESSED_DIR, RAW_DIR, rawPath } from "./config";
import { exists, readRaw } from "./http";
import { isRegularLeague, parseAwardsBest5, parseAwardsStats, parseAwardsVote, parseBoxScore, parseProfile, parseSchedule, parseSeasonOptions } from "./parse";
import { addLine, emptyLine, isDoubleDouble } from "../lib/metrics";
import { buildStandings } from "../lib/standings";
import { awardCounts, matchAwards, type RosterPlayer } from "../lib/awards";
import { gradeSeason, type SeasonGrade } from "../lib/grades";
import { QUALIFY_SHARE } from "../lib/metrics";
import type {
  BoxPlayerLine,
  CareerHigh,
  GameLogLine,
  PlayerDetail,
  PlayerIndexRow,
  PlayerSeason,
  Position,
  ProcessedGame,
  ScheduleGame,
  SeasonInfo,
  SeasonSummary,
  AwardEntry,
  StatLine,
  TopScorer,
} from "../lib/types";

async function writeJson(file: string, body: unknown) {
  await mkdir(join(file, ".."), { recursive: true });
  await writeFile(file, JSON.stringify(body) + "\n", "utf8");
}

function mostCommon<T>(items: T[]): T | null {
  const count = new Map<T, number>();
  for (const x of items) count.set(x, (count.get(x) ?? 0) + 1);
  let best: T | null = null;
  let n = 0;
  for (const [k, v] of count) if (v > n) [best, n] = [k, v];
  return best;
}

interface PlayerAcc {
  playerNo: string;
  nameKo: string;
  nameEn: string;
  positions: Position[];
  teamCodes: string[];
  line: StatLine;
  games: number;
  highPts: number;
  dd: number;
  logs: GameLogLine[];
}

function toPlayerSeason(a: PlayerAcc): PlayerSeason {
  return {
    playerNo: a.playerNo,
    nameKo: a.nameKo,
    nameEn: a.nameEn,
    position: mostCommon(a.positions),
    teamCode: a.teamCodes.at(-1) ?? "",
    teamCodes: [...new Set(a.teamCodes)],
    games: a.games,
    highPts: a.highPts,
    dd: a.dd,
    grade: null,
    ...a.line,
  };
}

const HIGH_KEYS: CareerHigh["key"][] = ["pts", "reb", "ast", "stl", "blk", "threePm"];

async function readSeasonGames(code: string): Promise<ScheduleGame[]> {
  const dir = join(RAW_DIR, code, "schedule");
  if (!(await exists(dir))) return [];
  const files = (await readdir(dir)).filter((f) => f.endsWith(".html.gz")).sort();
  const byNo = new Map<string, ScheduleGame>();
  for (const f of files) {
    for (const g of parseSchedule(await readRaw(join(dir, f)), code)) {
      // 같은 경기가 두 달에 걸쳐 나오면 한 번만 (번호 없으면 날짜+팀으로)
      byNo.set(g.gameNo > 0 ? `n${g.gameNo}` : `${g.date}-${g.homeCode}-${g.awayCode}`, g);
    }
  }
  return [...byNo.values()].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || a.gameNo - b.gameNo);
}

interface SeasonOut {
  info: SeasonInfo;
  summary: SeasonSummary;
  players: Map<string, PlayerAcc>;
  grades: Map<string, SeasonGrade>;
  warnings: string[];
}

async function processSeason(info: SeasonInfo): Promise<SeasonOut> {
  const code = info.code;
  const warnings: string[] = [];
  const schedule = await readSeasonGames(code);
  const players = new Map<string, PlayerAcc>();
  const games: ProcessedGame[] = [];

  for (const g of schedule) {
    const pg: ProcessedGame = { ...g, hasBox: false };
    games.push(pg);
    if (g.homeScore === null || g.awayScore === null || g.gameNo <= 0) continue;
    const file = rawPath.box(code, g.gameNo);
    if (!(await exists(file))) continue;
    const box = parseBoxScore(await readRaw(file));
    if (!box) {
      warnings.push(`${code} #${g.gameNo}: 박스스코어를 읽지 못함`);
      continue;
    }
    // 먼저 나오는 팀이 홈. 이름이 거꾸로면 바꾼다(시즌 중 팀 이름이 같으면 순서를 믿는다)
    let [home, away] = box.teams;
    if (home.teamName === g.awayName && away.teamName === g.homeName && g.homeName !== g.awayName) [home, away] = [away, home];
    else if (home.teamName !== g.homeName || away.teamName !== g.awayName) {
      warnings.push(`${code} #${g.gameNo}: 팀 이름이 일정과 다름 (${home.teamName}/${away.teamName} ↔ ${g.homeName}/${g.awayName})`);
    }
    const sides = [
      { team: home, teamCode: g.homeCode, oppCode: g.awayCode, isHome: true, margin: g.homeScore - g.awayScore, score: g.homeScore },
      { team: away, teamCode: g.awayCode, oppCode: g.homeCode, isHome: false, margin: g.awayScore - g.homeScore, score: g.awayScore },
    ];
    const tops: (TopScorer | null)[] = [];
    for (const side of sides) {
      const sum = side.team.players.reduce((a, p) => a + p.pts, 0);
      if (sum !== side.score) warnings.push(`${code} #${g.gameNo}: ${side.team.teamName} 선수 득점 합 ${sum} ≠ 점수 ${side.score}`);
      let top: BoxPlayerLine | null = null;
      for (const p of side.team.players) {
        if (!p.playerNo) {
          warnings.push(`${code} #${g.gameNo}: 선수 번호 없는 줄 (${p.nameKo})`);
          continue;
        }
        // 출전 시간 0 이고 기록도 없으면 명단에만 있던 선수 — 경기 수에 넣지 않는다
        const played = p.sec > 0 || p.pts > 0 || p.reb > 0 || p.ast > 0 || p.twoPa + p.threePa + p.fta > 0;
        if (!played) continue;
        if (!top || p.pts > top.pts) top = p;
        let acc = players.get(p.playerNo);
        if (!acc) {
          acc = { playerNo: p.playerNo, nameKo: p.nameKo, nameEn: p.nameEn, positions: [], teamCodes: [], line: emptyLine(), games: 0, highPts: 0, dd: 0, logs: [] };
          players.set(p.playerNo, acc);
        }
        const { playerNo: _no, nameKo: _ko, nameEn: _en, position, ...stat } = p;
        acc.nameKo = p.nameKo;
        if (p.nameEn) acc.nameEn = p.nameEn;
        if (position) acc.positions.push(position);
        if (acc.teamCodes.at(-1) !== side.teamCode) acc.teamCodes.push(side.teamCode);
        addLine(acc.line, stat);
        acc.games++;
        acc.highPts = Math.max(acc.highPts, p.pts);
        if (isDoubleDouble(stat)) acc.dd++;
        acc.logs.push({ ...stat, gameNo: g.gameNo, date: g.date, teamCode: side.teamCode, oppCode: side.oppCode, home: side.isHome, margin: side.margin });
      }
      tops.push(top ? { playerNo: top.playerNo, nameKo: top.nameKo, pts: top.pts, reb: top.reb, ast: top.ast } : null);
    }
    pg.hasBox = true;
    pg.topScorers = [tops[0], tops[1]];
  }

  // 능력치 등급: 비교 집단 = 팀 경기의 절반 이상 뛴 선수 (진행 중 시즌도 같은 규칙 — 1~2경기 표본이 S 가 되지 않게)
  const standings = buildStandings(games);
  const teamGames = standings.reduce((m, t) => Math.max(m, t.games), 0);
  const grades = gradeSeason([...players.values()].map((a) => ({ ...a.line, games: a.games, key: a.playerNo })), (p) => p.key, Math.ceil(teamGames * QUALIFY_SHARE));
  const seasonPlayers = [...players.values()]
    .map((a) => ({ ...toPlayerSeason(a), grade: grades.get(a.playerNo) ?? null }))
    .sort((x, y) => y.pts - x.pts);

  const played = games.filter((g) => g.homeScore !== null);
  const summary: SeasonSummary = {
    ...info,
    scheduled: games.length,
    played: played.length,
    withBox: games.filter((g) => g.hasBox).length,
    players: seasonPlayers.length,
    lastDate: played.at(-1)?.date ?? "",
    champion: null,
  };

  if (games.length > 0) {
    const dir = join(PROCESSED_DIR, code);
    await writeJson(join(dir, "games.json"), games);
    await writeJson(join(dir, "players.json"), seasonPlayers);
    await writeJson(join(dir, "standings.json"), standings);
  }
  return { info, summary, players, grades, warnings };
}

async function main() {
  if (!(await exists(rawPath.seasons()))) {
    console.log("data/raw/seasons.html.gz 가 없다 — 먼저 수집(npm run fetch, GitHub Actions)");
    return;
  }
  const { seasons } = parseSeasonOptions(await readRaw(rawPath.seasons()));
  const regular = seasons.filter(isRegularLeague);

  // 다시 만들기 전에 지난 가공본을 지운다 (선수 번호가 바뀌어 남는 파일이 없게)
  await rm(PROCESSED_DIR, { recursive: true, force: true });
  await mkdir(PROCESSED_DIR, { recursive: true });

  const outs: SeasonOut[] = [];
  for (const info of regular) {
    if (!(await exists(join(RAW_DIR, info.code)))) continue;
    const out = await processSeason(info);
    outs.push(out);
    const s = out.summary;
    console.log(`${info.code} ${info.label}: 경기 ${s.scheduled}(끝남 ${s.played}, 박스 ${s.withBox}) · 선수 ${s.players}` + (out.warnings.length ? ` · 경고 ${out.warnings.length}` : ""));
    for (const w of out.warnings.slice(0, 10)) console.log(`    ! ${w}`);
  }

  // 시즌 목록 (공홈 순서: 최신 먼저). 일정이 하나도 없는 시즌은 뺀다
  const summaries = outs.map((o) => o.summary).filter((s) => s.scheduled > 0);
  await writeJson(join(PROCESSED_DIR, "seasons.json"), summaries);

  // 팀 이름: 코드마다 시즌별 이름 (최신 이름 = 가장 최근 시즌)
  const teamNames: Record<string, { name: string; bySeason: Record<string, string> }> = {};
  for (const o of [...outs].reverse()) {
    const games = JSON.parse(await readFile(join(PROCESSED_DIR, o.info.code, "games.json"), "utf8").catch(() => "[]")) as ProcessedGame[];
    for (const g of games) {
      for (const [c, n] of [[g.homeCode, g.homeName], [g.awayCode, g.awayName]] as const) {
        teamNames[c] ??= { name: n, bySeason: {} };
        teamNames[c].name = n;
        teamNames[c].bySeason[o.info.code] = n;
      }
    }
  }
  await writeJson(join(PROCESSED_DIR, "teams.json"), teamNames);

  // 선수 통산 — 오래된 시즌부터 쌓는다
  interface Career {
    playerNo: string;
    nameKo: string;
    nameEn: string;
    positions: Position[];
    seasons: (PlayerSeason & { seasonCode: string })[];
    line: StatLine;
    games: number;
    highs: Map<CareerHigh["key"], CareerHigh>;
    lastLogs: GameLogLine[];
    lastSeason: string;
    firstSeason: string;
  }
  const careers = new Map<string, Career>();
  for (const o of [...outs].reverse()) {
    for (const acc of o.players.values()) {
      let c = careers.get(acc.playerNo);
      if (!c) {
        c = { playerNo: acc.playerNo, nameKo: acc.nameKo, nameEn: acc.nameEn, positions: [], seasons: [], line: emptyLine(), games: 0, highs: new Map(), lastLogs: [], lastSeason: o.info.code, firstSeason: o.info.code };
        careers.set(acc.playerNo, c);
      }
      c.nameKo = acc.nameKo;
      if (acc.nameEn) c.nameEn = acc.nameEn;
      c.positions.push(...acc.positions);
      c.seasons.push({ seasonCode: o.info.code, ...toPlayerSeason(acc), grade: o.grades.get(acc.playerNo) ?? null });
      addLine(c.line, acc.line);
      c.games += acc.games;
      for (const log of acc.logs) {
        for (const k of HIGH_KEYS) {
          const prev = c.highs.get(k);
          // 같은 값이면 먼저 나온 경기를 남긴다
          if (log[k] > 0 && (!prev || log[k] > prev.value)) {
            c.highs.set(k, { key: k, value: log[k], seasonCode: o.info.code, gameNo: log.gameNo, date: log.date, oppCode: log.oppCode });
          }
        }
      }
      c.lastLogs = acc.logs;
      c.lastSeason = o.info.code;
    }
  }

  // ── 역대 수상·우승·정규리그 1위 (2026-11-01) ──
  const awardEntries: AwardEntry[] = [];
  for (const [name, parse] of [["vote", parseAwardsVote], ["stats", parseAwardsStats], ["best5", parseAwardsBest5]] as const) {
    const file = rawPath.award(name);
    if (!(await exists(file))) continue;
    try {
      awardEntries.push(...parse(await readRaw(file)));
    } catch (e) {
      console.log(`  ! 수상(${name}) 읽기 실패: ${String(e)}`);
    }
  }
  const codeOfLabel = new Map(outs.map((o) => [o.info.label.replace(/\s+/g, ""), o.info.code]));
  const rosterCache = new Map<string, RosterPlayer[]>();
  const rosterOf = (code: string): RosterPlayer[] => {
    let r = rosterCache.get(code);
    if (!r) {
      const o = outs.find((x) => x.info.code === code);
      r = o
        ? [...o.players.values()].map((a) => {
            const teamCode = a.teamCodes.at(-1) ?? "";
            return { playerNo: a.playerNo, nameKo: a.nameKo, teamCode, teamName: teamNames[teamCode]?.bySeason[code] ?? "", games: a.games };
          })
        : [];
      rosterCache.set(code, r);
    }
    return r;
  };
  const awards = matchAwards(awardEntries, (l) => codeOfLabel.get(l) ?? null, rosterOf);
  // 우승 팀 = 챔피언전 MVP 의 그 시즌 팀
  const champions = new Map<string, string>();
  for (const m of awards.matched) {
    if (m.entry.key !== "finalsMvp") continue;
    const t = rosterOf(m.seasonCode).find((p) => p.playerNo === m.playerNo)?.teamCode;
    if (t) champions.set(m.seasonCode, t);
  }
  // 정규리그 1위 = 끝난 시즌 팀 순위 맨 위
  const regularFirst = new Map<string, string>();
  for (const sm of summaries) {
    if (sm.played === 0 || sm.played < sm.scheduled) continue;
    const st = JSON.parse(await readFile(join(PROCESSED_DIR, sm.code, "standings.json"), "utf8").catch(() => "[]")) as { teamCode: string }[];
    if (st[0]) regularFirst.set(sm.code, st[0].teamCode);
  }
  for (const sm of summaries) sm.champion = champions.get(sm.code) ?? null;
  await writeJson(join(PROCESSED_DIR, "seasons.json"), summaries);
  console.log(`수상 ${awardEntries.length}줄 → 선수 연결 ${awards.matched.length} · 못 찾음 ${awards.unmatched.length} · 우리 데이터 전 시즌 ${awards.outOfRange} · 우승 팀 ${champions.size}시즌`);
  for (const u of awards.unmatched.slice(0, 20)) console.log(`    ? ${u.season} ${u.key} ${u.name}`);

  const index: PlayerIndexRow[] = [];
  let withProfile = 0;
  for (const c of careers.values()) {
    const profileFile = rawPath.profile(c.playerNo);
    const profile = (await exists(profileFile)) ? parseProfile(await readRaw(profileFile)) : null;
    if (profile) withProfile++;
    const position = mostCommon(c.positions);
    const myAwards = (awards.byPlayer.get(c.playerNo) ?? []).sort((a, b) => a.seasonCode.localeCompare(b.seasonCode));
    const champSeasons = c.seasons.filter((x) => champions.get(x.seasonCode) === x.teamCode).map((x) => x.seasonCode);
    const firstSeasons = c.seasons.filter((x) => regularFirst.get(x.seasonCode) === x.teamCode).map((x) => x.seasonCode);
    const lastTeam = c.seasons.at(-1)?.teamCode ?? "";
    index.push({
      playerNo: c.playerNo,
      nameKo: c.nameKo,
      nameEn: c.nameEn,
      position,
      teamCode: lastTeam,
      firstSeason: c.firstSeason,
      lastSeason: c.lastSeason,
      seasons: c.seasons.length,
      career: { ...c.line, games: c.games },
      profile,
      awardCounts: awardCounts(myAwards),
      championships: champSeasons.length,
    });
    const detail: PlayerDetail = {
      playerNo: c.playerNo,
      nameKo: c.nameKo,
      nameEn: c.nameEn,
      position,
      seasons: [...c.seasons].reverse(),
      career: { ...c.line, games: c.games },
      highs: HIGH_KEYS.map((k) => c.highs.get(k)).filter((h): h is CareerHigh => !!h),
      recentGames: [...c.lastLogs].reverse(),
      recentSeason: c.lastSeason,
      profile,
      awards: myAwards,
      championships: champSeasons,
      regularFirsts: firstSeasons,
    };
    await writeJson(join(PROCESSED_DIR, "player", `${c.playerNo}.json`), detail);
  }
  index.sort((a, b) => b.career.pts - a.career.pts);
  await writeJson(join(PROCESSED_DIR, "players.json"), index);

  const fetchLog = JSON.parse(await readFile(rawPath.fetchLog(), "utf8").catch(() => "{}")) as { finished?: string };
  await writeJson(join(PROCESSED_DIR, "meta.json"), { processedAt: new Date().toISOString(), fetchedAt: fetchLog.finished ?? null });

  const warnCount = outs.reduce((a, o) => a + o.warnings.length, 0);
  console.log(`시즌 ${summaries.length} · 선수 ${index.length}(프로필 ${withProfile}) · 경고 ${warnCount}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
