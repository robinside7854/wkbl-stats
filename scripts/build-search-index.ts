// 빌드 전(prebuild·predev): data/processed/players.json → public/search-index.json (상단 검색창이 처음 누를 때 받는다)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PROCESSED_DIR, ROOT } from "./config";
import { seasonShortLabel } from "../lib/format";
import type { PlayerIndexRow, SeasonSummary } from "../lib/types";

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

const players = await readJson<PlayerIndexRow[]>(join(PROCESSED_DIR, "players.json"), []);
const seasons = await readJson<SeasonSummary[]>(join(PROCESSED_DIR, "seasons.json"), []);
const teams = await readJson<Record<string, { name: string }>>(join(PROCESSED_DIR, "teams.json"), {});
const label = (c: string) => seasonShortLabel(seasons.find((s) => s.code === c)?.label ?? c);
const out = players.map((p) => ({
  no: p.playerNo,
  ko: p.nameKo,
  en: p.nameEn,
  team: p.teamCode,
  teamName: teams[p.teamCode]?.name ?? "",
  span: p.firstSeason === p.lastSeason ? label(p.firstSeason) : `${label(p.firstSeason)} ~ ${label(p.lastSeason)}`,
}));
await mkdir(join(ROOT, "public"), { recursive: true });
await writeFile(join(ROOT, "public", "search-index.json"), JSON.stringify(out));
console.log(`검색 목록 ${out.length}명`);
