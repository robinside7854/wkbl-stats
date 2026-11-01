// 선수 탭 /players — 시즌 하나의 선수 카드 격자 (kbl-stats 선수 탭과 같은 틀). 첫 시즌은 HTML 에, 다른 시즌은 브라우저가 받는다
import { getPlayersIndex, getSeasonPlayers, getSeasons, teamName } from "@/lib/data";
import { seasonShortLabel } from "@/lib/format";
import { toGridPlayers } from "@/lib/players-grid";
import PageShell, { EmptyData, PageTitle } from "@/app/components/PageShell";
import PlayersView from "@/app/components/PlayersView";

export const metadata = { title: "선수" };

export default function PlayersPage() {
  const seasons = getSeasons().filter((s) => s.players > 0);
  const first = seasons[0];
  const profiles = new Map(getPlayersIndex().map((p) => [p.playerNo, p.profile]));
  const initial = first
    ? { season: first.code, players: toGridPlayers(getSeasonPlayers(first.code), (id) => profiles.get(id) ?? null, (c) => teamName(c, first.code)) }
    : null;
  return (
    <PageShell view="players">
      <PageTitle title="선수" />
      {!initial ? (
        <EmptyData what="선수 기록" />
      ) : (
        <PlayersView seasons={seasons.map((s) => ({ code: s.code, label: seasonShortLabel(s.label) }))} initial={initial} />
      )}
    </PageShell>
  );
}
