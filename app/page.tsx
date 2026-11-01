// 홈: 이번 시즌 한눈에 — 득점 1위 표지 · 다음 경기 · 최근 경기 · 팀 순위 카드 · 능력치 상위 · 부문별 상위 5명
import Link from "next/link";
import { defaultSeason, getGames, getSeasonPlayers, getSeasons, getStandings, teamGames, teamName } from "@/lib/data";
import { longDate } from "@/lib/format";
import { lastGameDay, nextGameDay } from "@/lib/games";
import { attemptThresholds, topLeaders, type LeaderPlayer } from "@/lib/leaders";
import { perGame, seasonQualify } from "@/lib/metrics";
import GameCard from "./components/GameCard";
import { IconChevronRight } from "./components/icons";
import LeaderMini from "./components/LeaderMini";
import PageShell, { EmptyData } from "./components/PageShell";
import HelpPopover from "./components/HelpPopover";
import HomeHero from "./components/HomeHero";
import StandingsCards from "./components/StandingsCards";
import TopGraded from "./components/TopGraded";

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
  // 리더보드 기본과 같은 표본 기준(팀 경기 절반 이상)
  const rule = seasonQualify(teamGames(code), false);
  const players = getSeasonPlayers(code);
  const leaderPlayers: LeaderPlayer[] = players.filter((p) => p.games >= rule.minGames).map((p) => ({ ...p, id: p.playerNo, teamName: teamName(p.teamCode, code) }));
  const thr = attemptThresholds(leaderPlayers, rule);
  const top5 = (key: "pts" | "reb" | "ast") => topLeaders(leaderPlayers, key, "perGame", 5, thr);
  const tn = (c: string) => teamName(c, code);
  const topEntry = top5("pts")[0];
  const topScorer = topEntry ? players.find((p) => p.playerNo === topEntry.player.id) ?? null : null;
  const graded = players
    .filter((p) => p.grade)
    .sort((a, b) => b.grade!.overall - a.grade!.overall)
    .slice(0, 6)
    .map((p) => ({ playerNo: p.playerNo, nameKo: p.nameKo, teamCode: p.teamCode, teamName: tn(p.teamCode), grade: p.grade! }));
  const LEAD = [
    { key: "pts", title: "득점", unit: "점" },
    { key: "reb", title: "리바운드", unit: "개" },
    { key: "ast", title: "어시스트", unit: "개" },
  ] as const;

  return (
    <PageShell view="home" season={code}>
      <HomeHero
        seasonTitle={`WKBL ${season.label} 시즌`}
        progress={`정규리그 ${season.played}/${season.scheduled}경기 끝남${season.played === season.scheduled ? " · 시즌 종료" : ""}`}
        leader={
          topScorer
            ? {
                playerNo: topScorer.playerNo,
                nameKo: topScorer.nameKo,
                teamCode: topScorer.teamCode,
                teamName: tn(topScorer.teamCode),
                ppg: perGame(topScorer.pts, topScorer.games).toFixed(1),
                rpg: perGame(topScorer.reb, topScorer.games).toFixed(1),
                apg: perGame(topScorer.ast, topScorer.games).toFixed(1),
                games: topScorer.games,
                grade: topScorer.grade,
              }
            : null
        }
      />

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
          <StandingsCards rows={getStandings(code)} />
          <Link href={`/season/${code}/standings`} className="focus-ring link-shortcut mt-1 text-sub">
            자세히
            <IconChevronRight size={16} />
          </Link>
        </section>
        {graded.length > 0 && (
          <section>
            <h2 className="mb-2 flex items-center gap-1 text-h2 font-bold">
              능력치 상위 <HelpPopover term="grade" className="ml-1" />
            </h2>
            <TopGraded players={graded} />
          </section>
        )}
        <section>
          <h2 className="mb-2 text-h2 font-bold">부문별 1~5위</h2>
          {players.length === 0 ? (
            <EmptyData what="선수 기록" />
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {LEAD.map((l) => (
                <LeaderMini key={l.key} title={`${l.title} (경기당)`} unit={l.unit} entries={top5(l.key)} />
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
