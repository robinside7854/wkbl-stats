// 보안 헤더 (kbl-stats next.config.mjs 를 줄임). CSP 허용 출처 = 이 사이트가 실제로 부르는 곳만:
//   - Pretendard 글꼴 cdn.jsdelivr.net (style·font)
//   - GA4 googletagmanager·google-analytics (측정 ID 를 넣었을 때만 쓰인다)
// 공식 사진·로고를 쓰지 않으므로 wkbl.or.kr 은 img 에도 없다. 새 외부 출처를 쓰면 여기에 더한다.
// Next.js 정적 HTML 은 인라인 스크립트를 쓰므로 script 'unsafe-inline' 이 필요하다(정적 사이트라 nonce 불가).
import site from "./data/codes/site.json" with { type: "json" };

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "img-src 'self' data: https://*.google-analytics.com https://*.googletagmanager.com",
  "connect-src 'self' https://cdn.jsdelivr.net https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // WKBL 승인 전에는 검색 노출 막기 (robots.txt 와 같이)
  ...(site.indexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
  ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/search-index.json", headers: [{ key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=3600" }] },
    ];
  },
};
export default nextConfig;
