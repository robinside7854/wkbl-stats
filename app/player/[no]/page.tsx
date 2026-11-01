// 선수 상세 /player/{번호}: 머리말(팀 색·유니폼 등번호·프로필·통산) · 시즌 능력치 카드(6축·등급) · 시즌별 변화 · 시즌별 기록 · 커리어 하이 · 마지막 시즌 경기 기록
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayersIndex, getSeasons, teamName } from "@/lib/data";
import { dotDate, formatPct1, positionLabel, seasonShortLabel, shortDate } from "@/lib/format";
import { fga, fgm, formatMinutes, pct, perGame, tsPct } from "@/lib/metrics";
import type { CareerHigh, DraftInfo, StatLine } from "@/lib/types";
import { COMPONENTS, ageOn, componentText, componentValue, type ComponentKey } from "@/lib/grades";
import { teamColor } from "@/lib/teams";
import PlayerCard, { type CardSeason } from "@/app/components/PlayerCard";
import PlayerHero, { type HeroFact, type HeroTile } from "@/app/components/PlayerHero";
import CareerTrend, { type TrendPoint } from "@/app/components/CareerTrend";
import HelpPopover from "@/app/components/HelpPopover";
import PageShell from "@/app/components/PageShell";
import SeasonTable, { type SeasonRow } from "@/app/components/SeasonTable";
import GameLog from "@/app/components/GameLog";

export const dynamicParams = false;
export function generateStaticParams() {
  return getPlayersIndex().map((p) => ({ no: p.playerNo }));
}

export async function generateMetadata({ params }: { params: Promise<{ no: string }> }) {
  const p = getPlayer((await params).no);
  return { title: p ? p.nameKo : "선수" };
}

const HIGH_LABEL: Record<CareerHigh["key"], string> = { pts: "득점", reb: "리바운드", ast: "어시스트", stl: "스틸", blk: "블록", threePm: "3점슛" };

function avgRow(key: string, label: string, team: string, tName: string, s: StatLine & { games: number }, career = false): SeasonRow {
  const g = s.games;
  const f = (v: number) => perGame(v, g).toFixed(1);
  return {
    key,
    label,
    team,
    teamName: tName,
    games: g,
    min: formatMinutes(perGame(s.sec, g)),
    pts: f(s.pts),
    reb: f(s.reb),
    ast: f(s.ast),
    stl: f(s.stl),
    blk: f(s.blk),
    tov: f(s.tov),
    pf: f(s.pf),
    fg: formatPct1(pct(fgm(s), fga(s))),
    three: formatPct1(pct(s.threePm, s.threePa)),
    ft: formatPct1(pct(s.ftm, s.fta)),
    ts: formatPct1(tsPct(s)),
    career,
  };
}

/** "2008 1라운드 2순위" (전체 순위가 다르면 덧붙임) */
function draftText(d: DraftInfo): string {
  const parts = [`${d.year}`];
  if (d.round) parts.push(`${d.round}라운드`);
  if (d.pick) parts.push(`${d.pick}순위`);
  if (d.overall && d.overall !== d.pick) parts.push(`(전체 ${d.overall}순위)`);
  return parts.length > 1 ? parts.join(" ") : d.text;
}

export default async function PlayerPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const p = getPlayer(no);
  if (!p) notFound();
  const seasons = getSeasons();
  const label = (c: string) => seasonShortLabel(seasons.find((s) => s.code === c)?.label ?? c);
  const last = p.seasons[0];
  const c = p.career;

  const rows: SeasonRow[] = [
    ...p.seasons.map((s) =>
      avgRow(s.seasonCode, label(s.seasonCode), s.teamCode, s.teamCodes.map((t) => teamName(t, s.seasonCode)).join(" → "), s),
    ),
    avgRow("career", "통산", "", `${p.seasons.length}시즌`, c, true),
  ];
  const trend: TrendPoint[] = [...p.seasons].reverse().map((s) => ({
    label: label(s.seasonCode),
    pts: Number(perGame(s.pts, s.games).toFixed(1)),
    reb: Number(perGame(s.reb, s.games).toFixed(1)),
    ast: Number(perGame(s.ast, s.games).toFixed(1)),
    ts: tsPct(s) === null ? null : Number((tsPct(s)! * 100).toFixed(1)),
  }));

  // 머리말 재료: 프로필(공홈) · 나이(빌드 날짜, 한국 시간) · 마지막으로 등급이 있는 시즌
  const prof = p.profile;
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const age = prof?.birthDate ? ageOn(prof.birthDate, today) : null;
  const facts: HeroFact[] = [
    prof?.backNumber ? { label: "등번호", value: `${prof.backNumber}번` } : null,
    age !== null && prof?.birthDate ? { label: "나이", value: `만 ${age}세 (${prof.birthDate.slice(0, 4)}년생)` } : null,
    prof?.heightCm ? { label: "키", value: `${prof.heightCm}cm` } : null,
    prof?.school ? { label: "출신교", value: prof.school } : null,
    prof?.draft ? { label: "드래프트", value: draftText(prof.draft) } : null,
  ].filter((f): f is HeroFact => f !== null);
  // 통산 8칸 (kbl-stats 선수 머리말과 같은 구성 — 경기·경기당 기록·통산 성공률)
  const pg = (v: number) => perGame(v, c.games).toFixed(1);
  const tiles: HeroTile[] = [
    { label: "경기", value: String(c.games), sub: "통산" },
    { label: "득점", value: pg(c.pts), sub: "경기당" },
    { label: "리바운드", value: pg(c.reb), sub: "경기당" },
    { label: "어시스트", value: pg(c.ast), sub: "경기당" },
    { label: "스틸", value: pg(c.stl), sub: "경기당" },
    { label: "블록", value: pg(c.blk), sub: "경기당" },
    { label: "야투%", value: formatPct1(pct(fgm(c), fga(c))), sub: "통산" },
    { label: "3점%", value: formatPct1(pct(c.threePm, c.threePa)), sub: "통산" },
  ];
  const graded = p.seasons.filter((s) => s.grade);
  const cardSeasons: CardSeason[] = graded.map((s) => ({
    code: s.seasonCode,
    label: label(s.seasonCode),
    teamName: teamName(s.teamCode, s.seasonCode),
    color: teamColor(s.teamCode),
    games: s.games,
    grade: s.grade!,
    values: Object.fromEntries((Object.keys(COMPONENTS) as ComponentKey[]).map((k) => [k, componentText(componentValue(s, k), k)])) as Record<ComponentKey, string>,
  }));

  return (
    <PageShell view="player">
      <PlayerHero
        nameKo={p.nameKo}
        nameEn={p.nameEn}
        profile={prof}
        teamCode={last?.teamCode ?? ""}
        teamLabel={last ? `${label(last.seasonCode)} ${teamName(last.teamCode, last.seasonCode)}` : ""}
        span=""
        positionText={positionLabel(prof?.position ?? p.position)}
        facts={facts}
        tiles={tiles}
        latestGrade={graded[0]?.grade ?? null}
        latestGradeSeason={graded[0] ? label(graded[0].seasonCode) : ""}
      />

      {cardSeasons.length > 0 ? (
        <div className="mb-8">
          <PlayerCard seasons={cardSeasons} nameKo={p.nameKo} backNumber={prof?.backNumber ?? null} />
        </div>
      ) : (
        <p className="mb-6 text-sub text-ink-3">어느 시즌도 팀 경기의 절반 이상 뛰지 않아 능력치 등급이 없어요.</p>
      )}

      {trend.length > 1 && (
        <section className="mb-6">
          <h2 className="mb-2 text-h2 font-bold">시즌별 변화 (경기당)</h2>
          <CareerTrend points={trend} />
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-2 text-h2 font-bold">시즌별 기록 (경기당)</h2>
        <SeasonTable rows={rows} />
      </section>

      {p.highs.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 flex items-center gap-1 text-h2 font-bold">
            커리어 하이 <HelpPopover term="careerHigh" />
          </h2>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {p.highs.map((h) => (
              <li key={h.key} className="surface-card rounded-card px-3 py-2.5">
                <p className="text-caption text-ink-3">{HIGH_LABEL[h.key]}</p>
                <p className="tabular text-h2 font-bold">{h.value}</p>
                <p className="text-caption text-ink-3">
                  {dotDate(h.date)} vs {teamName(h.oppCode, h.seasonCode)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.recentGames.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-h2 font-bold">
            경기 기록 <span className="text-body font-normal text-ink-3">{label(p.recentSeason)}</span>
          </h2>
          <GameLog
            caption={`${label(p.recentSeason)} 경기별 기록`}
            rows={p.recentGames.map((g) => ({
              key: String(g.gameNo),
              date: shortDate(g.date),
              opp: `${g.home ? "vs" : "@"} ${teamName(g.oppCode, p.recentSeason)}`,
              win: g.margin > 0,
              margin: g.margin,
              min: formatMinutes(g.sec),
              pts: g.pts,
              reb: g.reb,
              ast: g.ast,
              stl: g.stl,
              blk: g.blk,
              tpm: g.threePm,
            }))}
          />
        </section>
      )}
      <Link href="/players" className="focus-ring link-shortcut text-sub">
        선수 목록
      </Link>
    </PageShell>
  );
}
