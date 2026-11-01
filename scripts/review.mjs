import fs from "node:fs/promises";
import { safeReview } from "./collector-lib.mjs";
const id = process.argv.find((a) => a.startsWith("--approve="))?.split("=")[1];
if (!id)
  throw Error(
    "先閱讀 research/candidates/report.md，再指定 --approve=<brand-id>；不提供整批自動核准。",
  );
const file = "src/data/brands.json";
const brands = JSON.parse(await fs.readFile(file, "utf8"));
const report = JSON.parse(
  await fs.readFile("research/candidates/latest.json", "utf8"),
);
const idx = brands.findIndex((b) => b.id === id);
if (idx < 0) throw Error("未知品牌：" + id);
const candidate = report.brands.find((b) => b.id === id);
if (!candidate) throw Error("沒有該品牌的候選資料");
brands[idx] = safeReview(brands[idx], candidate);
await fs.writeFile(file, JSON.stringify(brands, null, 2) + "\n");
console.log("已核准 " + id + " 的官方入口；請執行 npm test 與 npm run build。");
