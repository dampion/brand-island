import { test } from "node:test";
import assert from "node:assert/strict";
import {
  inspectPage,
  diffBrand,
  safeReview,
  mergePages,
} from "../scripts/collector-lib.mjs";
const html =
  '<html><head><title>品牌官網</title></head><body><h1>歡迎來到品牌官網，探索每一份美味與每一次相聚，以下提供官方菜單及訂位資訊。</h1><a href="/menu.php">菜單</a><a href="https://example.com/order/1">線上訂位（外帶）</a><a href="https://example.com/booking/1">線上訂位</a><a href="javascript:alert(1)">線上訂位</a></body></html>';
test("extracts relative menus, avoids takeaway and unsafe reservation links", () => {
  const p = inspectPage(html, "https://brand.example/");
  assert.equal(p.menu, "https://brand.example/menu.php");
  assert.equal(p.reservation, "https://example.com/booking/1");
  assert.equal(p.textDigest.length, 64);
});
test("rejects a successful HTTP response containing a WAF rejection or empty page", () => {
  assert.throws(() =>
    inspectPage(
      "<title>Request Rejected</title><body>Denied</body>",
      "https://example.com",
    ),
  );
  assert.throws(() =>
    inspectPage("<title>test</title>", "https://example.com"),
  );
});
test("commented-out old reservation links do not become official entries", () => {
  const p = inspectPage(
    html.replace(
      '<a href="https://example.com/booking/1">線上訂位</a>',
      '<!--<a href="https://example.com/booking/1">線上訂位</a>-->',
    ),
    "https://example.com",
  );
  assert.equal(p.reservation, undefined);
});
test("absent or failed scraping never removes existing approved fields", () => {
  const current = {
    id: "test",
    menu: "https://example.com/menu",
    reservation: "https://example.com/book",
    official: "https://example.com",
    sources: [],
  };
  assert.deepEqual(diffBrand(current, {}), []);
  assert.throws(() => safeReview(current, { id: "test", status: "failed" }));
  const next = safeReview(current, {
    id: "test",
    status: "ok",
    title: "Test",
    checkedAt: "2026-10-26",
  });
  assert.equal(next.menu, current.menu);
  assert.equal(next.reservation, current.reservation);
  assert.equal(current.sources.length, 0);
});
test("review refuses mismatched brand and insecure links", () => {
  const current = { id: "a", sources: [], official: "https://example.com" };
  assert.throws(() => safeReview(current, { id: "b", status: "ok" }));
  assert.throws(() =>
    safeReview(current, { id: "a", status: "ok", menu: "http://example.com" }),
  );
});
test("observed navigation fragments can supplement a JavaScript-loaded header", () => {
  const p = inspectPage(html, "https://brand.example");
  const fragment = inspectPage(
    html.replace("/menu.php", "/other-menu.php"),
    "https://brand.example",
  );
  assert.equal(mergePages([p, fragment]).menu, p.menu);
});
