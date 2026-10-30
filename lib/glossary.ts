// 용어 풀이 — ⓘ 팝오버(HelpPopover)와 /glossary 가 읽는다. 계산은 하지 않는다(계산은 lib/metrics.ts).
// 글쓰기: short 는 한 문장, note 는 두 문장까지 (kbl-stats 2026-10-01 사용자 피드백 "길고 지루하다").

export type GlossaryKey = "tsPct" | "eff" | "qualify" | "attempts" | "standings" | "careerHigh" | "source";

export interface GlossaryEntry {
  key: GlossaryKey;
  anchor: string;
  name: string;
  short: string;
  formula?: string;
  note?: string;
}

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    key: "tsPct",
    anchor: "ts",
    name: "TS% (트루 슈팅)",
    short: "2점·3점·자유투를 한데 묶어 본 득점 효율이에요.",
    formula: "득점 ÷ (2 × (야투 시도 + 0.44 × 자유투 시도))",
    note: "WKBL 공홈은 이 값을 주지 않아 경기 기록으로 우리가 계산해요. 0.44 는 NBA 에서 쓰는 계수예요.",
  },
  {
    key: "eff",
    anchor: "eff",
    name: "EFF (효율)",
    short: "잘한 기록은 더하고 놓친 슛·턴오버는 빼서 한 숫자로 본 값이에요.",
    formula: "득점 + 리바 + 어시 + 스틸 + 블록 − 놓친 야투 − 놓친 자유투 − 턴오버",
    note: "NBA.com 식이에요. WKBL 공홈의 \"공헌도\"와는 식이 달라 숫자가 다를 수 있어요.",
  },
  {
    key: "qualify",
    anchor: "qualify",
    name: "순위 기준",
    short: "경기당 순위는 팀 경기의 절반 이상 뛴 선수만 넣어요.",
    note: "진행 중인 시즌은 기준 없이 뛴 선수 모두를 보여 줘요. 우리 규칙이라 공홈 순위와 다를 수 있어요.",
  },
  {
    key: "attempts",
    anchor: "attempts",
    name: "성공률 최소 시도",
    short: "한두 개 던져 100% 가 1위가 되지 않게, 시도가 충분한 선수만 넣어요.",
    formula: "야투·TS%: 경기당 3개 이상 · 3점: 경기당 1개 이상 · 자유투: 경기당 1개 이상",
  },
  {
    key: "standings",
    anchor: "standings",
    name: "팀 순위",
    short: "끝난 경기 점수로 승패를 세서 승률 순으로 줄 세웠어요.",
    note: "승률이 같을 때 공홈은 상대 전적 등으로 순위를 가려 순서가 다를 수 있어요.",
  },
  {
    key: "careerHigh",
    anchor: "high",
    name: "커리어 하이",
    short: "정규리그 한 경기에서 남긴 가장 높은 기록이에요.",
    note: "2003 여름리그부터의 경기 기록으로 찾아요. 그 전 기록은 들어 있지 않아요.",
  },
  {
    key: "source",
    anchor: "source",
    name: "데이터 범위",
    short: "WKBL 공식 홈페이지 경기 기록(박스스코어)을 더해서 만든 기록이에요.",
    note: "정규리그만, 2003 여름리그부터예요. 퓨처스리그·플레이오프는 아직 넣지 않았어요.",
  },
];

const BY_KEY = new Map(GLOSSARY.map((e) => [e.key, e]));

export interface HelpContent {
  title: string;
  short: string;
  formula: string | null;
  href: string;
}

export function helpContent(key: GlossaryKey): HelpContent {
  const e = BY_KEY.get(key);
  if (!e) return { title: "용어", short: "", formula: null, href: "/glossary" };
  return { title: e.name, short: e.short, formula: e.formula ?? null, href: `/glossary#${e.anchor}` };
}
