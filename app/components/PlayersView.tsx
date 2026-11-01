"use client";
// 선수 탭 (kbl-stats PlayersView 와 같은 틀, 2026-11-01 싱크): 이름 찾기 + 시즌 고르기 → 그 시즌 선수 카드 격자.
// 카드 = 팀 색 옅은 띠(팀·등급·포지션) + 이니셜 원 / 이름·팀 / 경기당 득점·리바·어시. 공식 사진·로고는 쓰지 않는다.
// 나열 순서 = 등급순·득점순·키순·나이순, 고른 버튼을 한 번 더 누르면 반대 순서(꺾쇠). 필터 = 등급·포지션·팀.
// 첫 시즌은 HTML 에 들어 있고, 다른 시즌은 /season-players/{시즌}.json 을 받는다(scripts/build-season-players).
// GA4: filter_change(screen=players, season·sort(값, 반대는 _asc)·grade·position·team) · filter_reset — 이름 입력값은 보내지 않는다
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { POSITION_LABEL, positionLabel } from "@/lib/format";
import type { Grade } from "@/lib/grades";
import {
  DEFAULT_GRID_FILTER,
  GRID_SORTS,
  filterGrid,
  gradeCounts,
  seasonPlayersUrl,
  sortGrid,
  type GridFilter,
  type GridPlayer,
  type GridSort,
  type SeasonPlayersFile,
} from "@/lib/players-grid";
import type { Position } from "@/lib/types";
import { teamColor } from "@/lib/teams";
import ChipRow from "./ChipRow";
import FilterSheet, { FilterGroup, type ActiveFilterChip } from "./FilterSheet";
import GradeBadge from "./GradeBadge";
import PlayerAvatar from "./PlayerAvatar";
import { IconChevronDown, IconChevronUp } from "./icons";
import { trackEvent, trackFilters } from "./track";

const GRADES: Grade[] = ["S", "A", "B", "C", "D", "F"];
const PAGE = 24;
const norm = (s: string) => s.toLowerCase().replace(/[\s.,'-]/g, "");

export default function PlayersView({
  seasons,
  initial,
}: {
  /** 선수가 있는 시즌 (최신 먼저) */
  seasons: { code: string; label: string }[];
  initial: SeasonPlayersFile;
}) {
  const [season, setSeason] = useState(initial.season);
  const [cache, setCache] = useState<Record<string, GridPlayer[]>>({ [initial.season]: initial.players });
  const [failed, setFailed] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<GridSort>("grade");
  const [asc, setAsc] = useState(false);
  const [filter, setFilter] = useState<GridFilter>(DEFAULT_GRID_FILTER);
  const [shown, setShown] = useState(PAGE);

  const players = cache[season];
  useEffect(() => {
    if (cache[season]) return;
    let live = true;
    setFailed(false);
    fetch(seasonPlayersUrl(season))
      .then((r) => (r.ok ? (r.json() as Promise<SeasonPlayersFile>) : Promise.reject(new Error(String(r.status)))))
      .then((f) => live && setCache((c) => ({ ...c, [season]: f.players })))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [season, cache]);

  const teams = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of players ?? []) m.set(p.team, p.teamName);
    return [...m].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [players]);
  const counts = useMemo(() => gradeCounts(players ?? []), [players]);

  const list = useMemo(() => {
    const n = norm(q);
    const base = filterGrid(players ?? [], filter).filter((p) => !n || norm(p.ko).includes(n));
    return sortGrid(base, sort, asc);
  }, [players, filter, q, sort, asc]);

  useEffect(() => setShown(PAGE), [season, filter, q, sort, asc]);

  function setF(patch: Partial<GridFilter>, ga: Record<string, string>) {
    setFilter((f) => ({ ...f, ...patch }));
    trackFilters("players", ga);
  }
  function pickSort(v: GridSort) {
    const nextAsc = v === sort ? !asc : false;
    setSort(v);
    setAsc(nextAsc);
    trackFilters("players", { sort: nextAsc ? `${v}_asc` : v });
  }
  function reset() {
    setFilter(DEFAULT_GRID_FILTER);
    setQ("");
    trackEvent("filter_reset", { screen: "players" });
  }

  const chips: ActiveFilterChip[] = [];
  if (filter.grade) chips.push({ key: "grade", label: `등급 ${filter.grade}`, onClear: () => setFilter((f) => ({ ...f, grade: null })) });
  if (filter.position !== "all") chips.push({ key: "pos", label: POSITION_LABEL[filter.position], onClear: () => setFilter((f) => ({ ...f, position: "all" })) });
  if (filter.team) chips.push({ key: "team", label: teams.find((t) => t.code === filter.team)?.name ?? filter.team, onClear: () => setFilter((f) => ({ ...f, team: null })) });

  return (
    <div>
      <div className="mb-3 space-y-2">
        <label className="flex h-12 items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-ink">
          <span className="sr-only">이름으로 찾기</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이 시즌 선수 이름으로 찾기"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2">
            <span className="text-sub font-semibold text-ink-2">시즌</span>
            <select
              value={season}
              onChange={(e) => {
                setSeason(e.target.value);
                setFilter((f) => ({ ...f, team: null }));
                trackFilters("players", { season: e.target.value });
              }}
              className="focus-ring h-10 rounded-control border border-line bg-surface px-2 text-base text-ink"
            >
              {seasons.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <FilterSheet chips={chips} onReset={reset} resultText={`${list.length}명 보기`}>
            <FilterGroup label="종합 등급">
              <ChipRow
                label="종합 등급"
                chips={[{ value: "all", label: "전체" }, ...GRADES.filter((g) => counts.has(g)).map((g) => ({ value: g as string, label: `${g} ${counts.get(g)}` }))]}
                value={filter.grade ?? "all"}
                onChange={(v) => setF({ grade: v === "all" ? null : (v as Grade) }, { grade: v })}
              />
            </FilterGroup>
            <FilterGroup label="포지션">
              <ChipRow
                label="포지션"
                chips={[{ value: "all", label: "전체" }, ...(["G", "F", "C"] as const).map((p) => ({ value: p as string, label: POSITION_LABEL[p] }))]}
                value={filter.position}
                onChange={(v) => setF({ position: v as "all" | Position }, { position: v })}
              />
            </FilterGroup>
            <FilterGroup label="팀">
              <ChipRow
                label="팀"
                chips={[{ value: "all", label: "모든 팀" }, ...teams.map((t) => ({ value: t.code, label: t.name }))]}
                value={filter.team ?? "all"}
                onChange={(v) => setF({ team: v === "all" ? null : v }, { team: v })}
              />
            </FilterGroup>
          </FilterSheet>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sub text-ink-3">{players ? `${list.length}명` : ""}</p>
          <div role="group" aria-label="나열 순서" className="inline-flex rounded-control border border-line bg-surface p-0.5">
            {GRID_SORTS.map((o) => {
              const on = o.value === sort;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={on ? `${o.label}, ${asc ? "반대 순서" : "기본 순서"} — 누르면 순서 바꾸기` : o.label}
                  onClick={() => pickSort(o.value)}
                  className={`focus-ring-inset inline-flex h-10 cursor-pointer items-center gap-0.5 rounded-md px-2.5 text-sub font-semibold transition-colors duration-200 ${
                    on ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"
                  }`}
                >
                  {o.label}
                  {on && (asc ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {!players ? (
        failed ? (
          <div role="status" className="surface-card rounded-container px-4 py-8 text-center text-body text-ink-2">
            불러오지 못했어요
            <button type="button" onClick={() => setCache((c) => ({ ...c }))} className="focus-ring link-shortcut ml-2">
              다시 불러오기
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6" aria-busy="true">
            {Array.from({ length: 12 }, (_, i) => (
              <li key={i} className="h-44 animate-pulse rounded-card bg-surface-2" />
            ))}
          </ul>
        )
      ) : list.length === 0 ? (
        <div role="status" className="surface-card rounded-container px-4 py-8 text-center text-body text-ink-2">
          찾는 선수가 없어요
          <button type="button" onClick={reset} className="focus-ring link-shortcut ml-2">
            필터 초기화
          </button>
        </div>
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {list.slice(0, shown).map((p) => (
              <li key={p.id}>
                <GridCard p={p} />
              </li>
            ))}
          </ul>
          {list.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE * 2)}
              className="focus-ring mt-3 h-11 w-full rounded-control border border-line bg-surface text-body font-semibold text-ink-2 transition-colors duration-200 hover:bg-surface-2"
            >
              {list.length - shown}명 더 보기
            </button>
          )}
        </>
      )}
    </div>
  );
}

function GridCard({ p }: { p: GridPlayer }) {
  const c = teamColor(p.team);
  const sub = [p.h ? `${p.h}cm` : null, p.b ? `${p.b.slice(0, 4)}년생` : null].filter(Boolean).join(" · ");
  return (
    <Link
      href={`/player/${p.id}`}
      className="focus-ring surface-card block overflow-hidden rounded-card transition-colors duration-200 hover:bg-surface-2"
    >
      <div
        className="flex items-start justify-between gap-1 px-2.5 pb-2 pt-2.5"
        style={{ background: `color-mix(in srgb, ${c.primary} 15%, transparent)`, borderBottom: `3px solid ${c.primary}` }}
      >
        <div className="flex min-w-0 flex-col items-start gap-1.5">
          {p.grade ? (
            <GradeBadge grade={p.grade.g} pct={p.grade.s} team={c} size="md" />
          ) : (
            <span className="inline-flex h-9 items-center rounded-control border border-line bg-surface px-2 text-caption text-ink-3">표본 미달</span>
          )}
          <span className="rounded-control border border-line bg-surface px-1.5 py-0.5 text-caption font-semibold text-ink-2">{positionLabel(p.pos)}</span>
        </div>
        <PlayerAvatar nameKo={p.ko} teamCode={p.team} size={56} />
      </div>
      <div className="px-2.5 pb-2.5 pt-2">
        <p className="truncate text-body font-bold text-ink">{p.ko}</p>
        <p className="truncate text-caption text-ink-2">{p.teamName}</p>
        <p className="truncate text-caption text-ink-3">{sub || "\u00a0"}</p>
        <dl className="tabular mt-2 grid grid-cols-3 gap-1 text-center">
          {(
            [
              ["득점", p.ppg],
              ["리바", p.rpg],
              ["어시", p.apg],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="rounded-md bg-surface-2 py-1">
              <dt className="text-caption text-ink-3">{k}</dt>
              <dd className="text-sub font-bold text-ink">{v.toFixed(1)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}
