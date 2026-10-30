// 선수 상세 /player/{번호}: 머리말 · 통산 요약 · 시즌별 변화 · 시즌별 기록 · 커리어 하이 · 마지막 시즌 경기 기록
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getPlayersIndex, getSeasons, teamName } from "@/lib/data";
import { dotDate, formatPct1, positionLabel, seasonShortLabel, shortDate } from "@/lib/format";
import { fga, fgm, formatMinutes, pct, perGame, tsPct } from "@/lib/metrics";
import type { CareerHigh, StatLine } from "@/lib/types";
import CareerTrend, { type TrendPoint } from "@/app/components/CareerTrend";
import HelpPopover from "@/app/components/HelpPopover";
import PageShell from "@/app/components/PageShell";
import PlayerAvatar from "@/app/components/PlayerAvatar";
import SeasonTable, { type SeasonRow } from "@/app/components/SeasonTable";
import TeamBadge from "@/app/components/TeamBadge";

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
    fg: formatPct1(pct(fgm(s), fga(s))),
    three: formatPct1(pct(s.threePm, s.threePa)),
    ft: formatPct1(pct(s.ftm, s.fta)),
    ts: formatPct1(tsPct(s)),
    career,
  };
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-card px-3 py-2.5">
      <p className="text-caption text-ink-3">{label}</p>
      <p className="tabular text-h2 font-bold">{value}</p>
    </div>
  );
}

export default async function PlayerPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params;
  const p = getPlayer(no);
  if (!p) notFound();
  const seasons = getSeasons();
  const label = (c: string) => seasonShortLabel(seasons.find((s) => s.code === c)?.label ?? c);
  const last = p.seasons[0];
  const first = p.seasons.at(-1);
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

  return (
    <PageShell view="player">
      <section className="surface-card mb-5 flex items-center gap-4 rounded-container p-4">
        <PlayerAvatar nameKo={p.nameKo} teamCode={last?.teamCode ?? ""} size={64} />
        <div className="min-w-0">
          <h1 className="text-h1 font-bold">{p.nameKo}</h1>
          {p.nameEn && <p className="text-sub text-ink-3">{p.nameEn}</p>}
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sub text-ink-2">
            {last && (
              <span className="inline-flex items-center gap-1.5">
                <TeamBadge code={last.teamCode} name={teamName(last.teamCode, last.seasonCode)} size={20} />
                {teamName(last.teamCode, last.seasonCode)}
              </span>
            )}
            <span>· {positionLabel(p.position)}</span>
            {first && last && <span>· {first === last ? label(first.seasonCode) : `${label(first.seasonCode)} ~ ${label(last.seasonCode)}`}</span>}
          </p>
        </div>
      </section>

      <h2 className="mb-2 text-h2 font-bold">통산 (정규리그)</h2>
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Tile label="경기" value={String(c.games)} />
        <Tile label="득점" value={perGame(c.pts, c.games).toFixed(1)} />
        <Tile label="리바운드" value={perGame(c.reb, c.games).toFixed(1)} />
        <Tile label="어시스트" value={perGame(c.ast, c.games).toFixed(1)} />
        <Tile label="TS%" value={formatPct1(tsPct(c))} />
        <Tile label="통산 득점" value={c.pts.toLocaleString("ko-KR")} />
      </div>

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
          <div className="surface-card overflow-hidden rounded-container">
            <table className="tabular w-full border-separate border-spacing-0 text-sub">
              <caption className="sr-only">{label(p.recentSeason)} 경기별 기록</caption>
              <thead>
                <tr className="text-ink-3">
                  <th scope="col" className="border-b border-line px-2 py-2 text-left font-medium">날짜</th>
                  <th scope="col" className="border-b border-line px-2 py-2 text-left font-medium">상대</th>
                  <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">결과</th>
                  <th scope="col" className="hidden border-b border-line px-2 py-2 text-right font-medium sm:table-cell">출전</th>
                  <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">득점</th>
                  <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">리바</th>
                  <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">어시</th>
                  <th scope="col" className="hidden border-b border-line px-2 py-2 text-right font-medium sm:table-cell">스틸</th>
                  <th scope="col" className="hidden border-b border-line px-2 py-2 text-right font-medium sm:table-cell">블록</th>
                </tr>
              </thead>
              <tbody>
                {p.recentGames.map((g) => (
                  <tr key={g.gameNo}>
                    <td className="h-11 border-b border-line px-2 text-ink-2">{shortDate(g.date)}</td>
                    <td className="border-b border-line px-2 text-ink">
                      {g.home ? "vs" : "@"} {teamName(g.oppCode, p.recentSeason)}
                    </td>
                    <td className={`border-b border-line px-2 text-right font-semibold ${g.margin > 0 ? "text-series-1" : "text-ink-3"}`}>
                      {g.margin > 0 ? "승" : "패"} {g.margin > 0 ? `+${g.margin}` : g.margin}
                    </td>
                    <td className="hidden border-b border-line px-2 text-right text-ink-2 sm:table-cell">{formatMinutes(g.sec)}</td>
                    <td className="border-b border-line px-2 text-right font-semibold text-ink">{g.pts}</td>
                    <td className="border-b border-line px-2 text-right text-ink-2">{g.reb}</td>
                    <td className="border-b border-line px-2 text-right text-ink-2">{g.ast}</td>
                    <td className="hidden border-b border-line px-2 text-right text-ink-2 sm:table-cell">{g.stl}</td>
                    <td className="hidden border-b border-line px-2 text-right text-ink-2 sm:table-cell">{g.blk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      <Link href="/players" className="focus-ring link-shortcut text-sub">
        선수 목록
      </Link>
    </PageShell>
  );
}
