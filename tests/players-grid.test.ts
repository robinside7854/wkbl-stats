// lib/players-grid 정렬·필터 검증 (npm test)
import assert from "node:assert/strict";
import { DEFAULT_GRID_FILTER, filterGrid, gradeCounts, sortGrid, type GridPlayer } from "../lib/players-grid";

const p = (id: string, o: Partial<GridPlayer>): GridPlayer => ({
  id, ko: id, team: "01", teamName: "KB", pos: "G", games: 30, ppg: 10, rpg: 3, apg: 2, grade: null, h: null, b: null, ...o,
});
const list = [
  p("a", { grade: { g: "A", s: 80 }, ppg: 15, h: 180, b: "1995-01-01" }),
  p("b", { grade: { g: "S", s: 97 }, ppg: 20, h: 175, b: "2000-01-01", pos: "F", team: "03" }),
  p("c", { ppg: 25 }),
  p("d", { grade: { g: "C", s: 40 }, ppg: 5, h: 190, b: "1990-05-05", pos: "C" }),
];
const ids = (l: GridPlayer[]) => l.map((x) => x.id);

// 등급순: 점수 큰 순, 등급 없는 선수는 맨 뒤 — 반대 순서에서도 맨 뒤
assert.deepEqual(ids(sortGrid(list, "grade")), ["b", "a", "d", "c"]);
assert.deepEqual(ids(sortGrid(list, "grade", true)), ["d", "a", "b", "c"]);
assert.deepEqual(ids(sortGrid(list, "ppg")), ["c", "b", "a", "d"]);
// 키순: 키 없는 선수(c) 맨 뒤
assert.deepEqual(ids(sortGrid(list, "height")), ["d", "a", "b", "c"]);
assert.deepEqual(ids(sortGrid(list, "height", true)), ["b", "a", "d", "c"]);
// 나이순 기본 = 나이 많은 순
assert.deepEqual(ids(sortGrid(list, "age")), ["d", "a", "b", "c"]);
assert.deepEqual(ids(sortGrid(list, "age", true)), ["b", "a", "d", "c"]);

assert.deepEqual(ids(filterGrid(list, { ...DEFAULT_GRID_FILTER, grade: "S" })), ["b"]);
assert.deepEqual(ids(filterGrid(list, { ...DEFAULT_GRID_FILTER, position: "G" })), ["a", "c"]);
assert.deepEqual(ids(filterGrid(list, { ...DEFAULT_GRID_FILTER, team: "03" })), ["b"]);
assert.equal(gradeCounts(list).get("S"), 1);
assert.equal(gradeCounts(list).has("F"), false);
console.log("players-grid ok");
