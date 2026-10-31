// 시즌 능력치 6축·등급 규칙 확인 (lib/grades)
import assert from "node:assert/strict";
import { emptyLine } from "../lib/metrics";
import { gradeOf, gradeSeason, percentileRank, playerTypeOf, score99 } from "../lib/grades";

assert.equal(percentileRank(5, [1, 5, 9]), 50);
assert.equal(percentileRank(9, [1, 5, 9]), (2 + 0.5) / 3 * 100);
assert.equal(gradeOf(90), "S");
assert.equal(gradeOf(89.9), "A");
assert.equal(gradeOf(94.9, true), "A");
assert.equal(gradeOf(10, true), "D");
assert.equal(score99(100), 99);
assert.equal(score99(0), 1);

// 유형: 5축 70+ 올라운더 / 가장 높은 강점 축 / 강점 없으면 롤플레이어
const ax = (o: number, s: number, r: number, p: number, d: number, e: number) => ({ offense: o, shooting: s, rebound: r, playmaking: p, defense: d, efficiency: e });
assert.equal(playerTypeOf(ax(80, 75, 72, 71, 90, 10)), "allround");
assert.equal(playerTypeOf(ax(65, 92, 10, 20, 30, 61)), "shooting");
assert.equal(playerTypeOf(ax(59, 50, 10, 20, 30, 40)), "role");

// 집단: 기준 경기 미달은 빠지고, 득점·리바만 많은 선수는 공격·리바운드 축이 높다
const mk = (games: number, p: Partial<ReturnType<typeof emptyLine>>, key: string) => ({ ...emptyLine(), ...p, games, key });
const players = [
  mk(30, { pts: 600, twoPm: 240, twoPa: 480, ftm: 120, fta: 150, oreb: 90, dreb: 210, reb: 300, ast: 30, tov: 60 }, "big"),
  mk(30, { pts: 300, threePm: 60, threePa: 150, twoPm: 50, twoPa: 120, ftm: 20, fta: 25, ast: 150, tov: 50, stl: 45 }, "guard"),
  mk(30, { pts: 150, twoPm: 60, twoPa: 140, ftm: 30, fta: 40, reb: 60, dreb: 60, ast: 20, tov: 20, blk: 20 }, "role1"),
  mk(30, { pts: 120, twoPm: 50, twoPa: 130, ftm: 20, fta: 30, reb: 40, dreb: 40, ast: 40, tov: 25, stl: 20 }, "role2"),
  mk(30, { pts: 90, threePm: 20, threePa: 60, twoPm: 10, twoPa: 30, ftm: 10, fta: 12, reb: 30, dreb: 30, ast: 30, tov: 15 }, "role3"),
  mk(3, { pts: 90, twoPm: 45, twoPa: 50 }, "short"),
];
const g = gradeSeason(players, (p) => p.key, 15);
assert.equal(g.has("short"), false, "기준 미달은 등급 없음");
assert.equal(g.size, 5);
const big = g.get("big")!;
assert.ok(big.axes.offense >= 90 && big.axes.rebound >= 90, "빅맨: 공격·리바운드 1위");
assert.ok(g.get("guard")!.axes.playmaking >= 90, "가드: 리딩 1위");
assert.equal(g.get("guard")!.parts.tpPct !== null, true);
assert.equal(g.get("role1")!.parts.tpPct, null, "3점 시도가 없으면 3점% 요소 없음");
assert.equal(big.poolSize, 5);
// 인원이 5명 미만이면 등급을 매기지 않는다
assert.equal(gradeSeason(players.slice(0, 3), (p) => p.key, 15).size, 0);
console.log("grades ok");
