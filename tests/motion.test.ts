import { test } from "node:test";
import assert from "node:assert/strict";
import { createWalkingRoute, sampleWalkingRoute } from "../src/motion.ts";
const positions = new Map([
  ["a", { x: 0, z: 0 }],
  ["b", { x: 3.8, z: 0 }],
]);
test("walking loop connects neighboring islands continuously and crosses their bridge", () => {
  const route = createWalkingRoute("a", "b", positions);
  assert.deepEqual(route.islands, ["a", "b"]);
  assert.deepEqual(route.points[0], route.points.at(-1));
  for (let i = 1; i < route.points.length; i++)
    assert.ok(
      Math.hypot(
        route.points[i].x - route.points[i - 1].x,
        route.points[i].z - route.points[i - 1].z,
      ) < 0.5,
      "route must not teleport",
    );
  const bridgeMid = (route.distances[40] + route.distances[41]) / 2;
  const point = sampleWalkingRoute(route, bridgeMid);
  assert.ok(Math.abs(point.x - 1.9) < 1e-9);
  assert.ok(Math.abs(point.z) < 1e-9);
});
test("constant-distance sampling wraps forward and backward without a jump", () => {
  const route = createWalkingRoute("a", "b", positions);
  const a = sampleWalkingRoute(route, 0.15),
    b = sampleWalkingRoute(route, route.length + 0.15),
    c = sampleWalkingRoute(route, -route.length + 0.15);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1e-9);
  assert.ok(Math.hypot(a.x - c.x, a.z - c.z) < 1e-9);
  const before = sampleWalkingRoute(route, route.length - 0.001),
    after = sampleWalkingRoute(route, 0.001);
  assert.ok(Math.hypot(before.x - after.x, before.z - after.z) < 0.003);
});
test("isolated visible islands retain a local promenade outside the restaurant footprint", () => {
  const route = createWalkingRoute("a", null, positions);
  assert.deepEqual(route.islands, ["a"]);
  for (let d = 0; d < route.length; d += 0.1) {
    const p = sampleWalkingRoute(route, d);
    assert.ok(Math.hypot(p.x, p.z) > 1.65);
    assert.ok(Number.isFinite(p.heading));
  }
});
test("routing refuses a missing island instead of generating invalid animation coordinates", () => {
  assert.throws(() => createWalkingRoute("missing", null, positions));
  assert.throws(() => createWalkingRoute("a", "missing", positions));
});
