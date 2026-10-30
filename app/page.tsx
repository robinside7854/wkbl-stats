// 홈: 이번 시즌 한눈에 — 최근 경기일 결과 · 다음 경기 · 팀 순위 · 부문별 상위 5명
import Link from "next/link";
import { defaultSeason, getGames, getSeasonPlayers, getSeasons, getStandings, isOngoing, teamGames, teamName } from "@/lib/data";
import { longDate, seasonShortLabel } from "@/lib/format";
import { lastGameDay, nextGameDay } from "@/lib/games";
import { rankBy } from "@/lib/leaders";
import { seasonQualify } from "@/lib/metrics";
import GameCard from "./components/GameCard";
import { IconChevronRight } from "./components/icons";
import LeaderMini from "./components/LeaderMini";
import PageShell, { EmptyData } from "./components/PageShell";
import StandingsTable from "./components/StandingsTable";

export default function HomePage() {
  const season = defaultSeason();
  if (!season) {
    return (
      <PageShell view="home">
        <EmptyData />
      </PageShell>
    );
  }
  const code = season.code;
  const games = getGames(code);
  const last = lastGameDay(games);
  // 다음 경기: 맨 위 시즌(개막 전이면 새 시즌 일정)에서
  const newest = getSeasons()[0];
  const next = nextGameDay(getGames(newest.code));
  const rule = seasonQualify(teamGames(code), isOngoing(code));
  const players = getSeasonPlayers(code);
  const tn = (c: string) => teamName(c, code);
  const LEAD = [
    { key: "pts", title: "득점", unit: "점" },
    { key: "reb", title: "리바운드", unit: "개" },
    { key: "ast", title: "어시스트", unit: "개" },
  ] as const;

  return (
    <PageShell view="home" season={code}>
      <h1 className="sr-only">WKBL 스탯 홈</h1>
      <p className="mb-4 text-sub text-ink-3">
        {seasonShortLabel(season.label)} 정규리그 · {season.played}/{season.scheduled}경기 끝남
      </p>

      {next.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-h2 font-bold">
            다음 경기 <span className="text-body font-normal text-ink-3">{longDate(next[0].date)}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {next.map((g) => (
              <GameCard key={`${g.seasonCode}-${g.gameNo}-${g.homeCode}`} g={g} />
            ))}
          </div>
        </section>
      )}

      {last.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-h2 font-bold">
            최근 경기 <span className="text-body font-normal text-ink-3">{longDate(last[0].date)}</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {last.map((g) => (
              <GameCard key={g.gameNo} g={g} />
            ))}
          </div>
          <Link href={`/season/${code}/schedule`} className="focus-ring link-shortcut mt-1 text-sub">
            전체 일정
            <IconChevronRight size={16} />
          </Link>
        </section>
      )}

      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-h2 font-bold">팀 순위</h2>
          <StandingsTable rows={getStandings(code)} compact />
          <Link href={`/season/${code}/standings`} className="focus-ring link-shortcut mt-1 text-sub">
            자세히
            <IconChevronRight size={16} />
          </Link>
        </section>
        <section>
          <h2 className="mb-2 text-h2 font-bold">부문별 1~5위</h2>
          {players.length === 0 ? (
            <EmptyData what="선수 기록" />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {LEAD.map((l) => (
                <LeaderMini key={l.key} title={`${l.title} (경기당)`} unit={l.unit} rows={rankBy(players, l.key, "avg", rule).slice(0, 5)} teamName={tn} />
              ))}
            </div>
          )}
          <Link href={`/season/${code}/leaders`} className="focus-ring link-shortcut mt-1 text-sub">
            리더보드
            <IconChevronRight size={16} />
          </Link>
        </section>
      </div>
    </PageShell>
  );
}
