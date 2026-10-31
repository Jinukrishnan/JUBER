// Radar zoom levels: how many metres from the bus to the edge of the circle.
export const RADAR_RANGES = [150, 400, 1000] as const;
export const DEFAULT_RANGE_INDEX = 1;

export type RadarView = { x: number; z: number; heading: number };

// A world point as seen on a round radar centred on the bus, with the bus's
// heading pointing up. Points beyond the range are held on the rim so you can
// still see which way they lie.
export function toRadar(
  view: RadarView,
  p: { x: number; z: number },
  rangeM: number,
  radiusPx: number,
): { px: number; py: number; dist: number; inside: boolean } {
  const dx = p.x - view.x;
  const dz = p.z - view.z;
  const c = Math.cos(view.heading);
  const s = Math.sin(view.heading);
  const ahead = dx * c + dz * s;
  const right = -dx * s + dz * c;
  const dist = Math.hypot(dx, dz);
  const k = radiusPx / rangeM;
  if (dist <= rangeM) return { px: right * k, py: -ahead * k, dist, inside: true };
  return { px: (right / dist) * radiusPx, py: (-ahead / dist) * radiusPx, dist, inside: false };
}

// The same projection without the rim clamp, for drawing roads that run off the edge.
export function toRadarRaw(view: RadarView, p: { x: number; z: number }, pxPerM: number): { px: number; py: number } {
  const dx = p.x - view.x;
  const dz = p.z - view.z;
  const c = Math.cos(view.heading);
  const s = Math.sin(view.heading);
  return { px: (-dx * s + dz * c) * pxPerM, py: -(dx * c + dz * s) * pxPerM };
}

// Road polylines as seen on the radar (rotated to the vehicle, scaled to pixels, not
// clamped to the rim). A road with no point within the range (plus a margin for the
// stretches between points) is left out.
export function roadsToRadar(
  view: RadarView,
  roads: { road: string; pts: { x: number; z: number }[] }[],
  rangeM: number,
  radiusPx: number,
): { road: string; pts: { px: number; py: number }[] }[] {
  const k = radiusPx / rangeM;
  const reach = rangeM * 1.2 + 15;
  return roads
    .filter((r) => r.pts.some((p) => Math.hypot(p.x - view.x, p.z - view.z) <= reach))
    .map((r) => ({ road: r.road, pts: r.pts.map((p) => toRadarRaw(view, p, k)) }));
}
