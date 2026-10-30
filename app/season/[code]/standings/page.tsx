// 팀 순위 /season/{코드}/standings
import { notFound } from "next/navigation";
import { getSeason, getSeasons, getStandings } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import StandingsTable from "@/app/components/StandingsTable";

export const dynamicParams = false;
export function generateStaticParams() {
  return getSeasons().map((s) => ({ code: s.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const s = getSeason((await params).code);
  return { title: s ? `${seasonShortLabel(s.label)} 팀 순위` : "팀 순위" };
}

export default async function StandingsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const season = getSeason(code);
  if (!season) notFound();
  const rows = getStandings(code);
  return (
    <PageShell view="standings" season={code}>
      <PageTitle title="팀 순위" sub={`${seasonShortLabel(season.label)} 정규리그 · ${season.played}/${season.scheduled}경기 끝남`} />
      {rows.length === 0 ? <EmptyData what="경기 결과" /> : <StandingsTable rows={rows} />}
    </PageShell>
  );
}
