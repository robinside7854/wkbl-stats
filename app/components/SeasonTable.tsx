"use client";
// 선수 상세 시즌별 기록표 (RowList: 모바일 행 카드 / PC 표). 숫자는 부르는 쪽(page)이 lib 로 계산해 넘긴다.
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
  fg: string;
  three: string;
  ft: string;
  ts: string;
  career?: boolean;
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
            <b className="text-ink">{r.pts}</b>점 {r.reb}리 {r.ast}어
          </span>
        </>
      )}
      details={(r) => [
        { key: "min", label: "출전", value: r.min },
        { key: "stl", label: "스틸", value: r.stl },
        { key: "blk", label: "블록", value: r.blk },
        { key: "fg", label: "야투%", value: r.fg },
        { key: "three", label: "3점%", value: r.three },
        { key: "ft", label: "자유투%", value: r.ft },
        { key: "ts", label: "TS%", value: r.ts },
      ]}
      columns={[
        { key: "label", header: "시즌", align: "left", rowHeader: true, cell: (r) => r.label },
        { key: "team", header: "팀", align: "left", cell: (r) => r.teamName },
        { key: "g", header: "경기", cell: (r) => r.games },
        { key: "min", header: "출전", cell: (r) => r.min },
        { key: "pts", header: "득점", cell: (r) => r.pts },
        { key: "reb", header: "리바", cell: (r) => r.reb },
        { key: "ast", header: "어시", cell: (r) => r.ast },
        { key: "stl", header: "스틸", cell: (r) => r.stl },
        { key: "blk", header: "블록", cell: (r) => r.blk },
        { key: "fg", header: "야투%", cell: (r) => r.fg },
        { key: "three", header: "3점%", cell: (r) => r.three },
        { key: "ft", header: "자유투%", cell: (r) => r.ft },
        { key: "ts", header: "TS%", cell: (r) => r.ts },
      ]}
    />
  );
}
