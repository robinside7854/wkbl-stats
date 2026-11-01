// WKBL 공홈에서 일정·박스스코어를 받아 data/raw 에 그대로 저장한다 (GitHub Actions 에서만 실행 — 작업 환경은 wkbl.or.kr 이 막혀 있다).
// 사용: npm run fetch            → 지금 시즌만 (매일 1회)
//       npm run fetch -- 046 045 → 고른 시즌
//       npm run fetch -- all     → 박스스코어가 있는 모든 정규리그 시즌 (백필, 처음 한 번 — 약 2,500회 요청, 1시간 남짓)
// 요청 줄이기: 이미 받은 끝난 경기의 박스스코어는 다시 받지 않는다(끝난 경기 기록은 바뀌지 않음).
//   단 최근 3일 안 경기는 공홈이 기록을 고칠 수 있어 다시 받는다.
// 실패한 시즌·경기는 건너뛰고 계속, 마지막에 실패 목록을 찍는다 (코딩 규칙).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { AWARD_REFRESH_DAYS, AWARD_URLS, BOX_URL, FIRST_BOX_SEASON, PROCESSED_DIR, PROFILE_REFRESH_DAYS, boxBody, type AwardPage, profileUrls, rawPath, scheduleListUrl, schedulePageUrl } from "./config";
import { exists, getBytes, postFormBytes, requestCount, saveRaw, utf8 } from "./http";
import { isRegularLeague, parseAwardsBest5, parseAwardsStats, parseAwardsVote, parseBoxScore, parseMonthOptions, parseProfile, parseSchedule, parseSeasonOptions } from "./parse";
import type { PlayerIndexRow } from "../lib/types";

const REFETCH_DAYS = 3;

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

interface SeasonResult {
  season: string;
  months: number;
  games: number;
  played: number;
  boxFetched: number;
  boxSkipped: number;
  failures: string[];
}

async function fetchSeason(season: string): Promise<SeasonResult> {
  const r: SeasonResult = { season, months: 0, games: 0, played: 0, boxFetched: 0, boxSkipped: 0, failures: [] };
  const pageBytes = await getBytes(schedulePageUrl(season));
  await saveRaw(rawPath.schedulePage(season), pageBytes);
  const months = parseMonthOptions(utf8(pageBytes));
  r.months = months.length;
  if (months.length === 0) r.failures.push(`${season}: 달 목록이 비었다`);

  const today = kstToday();
  for (const ym of months) {
    let games;
    try {
      const bytes = await getBytes(scheduleListUrl(season, ym));
      await saveRaw(rawPath.scheduleMonth(season, ym), bytes);
      games = parseSchedule(utf8(bytes), season);
    } catch (e) {
      r.failures.push(`${season} ${ym} 일정: ${String(e)}`);
      continue;
    }
    r.games += games.length;
    for (const g of games) {
      if (g.homeScore === null || g.gameNo <= 0) continue;
      r.played++;
      const file = rawPath.box(season, g.gameNo);
      if ((await exists(file)) && daysBetween(g.date, today) > REFETCH_DAYS) {
        r.boxSkipped++;
        continue;
      }
      try {
        const bytes = await postFormBytes(BOX_URL, boxBody(season, g.gameNo));
        const box = parseBoxScore(utf8(bytes));
        if (!box) {
          r.failures.push(`${season} #${g.gameNo} 박스스코어 없음`);
          continue;
        }
        await saveRaw(file, bytes);
        r.boxFetched++;
      } catch (e) {
        r.failures.push(`${season} #${g.gameNo} 박스스코어: ${String(e)}`);
      }
    }
  }
  return r;
}

/**
 * 선수 프로필(등번호·포지션·키·생년월일·출신교·드래프트). 대상 = 가공본 선수 목록(어제까지 뛴 선수 — 새 선수는 다음 날).
 * 처음 보는 선수는 받고, 지금 시즌 선수는 PROFILE_REFRESH_DAYS 마다 다시. 현역 화면에 없으면 은퇴 화면을 본다(선수당 1~2회).
 */
async function fetchProfiles(currentSeason: string | null, limit: number): Promise<{ fetched: number; missing: string[]; failures: string[] }> {
  const players = JSON.parse(await readFile(`${PROCESSED_DIR}/players.json`, "utf8").catch(() => "[]")) as PlayerIndexRow[];
  const log = JSON.parse(await readFile(rawPath.profileLog(), "utf8").catch(() => "{}")) as Record<string, string>;
  const today = kstToday();
  const due = players.filter((p) => {
    const last = log[p.playerNo];
    if (!last) return true;
    return p.lastSeason === currentSeason && daysBetween(last, today) >= PROFILE_REFRESH_DAYS;
  });
  const out = { fetched: 0, missing: [] as string[], failures: [] as string[] };
  for (const p of due.slice(0, limit)) {
    try {
      let saved = false;
      for (const url of profileUrls(p.playerNo)) {
        const bytes = await getBytes(url);
        if (parseProfile(utf8(bytes))) {
          await saveRaw(rawPath.profile(p.playerNo), bytes);
          saved = true;
          break;
        }
      }
      // 두 화면 모두 프로필이 없어도 날짜는 적는다(매일 다시 두드리지 않게)
      log[p.playerNo] = today;
      if (saved) out.fetched++;
      else out.missing.push(`${p.playerNo} ${p.nameKo}`);
    } catch (e) {
      out.failures.push(`프로필 ${p.playerNo} ${p.nameKo}: ${String(e)}`);
    }
  }
  await mkdir(dirname(rawPath.profileLog()), { recursive: true });
  await writeFile(rawPath.profileLog(), JSON.stringify(Object.fromEntries(Object.entries(log).sort()), null, 1) + "\n");
  if (due.length > limit) console.log(`  프로필: 남은 ${due.length - limit}명은 다음 실행에서`);
  return out;
}

/**
 * 역대 수상 화면 3개 — 7일에 한 번(시즌이 끝날 때만 바뀐다). 읽어서 한 줄이라도 나와야 저장한다(화면이 바뀌면 전 파일 유지 + 실패 목록)
 */
async function fetchAwards(): Promise<{ fetched: string[]; failures: string[] }> {
  const log = JSON.parse(await readFile(rawPath.awardLog(), "utf8").catch(() => "{}")) as Record<string, string>;
  const today = kstToday();
  const parsers: Record<AwardPage, (h: string) => unknown[]> = { vote: parseAwardsVote, stats: parseAwardsStats, best5: parseAwardsBest5 };
  const out = { fetched: [] as string[], failures: [] as string[] };
  for (const page of Object.keys(AWARD_URLS) as AwardPage[]) {
    if (log[page] && daysBetween(log[page], today) < AWARD_REFRESH_DAYS && (await exists(rawPath.award(page)))) continue;
    try {
      const bytes = await getBytes(AWARD_URLS[page]);
      if (parsers[page](utf8(bytes)).length === 0) throw new Error("수상 줄이 0개");
      await saveRaw(rawPath.award(page), bytes);
      log[page] = today;
      out.fetched.push(page);
    } catch (e) {
      out.failures.push(`수상 ${page}: ${String(e)}`);
    }
  }
  await mkdir(dirname(rawPath.awardLog()), { recursive: true });
  await writeFile(rawPath.awardLog(), JSON.stringify(log, null, 1) + "\n");
  return out;
}

/** 한 번에 받을 프로필 최대 수 (처음 약 470명 ≈ 12~20분) */
const PROFILE_LIMIT = 700;

async function main() {
  const args = process.argv.slice(2);
  const started = new Date().toISOString();

  // 시즌 목록 (일정 화면의 시즌 선택 상자) — 매번 받아 새 시즌이 생기면 알아챈다
  const listBytes = await getBytes(schedulePageUrl());
  await saveRaw(rawPath.seasons(), listBytes);
  const { seasons, selected } = parseSeasonOptions(utf8(listBytes));
  const regular = seasons.filter(isRegularLeague).filter((s) => s.code >= FIRST_BOX_SEASON);
  if (regular.length === 0) throw new Error("시즌 목록을 읽지 못했다 — 공홈 화면이 바뀌었는지 확인");

  // list: 백필 워크플로가 시즌을 하나씩 돌며 중간 저장하려고 목록만 받는다
  if (args[0] === "list") {
    console.log(regular.map((s) => s.code).join(" "));
    return;
  }

  let targets: string[];
  if (args.includes("all")) targets = regular.map((s) => s.code);
  else if (args.length > 0) targets = args;
  else {
    // 지금 시즌 + 개막 전이면 직전 시즌도 (지난 시즌 마지막 경기 기록 고침을 받으려고, 요청 몇 번뿐)
    const current = selected ?? regular[0].code;
    const idx = regular.findIndex((s) => s.code === current);
    targets = [current, ...(idx >= 0 && regular[idx + 1] ? [regular[idx + 1].code] : [])];
  }

  console.log(`대상 시즌: ${targets.join(" ")}`);
  const results: SeasonResult[] = [];
  for (const season of targets) {
    try {
      const r = await fetchSeason(season);
      results.push(r);
      console.log(
        `  ${season}: 달 ${r.months} · 경기 ${r.games}(끝남 ${r.played}) · 박스스코어 새로 ${r.boxFetched} / 이미 있음 ${r.boxSkipped}` +
          (r.failures.length ? ` · 실패 ${r.failures.length}` : ""),
      );
    } catch (e) {
      results.push({ season, months: 0, games: 0, played: 0, boxFetched: 0, boxSkipped: 0, failures: [`${season}: ${String(e)}`] });
      console.log(`  ${season}: 실패 — ${String(e)}`);
    }
  }

  // 선수 프로필 — 시즌 수집 뒤에 (일정만 받는 "list" 모드는 위에서 이미 끝남)
  const profiles = await fetchProfiles(selected, PROFILE_LIMIT);
  console.log(`  프로필: 새로 ${profiles.fetched}명` + (profiles.missing.length ? ` · 공홈에 없음 ${profiles.missing.length}명` : ""));

  const awards = await fetchAwards();
  if (awards.fetched.length) console.log(`  수상 화면 새로 받음: ${awards.fetched.join(" ")}`);

  const failures = [...results.flatMap((r) => r.failures), ...profiles.failures, ...awards.failures];
  await writeFile(
    rawPath.fetchLog(),
    JSON.stringify({ started, finished: new Date().toISOString(), requests: requestCount, targets, results, profiles }, null, 2) + "\n",
  );
  console.log(`요청 ${requestCount}회`);
  if (failures.length) {
    console.log(`실패 ${failures.length}건:`);
    for (const f of failures) console.log(`  - ${f}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
