"use client";
// 리더보드 (kbl-stats LeadersView 와 같은 배치 — 2026-11-01 사용자 "KBL 과 데이터 보여 주는 방식 싱크"):
// 부문 칩 한 줄(득점·리바·어시·스틸·블록·3점) + "다른 부문" → 필터 버튼(단위·포지션·팀·표본 기준, 모바일 시트/PC 패널) →
// 1~3위 흰 목록(1위 크게) → 전체 순위(모바일 행 카드 / PC 표). 표 머리글을 누르면 그 기록으로 정렬(같은 열 다시 = 반대 순서),
// 부문인 열이면 1~3위도 그 부문으로. 성공률 아래 작은 글자는 성공/시도, 경기당 시도가 리그 평균보다 적으면 순위 "–".
// 시즌별(/season/{코드}/leaders)·통산(/records) 공용 — scope 로 "시즌 합계"/"통산" 표기만 다르다.
// GA4: filter_change(screen, category·mode·position·team·qualify·sort) · filter_reset(screen) · help_open
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LEADER_STATS,
  LEADERS_PAGE_SIZE,
  PRIMARY_CATEGORIES,
  SECONDARY_GROUPS,
  TABLE_COLUMNS,
  CATEGORIES,
  attemptName,
  attemptThresholds,
  defaultSortDir,
  filterLeaders,
  formatMadeAttempts,
  formatStat,
  formatSummaryStat,
  isModeIndependent,
  isRankEligible,
  madeAttempts,
  rankMap,
  rowSummaryKeys,
  sortLeaders,
  statTitle,
  statValue,
  topLeaders,
  type LeaderEntry,
  type LeaderPlayer,
  type LeaderStatKey,
  type PositionFilter,
  type SortDir,
  type StatMode,
} from "@/lib/leaders";
import { POSITION_LABEL, positionLabel } from "@/lib/format";
import type { QualifyRule } from "@/lib/metrics";
import ChipRow from "./ChipRow";
import FilterSheet, { FilterGroup } from "./FilterSheet";
import HelpPopover from "./HelpPopover";
import { IconChevronDown, IconChevronRight, IconChevronUp } from "./icons";
import PlayerAvatar from "./PlayerAvatar";
import RowList, { type RowColumn } from "./RowList";
import Segmented from "./Segmented";
import TeamBadge from "./TeamBadge";
import { trackEvent, trackFilters } from "./track";

export interface QualifyPreset {
  label: string;
  rule: QualifyRule;
}

const MODE_OPTIONS: { value: StatMode; label: string }[] = [
  { value: "perGame", label: "경기당" },
  { value: "per30", label: "30분당" },
  { value: "total", label: "합계" },
];
const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
  { value: "all", label: "전체" },
  ...(["G", "F", "C"] as const).map((p) => ({ value: p, label: POSITION_LABEL[p] })),
];

function PosBadge({ p }: { p: LeaderPlayer }) {
  if (!p.position) return null;
  return (
    <span className="shrink-0 rounded border border-line px-1 text-caption font-semibold leading-[1.35] text-ink-2" title={positionLabel(p.position)} aria-label={positionLabel(p.position)}>
      {p.position}
    </span>
  );
}

/** 1~3위 한 줄 (KBL CoverItem — 흰 목록, 1위만 크게). 사진 대신 이니셜 원 */
function CoverItem({ entry, category, mode, hero, scope }: { entry: LeaderEntry; category: LeaderStatKey; mode: StatMode; hero: boolean; scope: "season" | "career" }) {
  const p = entry.player;
  const value = formatStat(entry.value, category, mode);
  return (
    <li
      className={`tabular flex min-w-0 items-center gap-3 lg:items-start ${hero ? "px-4 py-4 sm:px-5 lg:pb-5 lg:pl-6 lg:pt-5" : "px-4 py-3 lg:pb-4 lg:pt-4 xl:pl-5"}`}
      aria-label={`${entry.rank}위 ${p.nameKo} ${p.teamName} ${statTitle(category, mode, scope)} ${value}`}
    >
      <Link href={`/player/${p.id}`} tabIndex={-1} aria-hidden className="shrink-0 rounded-full">
        <PlayerAvatar nameKo={p.nameKo} teamCode={p.teamCode} size={hero ? 64 : 44} />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="text-caption font-semibold text-ink-2 lg:text-sub">{entry.rank}위</p>
        {/* deslop-ignore-next-line 11 */}
        <h3 className={`truncate font-bold leading-tight text-ink ${hero ? "text-xl lg:text-4xl" : "text-body lg:text-xl xl:text-2xl"}`} title={p.nameKo}>
          <Link href={`/player/${p.id}`} className="focus-ring rounded-control underline-offset-4 hover:underline">
            {p.nameKo}
          </Link>
        </h3>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-caption text-ink-2 lg:mt-1 lg:text-sub">
          <TeamBadge code={p.teamCode} name={p.teamName} size={16} />
          <span className="truncate">{p.teamName}</span>
          {p.position && <span className="shrink-0">· {positionLabel(p.position)}</span>}
        </p>
        {/* deslop-ignore-next-line 11 */}
        <p className={`mt-3 hidden font-bold leading-none tracking-tight text-ink lg:block ${hero ? "text-6xl" : "text-4xl"}`}>{value}</p>
      </div>
      {/* deslop-ignore-next-line 11 */}
      <p className={`shrink-0 font-bold leading-none tracking-tight text-ink lg:hidden ${hero ? "text-4xl" : "text-2xl"}`}>{value}</p>
    </li>
  );
}

interface Props {
  players: LeaderPlayer[];
  /** 표본 기준 선택지 (첫 번째가 기본) */
  presets: QualifyPreset[];
  scope: "season" | "career";
  /** GA4 화면 이름 */
  screen: "leaders" | "records";
  defaultMode?: StatMode;
  /** 표 캡션 앞머리, 예: "25-26" / "통산" */
  captionPrefix: string;
}

export default function LeadersView({ players, presets, scope, screen, defaultMode = "perGame", captionPrefix }: Props) {
  const [category, setCategory] = useState<LeaderStatKey>("pts");
  const [sort, setSort] = useState<{ key: LeaderStatKey; dir: SortDir } | null>(null);
  const [mode, setMode] = useState<StatMode>(defaultMode);
  const [position, setPosition] = useState<PositionFilter>("all");
  const [teamCode, setTeamCode] = useState<string | null>(null);
  const [presetIdx, setPresetIdx] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);

  const rule = presets[presetIdx]?.rule ?? { minGames: 0 };
  const teams = useMemo(
    () => [...new Map(players.map((p) => [p.teamCode, p.teamName])).entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [players],
  );
  // 시도 기준 = 표본 기준을 넘은 전체 선수의 경기당 시도 평균 (필터와 관계없이 리그 값)
  const thresholds = useMemo(() => attemptThresholds(players, rule), [players, rule]);
  const filtered = useMemo(() => filterLeaders(players, { position, teamCode, rule }), [players, position, teamCode, rule]);

  const sortKey = sort?.key ?? category;
  const sortDir = sort?.dir ?? defaultSortDir(category);
  const rows = useMemo(() => sortLeaders(filtered, sortKey, sortDir, mode, thresholds), [filtered, sortKey, sortDir, mode, thresholds]);
  const ranks = useMemo(() => rankMap(filtered, sortKey, mode, thresholds), [filtered, sortKey, mode, thresholds]);
  const top = useMemo(() => topLeaders(filtered, category, mode, 3, thresholds), [filtered, category, mode, thresholds]);

  const track = (patch: Record<string, unknown>) => trackFilters(screen, patch);
  function chooseCategory(key: LeaderStatKey) {
    setCategory(key);
    setSort(null);
    track({ category: key });
  }
  function clickHeader(key: LeaderStatKey) {
    // 부문으로 고를 수 있는 열이면 1~3위도 그 기록으로 (KBL 2026-10-06 규칙)
    if (key !== category && CATEGORIES.includes(key)) {
      chooseCategory(key);
      return;
    }
    const next = key === sortKey ? { key, dir: (sortDir === "desc" ? "asc" : "desc") as SortDir } : { key, dir: defaultSortDir(key) };
    setSort(next);
    track({ sort: next.dir === defaultSortDir(key) ? key : `${key}_${next.dir}` });
  }
  function reset() {
    setPosition("all");
    setTeamCode(null);
    setPresetIdx(0);
    setMode(defaultMode);
    trackEvent("filter_reset", { screen });
  }

  const chips = [
    mode !== defaultMode && { key: "mode", label: MODE_OPTIONS.find((o) => o.value === mode)!.label, onClear: () => setMode(defaultMode) },
    position !== "all" && { key: "position", label: POSITION_LABEL[position], onClear: () => setPosition("all") },
    teamCode && { key: "team", label: teams.find((t) => t.code === teamCode)?.name ?? teamCode, onClear: () => setTeamCode(null) },
    presetIdx !== 0 && { key: "qualify", label: presets[presetIdx].label, onClear: () => setPresetIdx(0) },
  ].filter((c): c is { key: string; label: string; onClear: () => void } => !!c);

  const inPrimary = PRIMARY_CATEGORIES.includes(category);
  const summaryKeys = rowSummaryKeys(sortKey);
  const note = `야투 ${thresholds.fga.toFixed(1)} · 3점 ${thresholds.threePa.toFixed(1)} · 자유투 ${thresholds.fta.toFixed(1)}`;

  const tableColumns: RowColumn<LeaderPlayer>[] = [
    {
      key: "rank",
      header: "순위",
      align: "center",
      headerClassName: "w-10",
      className: (p) => ((ranks.get(p.id) ?? 99) <= 3 ? "font-black text-ink" : ""),
      cell: (p) => ranks.get(p.id) ?? "–",
    },
    {
      key: "name",
      header: "선수",
      align: "left",
      rowHeader: true,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2">
          <PlayerAvatar nameKo={p.nameKo} teamCode={p.teamCode} size={28} />
          <Link href={`/player/${p.id}`} className="focus-ring truncate rounded-control text-ink hover:underline">
            {p.nameKo}
          </Link>
          <PosBadge p={p} />
        </span>
      ),
    },
    {
      key: "team",
      header: "팀",
      align: "left",
      cell: (p) => (
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <TeamBadge code={p.teamCode} name={p.teamName} size={18} />
          {p.teamName}
        </span>
      ),
    },
    ...TABLE_COLUMNS.map((key): RowColumn<LeaderPlayer> => {
      const active = key === sortKey;
      return {
        key,
        active,
        ariaSort: active ? (sortDir === "desc" ? "descending" : "ascending") : "none",
        headerClassName: "p-0",
        header: (
          <button
            type="button"
            onClick={() => clickHeader(key)}
            title={`${statTitle(key, mode, scope)}로 정렬`}
            className="focus-ring ml-auto flex h-10 cursor-pointer items-center justify-end gap-0.5 whitespace-nowrap rounded-control px-0.5 font-semibold transition-colors duration-200 hover:text-ink"
          >
            {LEADER_STATS[key].short}
            {active && (sortDir === "desc" ? <IconChevronDown size={16} className="-mx-0.5" /> : <IconChevronUp size={16} className="-mx-0.5" />)}
          </button>
        ),
        className: (p) => `whitespace-nowrap ${active && !isRankEligible(p, sortKey, thresholds) ? "opacity-60" : ""}`,
        cell: (p) => {
          const ma = madeAttempts(p, key);
          return (
            <>
              <span className="block leading-tight">{formatStat(statValue(p, key, mode), key, mode)}</span>
              {ma && <span className="block text-caption font-normal leading-tight text-ink-3">{formatMadeAttempts(ma)}</span>}
            </>
          );
        },
      };
    }),
  ];

  return (
    <div>
      {/* 1차 컨트롤: 부문 칩 한 줄 + 다른 부문 */}
      <div className="flex flex-wrap items-center gap-2">
        <ChipRow
          label="부문 선택"
          chips={[
            ...PRIMARY_CATEGORIES.map((k) => ({ value: k, label: LEADER_STATS[k].label })),
            ...(inPrimary ? [] : [{ value: category, label: LEADER_STATS[category].label }]),
          ]}
          value={category}
          onChange={chooseCategory}
        />
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="leaders-more"
          onClick={() => {
            track({ more_categories: moreOpen ? "close" : "open" });
            setMoreOpen((v) => !v);
          }}
          className="focus-ring inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-control border border-line bg-surface px-3 text-body font-semibold text-ink-2 transition-colors duration-200 hover:bg-surface-2"
        >
          다른 부문
          {moreOpen ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
      </div>
      {moreOpen && (
        <div id="leaders-more" className="surface-card mt-2 grid gap-3 rounded-container p-3 sm:grid-cols-2">
          {SECONDARY_GROUPS.map((g) => (
            <div key={g.key} className="min-w-0">
              <p className="text-sub font-semibold text-ink-3">{g.label}</p>
              <ChipRow
                label={`${g.label} 부문`}
                className="mt-1"
                chips={g.categories.map((k) => ({ value: k, label: LEADER_STATS[k].label }))}
                value={category}
                onChange={(k) => {
                  chooseCategory(k);
                  setMoreOpen(false);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* 나머지 필터: 버튼 → 시트(모바일) / 패널(PC). 적용 중인 것은 요약 칩 */}
      <section aria-label="필터" className="mt-3">
        <FilterSheet chips={chips} onReset={reset} resultText={`${filtered.length}명 보기`} trailing={`${filtered.length}명`}>
          <FilterGroup label="기록 단위" hint={isModeIndependent(category) ? "지금 부문은 비율 지표라 단위와 관계없습니다" : undefined}>
            <Segmented
              label="경기당, 30분당 또는 합계"
              options={MODE_OPTIONS}
              value={mode}
              onChange={(v) => {
                setMode(v);
                track({ mode: v });
              }}
            />
          </FilterGroup>
          <FilterGroup label="포지션">
            <Segmented
              label="포지션"
              options={POSITION_OPTIONS}
              value={position}
              onChange={(v) => {
                setPosition(v);
                track({ position: v });
              }}
            />
          </FilterGroup>
          <FilterGroup label="팀">
            <select
              aria-label="팀"
              className="focus-ring h-11 w-full min-w-0 max-w-xs cursor-pointer rounded-control border border-line bg-surface px-2 text-base text-ink"
              value={teamCode ?? ""}
              onChange={(e) => {
                setTeamCode(e.target.value || null);
                track({ team: e.target.value || "all" });
              }}
            >
              <option value="">전체 팀</option>
              {teams.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          </FilterGroup>
          <FilterGroup
            label="표본 기준 (고급)"
            hint={
              <>
                이 기준을 넘긴 선수만 순위에 넣습니다 <HelpPopover term="qualify" />
              </>
            }
          >
            <select
              aria-label="표본 기준"
              className="focus-ring h-11 w-full min-w-0 max-w-xs cursor-pointer rounded-control border border-line bg-surface px-2 text-base text-ink"
              value={presetIdx}
              onChange={(e) => {
                setPresetIdx(Number(e.target.value));
                track({ qualify: e.target.value });
              }}
            >
              {presets.map((r, i) => (
                <option key={i} value={i}>
                  {r.label}
                </option>
              ))}
            </select>
          </FilterGroup>
        </FilterSheet>
        {(position !== "all" || LEADER_STATS[category].better === "low" || attemptName(category)) && (
          <p className="mt-2 text-sub text-ink-3">
            {[
              position !== "all" && "순위는 고른 포지션 안 순위",
              LEADER_STATS[category].better === "low" && "적을수록 상위",
              attemptName(category) && `경기당 시도 리그 평균(${note}) 이상만 순위`,
              mode === "per30" && LEADER_STATS[category].kind === "count" && "30분당 = 누적 ÷ 출전 분 × 30",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </section>

      {/* 선택 부문 1~3위 */}
      <section aria-label={`${statTitle(category, mode, scope)} 1~3위`} className="mt-4">
        {top.length > 0 ? (
          <>
            <p className="flex items-center gap-1 text-sub text-ink-2">
              {statTitle(category, mode, scope)}
              {LEADER_STATS[category].better === "low" && " · 적을수록 상위"}
              {category === "eff" && <HelpPopover term="eff" />}
              {category === "tsPct" && <HelpPopover term="tsPct" />}
            </p>
            <ol className="surface-card mt-2 grid divide-y divide-line overflow-hidden rounded-container lg:grid-cols-[1.4fr_1fr_1fr] lg:divide-x lg:divide-y-0">
              {top.map((e, i) => (
                <CoverItem key={e.player.id} entry={e} category={category} mode={mode} hero={i === 0} scope={scope} />
              ))}
            </ol>
          </>
        ) : (
          <div className="surface-card rounded-container px-4 py-8 text-center">
            <p className="text-body font-semibold text-ink">조건에 맞는 선수가 없습니다</p>
            <p className="mt-1 text-sub text-ink-2">필터를 줄이거나 표본 기준을 낮춰 보세요.</p>
            <button
              type="button"
              onClick={reset}
              className="focus-ring mt-4 h-11 rounded-control border border-line bg-surface px-4 text-body font-semibold text-ink transition-colors duration-200 hover:bg-surface-2"
            >
              필터 초기화
            </button>
          </div>
        )}
      </section>

      {/* 전체 순위: 모바일 행 카드 / PC 표 */}
      {rows.length > 0 && (
        <section aria-labelledby="all-ranks" className="mt-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 id="all-ranks" className="text-h2 font-bold">
              전체 순위
            </h2>
            {/* 모바일 정렬: 드롭다운 하나 (PC 는 열 제목을 누른다) */}
            <label className="flex items-center gap-2 text-sub font-medium text-ink-2 lg:hidden">
              정렬 기준
              <select
                className="focus-ring h-10 cursor-pointer rounded-control border border-line bg-surface px-2 text-base text-ink"
                value={`${sortKey}:${sortDir}`}
                onChange={(e) => {
                  const [k, d] = e.target.value.split(":") as [LeaderStatKey, SortDir];
                  setSort({ key: k, dir: d });
                  track({ sort: d === defaultSortDir(k) ? k : `${k}_${d}` });
                }}
              >
                {TABLE_COLUMNS.map((key) => (
                  <option key={key} value={`${key}:${defaultSortDir(key)}`}>
                    {LEADER_STATS[key].label}
                  </option>
                ))}
                {sortDir !== defaultSortDir(sortKey) && <option value={`${sortKey}:${sortDir}`}>{LEADER_STATS[sortKey].label} (역순)</option>}
              </select>
            </label>
          </div>
          <RowList
            rows={rows}
            rowKey={(p) => p.id}
            caption={`${captionPrefix} ${statTitle(sortKey, mode, scope)} ${sortDir === defaultSortDir(sortKey) ? "상위 순" : "하위 순"}`}
            columns={tableColumns}
            pageSize={LEADERS_PAGE_SIZE}
            resetKey={`${category}|${sortKey}|${sortDir}|${mode}|${position}|${teamCode}|${presetIdx}`}
            emphasize={(p) => (ranks.get(p.id) ?? 99) <= 3}
            dense
            rowLabel={(p) =>
              `${ranks.get(p.id) ?? "순위 없음"}${ranks.has(p.id) ? "위" : ""} ${p.nameKo}, ${statTitle(sortKey, mode, scope)} ${formatStat(statValue(p, sortKey, mode), sortKey, mode)}, 자세히`
            }
            summary={(p) => {
              const rank = ranks.get(p.id);
              const ma = madeAttempts(p, sortKey);
              const eligible = isRankEligible(p, sortKey, thresholds);
              return (
                <>
                  <span className={`tabular w-7 shrink-0 text-center text-body leading-tight ${rank !== undefined && rank <= 3 ? "font-black text-ink" : "font-semibold text-ink-3"}`}>
                    {rank ?? "–"}
                  </span>
                  <PlayerAvatar nameKo={p.nameKo} teamCode={p.teamCode} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-body font-semibold leading-tight text-ink">{p.nameKo}</span>
                      <PosBadge p={p} />
                    </span>
                    <span className="tabular mt-0.5 flex min-w-0 items-center gap-1 text-sub text-ink-3">
                      <TeamBadge code={p.teamCode} name={p.teamName} size={16} />
                      <span className="truncate">
                        {p.teamName} · {summaryKeys.slice(0, 2).map((k) => formatSummaryStat(p, k, mode)).join(" · ")}
                        <span className="hidden sm:inline"> · {formatSummaryStat(p, summaryKeys[2], mode)}</span>
                      </span>
                    </span>
                  </span>
                  <span className={`shrink-0 text-right ${eligible ? "" : "opacity-60"}`}>
                    <span className="tabular block text-lg font-bold leading-tight tracking-tight text-ink">{formatStat(statValue(p, sortKey, mode), sortKey, mode)}</span>
                    <span className="tabular block text-caption leading-tight text-ink-3">{ma ? formatMadeAttempts(ma) : LEADER_STATS[sortKey].short}</span>
                  </span>
                </>
              );
            }}
            details={(p) =>
              TABLE_COLUMNS.map((key) => {
                const ma = madeAttempts(p, key);
                return {
                  key,
                  label: LEADER_STATS[key].short,
                  strong: key === sortKey,
                  value: (
                    <>
                      {formatStat(statValue(p, key, mode), key, mode)}
                      {ma && <span className="ml-1 text-caption font-normal text-ink-3">{formatMadeAttempts(ma)}</span>}
                    </>
                  ),
                };
              })
            }
            detailFooter={(p) => (
              <Link href={`/player/${p.id}`} className="focus-ring link-shortcut px-1 text-body">
                {p.nameKo} 선수 페이지 <IconChevronRight size={16} />
              </Link>
            )}
          />
          <p className="mt-2 flex flex-wrap items-center gap-1 text-sub leading-relaxed text-ink-3">
            성공률 아래 작은 숫자는 {scope === "career" ? "통산" : "시즌"} 합계 성공/시도. 경기당 시도가 리그 평균({note})보다 적으면 순위 칸에 – 표시
            <HelpPopover term="attempts" />
          </p>
        </section>
      )}
    </div>
  );
}
