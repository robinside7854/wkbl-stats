// 팀 순위: 끝난 경기 결과(점수)로 센다. 승률 → 승수 순. 동률일 때 공홈은 상대 전적 등으로 가르므로 순서가 다를 수 있다
// (화면에 "공식 순위와 동률 처리가 다를 수 있어요" ⓘ). 가공(scripts/process.ts)이 부른다.
import type { ScheduleGame, TeamStanding } from "./types";

export function buildStandings(games: readonly ScheduleGame[]): TeamStanding[] {
  const rows = new Map<string, TeamStanding & { results: ("W" | "L")[] }>();
  const row = (code: string, name: string) => {
    let r = rows.get(code);
    if (!r) {
      r = {
        teamCode: code,
        teamName: name,
        games: 0,
        wins: 0,
        losses: 0,
        pct: 0,
        gamesBehind: 0,
        homeWins: 0,
        homeLosses: 0,
        awayWins: 0,
        awayLosses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        last5: [],
        streak: "",
        rank: 0,
        results: [],
      };
      rows.set(code, r);
    }
    r.teamName = name;
    return r;
  };

  const played = [...games]
    .filter((g) => g.homeScore !== null && g.awayScore !== null)
    .sort((a, b) => a.date.localeCompare(b.date) || a.gameNo - b.gameNo);
  // 경기가 아직 없어도 일정에 있는 팀은 0승 0패로 보인다
  for (const g of games) {
    row(g.homeCode, g.homeName);
    row(g.awayCode, g.awayName);
  }
  for (const g of played) {
    const home = row(g.homeCode, g.homeName);
    const away = row(g.awayCode, g.awayName);
    const hs = g.homeScore!;
    const as = g.awayScore!;
    const homeWin = hs > as;
    home.games++;
    away.games++;
    home.pointsFor += hs;
    home.pointsAgainst += as;
    away.pointsFor += as;
    away.pointsAgainst += hs;
    if (homeWin) {
      home.wins++;
      home.homeWins++;
      away.losses++;
      away.awayLosses++;
    } else {
      away.wins++;
      away.awayWins++;
      home.losses++;
      home.homeLosses++;
    }
    home.results.push(homeWin ? "W" : "L");
    away.results.push(homeWin ? "L" : "W");
  }

  const list = [...rows.values()];
  for (const r of list) {
    r.pct = r.games > 0 ? r.wins / r.games : 0;
    r.last5 = r.results.slice(-5).reverse();
    r.streak = streakText(r.results);
  }
  list.sort((a, b) => b.pct - a.pct || b.wins - a.wins || b.pointsFor - b.pointsAgainst - (a.pointsFor - a.pointsAgainst));
  const top = list[0];
  list.forEach((r, i) => {
    r.gamesBehind = top ? (top.wins - r.wins + (r.losses - top.losses)) / 2 : 0;
    // 승률이 같으면 같은 순위
    r.rank = i > 0 && r.pct === list[i - 1].pct && r.games > 0 ? list[i - 1].rank : i + 1;
  });
  return list.map(({ results: _r, ...rest }) => rest);
}

/** 끝에서부터 같은 결과가 몇 번 이어졌는지: "3연승" / "2연패" / "" */
export function streakText(results: readonly ("W" | "L")[]): string {
  const last = results.at(-1);
  if (!last) return "";
  let n = 0;
  for (let i = results.length - 1; i >= 0 && results[i] === last; i--) n++;
  return `${n}${last === "W" ? "연승" : "연패"}`;
}
