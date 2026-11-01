"use client";
// 선수 상세 경기별 기록 — 10경기씩 쪽 나눔 (최근 경기 먼저). 숫자 글자는 부르는 쪽(page)이 만들어 넘긴다.
// GA4: filter_change(screen=player, filter=game_log_page, value=쪽 번호)
import { useState } from "react";
import { IconChevronLeft, IconChevronRight } from "./icons";
import { trackFilters } from "./track";

export interface GameLogRow {
  key: string;
  date: string;
  opp: string;
  win: boolean;
  margin: number;
  min: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tpm: number;
}

export const GAME_LOG_PAGE_SIZE = 10;

/** 쪽 수 (0경기면 0) */
export function pageCount(total: number, size = GAME_LOG_PAGE_SIZE): number {
  return Math.ceil(total / size);
}

export default function GameLog({ rows, caption }: { rows: GameLogRow[]; caption: string }) {
  const [page, setPage] = useState(0);
  const pages = pageCount(rows.length);
  const shown = rows.slice(page * GAME_LOG_PAGE_SIZE, (page + 1) * GAME_LOG_PAGE_SIZE);
  const go = (p: number) => {
    setPage(p);
    trackFilters("player", { game_log_page: String(p + 1) });
  };
  const th = "border-b border-line px-2 py-2 text-right font-medium";
  const td = "border-b border-line px-2 text-right text-ink-2";
  return (
    <div>
      <div className="surface-card overflow-hidden rounded-container">
        <table className="tabular w-full border-separate border-spacing-0 text-sub">
          <caption className="sr-only">
            {caption} ({page + 1}/{pages}쪽)
          </caption>
          <thead>
            <tr className="text-ink-3">
              <th scope="col" className={`${th} text-left`}>날짜</th>
              <th scope="col" className={`${th} text-left`}>상대</th>
              <th scope="col" className={th}>결과</th>
              <th scope="col" className={`${th} hidden sm:table-cell`}>출전</th>
              <th scope="col" className={th}>득점</th>
              <th scope="col" className={th}>리바</th>
              <th scope="col" className={th}>어시</th>
              <th scope="col" className={`${th} hidden sm:table-cell`}>스틸</th>
              <th scope="col" className={`${th} hidden sm:table-cell`}>블록</th>
              <th scope="col" className={`${th} hidden sm:table-cell`}>3점</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((g) => (
              <tr key={g.key}>
                <td className="h-11 border-b border-line px-2 text-ink-2">{g.date}</td>
                <td className="border-b border-line px-2 text-ink">{g.opp}</td>
                <td className={`border-b border-line px-2 text-right font-semibold ${g.win ? "text-series-1" : "text-ink-3"}`}>
                  {g.win ? "승" : "패"} {g.margin > 0 ? `+${g.margin}` : g.margin}
                </td>
                <td className={`${td} hidden sm:table-cell`}>{g.min}</td>
                <td className="border-b border-line px-2 text-right font-semibold text-ink">{g.pts}</td>
                <td className={td}>{g.reb}</td>
                <td className={td}>{g.ast}</td>
                <td className={`${td} hidden sm:table-cell`}>{g.stl}</td>
                <td className={`${td} hidden sm:table-cell`}>{g.blk}</td>
                <td className={`${td} hidden sm:table-cell`}>{g.tpm}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav aria-label="경기 기록 쪽" className="mt-2 flex flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => go(page - 1)}
            disabled={page === 0}
            aria-label="이전 10경기"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-2 transition-colors duration-200 hover:bg-surface-2 disabled:cursor-default disabled:text-ink-3 disabled:opacity-40"
          >
            <IconChevronLeft size={20} />
          </button>
          {Array.from({ length: pages }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-current={i === page ? "page" : undefined}
              aria-label={`${i * GAME_LOG_PAGE_SIZE + 1}~${Math.min(rows.length, (i + 1) * GAME_LOG_PAGE_SIZE)}번째 경기`}
              className={`focus-ring tabular h-10 min-w-10 rounded-control px-2 text-body font-semibold transition-colors duration-200 ${
                i === page ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2"
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            type="button"
            onClick={() => go(page + 1)}
            disabled={page >= pages - 1}
            aria-label="다음 10경기"
            className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-2 transition-colors duration-200 hover:bg-surface-2 disabled:cursor-default disabled:text-ink-3 disabled:opacity-40"
          >
            <IconChevronRight size={20} />
          </button>
        </nav>
      )}
      <p className="mt-1 text-center text-caption text-ink-3">
        {rows.length}경기 중 {page * GAME_LOG_PAGE_SIZE + 1}~{Math.min(rows.length, (page + 1) * GAME_LOG_PAGE_SIZE)}번째 (최근 경기 먼저)
      </p>
    </div>
  );
}
