// 역대 수상: 공홈 화면 3개 파싱 + 이름 → 선수 번호 (npm test)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAwardsBest5, parseAwardsStats, parseAwardsVote } from "../scripts/parse";
import { awardCounts, awardRows, matchAwards } from "../lib/awards";

const fx = (n: string) => readFileSync(new URL(`./fixtures/awards-${n}.html`, import.meta.url), "utf8");
const vote = parseAwardsVote(fx("vote"));
const stats = parseAwardsStats(fx("stats"));
const best5 = parseAwardsBest5(fx("best5"));

const s2526 = vote.filter((v) => v.season === "2025-2026");
assert.deepEqual(
  s2526.map((v) => `${v.key}:${v.name}`),
  ["mvp:박지수", "finalsMvp:허예은", "asia:이이지마 사키", "rookie:김도연", "defense:이해란", "sixth:송윤하", "fairPlay:진 안", "mip:신이슬"],
);
// 외국인 선수상 "-" 는 빠진다, 옛 시즌 표기 "2007 겨울" → "2007겨울"
assert.ok(vote.some((v) => v.season === "2007겨울"));
assert.deepEqual(stats.find((s) => s.season === "2025-2026" && s.key === "scoring"), { season: "2025-2026", key: "scoring", name: "김단비", team: null, value: "18.33점" });
assert.equal(stats.filter((s) => s.season === "2025-2026").length, 10);
// BEST5: 한 칸에 둘이 붙은 2013-14 도 다섯 명
assert.deepEqual(best5.filter((b) => b.season === "2013-2014").map((b) => b.name), ["이미선", "박혜진", "임영희", "김정은", "스트릭렌"]);
assert.equal(best5.find((b) => b.season === "2025-2026")?.team, "KB스타즈");

// 이름 → 번호: 같은 시즌 동명이인은 BEST5 팀, 없으면 그 시즌 득점
const roster = [
  { playerNo: "095104", nameKo: "김단비", teamName: "우리은행", teamCode: "05", games: 30, pts: 515 },
  { playerNo: "095226", nameKo: "김단비", teamName: "삼성생명", teamCode: "03", games: 30, pts: 192 },
  { playerNo: "095900", nameKo: "진안", teamName: "하나은행", teamCode: "09", games: 30, pts: 300 },
  { playerNo: "095800", nameKo: "앨리사 토마스", teamName: "삼성생명", teamCode: "03", games: 30, pts: 400 },
];
const r = matchAwards(
  [
    { season: "2025-2026", key: "best5", name: "김단비", team: "삼성생명", value: null },
    { season: "2025-2026", key: "scoring", name: "김단비", team: null, value: "18.33점" },
    { season: "2025-2026", key: "fairPlay", name: "진 안", team: null, value: null },
    { season: "2025-2026", key: "best5", name: "A. 토마스", team: "삼성생명", value: null },
    { season: "2025-2026", key: "mip", name: "김단비 (삼성생명)", team: null, value: null },
    { season: "2025-2026", key: "mvp", name: "없는 사람", team: null, value: null },
    { season: "1999여름", key: "mvp", name: "정은순", team: null, value: null },
  ],
  (l) => (l === "2025-2026" ? "046" : null),
  () => roster,
);
assert.deepEqual(r.matched.map((m) => m.playerNo), ["095226", "095104", "095900", "095800", "095226"]);
assert.equal(r.unmatched.length, 1);
assert.equal(r.outOfRange, 1);
assert.deepEqual(awardCounts(r.byPlayer.get("095104")!), { scoring: 1 });
assert.deepEqual(
  awardRows([
    { key: "scoring", seasonCode: "046", value: null },
    { key: "mvp", seasonCode: "045", value: null },
    { key: "mvp", seasonCode: "044", value: null },
  ]).map((x) => `${x.key}:${x.seasons.map((s) => s.code).join(",")}`),
  ["mvp:044,045", "scoring:046"],
);
console.log("awards ok");
{
  const { honorChips } = await import("../lib/awards");
  assert.deepEqual(
    honorChips(
      [
        { key: "mvp", seasonCode: "045", value: null },
        { key: "best5", seasonCode: "045", value: null },
        { key: "best5", seasonCode: "044", value: null },
        { key: "rookie", seasonCode: "030", value: null },
        { key: "scoring", seasonCode: "045", value: null },
      ],
      3,
    ).map((c) => c.label),
    ["우승 3회", "정규리그 MVP 1회", "BEST 5 2회", "신인상"],
  );
  const { pickPrimeSeason } = await import("../lib/grades");
  const g = (overall: number) => ({ overall }) as never;
  assert.equal(pickPrimeSeason([{ seasonCode: "045", games: 30, grade: g(90) }]), null);
  assert.equal(pickPrimeSeason([{ seasonCode: "045", games: 30, grade: g(90) }, { seasonCode: "044", games: 30, grade: g(97) }, { seasonCode: "043", games: 10, grade: null }]), "044");
  console.log("awards honors ok");
}
