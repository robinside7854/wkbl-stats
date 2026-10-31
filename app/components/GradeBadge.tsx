// 등급 배지 S~F (+ 점수 1~99). 색 규칙은 lib/grades gradeStyle (S 금색 · A/B 팀 색 · C~F 회색)
import { gradeStyle, score99, type Grade } from "@/lib/grades";

export default function GradeBadge({
  grade,
  pct,
  team,
  size = "md",
  className = "",
}: {
  grade: Grade;
  /** 백분위 — 주면 등급 옆에 점수 */
  pct?: number;
  team: { primary: string; text: string };
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const s = gradeStyle(grade, team);
  const box = size === "lg" ? "h-14 min-w-14 px-3 gap-1.5" : size === "md" ? "h-9 min-w-9 px-2 gap-1" : "h-6 min-w-6 px-1.5 gap-0.5";
  const g = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sub";
  const n = size === "lg" ? "text-body" : size === "md" ? "text-sub" : "text-caption";
  return (
    <span
      className={`tabular inline-flex shrink-0 items-baseline justify-center rounded-control border font-black leading-none ${box} ${className}`}
      style={s}
      aria-label={pct === undefined ? `등급 ${grade}` : `등급 ${grade}, ${score99(pct)}점`}
    >
      <span className={`${g} self-center`}>{grade}</span>
      {pct !== undefined && <span className={`${n} self-center font-bold opacity-90`}>{score99(pct)}</span>}
    </span>
  );
}
