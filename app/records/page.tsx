// 통산 기록 /records — 2003 여름리그부터 정규리그 박스스코어를 더한 통산 리더보드 (시즌별과 같은 LeadersView, 기본 단위 합계)
import { defaultSeason, getPlayersIndex, getSeasons, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import type { LeaderPlayer } from "@/lib/leaders";
import LeadersView, { type QualifyPreset } from "@/app/components/LeadersView";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import RecordsTabs from "@/app/components/RecordsTabs";

export const metadata = { title: "통산 기록" };

/** 통산 경기당·성공률 순위 기준 (우리 규칙 — KBL 통산 경기당은 200경기, WKBL 은 시즌이 짧아 100경기 기본) */
const PRESETS: QualifyPreset[] = [
  { label: "통산 100경기 이상", rule: { minGames: 100 } },
  { label: "통산 200경기 이상", rule: { minGames: 200 } },
  { label: "뛴 선수 전원", rule: { minGames: 0 } },
];

export default function RecordsPage() {
  const seasons = getSeasons();
  const players: LeaderPlayer[] = getPlayersIndex().map((p) => ({
    ...p.career,
    id: p.playerNo,
    nameKo: p.nameKo,
    teamCode: p.teamCode,
    teamName: teamName(p.teamCode),
    position: p.position,
  }));
  const oldest = seasons.at(-1);
  return (
    <PageShell view="records" season={defaultSeason()?.code}>
      <PageTitle title="기록" sub={oldest ? `${seasonShortLabel(oldest.label)}부터 WKBL 정규리그 통산 · 선수 ${players.length}명` : undefined} />
      <RecordsTabs active="career" season={defaultSeason()?.code ?? ""} />
      {players.length === 0 ? <EmptyData what="선수 기록" /> : <LeadersView players={players} presets={PRESETS} scope="career" screen="records" defaultMode="total" captionPrefix="통산" />}
    </PageShell>
  );
}
