export function getSceneTimeState(minutes: number) {
  if (!Number.isFinite(minutes)) throw new Error("Scene time must be finite");
  const time = ((minutes % 1440) + 1440) % 1440;
  return {
    minutes: time,
    lampsOn: time >= 17 * 60 + 30 || time < 5 * 60 + 30,
    phase:
      time < 330 || time >= 1200
        ? "night"
        : time < 390
          ? "dawn"
          : time >= 1020
            ? "dusk"
            : "day",
  } as const;
}
export function hasIslandClearance(
  point: { x: number; z: number },
  centers: Iterable<{ x: number; z: number }>,
  clearance: number,
) {
  for (const center of centers)
    if (Math.hypot(point.x - center.x, point.z - center.z) < clearance)
      return false;
  return true;
}
