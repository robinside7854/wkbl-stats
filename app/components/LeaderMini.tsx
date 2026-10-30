// 홈의 부문별 상위 5명 (서버에서 그림)
import Link from "next/link";
import { formatValue } from "@/lib/metrics";
import type { Ranked } from "@/lib/leaders";
import type { PlayerSeason } from "@/lib/types";
import PlayerAvatar from "./PlayerAvatar";

export default function LeaderMini({ title, rows, unit, teamName }: { title: string; rows: Ranked<PlayerSeason>[]; unit: string; teamName: (code: string) => string }) {
  return (
    <section className="surface-card rounded-container p-3">
      <h3 className="mb-1 text-body font-bold">{title}</h3>
      <ol>
        {rows.map((r) => (
          <li key={r.row.playerNo}>
            <Link href={`/player/${r.row.playerNo}`} className="focus-ring-inset flex min-h-11 items-center gap-2 rounded-control px-1 transition-colors duration-200 hover:bg-surface-2">
              <span className="tabular w-5 text-center text-sub font-semibold text-ink-3">{r.rank}</span>
              <PlayerAvatar nameKo={r.row.nameKo} teamCode={r.row.teamCode} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{r.row.nameKo}</span>
                <span className="block truncate text-caption text-ink-3">{teamName(r.row.teamCode)}</span>
              </span>
              <span className="tabular text-body font-bold">
                {formatValue(r.value, "avg")}
                <span className="ml-0.5 text-caption font-normal text-ink-3">{unit}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
