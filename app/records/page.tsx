// 통산 기록 /records — 2003 여름리그부터 정규리그 박스스코어를 더한 통산 순위
import { defaultSeason, getPlayersIndex, getSeasons, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import { pickLine } from "@/lib/leaders";
import LeadersView, { type LeaderInput } from "@/app/components/LeadersView";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import RecordsTabs from "@/app/components/RecordsTabs";

export const metadata = { title: "통산 기록" };

/** 통산 경기당·성공률 순위 기준 (우리 규칙): 100경기 이상 */
const CAREER_MIN_GAMES = 100;

export default function RecordsPage() {
  const seasons = getSeasons();
  const label = (c: string) => seasonShortLabel(seasons.find((s) => s.code === c)?.label ?? c);
  const rows: LeaderInput[] = getPlayersIndex().map((p) => ({
    ...pickLine(p.career),
    playerNo: p.playerNo,
    nameKo: p.nameKo,
    teamCode: p.teamCode,
    teamName: teamName(p.teamCode),
    position: p.position,
    sub: p.firstSeason === p.lastSeason ? label(p.firstSeason) : `${label(p.firstSeason)}~${label(p.lastSeason)}`,
  }));
  const oldest = seasons.at(-1);
  return (
    <PageShell view="records" season={defaultSeason()?.code}>
      <PageTitle title="기록" sub={oldest ? `${seasonShortLabel(oldest.label)}부터 정규리그 통산 · 선수 ${rows.length}명` : undefined} />
      <RecordsTabs active="career" season={defaultSeason()?.code ?? ""} />
      {rows.length === 0 ? (
        <EmptyData what="선수 기록" />
      ) : (
        <LeadersView rows={rows} rule={{ minGames: CAREER_MIN_GAMES }} screen="records" defaultMode="total" ruleNote={`통산 ${CAREER_MIN_GAMES}경기 이상`} />
      )}
    </PageShell>
  );
}
