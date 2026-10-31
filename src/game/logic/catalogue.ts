import { CITY_CENTRE, CITY_TYPES, type BuildingTypeId } from "../data/buildings-v1";

const EDGE_M = 900; // from the centre, the city is as low as it gets
const MIN_FACTOR = 0.15;
const EDGE_TOP_SHARE = 0.6; // an edge tower reaches at most this share of its range top

// 1 at the city centre, falling in a straight line to 0.15 at 900 m and beyond.
export function heightFactor(x: number, z: number): number {
  const d = Math.hypot(x - CITY_CENTRE.x, z - CITY_CENTRE.z);
  return Math.max(MIN_FACTOR, 1 - (1 - MIN_FACTOR) * Math.min(1, d / EDGE_M));
}

export type CityPick = { type: BuildingTypeId; width: number; depth: number; floors: number; color: string };

// A city building for a spot: the types are weighted by how central the spot is (towers and offices
// near the middle, homes and arcades outside) and the floors are scaled the same way.
export function pickCityBuilding(r: () => number, x: number, z: number): CityPick {
  const h = heightFactor(x, z);
  const weighted = CITY_TYPES.map((t) => ({ t, w: t.weight * (t.id === "tower" || t.id === "office" ? h : t.id === "home" || t.id === "arcade" ? 1.2 - h : 1) }));
  const total = weighted.reduce((s, v) => s + v.w, 0);
  let u = r() * total;
  let type = weighted[weighted.length - 1].t;
  for (const v of weighted) {
    if (u < v.w) {
      type = v.t;
      break;
    }
    u -= v.w;
  }
  const lerp = (range: [number, number]) => range[0] + r() * (range[1] - range[0]);
  const [lo, hi] = type.floors;
  // the range top shrinks toward the edge: full height at the centre, 60 percent of it at the edge
  const share = EDGE_TOP_SHARE + (1 - EDGE_TOP_SHARE) * ((h - MIN_FACTOR) / (1 - MIN_FACTOR));
  const top = Math.max(lo, Math.round(hi * share));
  const floors = Math.max(1, Math.round(lo + r() * (top - lo)));
  return { type: type.id, width: lerp(type.width), depth: lerp(type.depth), floors, color: type.palette[Math.floor(r() * type.palette.length)] };
}
