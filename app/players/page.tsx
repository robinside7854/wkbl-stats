// 선수 탭 /players
import { getPlayersIndex, getSeasons, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import { perGame } from "@/lib/metrics";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import PlayersView, { type PlayerRow } from "@/app/components/PlayersView";

export const metadata = { title: "선수" };

export default function PlayersPage() {
  const seasons = getSeasons();
  // "지금 시즌" = 선수 기록이 있는 가장 최근 시즌
  const current = seasons.find((s) => s.players > 0)?.code ?? "";
  const label = (c: string) => seasonShortLabel(seasons.find((s) => s.code === c)?.label ?? c);
  const rows: PlayerRow[] = getPlayersIndex().map((p) => ({
    no: p.playerNo,
    ko: p.nameKo,
    en: p.nameEn,
    team: p.teamCode,
    teamName: teamName(p.teamCode),
    pos: p.position,
    span: p.firstSeason === p.lastSeason ? label(p.firstSeason) : `${label(p.firstSeason)}~${label(p.lastSeason)}`,
    active: p.lastSeason === current,
    games: p.career.games,
    ppg: perGame(p.career.pts, p.career.games),
    rpg: perGame(p.career.reb, p.career.games),
    apg: perGame(p.career.ast, p.career.games),
    pts: p.career.pts,
  }));
  const teams = [...new Set(rows.filter((r) => r.active).map((r) => r.team))]
    .map((code) => ({ code, name: teamName(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return (
    <PageShell view="players">
      <PageTitle title="선수" sub={`2003 여름리그부터 정규리그에 뛴 선수 ${rows.length}명`} />
      {rows.length === 0 ? <EmptyData what="선수 기록" /> : <PlayersView rows={rows} teams={teams} />}
    </PageShell>
  );
}
