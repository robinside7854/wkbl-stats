import type { Metadata, Viewport } from "next";
import site from "@/data/codes/site.json";
import Analytics from "./components/Analytics";
import { SITE_NAME } from "./components/SiteNav";
import { FONT_CDN_ORIGIN, PRETENDARD_CSS_URL } from "./components/webFont";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: `${SITE_NAME} — WKBL 기록을 보기 쉽게`, template: `%s · ${SITE_NAME}` },
  description: "WKBL 정규리그 선수·팀 기록을 리더보드·선수 페이지·팀 순위로 보는 비영리 팬 프로젝트.",
  // WKBL 승인 전에는 검색엔진에 노출하지 않는다 (data/codes/site.json indexable, CLAUDE.md 법적 제약)
  robots: site.indexable ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href={FONT_CDN_ORIGIN} crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href={PRETENDARD_CSS_URL} crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
