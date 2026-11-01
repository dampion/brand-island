import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  brands,
  categories,
  filterBrands,
  relationships,
  escapeHtml,
} from "../src/domain.ts";
import type { Filters } from "../src/types.ts";
const all: Filters = { search: "", categories: [], year: 2026 };
test("every brand has a unique stable identity, valid cuisine, representative food and attributable sources", () => {
  assert.equal(new Set(brands.map((b) => b.id)).size, brands.length);
  assert.ok(brands.length >= 20);
  for (const b of brands) {
    assert.match(b.id, /^[a-z0-9-]+$/);
    assert.ok(categories.some((c) => c.id === b.category));
    assert.ok(b.dishes.length > 0);
    assert.ok(b.founded >= 1993 && b.founded <= 2026);
    assert.equal(b.status, "listed-active");
    assert.ok(b.description && b.tagline && b.name);
    assert.ok(b.sources.some((s) => s.method === "official-index"));
    for (const s of b.sources) {
      assert.equal(new URL(s.url).protocol, "https:");
      assert.match(s.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
    }
    for (const u of [b.official, b.menu, b.reservation].filter(Boolean))
      assert.equal(new URL(u!).protocol, "https:");
  }
});
test("relationships point to real entities, are unique and have evidence", () => {
  const ids = new Set(["wowprime", ...brands.map((b) => b.id)]);
  assert.equal(
    new Set(relationships.map((r) => r.id)).size,
    relationships.length,
  );
  for (const r of relationships) {
    assert.ok(ids.has(r.from) && ids.has(r.to));
    assert.notEqual(r.from, r.to);
    assert.equal(new URL(r.source).hostname, "www.wowprime.com");
    if (r.kind === "category")
      assert.equal(
        brands.find((b) => b.id === r.from)!.category,
        brands.find((b) => b.id === r.to)!.category,
      );
  }
  assert.equal(
    relationships.filter((r) => r.kind === "group").length,
    brands.length,
  );
});
test("search handles Chinese dishes, normalized Latin text, whitespace and no results", () => {
  assert.ok(
    filterBrands(brands, { ...all, search: " 牛小排 " }).some(
      (b) => b.id === "wangsteak",
    ),
  );
  assert.deepEqual(
    filterBrands(brands, { ...all, search: " ＴＡＳＴＹ " }).map((b) => b.id),
    ["tasty"],
  );
  assert.ok(
    filterBrands(brands, { ...all, search: "片皮烤鴨" }).some(
      (b) => b.id === "xiangduck",
    ),
  );
  assert.equal(
    filterBrands(brands, { ...all, search: "不存在的餐廳xyz" }).length,
    0,
  );
});
test("category multiselect combines cuisines and intersects with year and keyword filters", () => {
  const selected = filterBrands(brands, {
    search: "",
    categories: ["steak", "hotpot"],
    year: 2004,
  });
  assert.deepEqual(
    new Set(selected.map((b) => b.id)),
    new Set(["wangsteak", "tasty", "giguo"]),
  );
  assert.deepEqual(
    filterBrands(brands, { search: "聚", categories: ["hotpot"], year: 2003 }),
    [],
  );
  assert.deepEqual(
    filterBrands(brands, { ...all, year: 1993 }).map((b) => b.id),
    ["wangsteak"],
  );
  assert.equal(filterBrands(brands, all).length, brands.length);
});
test("content is escaped before HTML rendering", () =>
  assert.equal(
    escapeHtml("<script x=\"1\">&'hi'</script>"),
    "&lt;script x=&quot;1&quot;&gt;&amp;&#39;hi&#39;&lt;/script&gt;",
  ));
test("dependency lock retains upstream integrity and platform packages for reproducible installs", () => {
  const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
  for (const [k, p] of Object.entries(lock.packages) as [string, any][]) {
    if (!k) continue;
    assert.match(p.integrity, /^sha(1|256|512)-/);
    assert.match(p.resolved, /^https:\/\/registry\.npmjs\.org\//);
  }
  assert.ok(lock.packages["node_modules/@esbuild/linux-x64"]);
  assert.ok(lock.packages["node_modules/@rollup/rollup-darwin-arm64"]);
});
