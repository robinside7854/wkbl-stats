// 일정·결과 /season/{코드}/schedule — 달별로, 팀 칩으로 거르기(ScheduleView)
import { notFound } from "next/navigation";
import { getGames, getSeason, getSeasons } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import ScheduleView from "@/app/components/ScheduleView";

export const dynamicParams = false;
export function generateStaticParams() {
  return getSeasons().map((s) => ({ code: s.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const s = getSeason((await params).code);
  return { title: s ? `${seasonShortLabel(s.label)} 일정` : "일정" };
}

export default async function SchedulePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const season = getSeason(code);
  if (!season) notFound();
  const games = getGames(code);
  const teams = [...new Map(games.flatMap((g) => [[g.homeCode, g.homeName], [g.awayCode, g.awayName]] as [string, string][])).entries()]
    .map(([teamCode, name]) => ({ code: teamCode, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  return (
    <PageShell view="schedule" season={code}>
      <PageTitle title="일정·결과" sub={`${seasonShortLabel(season.label)} 정규리그 · ${season.scheduled}경기`} />
      {games.length === 0 ? <EmptyData what="일정" /> : <ScheduleView games={games} teams={teams} />}
    </PageShell>
  );
}
