import fs from "node:fs/promises";
import path from "node:path";
import { inspectPage, mergePages, diffBrand } from "./collector-lib.mjs";
import { load } from "cheerio";
const cacheOnly = process.argv.includes("--cached");
const refresh = process.argv.includes("--refresh");
const indexUrl = "https://www.wowprime.com/zh-tw/business/strategy";
const brands = JSON.parse(await fs.readFile("src/data/brands.json", "utf8"));
const dir = "research/candidates";
await fs.mkdir(dir, { recursive: true });
await fs.mkdir("research/cache", { recursive: true });
// Supplemental URLs are observed public navigation fragments, not guessed endpoints.
const supplements = {
  giguo: ["/header.php"],
  yakiyan: ["/header.html"],
  tokiya: ["/page_header.php"],
};
const checkedAt = new Date().toISOString().slice(0, 10);
async function get(url, file) {
  const filename = path.join("research/cache", file + ".html");
  if (!refresh) {
    try {
      return { html: await fs.readFile(filename, "utf8"), cached: true };
    } catch {}
  }
  if (cacheOnly) throw Error("沒有本機快取");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
    headers: {
      "User-Agent":
        "BrandIslandsResearch/1.0 (manual review; public brand information)",
    },
  });
  if (!response.ok) throw Error("HTTP " + response.status);
  const html = await response.text();
  inspectPage(html, url);
  await fs.writeFile(filename, html);
  return { html, cached: false };
}
const report = {
  checkedAt,
  mode: cacheOnly ? "cached" : "network",
  index: { status: "pending" },
  brands: [],
  indexCandidates: [],
  notes: [
    "候選結果不會覆蓋正式資料。",
    "快取日期不代表今日仍營運；核准前須人工確認來源與營運狀態。",
  ],
};
try {
  const { html, cached } = await get(indexUrl, "wowprime-brands");
  inspectPage(html, indexUrl);
  const $ = load(html);
  const found = [];
  $("a[href]")
    .filter((_, a) => $(a).text().includes("品牌官網"))
    .each((_, a) => {
      let node = $(a).parent();
      for (let i = 0; i < 5 && !/成立時間/.test(node.text()); i++)
        node = node.parent();
      const text = node.text().replace(/\s+/g, " ").trim();
      if (!/成立時間/.test(text)) return;
      let url;
      try {
        url = new URL($(a).attr("href"), indexUrl).href;
      } catch {
        return;
      }
      if (!found.some((x) => x.url === url))
        found.push({ url, excerpt: text.slice(0, 700) });
    });
  if (!found.length) throw Error("品牌版圖結構無法識別，需更新解析器");
  report.index = { status: "ok", cached, count: found.length };
  report.indexCandidates = found;
} catch (error) {
  report.index = { status: "failed", reason: error.message };
}
// Two workers bound load on the source sites.
let cursor = 0;
async function worker() {
  while (cursor < brands.length) {
    const b = brands[cursor++];
    if (b.official.includes("facebook.com")) {
      report.brands.push({
        id: b.id,
        status: "manual",
        reason: "官方社群頁面，保留集團介紹並人工核對",
      });
      continue;
    }
    try {
      const primary = await get(b.official, b.id);
      const pages = [inspectPage(primary.html, b.official)];
      const warnings = [];
      for (const [i, relative] of (supplements[b.id] || []).entries()) {
        try {
          const cachedName = b.id + "-header";
          const part = await get(
            new URL(relative, b.official).href,
            cachedName,
          );
          pages.push(inspectPage(part.html, b.official));
        } catch (e) {
          warnings.push("導覽片段：" + e.message);
        }
      }
      const page = mergePages(pages);
      const candidate = {
        id: b.id,
        status: "ok",
        checkedAt,
        cached: primary.cached,
        ...page,
        warnings,
      };
      candidate.changes = diffBrand(b, candidate);
      report.brands.push(candidate);
    } catch (error) {
      report.brands.push({ id: b.id, status: "failed", reason: error.message });
    }
    if (!cacheOnly) await new Promise((r) => setTimeout(r, 350));
  }
}
await Promise.all([worker(), worker()]);
report.brands.sort(
  (a, b) =>
    brands.findIndex((x) => x.id === a.id) -
    brands.findIndex((x) => x.id === b.id),
);
await fs.writeFile(
  path.join(dir, "latest.json"),
  JSON.stringify(report, null, 2) + "\n",
);
let markdown = `# 品牌採集差異報告\n\n日期：${checkedAt}；模式：${report.mode}\n\n集團索引：${report.index.status}${report.index.reason ? " — " + report.index.reason : ""}\n\n`;
for (const b of report.brands) {
  markdown += `- ${b.id}：${b.status}${b.reason ? " — " + b.reason : ""}${b.changes?.length ? "；" + b.changes.map((c) => c.field + ": " + (c.before || "無") + " → " + c.after).join("；") : ""}\n`;
}
markdown +=
  "\n正式資料未變更。請人工核對後，使用 npm run review -- --approve=<brand-id> 核准單一品牌的入口連結；新增／退場品牌須另行人工編輯與驗證。\n";
await fs.writeFile(path.join(dir, "report.md"), markdown);
console.log(
  `候選資料：${dir}/latest.json\n差異報告：${dir}/report.md\n成功 ${report.brands.filter((x) => x.status === "ok").length}，人工 ${report.brands.filter((x) => x.status === "manual").length}，失敗 ${report.brands.filter((x) => x.status === "failed").length}；集團索引 ${report.index.status}`,
);
if (
  report.index.status === "failed" ||
  report.brands.some((b) => b.status === "failed")
)
  process.exitCode = 2;
