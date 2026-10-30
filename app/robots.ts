// WKBL 승인 전에는 모든 검색엔진을 막는다 (data/codes/site.json indexable)
import type { MetadataRoute } from "next";
import site from "@/data/codes/site.json";

export default function robots(): MetadataRoute.Robots {
  return site.indexable ? { rules: { userAgent: "*", allow: "/" } } : { rules: { userAgent: "*", disallow: "/" } };
}
