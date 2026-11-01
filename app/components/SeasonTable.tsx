"use client";
// 선수 상세 시즌별 기록표 (RowList: 모바일 행 카드 / PC 표). 숫자는 부르는 쪽(page)이 lib 로 계산해 넘긴다.
import type { ReactNode } from "react";
import RowList from "./RowList";
import TeamBadge from "./TeamBadge";

export interface SeasonRow {
  key: string;
  label: string;
  team: string;
  teamName: string;
  games: number;
  min: string;
  pts: string;
  reb: string;
  ast: string;
  stl: string;
  blk: string;
  tov: string;
  pf: string;
  fg: string;
  three: string;
  ft: string;
  ts: string;
  career?: boolean;
  /** 그 시즌 리그 1위인 칸 키 (pts·reb·ast·stl·blk·fg·three·ft) */
  lead?: string[];
}

/** 리그 1위 칸은 굵은 글자 + 금색 (kbl-stats 기록표와 같은 표시) */
function cell(r: SeasonRow, key: "pts" | "reb" | "ast" | "stl" | "blk" | "fg" | "three" | "ft"): ReactNode {
  return r.lead?.includes(key) ? (
    <b className="font-black text-gold-ink" title="그 시즌 리그 1위">
      {r[key]}
    </b>
  ) : (
    r[key]
  );
}

export default function SeasonTable({ rows }: { rows: SeasonRow[] }) {
  return (
    <RowList
      rows={rows}
      rowKey={(r) => r.key}
      caption="시즌별 기록 (경기당)"
      rowLabel={(r) => `${r.label} 기록, 자세히`}
      emphasize={(r) => !!r.career}
      summary={(r) => (
        <>
          {r.career ? <span className="w-6" /> : <TeamBadge code={r.team} name={r.teamName} size={24} />}
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-body ${r.career ? "font-bold" : "font-semibold"} text-ink`}>{r.label}</span>
            <span className="block truncate text-caption text-ink-3">
              {r.teamName} · {r.games}경기
            </span>
          </span>
          <span className="tabular shrink-0 text-sub text-ink-2">
            <b className="text-ink">{cell(r, "pts")}</b>점 {cell(r, "reb")}리 {cell(r, "ast")}어
          </span>
        </>
      )}
      details={(r) => [
        { key: "min", label: "출전", value: r.min },
        { key: "stl", label: "스틸", value: cell(r, "stl") },
        { key: "blk", label: "블록", value: cell(r, "blk") },
        { key: "tov", label: "턴오버", value: r.tov },
        { key: "pf", label: "파울", value: r.pf },
        { key: "fg", label: "야투%", value: cell(r, "fg") },
        { key: "three", label: "3점%", value: cell(r, "three") },
        { key: "ft", label: "자유투%", value: cell(r, "ft") },
        { key: "ts", label: "TS%", value: r.ts },
      ]}
      columns={[
        { key: "label", header: "시즌", align: "left", rowHeader: true, cell: (r) => r.label },
        { key: "team", header: "팀", align: "left", cell: (r) => r.teamName },
        { key: "g", header: "경기", cell: (r) => r.games },
        { key: "min", header: "출전", cell: (r) => r.min },
        { key: "pts", header: "득점", cell: (r) => cell(r, "pts") },
        { key: "reb", header: "리바", cell: (r) => cell(r, "reb") },
        { key: "ast", header: "어시", cell: (r) => cell(r, "ast") },
        { key: "stl", header: "스틸", cell: (r) => cell(r, "stl") },
        { key: "blk", header: "블록", cell: (r) => cell(r, "blk") },
        { key: "tov", header: "턴오버", cell: (r) => r.tov },
        { key: "pf", header: "파울", cell: (r) => r.pf },
        { key: "fg", header: "야투%", cell: (r) => cell(r, "fg") },
        { key: "three", header: "3점%", cell: (r) => cell(r, "three") },
        { key: "ft", header: "자유투%", cell: (r) => cell(r, "ft") },
        { key: "ts", header: "TS%", cell: (r) => r.ts },
      ]}
    />
  );
}
