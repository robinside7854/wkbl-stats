// 시즌 리더보드 /season/{코드}/leaders (KBL 리더보드와 같은 배치 — LeadersView)
import { notFound } from "next/navigation";
import Link from "next/link";
import { getSeason, getSeasonPlayers, getSeasons, teamGames, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import { QUALIFY_SHARE } from "@/lib/metrics";
import type { LeaderPlayer } from "@/lib/leaders";
import LeadersView, { type QualifyPreset } from "@/app/components/LeadersView";
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
  const players: LeaderPlayer[] = getSeasonPlayers(code).map(({ grade: _g, teamCodes: _t, highPts: _h, dd: _d, nameEn: _e, playerNo, ...p }) => ({
    ...p,
    id: playerNo,
    teamName: teamName(p.teamCode, code),
  }));
  // 표본 기준: 팀 경기 절반 이상(진행 중 시즌도 같게 — KBL 2026-10-14 규칙) / 출전 선수 전원
  const half = Math.ceil(teamGames(code) * QUALIFY_SHARE);
  const presets: QualifyPreset[] = [
    { label: `팀 경기 절반 이상 (${half}경기+)`, rule: { minGames: half } },
    { label: "출전 선수 전원", rule: { minGames: 0 } },
  ];
  const short = seasonShortLabel(season.label);
  return (
    <PageShell view="leaders" season={code}>
      <PageTitle title="기록" sub={`${short} WKBL 정규리그 · 선수 ${players.length}명`} />
      <RecordsTabs active="season" season={code} />
      {players.length === 0 ? <EmptyData what="선수 기록" /> : <LeadersView players={players} presets={presets} scope="season" screen="leaders" captionPrefix={short} />}
      <p className="mt-3 text-caption text-ink-3">
        박스스코어 {season.withBox}/{season.played}경기로 더한 기록이에요.{" "}
        <Link href="/glossary#source" className="underline underline-offset-2">
          데이터 범위
        </Link>
      </p>
    </PageShell>
  );
}
