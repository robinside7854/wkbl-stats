// 팀 순위표. 모바일은 핵심 열만(순위·팀·승·패·승률·승차), 640px 이상에서 홈/원정·최근 5경기·연속·득실을 더 보인다.
import { formatWinPct } from "@/lib/format";
import type { TeamStanding } from "@/lib/types";
import HelpPopover from "./HelpPopover";
import TeamBadge from "./TeamBadge";

export default function StandingsTable({ rows, compact = false }: { rows: TeamStanding[]; compact?: boolean }) {
  const wide = compact ? "hidden" : "hidden sm:table-cell";
  return (
    <div className="surface-card overflow-hidden rounded-container">
      <table className="tabular w-full border-separate border-spacing-0 text-sub">
        <caption className="sr-only">팀 순위</caption>
        <thead>
          <tr className="text-ink-3">
            <th scope="col" className="border-b border-line px-2 py-2 text-center font-medium">
              순위
            </th>
            <th scope="col" className="border-b border-line px-2 py-2 text-left font-medium">
              팀 {!compact && <HelpPopover term="standings" compact />}
            </th>
            <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">승</th>
            <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">패</th>
            <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">승률</th>
            <th scope="col" className="border-b border-line px-2 py-2 text-right font-medium">승차</th>
            <th scope="col" className={`${wide} border-b border-line px-2 py-2 text-right font-medium`}>홈</th>
            <th scope="col" className={`${wide} border-b border-line px-2 py-2 text-right font-medium`}>원정</th>
            <th scope="col" className={`${wide} border-b border-line px-2 py-2 text-right font-medium`}>득실</th>
            <th scope="col" className={`${wide} border-b border-line px-2 py-2 text-center font-medium`}>최근 5경기</th>
            <th scope="col" className={`${wide} border-b border-line px-2 py-2 text-right font-medium`}>연속</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.games > 0 ? (r.pointsFor - r.pointsAgainst) / r.games : 0;
            return (
              <tr key={r.teamCode}>
                <td className="h-12 border-b border-line px-2 text-center font-semibold text-ink">{r.rank}</td>
                <th scope="row" className="h-12 border-b border-line px-2 text-left font-semibold text-ink">
                  <span className="flex items-center gap-2">
                    <TeamBadge code={r.teamCode} name={r.teamName} size={24} />
                    <span className="truncate">{r.teamName}</span>
                  </span>
                </th>
                <td className="border-b border-line px-2 text-right text-ink">{r.wins}</td>
                <td className="border-b border-line px-2 text-right text-ink">{r.losses}</td>
                <td className="border-b border-line px-2 text-right font-semibold text-ink">{formatWinPct(r.pct, r.games)}</td>
                <td className="border-b border-line px-2 text-right text-ink-2">{r.rank === 1 || r.gamesBehind === 0 ? "-" : r.gamesBehind.toFixed(1)}</td>
                <td className={`${wide} border-b border-line px-2 text-right text-ink-2`}>
                  {r.homeWins}-{r.homeLosses}
                </td>
                <td className={`${wide} border-b border-line px-2 text-right text-ink-2`}>
                  {r.awayWins}-{r.awayLosses}
                </td>
                <td className={`${wide} border-b border-line px-2 text-right text-ink-2`}>{diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}</td>
                <td className={`${wide} border-b border-line px-2 text-center`}>
                  <span className="inline-flex gap-0.5" aria-label={`최근 5경기 ${r.last5.map((x) => (x === "W" ? "승" : "패")).join(" ")}`}>
                    {r.last5.map((x, i) => (
                      <span
                        key={i}
                        aria-hidden
                        className={`inline-flex h-5 w-5 items-center justify-center rounded text-caption font-bold ${x === "W" ? "bg-series-1 text-white" : "bg-surface-2 text-ink-3"}`}
                      >
                        {x === "W" ? "승" : "패"}
                      </span>
                    ))}
                  </span>
                </td>
                <td className={`${wide} border-b border-line px-2 text-right text-ink-2`}>{r.streak || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
