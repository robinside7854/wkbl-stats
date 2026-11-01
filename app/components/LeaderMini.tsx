// 홈의 부문별 1~5위 (서버에서 그림, 순위는 lib/leaders topLeaders — 리더보드와 같은 규칙)
import Link from "next/link";
import { formatStat, type LeaderEntry } from "@/lib/leaders";
import PlayerAvatar from "./PlayerAvatar";

export default function LeaderMini({ title, entries, unit }: { title: string; entries: LeaderEntry[]; unit: string }) {
  return (
    <section className="surface-card rounded-container p-3">
      <h3 className="mb-1 text-body font-bold">{title}</h3>
      <ol>
        {entries.map((e) => (
          <li key={e.player.id}>
            <Link href={`/player/${e.player.id}`} className="focus-ring-inset flex min-h-11 items-center gap-2 rounded-control px-1 transition-colors duration-200 hover:bg-surface-2">
              <span className="tabular w-5 text-center text-sub font-semibold text-ink-3">{e.rank}</span>
              <PlayerAvatar nameKo={e.player.nameKo} teamCode={e.player.teamCode} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold">{e.player.nameKo}</span>
                <span className="block truncate text-caption text-ink-3">
                  {e.player.teamName} · {e.player.games}경기
                </span>
              </span>
              <span className="tabular text-body font-bold">
                {formatStat(e.value, "pts", "perGame")}
                <span className="ml-0.5 text-caption font-normal text-ink-3">{unit}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
