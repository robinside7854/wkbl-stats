// WKBL 공홈에서 일정·박스스코어를 받아 data/raw 에 그대로 저장한다 (GitHub Actions 에서만 실행 — 작업 환경은 wkbl.or.kr 이 막혀 있다).
// 사용: npm run fetch            → 지금 시즌만 (매일 1회)
//       npm run fetch -- 046 045 → 고른 시즌
//       npm run fetch -- all     → 박스스코어가 있는 모든 정규리그 시즌 (백필, 처음 한 번 — 약 2,500회 요청, 1시간 남짓)
// 요청 줄이기: 이미 받은 끝난 경기의 박스스코어는 다시 받지 않는다(끝난 경기 기록은 바뀌지 않음).
//   단 최근 3일 안 경기는 공홈이 기록을 고칠 수 있어 다시 받는다.
// 실패한 시즌·경기는 건너뛰고 계속, 마지막에 실패 목록을 찍는다 (코딩 규칙).
import { writeFile } from "node:fs/promises";
import { BOX_URL, FIRST_BOX_SEASON, boxBody, rawPath, scheduleListUrl, schedulePageUrl } from "./config";
import { exists, getBytes, postFormBytes, requestCount, saveRaw, utf8 } from "./http";
import { isRegularLeague, parseBoxScore, parseMonthOptions, parseSchedule, parseSeasonOptions } from "./parse";

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

  const failures = results.flatMap((r) => r.failures);
  await writeFile(
    rawPath.fetchLog(),
    JSON.stringify({ started, finished: new Date().toISOString(), requests: requestCount, targets, results }, null, 2) + "\n",
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
