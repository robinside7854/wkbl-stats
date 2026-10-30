// 팀 대체 디자인: 팀 색 사각형 + 짧은 글자. 공식 로고는 쓰지 않는다 — WKBL 화면 하단에 로고 무단 사용 금지가 적혀 있다(2026-10-30).
import { teamColor, teamMark } from "@/lib/teams";

export default function TeamBadge({ code, name, size = 24, className = "" }: { code: string; name: string; size?: number; className?: string }) {
  const c = teamColor(code);
  const mark = teamMark(code, name);
  return (
    <span
      // 옅은 안쪽 테두리 — 어두운 팀 색이 다크 바탕에 묻히지 않게 (kbl-stats 디자인 점검 C5)
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-md font-bold leading-none ring-1 ring-inset ring-black/5 dark:ring-white/20 ${className}`}
      style={{ width: size, height: size, background: c.primary, color: c.text, fontSize: Math.max(8, Math.round(size * (mark.length > 2 ? 0.32 : 0.4))) }}
      title={name}
      aria-hidden
    >
      {mark}
    </span>
  );
}
