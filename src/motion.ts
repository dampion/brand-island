export interface GroundPoint {
  x: number;
  z: number;
}
export interface WalkingRoute {
  islands: string[];
  points: GroundPoint[];
  distances: number[];
  length: number;
}

// Follow the outside promenade, cross the actual neighboring bridge, and return.
// Routes never take the shortcut through the restaurant in the middle of an island.
export function createWalkingRoute(
  from: string,
  to: string | null,
  positions: ReadonlyMap<string, GroundPoint>,
): WalkingRoute {
  const a = positions.get(from);
  const b = to ? positions.get(to) : null;
  if (!a || (to && !b))
    throw new Error("Walking route references an unknown island");
  const points: GroundPoint[] = [];
  const radius = 1.68;
  const angle = b ? Math.atan2(b.z - a.z, b.x - a.x) : 0;
  const circle = (center: GroundPoint, start: number) => {
    for (let i = 0; i <= 40; i++) {
      const theta = start + (i / 40) * Math.PI * 2;
      points.push({
        x: center.x + Math.cos(theta) * radius,
        z: center.z + Math.sin(theta) * radius,
      });
    }
  };
  circle(a, angle);
  if (b) {
    circle(b, angle + Math.PI);
    points.push({ ...points[0] });
  }
  const distances = [0];
  for (let i = 1; i < points.length; i++)
    distances.push(
      distances[i - 1] +
        Math.hypot(
          points[i].x - points[i - 1].x,
          points[i].z - points[i - 1].z,
        ),
    );
  return {
    islands: to ? [from, to] : [from],
    points,
    distances,
    length: distances.at(-1)!,
  };
}

export function sampleWalkingRoute(route: WalkingRoute, distance: number) {
  const travelled = ((distance % route.length) + route.length) % route.length;
  let lo = 1,
    hi = route.distances.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (route.distances[mid] < travelled) lo = mid + 1;
    else hi = mid;
  }
  const a = route.points[lo - 1],
    b = route.points[lo];
  const length = route.distances[lo] - route.distances[lo - 1];
  const t = length ? (travelled - route.distances[lo - 1]) / length : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    heading: Math.atan2(b.x - a.x, b.z - a.z),
  };
}
