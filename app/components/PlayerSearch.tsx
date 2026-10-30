"use client";
// 선수 검색창: 이름(한글·영문, 공백 무시, 부분 일치). 고르면 선수 페이지로.
// 데이터는 우리 정적 파일 /search-index.json (scripts/build-search-index.ts) — 처음 누를 때 한 번만 받는다.
// 틀은 kbl-stats PlayerSearch 를 줄인 것. GA4: search_select(player_no, mode=go)
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconSearch } from "./icons";
import PlayerAvatar from "./PlayerAvatar";
import { trackEvent } from "./track";

/** search-index.json 한 줄: 번호 · 한글 이름 · 영문 이름 · 마지막 팀 코드 · 마지막 팀 이름 · 첫~마지막 시즌 */
export interface SearchEntry {
  no: string;
  ko: string;
  en: string;
  team: string;
  teamName: string;
  span: string;
}

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex(): Promise<SearchEntry[]> {
  if (!indexPromise) {
    indexPromise = fetch("/search-index.json")
      .then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : []))
      .catch(() => {
        indexPromise = null;
        return [];
      });
  }
  return indexPromise;
}

const norm = (s: string) => s.toLowerCase().replace(/[\s.,'-]/g, "");

export function searchPlayers(index: readonly SearchEntry[], q: string, limit = 8): SearchEntry[] {
  const n = norm(q);
  if (!n) return [];
  const hits = index.filter((e) => norm(e.ko).includes(n) || norm(e.en).includes(n));
  // 이름이 검색어로 시작하는 선수 먼저 (나머지는 목록 순서 = 통산 득점 순)
  hits.sort((a, b) => Number(!norm(a.ko).startsWith(n)) - Number(!norm(b.ko).startsWith(n)));
  return hits.slice(0, limit);
}

export default function PlayerSearch({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const results = useMemo(() => (index ? searchPlayers(index, q) : []), [index, q]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function go(e: SearchEntry) {
    trackEvent("search_select", { player_no: e.no, mode: "go" });
    setOpen(false);
    setQ("");
    router.push(`/player/${e.no}`);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") setOpen(false);
  }

  const showList = open && q.trim().length > 0;
  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <label className="flex h-10 items-center gap-2 rounded-control border border-line bg-surface px-3 text-ink-3 focus-within:border-ink">
        <IconSearch size={16} />
        <span className="sr-only">선수 검색</span>
        <input
          type="search"
          value={q}
          placeholder="선수 이름"
          onFocus={() => {
            setOpen(true);
            loadIndex().then(setIndex);
          }}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKey}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
        />
      </label>
      {showList && (
        <ul id={listId} role="listbox" aria-label="검색 결과" className="surface-card absolute inset-x-0 top-11 z-50 max-h-96 overflow-auto rounded-card py-1">
          {index === null && <li className="px-3 py-3 text-sub text-ink-3">불러오는 중…</li>}
          {index !== null && results.length === 0 && <li className="px-3 py-3 text-sub text-ink-3">찾는 선수가 없어요</li>}
          {results.map((e, i) => (
            <li key={e.no} role="option" aria-selected={i === active}>
              <button
                type="button"
                onClick={() => go(e)}
                onMouseEnter={() => setActive(i)}
                className={`focus-ring-inset flex min-h-12 w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors duration-200 ${i === active ? "bg-surface-2" : ""}`}
              >
                <PlayerAvatar nameKo={e.ko} teamCode={e.team} size={28} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{e.ko}</span>
                  <span className="block truncate text-caption text-ink-3">
                    {e.teamName} · {e.span}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
