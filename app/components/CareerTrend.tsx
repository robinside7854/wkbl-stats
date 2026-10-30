"use client";
// 선수 시즌별 변화 그래프 (Recharts 하나만 — CLAUDE.md 기술 스택). 지표 칩: 득점·리바·어시·TS%
// GA4: filter_change(screen=player, trend_metric)
import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import ChipRow from "./ChipRow";
import { trackFilters } from "./track";

export interface TrendPoint {
  label: string;
  pts: number;
  reb: number;
  ast: number;
  ts: number | null;
}

const METRICS = [
  { key: "pts", label: "득점" },
  { key: "reb", label: "리바운드" },
  { key: "ast", label: "어시스트" },
  { key: "ts", label: "TS%" },
] as const;
type Key = (typeof METRICS)[number]["key"];

export default function CareerTrend({ points }: { points: TrendPoint[] }) {
  const [key, setKey] = useState<Key>("pts");
  const label = METRICS.find((m) => m.key === key)!.label;
  return (
    <div>
      <ChipRow
        label="지표"
        chips={METRICS.map((m) => ({ value: m.key, label: m.label }))}
        value={key}
        onChange={(v) => {
          setKey(v);
          trackFilters("player", { trend_metric: v });
        }}
        className="mb-3"
      />
      <div className="surface-card rounded-container p-3" aria-hidden>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "var(--ink-3)", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "var(--line)" }} minTickGap={12} />
            <YAxis tick={{ fill: "var(--ink-3)", fontSize: 12 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 8, color: "var(--ink)" }}
              formatter={(v) => [typeof v === "number" ? v.toFixed(1) : "-", label]}
            />
            <Line type="monotone" dataKey={key} stroke="var(--series-1)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--series-1)" }} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* 그래프를 못 보는 사람을 위한 같은 내용 */}
      <p className="sr-only">
        시즌별 경기당 {label}: {points.map((p) => `${p.label} ${p[key] === null ? "-" : p[key]!.toFixed(1)}`).join(", ")}
      </p>
    </div>
  );
}
