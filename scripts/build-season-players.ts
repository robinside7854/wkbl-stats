// 빌드 전(prebuild·predev): 시즌마다 선수 탭 카드 파일 public/season-players/{시즌}.json (선수 탭이 시즌을 바꿀 때 받는다)
// 형식·변환은 lib/players-grid — 선수 탭 첫 화면(서버)과 같은 함수
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PROCESSED_DIR, ROOT } from "./config";
import { toGridPlayers, type SeasonPlayersFile } from "../lib/players-grid";
import type { PlayerIndexRow, PlayerSeason, SeasonSummary } from "../lib/types";

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

const seasons = await readJson<SeasonSummary[]>(join(PROCESSED_DIR, "seasons.json"), []);
const index = await readJson<PlayerIndexRow[]>(join(PROCESSED_DIR, "players.json"), []);
const teams = await readJson<Record<string, { name: string; bySeason: Record<string, string> }>>(join(PROCESSED_DIR, "teams.json"), {});
const profiles = new Map(index.map((p) => [p.playerNo, p.profile]));
const out = join(ROOT, "public", "season-players");
await mkdir(out, { recursive: true });
let n = 0;
for (const s of seasons) {
  const players = await readJson<PlayerSeason[]>(join(PROCESSED_DIR, s.code, "players.json"), []);
  if (players.length === 0) continue;
  const file: SeasonPlayersFile = {
    season: s.code,
    players: toGridPlayers(players, (id) => profiles.get(id) ?? null, (c) => teams[c]?.bySeason[s.code] ?? teams[c]?.name ?? c),
  };
  await writeFile(join(out, `${s.code}.json`), JSON.stringify(file));
  n++;
}
console.log(`시즌 선수 카드 파일 ${n}개`);
