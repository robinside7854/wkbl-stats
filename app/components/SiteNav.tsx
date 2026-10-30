"use client";
// 모든 화면 상단: 사이트 이름 · 선수 검색 · (시즌 화면에서만) 시즌 선택 · 화면 메뉴. 모바일은 하단 탭 바.
// 틀은 kbl-stats SiteNav 그대로 줄임 — 로그인·알림·즐겨찾기·랜덤 카드·54-0 은 1차 범위 밖(docs/wkbl-kickoff).
// GA4: nav_click(menu, place top/bottom) · 시즌 바꾸기 filter_change(screen, season)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { seasonShortLabel } from "@/lib/format";
import type { SeasonInfo } from "@/lib/types";
import PlayerSearch from "./PlayerSearch";
import { IconCalendar, IconHome, IconLeaders, IconPlayer, IconTeam } from "./icons";
import { trackEvent, trackFilters } from "./track";

export type SiteView = "home" | "players" | "player" | "standings" | "leaders" | "records" | "schedule" | "glossary" | "other";

type MenuItem = { views: SiteView[]; label: string; icon: (p: { size: 24 }) => React.ReactNode; href: (season: string) => string };
const MENU: MenuItem[] = [
  { views: ["home"], label: "홈", icon: IconHome, href: () => "/" },
  { views: ["players", "player"], label: "선수", icon: IconPlayer, href: () => "/players" },
  { views: ["standings"], label: "팀 순위", icon: IconTeam, href: (c) => `/season/${c}/standings` },
  { views: ["leaders", "records"], label: "기록", icon: IconLeaders, href: (c) => `/season/${c}/leaders` },
  { views: ["schedule"], label: "일정", icon: IconCalendar, href: (c) => `/season/${c}/schedule` },
];

/** 시즌 주소가 있는 화면 (시즌을 바꾸면 그 주소로) */
const SEASON_ROUTES: Partial<Record<SiteView, (c: string) => string>> = {
  standings: (c) => `/season/${c}/standings`,
  leaders: (c) => `/season/${c}/leaders`,
  schedule: (c) => `/season/${c}/schedule`,
};

export const SITE_NAME = "WKBL 스탯";

export default function SiteNav({ seasons, season, view }: { seasons: SeasonInfo[]; season: string; view: SiteView }) {
  const router = useRouter();
  const route = SEASON_ROUTES[view];

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto max-w-page px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 pt-3">
          <Link href="/" className="focus-ring order-1 inline-flex h-10 shrink-0 items-center gap-2 rounded-control text-body font-bold tracking-tight text-ink lg:h-12 lg:text-h2">
            <span aria-hidden className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-series-1 text-caption font-black text-white lg:h-8 lg:w-8">
              W
            </span>
            {SITE_NAME}
          </Link>
          <PlayerSearch className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-xs sm:flex-1 lg:max-w-md" />
          {route && seasons.length > 0 && (
            <label className="order-2 flex min-w-0 items-center gap-2 text-sub font-medium text-ink-2 sm:order-3">
              <span className="shrink-0">시즌</span>
              <select
                aria-label="시즌 선택"
                className="focus-ring h-10 min-w-0 cursor-pointer rounded-control border border-line bg-surface px-2 text-base text-ink"
                value={season}
                onChange={(e) => {
                  trackFilters(view, { season: e.target.value });
                  router.push(route(e.target.value));
                }}
              >
                {seasons.map((s) => (
                  <option key={s.code} value={s.code}>
                    {seasonShortLabel(s.label)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <nav aria-label="화면 메뉴" className="-mx-1 mt-2 hidden overflow-x-auto [scrollbar-width:none] md:flex">
          {MENU.map((m) => {
            const active = m.views.includes(view);
            return (
              <Link
                key={m.label}
                href={m.href(season)}
                onClick={() => trackEvent("nav_click", { menu: m.label, place: "top" })}
                aria-current={active ? "page" : undefined}
                className={`focus-ring-inset -mb-px flex h-11 shrink-0 items-center whitespace-nowrap border-b-2 px-2 text-body font-semibold transition-colors duration-200 sm:px-3 lg:h-12 lg:px-4 lg:text-[1.125rem] ${
                  active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"
                }`}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>
        <div className="h-3 md:hidden" />
      </div>
      <nav aria-label="화면 메뉴" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {MENU.map((m) => {
          const active = m.views.includes(view);
          const Icon = m.icon;
          return (
            <Link
              key={m.label}
              href={m.href(season)}
              onClick={() => trackEvent("nav_click", { menu: m.label, place: "bottom" })}
              aria-current={active ? "page" : undefined}
              className={`focus-ring-inset relative flex h-14 flex-col items-center justify-center gap-0.5 text-caption transition-colors duration-200 ${
                active ? "font-bold text-series-1" : "font-medium text-ink-3 hover:text-ink"
              }`}
            >
              {active && <span aria-hidden className="absolute inset-x-3 top-0 h-[3px] rounded-b-sm bg-series-1" />}
              <span className={`flex h-7 w-11 items-center justify-center rounded-control ${active ? "bg-series-1/15" : ""}`}>
                <Icon size={24} />
              </span>
              <span className="whitespace-nowrap leading-none tracking-tight">{m.label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
