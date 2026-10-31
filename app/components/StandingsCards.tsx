// 홈 팀 순위 카드: 순위·팀 색·승패 + 승률 막대 (표 대신 한눈에). 자세한 표는 /season/{코드}/standings
import { formatWinPct } from "@/lib/format";
import { teamColor } from "@/lib/teams";
import type { TeamStanding } from "@/lib/types";
import TeamBadge from "./TeamBadge";

export default function StandingsCards({ rows }: { rows: TeamStanding[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="팀 순위">
      {rows.map((r) => {
        const c = teamColor(r.teamCode);
        return (
          <li key={r.teamCode} className="surface-card overflow-hidden rounded-card">
            <div className="h-1.5" style={{ background: c.primary }} aria-hidden />
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="tabular text-h2 font-black text-ink">{r.rank}</span>
                <TeamBadge code={r.teamCode} name={r.teamName} size={32} />
              </div>
              <p className="mt-1 truncate text-body font-bold text-ink">{r.teamName}</p>
              <p className="tabular text-sub text-ink-2">
                {r.wins}승 {r.losses}패 · <b className="text-ink">{formatWinPct(r.pct, r.games)}</b>
              </p>
              <span className="mt-2 block h-2 overflow-hidden rounded-md bg-surface-2" aria-hidden>
                <span className="block h-full rounded-md" style={{ width: `${Math.round(r.pct * 100)}%`, background: c.primary }} />
              </span>
              {r.streak && <p className="mt-1.5 text-caption text-ink-3">{r.streak}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
