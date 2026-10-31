// 선수 페이지 머리말 (kbl-stats PlayerHero 를 WKBL 에 맞게): 마지막 시즌 팀 색 띠 + 이름·영문 이름·포지션·활동 기간 +
// 프로필(등번호·나이·키·출신교·드래프트 — 공홈 선수 상세) + 마지막 시즌 종합 등급·유형 + 아래 통산 요약.
// 공식 사진 대신 팀 색 유니폼 그림에 등번호 (WKBL 화면 하단 무단 사용 금지 문구 — 사진·로고 쓰지 않음).
import { mixHex, teamColor } from "@/lib/teams";
import { PLAYER_TYPE_LABELS, type SeasonGrade } from "@/lib/grades";
import type { PlayerProfile } from "@/lib/types";
import GradeBadge from "./GradeBadge";
import TeamBadge from "./TeamBadge";

export interface HeroFact {
  label: string;
  value: string;
}

export interface HeroTile {
  label: string;
  value: string;
  sub?: string;
}

/** 민소매 유니폼 SVG + 등번호 (사진 대신) */
function Jersey({ number, primary, text, size }: { number: string | null; primary: string; text: string; size: number }) {
  const trim = mixHex(primary, "#ffffff", 0.35);
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 200 224" aria-hidden className="block">
      <path
        d="M58 4h24c4 14 13 22 18 22s14-8 18-22h24l6 6c-6 30 2 52 22 62v146a6 6 0 0 1-6 6H42a6 6 0 0 1-6-6V72c20-10 28-32 22-62z"
        fill={mixHex(primary, "#000000", 0.18)}
        stroke={trim}
        strokeWidth="5"
      />
      <path d="M82 4c4 14 13 22 18 22s14-8 18-22" fill="none" stroke={trim} strokeWidth="5" />
      {number && (
        // deslop-ignore-next-line 11
        <text x="100" y="150" textAnchor="middle" fontSize={number.length > 2 ? 64 : 84} fontWeight={900} fill={text} style={{ fontVariantNumeric: "tabular-nums" }}>
          {number}
        </text>
      )}
    </svg>
  );
}

export default function PlayerHero({
  nameKo,
  nameEn,
  profile,
  teamCode,
  teamLabel,
  span,
  positionText,
  facts,
  tiles,
  latestGrade,
  latestGradeSeason,
}: {
  nameKo: string;
  nameEn: string;
  profile: PlayerProfile | null;
  teamCode: string;
  /** "25-26 우리은행" */
  teamLabel: string;
  span: string;
  positionText: string;
  facts: HeroFact[];
  tiles: HeroTile[];
  latestGrade: SeasonGrade | null;
  latestGradeSeason: string;
}) {
  const c = teamColor(teamCode);
  const mid = mixHex(c.primary, "#000000", 0.3);
  const dark = mixHex(c.primary, "#000000", 0.62);
  return (
    <section aria-label={`${nameKo} 선수 소개`} className="-mx-4 -mt-5 mb-5">
      <div style={{ background: `linear-gradient(160deg, ${c.primary} 0%, ${mid} 55%, ${dark} 100%)`, color: c.text }}>
        <div className="mx-auto grid max-w-page grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 px-4 lg:grid-cols-[fit-content(40rem)_auto] lg:justify-start lg:gap-x-12">
          <div className="min-w-0 pb-5 pt-5">
            <p className="inline-flex min-h-10 items-center gap-2 text-sub font-semibold opacity-90 sm:text-body">
              <span className="inline-flex rounded-control bg-white/90 p-0.5">
                <TeamBadge code={teamCode} name={teamLabel} size={28} />
              </span>
              {teamLabel}
            </p>
            {/* deslop-ignore-next-line 11 */}
            <h1 className="mt-1 text-[2.25rem] font-black leading-[1.1] tracking-tight [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">{nameKo}</h1>
            {nameEn && <p className="mt-1 text-sub font-medium opacity-85 sm:text-body">{nameEn}</p>}
            <p className="text-sub font-medium opacity-85 sm:text-body">
              <span className="whitespace-nowrap">{positionText}</span>
              {span && <span className="whitespace-nowrap"> · {span}</span>}
            </p>
            {latestGrade && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sub font-semibold">
                <GradeBadge grade={latestGrade.overallGrade} pct={latestGrade.overall} team={c} size="md" />
                <span className="rounded-control px-2 py-1" style={{ background: "rgba(0,0,0,0.25)" }}>
                  {PLAYER_TYPE_LABELS[latestGrade.type]}
                </span>
                <span className="opacity-85">{latestGradeSeason} 종합</span>
              </div>
            )}
          </div>
          <div className="self-end">
            <span className="flex sm:hidden">
              <Jersey number={profile?.backNumber ?? null} primary={c.primary} text={c.text} size={120} />
            </span>
            <span className="hidden sm:flex">
              <Jersey number={profile?.backNumber ?? null} primary={c.primary} text={c.text} size={190} />
            </span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-page px-4">
        <dl className="tabular -mt-px grid grid-cols-3 gap-px overflow-hidden rounded-b-container border border-t-0 border-line bg-line shadow-card sm:grid-cols-6">
          {tiles.map((t) => (
            <div key={t.label} className="min-w-0 bg-surface px-1.5 py-3 text-center sm:px-3">
              <dt className="truncate text-caption font-medium text-ink-3 sm:text-sub">{t.label}</dt>
              <dd className="mt-0.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">{t.value}</dd>
              {t.sub && <dd className="mt-0.5 truncate text-caption text-ink-3">{t.sub}</dd>}
            </div>
          ))}
        </dl>
        {facts.length > 0 && (
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sub">
            {facts.map((f) => (
              <div key={f.label} className={`flex min-w-0 items-baseline gap-1.5 ${f.value.length <= 20 ? "whitespace-nowrap" : ""}`}>
                <dt className="shrink-0 text-ink-3">{f.label}</dt>
                <dd className="min-w-0 font-semibold text-ink [overflow-wrap:anywhere]">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
