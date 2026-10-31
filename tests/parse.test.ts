// 공홈 HTML 읽기 확인 — 표본은 2026-10-30 GitHub Actions 조사 응답(tests/fixtures). 공홈 화면이 바뀌면 여기서 먼저 깨진다.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isRegularLeague, minutesToSec, parseBoxScore, parseDraft, parseMonthOptions, parseProfile, parseSchedule, parseSeasonOptions } from "../scripts/parse";

const fx = (f: string) => readFileSync(join(import.meta.dirname, "fixtures", f), "utf8");

// 박스스코어: 2003 여름·2010-11·2025-26 세 시대 모두 선수 득점 합 = 팀합계, 출전 합 = 200분
for (const f of ["box-013-001.html", "box-031-001.html", "box-046-001.html"]) {
  const box = parseBoxScore(fx(f));
  assert.ok(box, `${f} 읽기`);
  assert.equal(box.teams.length, 2);
  for (const t of box.teams) {
    assert.ok(t.total, `${f} 팀합계`);
    assert.equal(t.players.reduce((a, p) => a + p.pts, 0), t.total.pts, `${f} ${t.teamName} 득점 합`);
    assert.equal(t.players.reduce((a, p) => a + p.reb, 0), t.total.reb, `${f} ${t.teamName} 리바 합`);
    assert.equal(t.players.reduce((a, p) => a + p.sec, 0), 200 * 60, `${f} ${t.teamName} 출전 합`);
    for (const p of t.players) {
      assert.match(p.playerNo, /^\d{6}$/);
      assert.equal(p.pts, 2 * p.twoPm + 3 * p.threePm + p.ftm, `${p.nameKo} 득점 = 2점×2 + 3점×3 + 자유투`);
      assert.equal(p.reb, p.oreb + p.dreb);
    }
  }
}
const b46 = parseBoxScore(fx("box-046-001.html"))!;
assert.equal(b46.teams[0].teamName, "BNK 썸");
const ahn = b46.teams[0].players[0];
assert.deepEqual([ahn.nameKo, ahn.position, ahn.sec, ahn.twoPm, ahn.twoPa, ahn.ast, ahn.pts], ["안혜지", "G", 35 * 60 + 2, 5, 10, 5, 10]);

// 머리글이 바뀌면 조용히 틀린 숫자를 만들지 않고 멈춘다
assert.throws(() => parseBoxScore(fx("box-046-001.html").replace(">3PM-A<", ">3P<")), /머리글/);
assert.equal(parseBoxScore("<div>경기 결과 데이터가 없습니다</div>"), null);

// 일정: 먼저 나오는 팀이 홈(경기장으로 확인), 경기 번호·날짜·점수
const nov = parseSchedule(fx("schedule-046-202511.html"), "046");
assert.equal(nov.length, 13);
assert.deepEqual(
  [nov[0].gameNo, nov[0].date, nov[0].time, nov[0].homeCode, nov[0].homeName, nov[0].awayCode, nov[0].homeScore, nov[0].awayScore, nov[0].venue],
  [1, "2025-11-16", "14:25", "11", "BNK 썸", "07", 65, 54, "부산사직실내체육관"],
);
const feb = parseSchedule(fx("schedule-046-202602.html"), "046");
assert.deepEqual(feb.map((g) => g.gameNo), Array.from({ length: 22 }, (_, i) => 60 + i));

// 올스타전(game_type 10)은 정규리그 일정에서 뺀다
const allStar = fx("schedule-046-202511.html").replace("game_type=01&game_no=1&", "game_type=10&game_no=1&").replace("goTodayGame('01', 1)", "goTodayGame('10', 1)").replace("goLive('01', 1)", "goLive('10', 1)");
assert.equal(parseSchedule(allStar, "046").length, 12);

// 시즌·달 선택 상자
const { seasons, selected } = parseSeasonOptions(fx("schedule-page-047.html"));
assert.equal(selected, "047");
assert.equal(seasons[0].label, "2026-2027");
assert.ok(seasons.some((s) => s.code === "013" && s.label === "2003여름"));
assert.equal(isRegularLeague({ code: "030", label: "2010퓨처스" }), false);
assert.deepEqual(parseMonthOptions(fx("schedule-page-047.html")), ["202611", "202612", "202701", "202702", "202703"]);

assert.equal(minutesToSec("35:02"), 2102);
assert.equal(minutesToSec("-"), 0);
// 선수 프로필: 현역(detail.asp)·신인(출신교 없음)·은퇴(detail2.asp, 드래프트 없음). 주석 안 옛 팀 태그는 무시
const kim = parseProfile(fx("profile-095104.html"))!;
assert.deepEqual(
  [kim.backNumber, kim.teamLabel, kim.position, kim.heightCm, kim.birthDate, kim.school, kim.draft?.year, kim.draft?.round, kim.draft?.pick, kim.draft?.overall, kim.draft?.team],
  ["23", "우리은행 우리WON", "F", 180, "1990-02-27", "명신여자고등학교", 2008, 1, 2, 2, "금호생명 레드윙스"],
);
const rookie = parseProfile(fx("profile-095937.html"))!;
assert.deepEqual([rookie.backNumber, rookie.school, rookie.draft?.year, rookie.draft?.overall], ["3", null, 2026, 1]);
const retired = parseProfile(fx("profile2-002008.html"))!;
assert.deepEqual([retired.backNumber, retired.teamLabel, retired.heightCm, retired.birthDate, retired.draft], ["09", "금호생명 레드윙스", 175, "1979-11-21", null]);
assert.equal(parseProfile("<div>선수 정보가 없습니다</div>"), null);
assert.equal(parseDraft("-"), null);

console.log("parse ok");
