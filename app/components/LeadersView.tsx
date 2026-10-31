"use client";
// 리더보드 (시즌별 /season/{코드}/leaders · 통산 /records 공용).
// 부문 칩 · 경기당/합계 · 포지션 칩 → 순위 목록(RowList: 모바일 행 카드 / PC 표). 순위 계산은 lib/leaders rankBy.
// GA4: filter_change(screen, category·mode·position) · help_open(ⓘ)
import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, categoryOf, categoryValue, rankBy, type CategoryKey, type Line, type Mode } from "@/lib/leaders";
import { formatValue, type QualifyRule } from "@/lib/metrics";
import { POSITION_LABEL } from "@/lib/format";
import type { Position } from "@/lib/types";
import ChipRow from "./ChipRow";
import HelpPopover from "./HelpPopover";
import PlayerAvatar from "./PlayerAvatar";
import LeaderCover from "./LeaderCover";
import RowList from "./RowList";
import Segmented from "./Segmented";
import { trackFilters } from "./track";

export interface LeaderInput extends Line {
  playerNo: string;
  nameKo: string;
  teamCode: string;
  teamName: string;
  position: Position | null;
  /** 이름 아래 작은 글 (통산: 뛴 시즌) */
  sub?: string;
}

type Pos = "all" | Position;

function show(v: number | null, key: CategoryKey, mode: Mode): string {
  const kind = categoryOf(key).kind;
  if (kind === "pct") return formatValue(v, "pct");
  if (kind === "time") return mode === "avg" ? formatValue(v, "avg") : formatValue(v, "total");
  return formatValue(v, mode === "avg" ? "avg" : "total");
}

export default function LeadersView({
  rows,
  rule,
  screen,
  defaultMode = "avg",
  ruleNote,
}: {
  rows: LeaderInput[];
  rule: QualifyRule;
  screen: "leaders" | "records";
  defaultMode?: Mode;
  /** 표본 기준 한 줄 (예: "15경기 이상") */
  ruleNote: string;
}) {
  const [cat, setCat] = useState<CategoryKey>("pts");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [pos, setPos] = useState<Pos>("all");
  const c = categoryOf(cat);

  const ranked = useMemo(() => {
    const pool = pos === "all" ? rows : rows.filter((r) => r.position === pos);
    return rankBy(pool, cat, mode, rule);
  }, [rows, cat, mode, pos, rule]);

  const sideKeys = (["pts", "reb", "ast"] as const).filter((k) => k !== cat);
  const resetKey = `${cat}-${mode}-${pos}`;

  return (
    <div>
      <div className="mb-3 space-y-2">
        <ChipRow
          label="부문"
          scroll
          chips={CATEGORIES.map((x) => ({ value: x.key, label: x.label }))}
          value={cat}
          onChange={(v) => {
            setCat(v);
            trackFilters(screen, { category: v });
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {c.kind !== "pct" && (
            <Segmented
              label="단위"
              options={[
                { value: "avg", label: "경기당" },
                { value: "total", label: "합계" },
              ]}
              value={mode}
              onChange={(v) => {
                setMode(v);
                trackFilters(screen, { mode: v });
              }}
            />
          )}
          <ChipRow
            label="포지션"
            chips={[{ value: "all" as Pos, label: "전체" }, ...(["G", "F", "C"] as const).map((p) => ({ value: p as Pos, label: POSITION_LABEL[p] }))]}
            value={pos}
            onChange={(v) => {
              setPos(v);
              trackFilters(screen, { position: v });
            }}
          />
        </div>
        <p className="flex items-center gap-1 text-caption text-ink-3">
          {c.kind === "pct" || mode === "avg" ? ruleNote : "합계는 뛴 선수 모두"}
          <HelpPopover term={c.kind === "pct" ? "attempts" : "qualify"} />
          {(cat === "eff" || cat === "tsPct") && (
            <>
              <span className="ml-2">우리 계산</span>
              <HelpPopover term={cat === "eff" ? "eff" : "tsPct"} />
            </>
          )}
        </p>
      </div>

      {ranked.length > 0 && (
        <LeaderCover
          unit={c.kind === "pct" ? "%" : c.kind === "time" ? "분" : mode === "avg" ? "경기당" : "합계"}
          items={ranked.slice(0, 3).map((r) => ({
            playerNo: r.row.playerNo,
            nameKo: r.row.nameKo,
            teamCode: r.row.teamCode,
            teamName: r.row.teamName,
            rank: r.rank,
            value: show(r.value, cat, mode),
            sub: `${r.row.games}경기${r.row.sub ? ` · ${r.row.sub}` : ""}`,
          }))}
        />
      )}
      {ranked.length === 0 ? (
        <div role="status" className="surface-card rounded-container px-4 py-8 text-center text-body text-ink-2">
          조건에 맞는 선수가 없어요
          <button
            type="button"
            onClick={() => {
              setPos("all");
              trackFilters(screen, { position: "all" });
            }}
            className="focus-ring link-shortcut ml-2"
          >
            필터 초기화
          </button>
        </div>
      ) : (
        <RowList
          rows={ranked}
          rowKey={(r) => r.row.playerNo}
          caption={`${c.label} 순위`}
          pageSize={50}
          resetKey={resetKey}
          rowLabel={(r) => `${r.rank}위 ${r.row.nameKo}, 자세히`}
          emphasize={(r) => r.rank <= 3}
          summary={(r) => (
            <>
              <span className="tabular w-6 shrink-0 text-center text-body font-bold text-ink-2">{r.rank}</span>
              <PlayerAvatar nameKo={r.row.nameKo} teamCode={r.row.teamCode} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">{r.row.nameKo}</span>
                <span className="block truncate text-caption text-ink-3">
                  {r.row.teamName} · {r.row.games}경기{r.row.sub ? ` · ${r.row.sub}` : ""}
                </span>
              </span>
              <span className="tabular shrink-0 text-h2 font-bold text-ink">{show(r.value, cat, mode)}</span>
            </>
          )}
          details={(r) => [
            { key: "g", label: "경기", value: r.row.games },
            ...(["pts", "reb", "ast", "stl", "blk", "threePm"] as const).map((k) => ({
              key: k,
              label: categoryOf(k).label,
              value: show(categoryValue(r.row, k, mode), k, mode),
              strong: k === cat,
            })),
            { key: "fg", label: "야투%", value: show(categoryValue(r.row, "fgPct", mode), "fgPct", mode), strong: cat === "fgPct" },
            { key: "ts", label: "TS%", value: show(categoryValue(r.row, "tsPct", mode), "tsPct", mode), strong: cat === "tsPct" },
          ]}
          detailFooter={(r) => (
            <Link href={`/player/${r.row.playerNo}`} className="focus-ring link-shortcut text-sub">
              선수 페이지
            </Link>
          )}
          columns={[
            { key: "rank", header: "순위", cell: (r) => r.rank, align: "center" },
            {
              key: "name",
              header: "선수",
              align: "left",
              rowHeader: true,
              cell: (r) => (
                <Link href={`/player/${r.row.playerNo}`} className="focus-ring inline-flex items-center gap-2 rounded-control text-ink hover:underline">
                  <PlayerAvatar nameKo={r.row.nameKo} teamCode={r.row.teamCode} size={28} />
                  {r.row.nameKo}
                  {r.row.sub && <span className="text-caption font-normal text-ink-3">{r.row.sub}</span>}
                </Link>
              ),
            },
            { key: "team", header: "팀", align: "left", cell: (r) => r.row.teamName },
            { key: "g", header: "경기", cell: (r) => r.row.games },
            { key: "val", header: c.label, active: true, cell: (r) => show(r.value, cat, mode) },
            ...sideKeys.map((k) => ({ key: k, header: categoryOf(k).short, cell: (r: (typeof ranked)[number]) => show(categoryValue(r.row, k, mode), k, mode) })),
            { key: "ts", header: "TS%", cell: (r) => show(categoryValue(r.row, "tsPct", mode), "tsPct", mode) },
          ]}
        />
      )}
    </div>
  );
}
