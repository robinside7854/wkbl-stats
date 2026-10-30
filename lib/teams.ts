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
