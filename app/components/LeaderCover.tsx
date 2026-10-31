// 리더보드 1~3위 표지 카드 (kbl-stats LeadersView CoverItem 을 줄임): 팀 색 바탕 + 순위 + 이름·팀 + 큰 숫자.
// 1위는 폰에서 한 줄 전체, 2·3위는 반씩. PC 는 세 칸. 누르면 선수 페이지
import Link from "next/link";
import { mixHex, teamColor } from "@/lib/teams";

export interface CoverItem {
  playerNo: string;
  nameKo: string;
  teamCode: string;
  teamName: string;
  rank: number;
  value: string;
  sub: string;
}

export default function LeaderCover({ items, unit }: { items: CoverItem[]; unit: string }) {
  if (items.length === 0) return null;
  return (
    <ol className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="1~3위">
      {items.slice(0, 3).map((it, i) => {
        const c = teamColor(it.teamCode);
        const dark = mixHex(c.primary, "#000000", 0.5);
        const first = i === 0;
        return (
          <li key={it.playerNo} className={first ? "col-span-2 sm:col-span-1" : ""}>
            <Link
              href={`/player/${it.playerNo}`}
              className="focus-ring relative flex h-full min-h-28 flex-col justify-between overflow-hidden rounded-container p-3 shadow-card transition-[filter] duration-200 hover:brightness-110 sm:min-h-36 sm:p-4"
              style={{ background: `linear-gradient(150deg, ${c.primary} 0%, ${dark} 100%)`, color: c.text }}
            >
              {/* 배경 큰 순위 숫자 */}
              {/* deslop-ignore-next-line 11 */}
              <span aria-hidden className="tabular pointer-events-none absolute -bottom-6 right-1 select-none text-[7rem] font-black leading-none opacity-15">
                {it.rank}
              </span>
              <span className="relative flex items-center gap-2 text-sub font-semibold opacity-90">
                <span className="tabular inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/25 font-black">{it.rank}</span>
                {it.teamName}
              </span>
              <span className="relative mt-2 block">
                <span className={`block truncate font-black ${first ? "text-h1" : "text-h2"}`}>{it.nameKo}</span>
                <span className="tabular mt-0.5 flex items-baseline gap-1">
                  <span className={`font-black tracking-tight ${first ? "text-5xl" : "text-3xl"}`}>{it.value}</span>
                  <span className="text-sub font-semibold opacity-85">{unit}</span>
                </span>
                <span className="mt-0.5 block truncate text-caption opacity-80">{it.sub}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
