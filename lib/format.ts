// 화면 표기 도우미 (계산 없음 — 계산은 lib/metrics.ts)
import type { Position } from "./types";

/** "2025-2026" → "2025-26", "2003여름" → "2003 여름" */
export function seasonShortLabel(label: string): string {
  const m = label.match(/^(\d{4})-(\d{4})$/);
  if (m) return `${m[1]}-${m[2].slice(2)}`;
  const n = label.match(/^(\d{4})\s*(.+)$/);
  return n ? `${n[1]} ${n[2]}` : label;
}

export const POSITION_LABEL: Record<Position, string> = { G: "가드", F: "포워드", C: "센터" };

export function positionLabel(p: Position | null): string {
  return p ? POSITION_LABEL[p] : "-";
}

const WEEK = ["일", "월", "화", "수", "목", "금", "토"];

/** "2025-11-16" → "11/16(일)" */
export function shortDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEK[d.getUTCDay()]})`;
}

/** "2025-11-16" → "2025년 11월 16일 (일)" */
export function longDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WEEK[d.getUTCDay()]})`;
}

export function formatPct1(v: number | null): string {
  return v === null ? "-" : (v * 100).toFixed(1);
}

/** 승률 ".667" */
export function formatWinPct(v: number, games: number): string {
  if (games === 0) return "-";
  return v.toFixed(3).replace(/^0/, "");
}

/** "2025-11-16" → "2025.11.16" */
export const dotDate = (date: string) => date.replaceAll("-", ".");
