// 팀 색·대체 글자 (공식 로고 대신 — 팀 색 사각형 + 짧은 글자). 값은 data/codes/teams.json.
import codes from "../data/codes/teams.json";
import type { TeamColor } from "./types";

export const FALLBACK_TEAM_COLOR: TeamColor = { primary: "#6B6A66", text: "#FFFFFF" };

const BY_CODE = new Map(codes.teams.map((t) => [t.code, t]));

export function teamColor(code: string): TeamColor {
  const t = BY_CODE.get(code);
  return t ? { primary: t.primary, text: t.text } : FALLBACK_TEAM_COLOR;
}

/** 대체 디자인 글자: 코드표에 있으면 그 글자, 없으면 이름 앞 두 글자 (영문이면 대문자 머리글자) */
export function teamMark(code: string, name: string): string {
  const t = BY_CODE.get(code);
  if (t) return t.mark;
  const s = name.replace(/\s+/g, " ").trim();
  if (!s) return "?";
  if (/^[A-Za-z ]+$/.test(s) && s.includes(" ")) return s.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase();
  return [...s.replace(/\s/g, "")].slice(0, 2).join("");
}

/** 두 색 섞기 (t = 0 이면 a, 1 이면 b) — 선수 머리말·카드의 팀 색 그라데이션 (kbl-stats lib/images mixHex 와 같다) */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string): number[] | null => {
    let s = h.trim().replace(/^#/, "");
    if (s.length === 3) s = [...s].map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return a;
  const k = Math.min(1, Math.max(0, t));
  return "#" + ca.map((v, i) => Math.round(v + (cb[i] - v) * k).toString(16).padStart(2, "0")).join("");
}
