// 지표·순위·팀 순위 계산 확인
import assert from "node:assert/strict";
import { efgPct, eff, emptyLine, isDoubleDouble, seasonQualify, tsPct } from "../lib/metrics";
import { rankBy } from "../lib/leaders";
import { buildStandings, streakText } from "../lib/standings";
import type { ScheduleGame, StatLine } from "../lib/types";

const line = (p: Partial<StatLine>): StatLine => ({ ...emptyLine(), ...p });

// TS% = 득점 / (2 × (야투 시도 + 0.44 × 자유투 시도)): 20점, 2점 10개·3점 5개 시도, 자유투 5개 → 20 / (2 × 17.2)
const s = line({ pts: 20, twoPm: 5, twoPa: 10, threePm: 2, threePa: 5, ftm: 4, fta: 5, reb: 8, ast: 3, stl: 1, blk: 1, tov: 2 });
assert.ok(Math.abs(tsPct(s)! - 20 / 34.4) < 1e-9);
assert.ok(Math.abs(efgPct(s)! - 8 / 15) < 1e-9);
// EFF = 20+8+3+1+1 − (15−7) − (5−4) − 2 = 22
assert.equal(eff(s), 22);
assert.equal(tsPct(emptyLine()), null);
assert.equal(isDoubleDouble(line({ pts: 10, reb: 10 })), true);
assert.equal(isDoubleDouble(line({ pts: 30, reb: 9 })), false);

// 표본 기준: 끝난 시즌 팀 30경기 → 15경기, 진행 중은 없음
assert.equal(seasonQualify(30, false).minGames, 15);
assert.equal(seasonQualify(30, true).minGames, 0);

// 순위: 기준 미달 제외, 같은 값 같은 순위, 성공률은 최소 시도
const rows = [
  { ...line({ pts: 300, twoPa: 100, twoPm: 50 }), games: 20, id: "a" },
  { ...line({ pts: 300, twoPa: 100, twoPm: 60 }), games: 20, id: "b" },
  { ...line({ pts: 400 }), games: 10, id: "c" },
  { ...line({ pts: 10, twoPa: 2, twoPm: 2 }), games: 20, id: "d" },
];
const byPts = rankBy(rows, "pts", "avg", { minGames: 15 });
assert.deepEqual(byPts.map((r) => [r.row.id, r.rank]), [["a", 1], ["b", 1], ["d", 3]]);
assert.deepEqual(rankBy(rows, "pts", "total", { minGames: 15 }).map((r) => r.row.id)[0], "c");
assert.deepEqual(rankBy(rows, "fgPct", "avg", { minGames: 0 }).map((r) => r.row.id), ["b", "a"]);

// 팀 순위: 승률 → 승차, 최근 5경기·연속
const g = (no: number, h: string, a: string, hs: number, as: number): ScheduleGame => ({
  seasonCode: "046", gameNo: no, date: `2025-11-${String(10 + no).padStart(2, "0")}`, time: "", venue: "",
  homeCode: h, homeName: h, awayCode: a, awayName: a, homeScore: hs, awayScore: as,
});
const st = buildStandings([g(1, "A", "B", 70, 60), g(2, "B", "A", 70, 60), g(3, "A", "C", 80, 60), { ...g(4, "B", "C", 0, 0), homeScore: null, awayScore: null }]);
assert.deepEqual(st.map((t) => [t.teamCode, t.wins, t.losses, t.rank, t.gamesBehind]), [["A", 2, 1, 1, 0], ["B", 1, 1, 2, 0.5], ["C", 0, 1, 3, 1]]);
assert.equal(st[0].streak, "1연승");
assert.deepEqual(st[0].last5, ["W", "L", "W"]);
assert.equal(st[0].homeWins, 2);
assert.equal(streakText(["W", "L", "L"]), "2연패");
console.log("metrics ok");
