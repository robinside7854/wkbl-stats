"use client";
// 플레이어 카드 (kbl-stats PlayerCard 를 WKBL 데이터에 맞게 줄임): 시즌 칩 → 팀 색 머리(등번호·이름·종합 등급·유형) →
// 6축 레이더(꼭짓점마다 축 등급) + 세부 능력치 막대(구성 요소 백분위). 등급·백분위 계산은 lib/grades(가공 때 끝남), 여기서는 그리기만.
// GA4: filter_change(screen=player, filter=card_season, value=시즌 코드) · help_open(grade/playerType)
import { useMemo, useState } from "react";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { AXES, AXIS_COMPONENTS, AXIS_LABELS, COMPONENTS, PLAYER_TYPE_LABELS, gradeOf, percentileFill, score99, type ComponentKey, type SeasonGrade } from "@/lib/grades";
import { mixHex } from "@/lib/teams";
import type { TeamColor } from "@/lib/types";
import ChipRow from "./ChipRow";
import GradeBadge from "./GradeBadge";
import HelpPopover from "./HelpPopover";
import { trackFilters } from "./track";
import { useMounted } from "./useMedia";

export interface CardSeason {
  code: string;
  label: string;
  teamName: string;
  color: TeamColor;
  games: number;
  grade: SeasonGrade;
  /** 구성 요소 값 글자 (예: "12.3", "45.6%") — 서버에서 lib/grades componentText 로 */
  values: Record<ComponentKey, string>;
}

export default function PlayerCard({ seasons, nameKo, backNumber }: { seasons: CardSeason[]; nameKo: string; backNumber: string | null }) {
  const [code, setCode] = useState(seasons[0]?.code ?? "");
  const mounted = useMounted();
  const s = seasons.find((x) => x.code === code) ?? seasons[0];
  const data = useMemo(() => (s ? AXES.map((a) => ({ axis: a, label: AXIS_LABELS[a], value: Math.round(s.grade.axes[a]) })) : []), [s]);
  if (!s) return null;
  const c = s.color;
  const dark = mixHex(c.primary, "#000000", 0.55);

  return (
    <section aria-labelledby="card-title">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="card-title" className="flex items-center gap-1 text-h2 font-bold">
          시즌 능력치 <HelpPopover term="grade" className="ml-1" />
        </h2>
      </div>
      {seasons.length > 1 && (
        <ChipRow
          label="시즌"
          scroll
          className="mb-3"
          chips={seasons.map((x) => ({ value: x.code, label: x.label }))}
          value={s.code}
          onChange={(v) => {
            setCode(v);
            trackFilters("player", { card_season: v });
          }}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        {/* ── 카드 ── */}
        <article className="surface-card overflow-hidden rounded-container">
          <div className="relative overflow-hidden px-4 pb-4 pt-4" style={{ background: `linear-gradient(150deg, ${c.primary} 0%, ${dark} 100%)`, color: c.text }}>
            {/* 사진 대신 큰 등번호 (공식 사진을 쓰지 않는다 — WKBL 무단 사용 금지 문구) */}
            {backNumber && (
              // deslop-ignore-next-line 11
              <span aria-hidden className="tabular pointer-events-none absolute -right-2 -top-6 select-none text-[8.5rem] font-black leading-none opacity-15">
                {backNumber}
              </span>
            )}
            <p className="relative text-sub font-semibold opacity-90">
              {s.label} · {s.teamName} · {s.games}경기
            </p>
            <div className="relative mt-1 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-h1 font-black">{nameKo}</p>
                <HelpPopover term="playerType" ariaLabel={`선수 유형 ${PLAYER_TYPE_LABELS[s.grade.type]} — 기준 보기`} className="mt-1 inline-flex h-10 items-center rounded-control">
                  <span className="rounded-control px-2.5 py-1 text-body font-bold" style={{ background: "rgba(0,0,0,0.25)" }}>
                    {PLAYER_TYPE_LABELS[s.grade.type]}
                  </span>
                </HelpPopover>
              </div>
              <div className="flex flex-col items-center gap-1">
                <GradeBadge grade={s.grade.overallGrade} pct={s.grade.overall} team={c} size="lg" />
                <span className="text-caption font-semibold opacity-90">종합 · {s.grade.poolSize}명 중</span>
              </div>
            </div>
          </div>
          <div className="px-2 pb-2 pt-1" aria-hidden>
            {mounted ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={data} outerRadius="64%" margin={{ top: 18, right: 48, bottom: 10, left: 48 }}>
                  <PolarGrid stroke="var(--grid)" />
                  <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                  <PolarAngleAxis
                    dataKey="label"
                    tick={(props: { x?: number | string; y?: number | string; payload?: { value: string; index: number } }) => {
                      const x = Number(props.x ?? 0);
                      const y = Number(props.y ?? 0);
                      const d = data[props.payload?.index ?? 0];
                      const g = gradeOf(d.value);
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text textAnchor="middle" dy={-4} fill="var(--ink-2)" fontSize={13} fontWeight={600}>
                            {d.label}
                          </text>
                          <text textAnchor="middle" dy={13} fill="var(--ink)" fontSize={14} fontWeight={800}>
                            {g} {score99(d.value)}
                          </text>
                        </g>
                      );
                    }}
                  />
                  <Radar dataKey="value" stroke={c.primary} strokeWidth={2.5} fill={c.primary} fillOpacity={0.28} isAnimationActive={false} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 280 }} />
            )}
          </div>
          <p className="sr-only">
            {AXES.map((a) => `${AXIS_LABELS[a]} ${gradeOf(s.grade.axes[a])} ${score99(s.grade.axes[a])}점`).join(", ")}
          </p>
        </article>

        {/* ── 세부 능력치 막대 ── */}
        <div className="grid content-start gap-3 sm:grid-cols-2">
          {AXES.map((a) => (
            <div key={a} className="surface-card rounded-container px-3 py-2.5">
              <h3 className="tabular flex items-center justify-between text-body font-bold text-ink">
                {AXIS_LABELS[a]}
                <span className="flex items-center gap-1.5">
                  <span className="text-sub font-semibold text-ink-2">{score99(s.grade.axes[a])}</span>
                  <GradeBadge grade={gradeOf(s.grade.axes[a])} team={c} size="sm" />
                </span>
              </h3>
              <ul className="tabular mt-1.5 space-y-1.5">
                {AXIS_COMPONENTS[a].map((k) => {
                  const p = s.grade.parts[k];
                  return (
                    <li
                      key={k}
                      className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(3rem,5rem)_1.75rem] items-center gap-2 text-sub"
                      aria-label={`${COMPONENTS[k].label} ${s.values[k]}, ${p === null ? "시도가 적어 순위 없음" : `${score99(p)}점`}`}
                    >
                      <span className="truncate text-ink-2" aria-hidden>
                        {COMPONENTS[k].label}
                      </span>
                      <span className="text-right text-ink" aria-hidden>
                        {s.values[k]}
                      </span>
                      <span className="relative block h-2 overflow-hidden rounded-md bg-surface-2" aria-hidden>
                        {p !== null && <span className="absolute inset-y-0 left-0 block rounded-md" style={{ width: `${Math.max(3, p)}%`, background: percentileFill(p) }} />}
                      </span>
                      <span className="text-right font-bold text-ink" aria-hidden>
                        {p === null ? "–" : score99(p)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
