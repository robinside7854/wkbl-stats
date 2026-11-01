// 조사용(한 번): WKBL 공홈 역대 수상·우승 화면과 그 화면이 부르는 ajax 주소를 받아 probe/out 에 저장 (요청 간격 1.5초)
import { mkdir, writeFile } from "node:fs/promises";
const BASE = "https://www.wkbl.or.kr";
const UA = "wkbl-stats fan project (non-commercial; github.com/robinside7854/wkbl-stats)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await mkdir("probe/out", { recursive: true });
const seen = new Set();
const log = [];
let n = 0;
async function get(path, body) {
  const key = path + (body ?? "");
  if (seen.has(key) || n >= 60) return null;
  seen.add(key);
  n++;
  await sleep(1500);
  try {
    const r = await fetch(BASE + path, {
      method: body ? "POST" : "GET",
      headers: { "User-Agent": UA, Referer: BASE + "/history/awards.asp", ...(body ? { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" } : {}) },
      body,
    });
    const t = await r.text();
    const file = `${String(n).padStart(3, "0")}_${(path + (body ? "_" + body : "")).replace(/[^a-z0-9]+/gi, "_").slice(0, 90)}.html`;
    await writeFile(`probe/out/${file}`, `<!-- ${r.status} ${path} ${body ?? ""} -->\n${t}`);
    log.push([r.status, t.length, path, body ?? "", file].join("\t"));
    return t;
  } catch (e) {
    log.push(["ERR", 0, path, body ?? "", String(e)].join("\t"));
    return null;
  }
}
const pages = ["/history/awards.asp", "/history/awards_mvp.asp", "/history/awards_statistics.asp", "/history/awards_vote.asp", "/history/major.asp", "/history/major_player.asp", "/history/major_team.asp", "/history/league.asp"];
const ajax = new Set();
for (const p of pages) {
  const t = await get(p);
  if (!t) continue;
  for (const m of t.matchAll(/["'(]\s*(\/?[\w/]*ajax[\w/]*\.asp[^"' )]*)/gi)) ajax.add(m[1].startsWith("/") ? m[1] : "/history/" + m[1]);
  for (const m of t.matchAll(/href=["'](\/history\/[\w_]+\.asp\?[^"']+)["']/gi)) if (ajax.size < 40) ajax.add(m[1].replace(/&amp;/g, "&"));
}
log.push("# found\t" + [...ajax].join(" "));
for (const a of ajax) await get(a);
await writeFile("probe/out/log.tsv", log.join("\n") + "\n");
console.log(log.join("\n"));
