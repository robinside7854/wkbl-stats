// 홈 표지 (kbl-stats HomeHero 를 줄임): 그 시즌 경기당 득점 1위를 팀 색 띠로 크게 — 이름·팀·득점·종합 등급·유형 + 리바·어시.
import Link from "next/link";
import { PLAYER_TYPE_LABELS, type SeasonGrade } from "@/lib/grades";
import { mixHex, teamColor } from "@/lib/teams";
import GradeBadge from "./GradeBadge";
import { IconChevronRight } from "./icons";

export default function HomeHero({
  seasonTitle,
  progress,
  leader,
}: {
  seasonTitle: string;
  progress: string;
  leader: { playerNo: string; nameKo: string; teamCode: string; teamName: string; ppg: string; rpg: string; apg: string; games: number; grade: SeasonGrade | null } | null;
}) {
  const c = teamColor(leader?.teamCode ?? "");
  const dark = mixHex(c.primary, "#000000", 0.55);
  return (
    <section aria-label="이번 시즌 득점 1위" className="-mx-4 -mt-5 mb-6">
      <div style={{ background: leader ? `linear-gradient(150deg, ${c.primary} 0%, ${dark} 100%)` : "var(--surface-2)", color: leader ? c.text : "var(--ink)" }}>
        <div className="mx-auto max-w-page px-4 pb-5 pt-5">
          <h1 className="text-h2 font-black">{seasonTitle}</h1>
          <p className="text-sub font-medium opacity-85">{progress}</p>
          {leader && (
            <Link href={`/player/${leader.playerNo}`} className="focus-ring group mt-4 flex flex-wrap items-end justify-between gap-4 rounded-container">
              <span className="min-w-0">
                <span className="block text-sub font-semibold opacity-90">경기당 득점 1위 · {leader.teamName}</span>
                {/* deslop-ignore-next-line 11 */}
                <span className="mt-1 flex items-center gap-1 text-[2.25rem] font-black leading-tight tracking-tight sm:text-5xl">
                  {leader.nameKo}
                  <IconChevronRight size={24} className="opacity-70 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
                {leader.grade && (
                  <span className="mt-2 flex flex-wrap items-center gap-2 text-sub font-semibold">
                    <GradeBadge grade={leader.grade.overallGrade} pct={leader.grade.overall} team={c} size="sm" />
                    <span className="rounded-control px-2 py-0.5" style={{ background: "rgba(0,0,0,0.25)" }}>
                      {PLAYER_TYPE_LABELS[leader.grade.type]}
                    </span>
                  </span>
                )}
              </span>
              <span className="tabular flex items-end gap-5">
                <span className="text-right">
                  <span className="block text-sub font-semibold opacity-85">득점</span>
                  {/* deslop-ignore-next-line 11 */}
                  <span className="block text-6xl font-black leading-none tracking-tight">{leader.ppg}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sub font-semibold opacity-85">리바</span>
                  <span className="block text-3xl font-black leading-none">{leader.rpg}</span>
                </span>
                <span className="text-right">
                  <span className="block text-sub font-semibold opacity-85">어시</span>
                  <span className="block text-3xl font-black leading-none">{leader.apg}</span>
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
