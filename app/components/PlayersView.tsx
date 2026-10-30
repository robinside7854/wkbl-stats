"use client";
// 선수 탭: 이름 거르기 · 현역/전체 · 포지션 · 팀 칩 → 선수 목록 (통산 득점 순).
// GA4: filter_change(screen=players, scope·position·team) — 이름 입력값은 보내지 않는다(개인 입력 원문 금지)
import Link from "next/link";
import { useMemo, useState } from "react";
import { POSITION_LABEL, positionLabel } from "@/lib/format";
import type { Position } from "@/lib/types";
import ChipRow from "./ChipRow";
import PlayerAvatar from "./PlayerAvatar";
import RowList from "./RowList";
import Segmented from "./Segmented";
import { trackEvent, trackFilters } from "./track";

export interface PlayerRow {
  no: string;
  ko: string;
  en: string;
  team: string;
  teamName: string;
  pos: Position | null;
  span: string;
  active: boolean;
  games: number;
  ppg: number;
  rpg: number;
  apg: number;
  pts: number;
}

type Pos = "all" | Position;
const norm = (s: string) => s.toLowerCase().replace(/[\s.,'-]/g, "");

export default function PlayersView({ rows, teams }: { rows: PlayerRow[]; teams: { code: string; name: string }[] }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<"active" | "all">("active");
  const [pos, setPos] = useState<Pos>("all");
  const [team, setTeam] = useState("all");

  const list = useMemo(() => {
    const n = norm(q);
    return rows.filter(
      (r) =>
        (scope === "all" || r.active) &&
        (pos === "all" || r.pos === pos) &&
        (team === "all" || r.team === team) &&
        (!n || norm(r.ko).includes(n) || norm(r.en).includes(n)),
    );
  }, [rows, q, scope, pos, team]);

  function reset() {
    setQ("");
    setScope("all");
    setPos("all");
    setTeam("all");
    trackEvent("filter_reset", { screen: "players" });
  }

  return (
    <div>
      <div className="mb-3 space-y-2">
        <label className="flex h-12 items-center gap-2 rounded-control border border-line bg-surface px-3 focus-within:border-ink">
          <span className="sr-only">이름으로 찾기</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름으로 찾기 (한글·영문)"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="범위"
            options={[
              { value: "active", label: "지금 시즌" },
              { value: "all", label: "전체" },
            ]}
            value={scope}
            onChange={(v) => {
              setScope(v);
              trackFilters("players", { scope: v });
            }}
          />
          <ChipRow
            label="포지션"
            chips={[{ value: "all" as Pos, label: "전체" }, ...(["G", "F", "C"] as const).map((p) => ({ value: p as Pos, label: POSITION_LABEL[p] }))]}
            value={pos}
            onChange={(v) => {
              setPos(v);
              trackFilters("players", { position: v });
            }}
          />
        </div>
        <ChipRow
          label="팀"
          scroll
          chips={[{ value: "all", label: "모든 팀" }, ...teams.map((t) => ({ value: t.code, label: t.name }))]}
          value={team}
          onChange={(v) => {
            setTeam(v);
            trackFilters("players", { team: v });
          }}
        />
        <p className="text-caption text-ink-3">{list.length}명 · 통산 득점 순</p>
      </div>
      {list.length === 0 ? (
        <div role="status" className="surface-card rounded-container px-4 py-8 text-center text-body text-ink-2">
          찾는 선수가 없어요
          <button type="button" onClick={reset} className="focus-ring link-shortcut ml-2">
            필터 초기화
          </button>
        </div>
      ) : (
        <RowList
          rows={list}
          rowKey={(r) => r.no}
          caption="선수 목록"
          pageSize={60}
          resetKey={`${q}-${scope}-${pos}-${team}`}
          rowLabel={(r) => `${r.ko}, 자세히`}
          summary={(r) => (
            <>
              <PlayerAvatar nameKo={r.ko} teamCode={r.team} size={36} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body font-semibold text-ink">{r.ko}</span>
                <span className="block truncate text-caption text-ink-3">
                  {r.teamName} · {positionLabel(r.pos)} · {r.span}
                </span>
              </span>
              <span className="tabular shrink-0 text-right text-sub text-ink-2">
                <span className="block font-bold text-ink">{r.ppg.toFixed(1)}점</span>
                <span className="block text-caption text-ink-3">{r.games}경기</span>
              </span>
            </>
          )}
          details={(r) => [
            { key: "g", label: "경기", value: r.games },
            { key: "pts", label: "통산 득점", value: r.pts.toLocaleString("ko-KR") },
            { key: "ppg", label: "경기당 득점", value: r.ppg.toFixed(1) },
            { key: "rpg", label: "경기당 리바", value: r.rpg.toFixed(1) },
            { key: "apg", label: "경기당 어시", value: r.apg.toFixed(1) },
          ]}
          detailFooter={(r) => (
            <Link href={`/player/${r.no}`} className="focus-ring link-shortcut text-sub">
              선수 페이지
            </Link>
          )}
          columns={[
            {
              key: "name",
              header: "선수",
              align: "left",
              rowHeader: true,
              cell: (r) => (
                <Link href={`/player/${r.no}`} className="focus-ring inline-flex items-center gap-2 rounded-control text-ink hover:underline">
                  <PlayerAvatar nameKo={r.ko} teamCode={r.team} size={28} />
                  {r.ko}
                </Link>
              ),
            },
            { key: "team", header: "팀(마지막)", align: "left", cell: (r) => r.teamName },
            { key: "pos", header: "포지션", align: "left", cell: (r) => positionLabel(r.pos) },
            { key: "span", header: "시즌", align: "left", cell: (r) => r.span },
            { key: "g", header: "경기", cell: (r) => r.games },
            { key: "pts", header: "통산 득점", active: true, cell: (r) => r.pts.toLocaleString("ko-KR") },
            { key: "ppg", header: "득점", cell: (r) => r.ppg.toFixed(1) },
            { key: "rpg", header: "리바", cell: (r) => r.rpg.toFixed(1) },
            { key: "apg", header: "어시", cell: (r) => r.apg.toFixed(1) },
          ]}
        />
      )}
    </div>
  );
}
