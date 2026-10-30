// 방문 통계(GA4) 측정 ID — WKBL 사이트는 새 측정 ID 를 쓴다(KBL 것과 섞지 않는다). 아직 없으면 꺼짐.
// - Vercel 운영 배포(VERCEL_ENV=production) + 환경변수 NEXT_PUBLIC_GA_ID 가 있을 때만 켠다. "off" 면 끈다
export function gaMeasurementId(): string {
  const id = (process.env.NEXT_PUBLIC_GA_ID ?? "").trim();
  if (!id || id.toLowerCase() === "off" || process.env.VERCEL_ENV !== "production") return "";
  // 형식이 틀린 값이면 스크립트 주소가 깨지므로 끈다
  return /^G-[A-Z0-9]+$/.test(id) ? id : "";
}
