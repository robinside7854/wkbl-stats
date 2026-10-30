// 시즌 리더보드 /season/{코드}/leaders
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeason, getSeasonPlayers, getSeasons, isOngoing, teamGames, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import { seasonQualify } from "@/lib/metrics";
import { pickLine } from "@/lib/leaders";
import LeadersView, { type LeaderInput } from "@/app/components/LeadersView";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import RecordsTabs from "@/app/components/RecordsTabs";

export const dynamicParams = false;
export function generateStaticParams() {
  return getSeasons().map((s) => ({ code: s.code }));
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  const s = getSeason((await params).code);
  return { title: s ? `${seasonShortLabel(s.label)} 리더보드` : "리더보드" };
}

export default async function LeadersPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const season = getSeason(code);
  if (!season) notFound();
  const ongoing = isOngoing(code);
  const rule = seasonQualify(teamGames(code), ongoing);
  const rows: LeaderInput[] = getSeasonPlayers(code).map((p) => ({
    ...pickLine(p),
    playerNo: p.playerNo,
    nameKo: p.nameKo,
    teamCode: p.teamCode,
    teamName: teamName(p.teamCode, code),
    position: p.position,
  }));
  return (
    <PageShell view="leaders" season={code}>
      <PageTitle title="기록" sub={`${seasonShortLabel(season.label)} 정규리그 · 선수 ${rows.length}명`} />
      <RecordsTabs active="season" season={code} />
      {rows.length === 0 ? (
        <EmptyData what="선수 기록" />
      ) : (
        <LeadersView rows={rows} rule={rule} screen="leaders" ruleNote={rule.minGames > 0 ? `${rule.minGames}경기 이상 뛴 선수` : "진행 중 시즌 — 뛴 선수 모두"} />
      )}
      <p className="mt-3 text-caption text-ink-3">
        박스스코어 {season.withBox}/{season.played}경기로 더한 기록이에요.{" "}
        <Link href="/glossary#source" className="underline underline-offset-2">
          데이터 범위
        </Link>
      </p>
    </PageShell>
  );
}
