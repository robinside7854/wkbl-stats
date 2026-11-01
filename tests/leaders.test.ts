// 리더보드 규칙 (lib/leaders — kbl-stats 와 같은 정렬·순위·시도 기준)
import assert from "node:assert/strict";
import { emptyLine } from "../lib/metrics";
import { attemptThresholds, defaultSortDir, filterLeaders, formatStat, isRankEligible, rankMap, sortLeaders, statValue, topLeaders, type LeaderPlayer } from "../lib/leaders";

const mk = (id: string, games: number, p: Partial<ReturnType<typeof emptyLine>>, extra: Partial<LeaderPlayer> = {}): LeaderPlayer => ({
  ...emptyLine(),
  ...p,
  id,
  nameKo: id,
  teamCode: "01",
  teamName: "KB",
  position: "G",
  games,
  ...extra,
});

const ps = [
  mk("a", 20, { pts: 300, sec: 600 * 60, twoPm: 50, twoPa: 100, tov: 40 }),
  mk("b", 20, { pts: 300, sec: 400 * 60, twoPm: 60, twoPa: 100, tov: 20 }),
  mk("c", 10, { pts: 400, sec: 300 * 60, twoPm: 10, twoPa: 12, tov: 10 }, { position: "C", teamCode: "03" }),
  mk("d", 20, { pts: 10, sec: 100 * 60, twoPm: 2, twoPa: 2 }),
];

// 단위: 경기당 / 30분당 / 합계, 비율은 단위와 관계없음
assert.equal(statValue(ps[0], "pts", "perGame"), 15);
assert.equal(statValue(ps[0], "pts", "per30"), (300 / 600) * 30);
assert.equal(statValue(ps[0], "pts", "total"), 300);
assert.equal(statValue(ps[0], "minutes", "per30"), 30, "출전시간의 30분당은 경기당으로");
assert.equal(statValue(ps[0], "fgPct", "total"), 50);
assert.equal(formatStat(1234, "pts", "total"), "1,234");
assert.equal(formatStat(15, "pts", "perGame"), "15.0");

// 정렬 방향 기본값: 턴오버·파울은 적은 순
assert.equal(defaultSortDir("tov"), "asc");
assert.equal(defaultSortDir("pts"), "desc");

// 순위: 동점 같은 순위(1,1,3), 반대 정렬해도 순위는 상위 방향 기준
const r = rankMap(ps.slice(0, 2).concat(ps[3]), "pts", "total");
assert.deepEqual([r.get("a"), r.get("b"), r.get("d")], [1, 1, 3]);
assert.deepEqual(sortLeaders(ps, "pts", "asc", "perGame").map((p) => p.id), ["d", "a", "b", "c"]);
assert.deepEqual(sortLeaders(ps, "tov", defaultSortDir("tov"), "total").map((p) => p.id)[0], "d");

// 필터: 표본 기준·포지션·팀
assert.deepEqual(filterLeaders(ps, { position: "all", teamCode: null, rule: { minGames: 15 } }).map((p) => p.id), ["a", "b", "d"]);
assert.deepEqual(filterLeaders(ps, { position: "C", teamCode: null, rule: { minGames: 0 } }).map((p) => p.id), ["c"]);
assert.deepEqual(filterLeaders(ps, { position: "all", teamCode: "03", rule: { minGames: 0 } }).map((p) => p.id), ["c"]);

// 시도 기준 = 표본 기준을 넘은 선수들의 경기당 시도 평균: (100+100+2)/60 ≈ 3.37
const t = attemptThresholds(ps, { minGames: 15 });
assert.ok(Math.abs(t.fga - 202 / 60) < 1e-9);
assert.equal(isRankEligible(ps[3], "fgPct", t), false, "2개 던진 100% 는 순위 없음");
assert.equal(rankMap(ps, "fgPct", "perGame", t).has("d"), false);
// c 도 경기당 1.2개라 기준 미달 → 기준 미달 둘은 값과 관계없이 뒤로(그 안에서는 값 순)
assert.deepEqual(sortLeaders(ps, "fgPct", "desc", "perGame", t).map((p) => p.id), ["b", "a", "d", "c"], "기준 미달은 맨 뒤");
assert.deepEqual(topLeaders(ps, "fgPct", "perGame", 3, t).map((e) => [e.player.id, e.rank]), [["b", 1], ["a", 2]]);
console.log("leaders ok");
