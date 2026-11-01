import { test } from "node:test";
import assert from "node:assert/strict";
import { getSceneTimeState, hasIslandClearance } from "../src/scene-rules.ts";
import { brands } from "../src/domain.ts";
test("street lamps turn on at 17:30 and turn off exactly at 05:30", () => {
  assert.equal(getSceneTimeState(1049.99).lampsOn, false);
  assert.equal(getSceneTimeState(1050).lampsOn, true);
  assert.equal(getSceneTimeState(1439).lampsOn, true);
  assert.equal(getSceneTimeState(0).lampsOn, true);
  assert.equal(getSceneTimeState(329.99).lampsOn, true);
  assert.equal(getSceneTimeState(330).lampsOn, false);
  assert.equal(getSceneTimeState(720).lampsOn, false);
});
test("clock wrapping preserves night lighting and dawn returns ambient daylight", () => {
  assert.equal(getSceneTimeState(1440).lampsOn, true);
  assert.equal(getSceneTimeState(-1).minutes, 1439);
  assert.equal(getSceneTimeState(329).phase, "night");
  assert.equal(getSceneTimeState(330).phase, "dawn");
  assert.equal(getSceneTimeState(390).phase, "day");
  assert.throws(() => getSceneTimeState(Number.NaN));
});
test("coastal scenery rejects placements too close to any restaurant island", () => {
  const centers = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
  ];
  assert.equal(hasIslandClearance({ x: 2, z: 0 }, centers, 2.5), false);
  assert.equal(hasIslandClearance({ x: 9, z: 0 }, centers, 2.5), true);
  assert.equal(hasIslandClearance({ x: 6.5, z: 0 }, centers, 2.5), true);
});
test("every brand has three distinct, sourced signature choices for its building board", () => {
  for (const brand of brands) {
    assert.equal(brand.dishes.length, 3, brand.id);
    assert.equal(new Set(brand.dishes).size, 3, brand.id);
    assert.ok(brand.sources.some((s) => s.status === "verified"));
  }
});
