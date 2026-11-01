// 용어 풀이 — ⓘ 팝오버(HelpPopover)와 /glossary 가 읽는다. 계산은 하지 않는다(계산은 lib/metrics.ts).
// 글쓰기: short 는 한 문장, note 는 두 문장까지 (kbl-stats 2026-10-01 사용자 피드백 "길고 지루하다").

export type GlossaryKey = "tsPct" | "eff" | "qualify" | "attempts" | "standings" | "careerHigh" | "source" | "grade" | "playerType";

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
    short: "경기당 순위는 팀 경기의 절반 이상 뛴 선수만 넣어요(통산은 100경기 이상).",
    note: "필터에서 \"출전 선수 전원\"으로 바꿀 수 있어요. 우리 규칙이라 공홈 순위와 다를 수 있어요.",
  },
  {
    key: "attempts",
    anchor: "attempts",
    name: "성공률 최소 시도",
    short: "한두 개 던져 100% 가 1위가 되지 않게, 시도가 충분한 선수만 넣어요.",
    formula: "경기당 시도가 그 시즌(통산은 전체) 리그 평균 이상인 선수만 — 야투율·TS% 는 야투, 3점% 는 3점, 자유투% 는 자유투 시도",
    note: "KBL 사이트와 같은 규칙이에요. 기준에 못 미친 선수는 표에 남지만 순위 칸이 – 예요.",
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
    key: "grade",
    anchor: "grade",
    name: "능력치·등급",
    short: "그 시즌 팀 경기의 절반 이상 뛴 선수끼리 6가지 능력을 비교한 순위예요.",
    formula: "공격(득점·야투 성공) · 슈팅(3점 성공·3점%·자유투%) · 리바운드(공격·수비) · 리딩(어시스트·어시/턴오버) · 수비(스틸·블록) · 효율(TS%·EFF), 모두 경기당",
    note: "숫자는 같은 시즌 선수 중 몇 % 보다 잘했는지예요(50 = 중간). 등급은 S 90 이상 · A 75 · B 55 · C 35 · D 15, 종합 S 는 상위 5%. 우리 규칙이라 공식 기록이 아니에요.",
  },
  {
    key: "playerType",
    anchor: "type",
    name: "선수 유형",
    short: "6가지 능력 중 가장 두드러진 것으로 붙인 이름표예요.",
    formula: "득점원(공격) · 슈터 · 리바운더 · 플레이메이커(리딩) · 수비수 · 피니셔(효율) / 5가지 이상 70 이상이면 올라운더 / 60 넘는 능력이 없으면 롤플레이어",
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
