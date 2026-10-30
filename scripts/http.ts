// WKBL 공홈 요청·raw 저장 공용 함수. 요청은 모두 이 파일을 거쳐 간격(REQUEST_GAP_MS)을 지킨다.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { REQUEST_GAP_MS, USER_AGENT, WKBL } from "./config";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastAt = 0;
/** 이번 실행에서 보낸 요청 수 (마지막 요약에 찍는다) */
export let requestCount = 0;

async function politeFetch(url: string, init: RequestInit): Promise<Uint8Array> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const wait = lastAt + REQUEST_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    requestCount++;
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": USER_AGENT, Referer: `${WKBL}/`, ...(init.headers ?? {}) },
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${url}`), { fatal: true });
      return new Uint8Array(await res.arrayBuffer());
    } catch (e) {
      if ((e as { fatal?: boolean }).fatal) throw e;
      lastErr = e;
      // 서버가 힘들어할 때는 더 기다렸다가 (5초, 10초)
      await sleep(5000 * attempt);
    }
  }
  throw new Error(`요청 실패 3번: ${url} — ${String(lastErr)}`);
}

export const getBytes = (url: string) => politeFetch(url, { method: "GET" });

export const postFormBytes = (url: string, body: string) =>
  politeFetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "X-Requested-With": "XMLHttpRequest" },
  });

export const utf8 = (b: Uint8Array) => new TextDecoder("utf-8").decode(b);

/**
 * 응답을 받은 그대로(바이트 그대로) gzip 으로 묶어 저장한다 (원칙 2 — 풀면 원본과 똑같다).
 * HTML 이라 묶으면 약 1/8 — 박스스코어 2,400개가 저장소를 키우지 않게.
 */
export async function saveRaw(file: string, bytes: Uint8Array) {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, gzipSync(bytes, { level: 9 }));
}

export async function readRaw(file: string): Promise<string> {
  return utf8(gunzipSync(await readFile(file)));
}

export async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}
