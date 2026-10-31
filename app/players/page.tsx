// 선수 탭 /players
import { getPlayersIndex, getSeasonPlayers, getSeasons, teamName } from "@/lib/data";
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
  // 마지막 시즌 종합 등급 (표본 미달이면 없음)
  const gradeOf = (no: string, season: string) => getSeasonPlayers(season).find((x) => x.playerNo === no)?.grade ?? null;
  const rows: PlayerRow[] = getPlayersIndex().map((p) => {
    const g = gradeOf(p.playerNo, p.lastSeason);
    return {
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
    grade: g ? { g: g.overallGrade, pct: Math.round(g.overall), season: label(p.lastSeason) } : null,
  };
  });
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
