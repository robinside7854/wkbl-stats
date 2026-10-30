// 선수 아바타: 팀 색 원 + 이름 첫 글자. 공식 선수 사진은 쓰지 않는다(WKBL 화면 하단 무단 사용 금지 문구, 2026-10-30).
import { teamColor } from "@/lib/teams";

export default function PlayerAvatar({ nameKo, teamCode, size = 32, className = "" }: { nameKo: string; teamCode: string; size?: number; className?: string }) {
  const c = teamColor(teamCode);
  const initial = [...nameKo.trim()][0] ?? "?";
  return (
    <span
      // deslop-ignore-next-line 19
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold ring-1 ring-inset ring-black/5 dark:ring-white/20 ${className}`}
      style={{ width: size, height: size, background: c.primary, color: c.text, fontSize: Math.round(size * 0.45) }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
