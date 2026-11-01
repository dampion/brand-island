import { test, expect, Page } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
// Serve the production build through interception; no server, external network or test port is required.
async function openApp(page: Page, query = "", webgl = true) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname !== "brand-islands.test") return route.abort();
    const relative =
      url.pathname === "/"
        ? "index.html"
        : decodeURIComponent(url.pathname).slice(1);
    if (relative.includes("..")) return route.fulfill({ status: 400 });
    try {
      const body = await fs.readFile(path.resolve("dist", relative));
      const ext = path.extname(relative);
      await route.fulfill({
        body,
        contentType:
          (
            {
              ".html": "text/html",
              ".js": "text/javascript",
              ".css": "text/css",
              ".svg": "image/svg+xml",
            } as Record<string, string>
          )[ext] || "application/octet-stream",
      });
    } catch {
      await route.fulfill({ status: 404, body: "not found" });
    }
  });
  await page.addInitScript(
    ({ webgl }) => {
      localStorage.setItem("brand-island-onboarded", "1");
      if (!webgl) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (
          type: string,
          ...args: unknown[]
        ) {
          if (type.startsWith("webgl")) return null;
          return original.call(this, type, ...(args as []));
        } as typeof original;
      }
    },
    { webgl },
  );
  await page.goto("http://brand-islands.test/" + query);
  await expect(page.locator("#loading")).toBeHidden();
}
async function showIndex(page: Page) {
  if (!(await page.locator("#index-panel").isVisible()))
    await page.locator("#index-toggle").click();
}
test("3D overview, brand selection, related content and reset", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openApp(page);
  await expect(page.locator("#stage canvas")).toHaveCount(1);
  await expect(page.locator(".island-label:visible").first()).toBeVisible();
  await page.screenshot({ path: info.outputPath("overview.png") });
  const firstLabel = page.locator(".island-label:visible").first();
  const labelName = await firstLabel.innerText();
  await firstLabel.click({ force: true });
  await expect(page.locator("#detail-title")).toHaveText(labelName);
  await page.locator("#detail-close").click();
  await showIndex(page);
  await page.locator('.brand-row[data-select="wangsteak"]').click();
  await expect(page.locator("#detail-title")).toHaveText("王品牛排");
  await expect(page.locator("#detail")).toContainText("王品牛小排");
  await expect(page).toHaveURL(/brand=wangsteak/);
  await page.screenshot({ path: info.outputPath("brand.png") });
  await page.locator("#detail-close").click();
  await page.locator("#overview").click();
  await expect(page.locator("#detail")).toBeHidden();
  await expect(page).not.toHaveURL(/brand=/);
  expect(errors).toEqual([]);
});
test("search, empty state, cuisine multi-select and founding year intersect correctly", async ({
  page,
}) => {
  await openApp(page);
  await showIndex(page);
  await page.locator("#brand-search").fill("片皮烤鴨");
  await expect(page.locator(".brand-row")).toHaveCount(1);
  await expect(page.locator(".brand-row")).toContainText("享鴨");
  await page.locator(".brand-row").click();
  await expect(page.locator("#detail-title")).toHaveText("享鴨");
  await page.locator("#detail-close").click();
  await showIndex(page);
  await page.locator("#brand-search").fill("不存在的餐廳");
  await expect(page.locator("#clear-filters")).toBeVisible();
  await page.locator("#clear-filters").click();
  await expect(page.locator(".brand-row")).toHaveCount(20);
  if (infoIsMobile(page)) await page.locator("#index-close").click();
  await page.locator('[data-category="steak"]').click();
  await page.locator('[data-category="hotpot"]').click();
  await showIndex(page);
  await expect(page.locator(".brand-row")).toHaveCount(8);
  if (infoIsMobile(page)) await page.locator("#index-close").click();
  await page.locator("#history-tab").click();
  await page.locator("#year-range").fill("2004");
  await showIndex(page);
  await expect(page.locator(".brand-row")).toHaveCount(3);
});
function infoIsMobile(page: Page) {
  return (page.viewportSize()?.width || 1440) < 760;
}
test("time, toggles, journal, deep link and source disclosure", async ({
  page,
}, info) => {
  await openApp(page, "?brand=chinhuajiao");
  await expect(page.locator("#detail-title")).toHaveText("青花驕");
  await page.locator(".source-details summary").click();
  await expect(page.locator(".source-details")).toContainText("2026-10-26");
  await page.locator("#detail-close").click();
  await page.locator("#day-range").fill("1260");
  await expect(page.locator("#clock")).toHaveText("21:00");
  await expect(page.locator("html")).toHaveAttribute("data-time", "night");
  await page.locator("#pause").click();
  await expect(page.locator("#pause")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#connections").click();
  await expect(page.locator("#connections")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#bird").click();
  await page.screenshot({ path: info.outputPath("night.png") });
  await page.locator("#log-toggle").click();
  await expect(page.locator("#scene-log")).toContainText("非即時營運資訊");
});
test("WebGL fallback retains all searchable brand information", async ({
  page,
}) => {
  await openApp(page, "", false);
  await expect(page.locator("#map-hint")).toContainText("無法啟用 3D");
  await expect(page.locator("#index-panel")).toBeVisible();
  await page.locator("#brand-search").fill("西堤");
  await page.locator(".brand-row").click();
  await expect(page.locator("#detail-title")).toHaveText("西堤牛排");
});
test("reduced motion, invalid deep link and guided cuisine tour", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, "?brand=unknown");
  await expect(page).not.toHaveURL(/brand=/);
  await expect(page.locator("#pause")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#help").click();
  await expect(page.locator("#guide")).toBeVisible();
  await page.locator("#tour-start").click();
  await expect(page.locator("#tour-bar")).toBeVisible();
  for (let i = 0; i < 6; i++) await page.locator("#tour-next").click();
  await expect(page.locator("#tour-bar")).toBeHidden();
  await expect(page.locator("#detail")).toBeHidden();
});
