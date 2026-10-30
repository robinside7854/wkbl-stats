// 모든 화면 하단 고정 출처 표기 (원칙 6)
import Link from "next/link";
import site from "@/data/codes/site.json";
import { gaMeasurementId } from "@/lib/analytics";
import { getMeta } from "@/lib/data";
import { IconExternal } from "./icons";

export const SOURCE_LINE = "기록 출처: WKBL 공식 홈페이지 · 비영리 팬 프로젝트";
export const ANALYTICS_LINE = "방문 통계를 위해 Google Analytics(쿠키)를 씁니다. 개인을 알아볼 수 있는 정보는 모으지 않습니다.";

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(d);
}

export default function SourceFooter() {
  const meta = getMeta();
  return (
    <footer className="mx-auto mt-10 max-w-page border-t border-line px-4 py-6 text-sub text-ink-3">
      <Link
        href="/glossary"
        className="focus-ring mb-4 inline-flex h-10 items-center rounded-control border border-line bg-surface px-3 text-sub font-semibold text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
      >
        용어 풀이
      </Link>
      <a
        href={site.officialSite}
        target="_blank"
        rel="noopener noreferrer"
        className="focus-ring mb-4 ml-2 inline-flex h-10 items-center gap-1 rounded-control border border-line bg-surface px-3 text-sub font-semibold text-ink-2 transition-colors duration-200 hover:bg-surface-2 hover:text-ink"
      >
        WKBL 공식 홈페이지
        <IconExternal size={16} />
      </a>
      <p>{SOURCE_LINE}</p>
      <p className="mt-1">선수 사진·팀 로고는 쓰지 않습니다. 팀 색은 대략 고른 색이에요.</p>
      {gaMeasurementId() && <p className="mt-1">{ANALYTICS_LINE}</p>}
      {meta.fetchedAt && <p className="mt-1">데이터 수집일: {formatDay(meta.fetchedAt)}</p>}
    </footer>
  );
}
