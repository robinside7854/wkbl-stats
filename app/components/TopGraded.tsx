// 홈 "이번 시즌 능력치 상위" — 종합 등급이 높은 선수 카드 (등급 배지·유형·팀 색 테두리)
import Link from "next/link";
import { PLAYER_TYPE_LABELS, type SeasonGrade } from "@/lib/grades";
import { teamColor } from "@/lib/teams";
import GradeBadge from "./GradeBadge";
import PlayerAvatar from "./PlayerAvatar";

export interface GradedPlayer {
  playerNo: string;
  nameKo: string;
  teamCode: string;
  teamName: string;
  grade: SeasonGrade;
}

export default function TopGraded({ players }: { players: GradedPlayer[] }) {
  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {players.map((p) => {
        const c = teamColor(p.teamCode);
        return (
          <li key={p.playerNo}>
            <Link
              href={`/player/${p.playerNo}`}
              className="focus-ring surface-card flex h-full flex-col items-center gap-1.5 rounded-card border-t-4 p-3 text-center transition-colors duration-200 hover:bg-surface-2"
              style={{ borderTopColor: c.primary }}
            >
              <PlayerAvatar nameKo={p.nameKo} teamCode={p.teamCode} size={44} />
              <span className="w-full truncate text-body font-bold text-ink">{p.nameKo}</span>
              <span className="w-full truncate text-caption text-ink-3">{p.teamName}</span>
              <GradeBadge grade={p.grade.overallGrade} pct={p.grade.overall} team={c} size="md" />
              <span className="text-sub font-semibold text-ink-2">{PLAYER_TYPE_LABELS[p.grade.type]}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
