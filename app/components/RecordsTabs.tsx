// 기록 화면 탭 한 줄: 시즌별 / 통산 (GA4: nav_click 이 아니라 filter_change screen=records filter=tab)
"use client";
import Link from "next/link";
import { trackFilters } from "./track";

export default function RecordsTabs({ active, season }: { active: "season" | "career"; season: string }) {
  const tabs = [
    { key: "season", label: "시즌별", href: `/season/${season}/leaders` },
    { key: "career", label: "통산", href: "/records" },
  ] as const;
  return (
    <nav aria-label="기록 보기" className="mb-4 flex gap-1 border-b border-line">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          onClick={() => trackFilters("records", { tab: t.key })}
          className={`focus-ring-inset -mb-px flex h-11 items-center border-b-2 px-3 text-body font-semibold transition-colors duration-200 ${
            t.key === active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
