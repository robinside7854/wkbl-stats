// 모든 화면의 틀: 상단 메뉴 + 본문 + 하단 출처. 시즌 목록은 여기서 읽어 SiteNav 에 넘긴다.
import { defaultSeason, getSeasons } from "@/lib/data";
import SiteNav, { type SiteView } from "./SiteNav";
import SourceFooter from "./SourceFooter";

export default function PageShell({ view, season, children }: { view: SiteView; season?: string; children: React.ReactNode }) {
  const seasons = getSeasons().map(({ code, label }) => ({ code, label }));
  const current = season ?? defaultSeason()?.code ?? "";
  return (
    <>
      <SiteNav seasons={seasons} season={current} view={view} />
      <main className="mx-auto max-w-page px-4 pt-5">{children}</main>
      <SourceFooter />
    </>
  );
}

/** 데이터가 아직 없을 때 (수집 전) */
export function EmptyData({ what = "기록" }: { what?: string }) {
  return (
    <div role="status" className="surface-card rounded-container px-4 py-10 text-center text-body text-ink-2">
      아직 {what}이 없어요. 수집이 끝나면 여기에 보여요.
    </div>
  );
}

/** 화면 제목 한 줄 */
export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h1 className="text-h1 font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sub text-ink-3">{sub}</p>}
      </div>
      {children}
    </div>
  );
}
