// 경기 카드: 홈·원정 팀, 점수(이긴 팀 굵게), 양 팀 득점 1위. 서버에서 그린다(누르는 것은 선수 링크뿐).
import Link from "next/link";
import { shortDate } from "@/lib/format";
import type { ProcessedGame, TopScorer } from "@/lib/types";
import TeamBadge from "./TeamBadge";

function Side({ code, name, score, win, label }: { code: string; name: string; score: number | null; win: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamBadge code={code} name={name} size={28} />
      <span className={`min-w-0 flex-1 truncate text-body ${win ? "font-bold text-ink" : "text-ink-2"}`}>
        {name}
        <span className="ml-1.5 text-caption font-normal text-ink-3">{label}</span>
      </span>
      <span className={`tabular text-h2 ${win ? "font-bold text-ink" : "text-ink-3"}`}>{score ?? "-"}</span>
    </div>
  );
}

function Scorer({ s }: { s: TopScorer | null }) {
  if (!s) return <span className="text-ink-3">-</span>;
  return (
    <Link href={`/player/${s.playerNo}`} className="focus-ring rounded-control font-semibold text-ink-2 underline decoration-line underline-offset-2 hover:text-ink">
      {s.nameKo} <span className="tabular font-normal text-ink-3">{s.pts}점 {s.reb}리 {s.ast}어</span>
    </Link>
  );
}

export default function GameCard({ g, showDate = false }: { g: ProcessedGame; showDate?: boolean }) {
  const played = g.homeScore !== null && g.awayScore !== null;
  const homeWin = played && g.homeScore! > g.awayScore!;
  const awayWin = played && g.awayScore! > g.homeScore!;
  return (
    <article className="surface-card rounded-card p-3">
      <p className="mb-2 text-caption text-ink-3">
        {showDate && <span className="mr-1.5 font-semibold text-ink-2">{shortDate(g.date)}</span>}
        {g.time && <span className="tabular mr-1.5">{g.time}</span>}
        {g.venue}
      </p>
      <div className="space-y-1.5">
        <Side code={g.homeCode} name={g.homeName} score={g.homeScore} win={homeWin} label="홈" />
        <Side code={g.awayCode} name={g.awayName} score={g.awayScore} win={awayWin} label="원정" />
      </div>
      {g.topScorers && (
        <div className="mt-2.5 space-y-0.5 border-t border-line pt-2 text-caption">
          <p className="text-ink-3">
            득점 1위 · <Scorer s={g.topScorers[0]} />
          </p>
          <p className="text-ink-3">
            득점 1위 · <Scorer s={g.topScorers[1]} />
          </p>
        </div>
      )}
    </article>
  );
}
