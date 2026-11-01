// 선수 상세 /player/{번호}: 머리말(팀 색·유니폼 등번호·프로필·통산) · 시즌 능력치 카드(6축·등급) · 시즌별 변화 · 시즌별 기록 · 커리어 하이 · 마지막 시즌 경기 기록
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayersIndex, getSeasonLeaders, getSeasons, teamName } from "@/lib/data";
import { AWARD_LABELS, STAT_AWARD_KEYS, awardRows, honorChips } from "@/lib/awards";
import { SEASON_LEAD_KEYS } from "@/lib/leaders";
import { dotDate, formatPct1, positionLabel, seasonShortLabel, shortDate } from "@/lib/format";
import { fga, fgm, formatMinutes, pct, perGame, tsPct } from "@/lib/metrics";
import type { CareerHigh, DraftInfo, StatLine } from "@/lib/types";
import { COMPONENTS, ageOn, componentText, componentValue, pickPrimeSeason, score99, type ComponentKey } from "@/lib/grades";
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

  // 리그 1위 칸 (기록표 굵게): lib/leaders 키 → 기록표 칸 키
  const LEAD_CELL: Record<(typeof SEASON_LEAD_KEYS)[number], string> = { pts: "pts", reb: "reb", ast: "ast", stl: "stl", blk: "blk", fgPct: "fg", threePct: "three", ftPct: "ft" };
  const leadOf = (code: string) => {
    const m = getSeasonLeaders(code);
    return SEASON_LEAD_KEYS.filter((k) => m.get(k)?.has(p.playerNo)).map((k) => LEAD_CELL[k]);
  };
  const rows: SeasonRow[] = [
    ...p.seasons.map((s) => ({
      ...avgRow(s.seasonCode, label(s.seasonCode), s.teamCode, s.teamCodes.map((t) => teamName(t, s.seasonCode)).join(" → "), s),
      lead: leadOf(s.seasonCode),
    })),
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
  const primeCode = pickPrimeSeason(p.seasons);
  const prime = primeCode ? p.seasons.find((s) => s.seasonCode === primeCode) : undefined;
  const primeText = prime?.grade ? `${label(prime.seasonCode)} · ${prime.grade.overallGrade} ${score99(prime.grade.overall)}` : undefined;
  const awards = p.awards ?? [];
  const champs = p.championships ?? [];
  const firsts = p.regularFirsts ?? [];
  const aRows = awardRows(awards);
  const mainRows = aRows.filter((r) => !STAT_AWARD_KEYS.includes(r.key));
  const statRows = aRows.filter((r) => STAT_AWARD_KEYS.includes(r.key));
  const leadCount = rows.reduce((n, r) => n + (r.lead?.length ?? 0), 0);
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
        honors={honorChips(awards, champs.length)}
        primeText={primeText}
      />

      {cardSeasons.length > 0 ? (
        <div className="mb-8">
          <PlayerCard seasons={cardSeasons} nameKo={p.nameKo} backNumber={prof?.backNumber ?? null} primeCode={primeCode} />
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
        {leadCount > 0 && <p className="mt-1.5 text-caption text-ink-3">금색 굵은 숫자 = 그 시즌 리그 1위 (팀 경기 절반 이상 뛴 선수 중)</p>}
      </section>

      {(champs.length > 0 || firsts.length > 0 || aRows.length > 0) && (
        <section className="mb-6" aria-labelledby="awards-title">
          <h2 id="awards-title" className="mb-2 text-h2 font-bold">
            우승·수상 경력
          </h2>
          <dl className="surface-card divide-y divide-line rounded-container">
            {[
              ...(champs.length ? [{ key: "champion", label: "챔피언결정전 우승", seasons: champs.map((code) => ({ code, value: null as string | null })), gold: true }] : []),
              ...(firsts.length ? [{ key: "first", label: "정규리그 1위", seasons: firsts.map((code) => ({ code, value: null as string | null })), gold: false }] : []),
              ...mainRows.map((r) => ({ key: r.key, label: AWARD_LABELS[r.key], seasons: r.seasons, gold: r.key === "mvp" || r.key === "finalsMvp" })),
              ...statRows.map((r) => ({ key: r.key, label: AWARD_LABELS[r.key], seasons: r.seasons, gold: false })),
            ].map((r) => (
              <div key={r.key} className="grid gap-x-3 gap-y-1 px-4 py-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <dt className="flex items-center gap-2 text-body font-semibold text-ink">
                  {r.label}
                  <span className={`tabular rounded-control px-1.5 py-0.5 text-caption font-bold ${r.gold ? "" : "bg-surface-2 text-ink-2"}`} style={r.gold ? { background: "var(--grade-s)", color: "var(--grade-s-ink)" } : undefined}>
                    {r.seasons.length}회
                  </span>
                </dt>
                <dd className="tabular flex flex-wrap gap-x-3 gap-y-1 text-sub text-ink-2">
                  {[...r.seasons].sort((a, b) => b.code.localeCompare(a.code)).map((x) => (
                    <span key={x.code} className="whitespace-nowrap">
                      {label(x.code)}
                      {x.value && <span className="text-ink-3"> ({x.value})</span>}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-1.5 text-caption text-ink-3">수상은 WKBL 역대 부문별 수상자 기준. 우승은 그 시즌 챔피언전 MVP 소속 팀에서 뛴 시즌(우리 판정).</p>
        </section>
      )}

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
