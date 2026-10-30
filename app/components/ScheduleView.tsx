"use client";
// 일정 화면: 팀 칩(전체/팀) + 달별 경기 카드. GA4: filter_change(screen=schedule, team)
import { useState } from "react";
import { groupByMonth, teamGamesOf } from "@/lib/games";
import type { ProcessedGame } from "@/lib/types";
import ChipRow from "./ChipRow";
import GameCard from "./GameCard";
import { trackFilters } from "./track";

export default function ScheduleView({ games, teams }: { games: ProcessedGame[]; teams: { code: string; name: string }[] }) {
  const [team, setTeam] = useState("all");
  const list = team === "all" ? games : teamGamesOf(games, team);
  return (
    <div>
      <ChipRow
        label="팀"
        scroll
        className="mb-4"
        chips={[{ value: "all", label: "전체" }, ...teams.map((t) => ({ value: t.code, label: t.name }))]}
        value={team}
        onChange={(v) => {
          setTeam(v);
          trackFilters("schedule", { team: v });
        }}
      />
      {groupByMonth(list).map(([ym, gs]) => (
        <section key={ym} className="mb-6">
          <h2 className="mb-2 text-h2 font-bold">
            {Number(ym.slice(0, 4))}년 {Number(ym.slice(5, 7))}월
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gs.map((g) => (
              <GameCard key={`${g.gameNo}-${g.date}-${g.homeCode}`} g={g} showDate />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
