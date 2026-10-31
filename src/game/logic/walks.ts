import type { Network, RoadId } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { FOOTPATH_WIDTH, JUNCTION_BOX_HALF, builtRoads, headingAt, pointAt } from "./network";
import type { P } from "./path";
import { placeSpot } from "./places";
import type { Zebra } from "./roadside";

const ALONG = 10; // metres they walk along the footpath before and after crossing
const STROLL_LENGTH = 28;
const JUNCTION_CLEAR = 14; // a stroll stays this far beyond a junction box
const PLACE_CLEAR = 12; // and this far from a place, where customers and shelters stand

// Along the footpath to the zebra, over the stripes, and on along the other
// footpath, both ends away from the junction. `dir` picks which side they start on.
export function crossingPath(n: Network, z: Zebra, dir: 1 | -1): P[] {
  const hw = builtRoads(n).find((r) => r.road.id === z.road)!.road.halfWidth;
  const mid = hw + FOOTPATH_WIDTH / 2;
  const fx = Math.cos(z.heading);
  const fz = Math.sin(z.heading);
  const rx = -fz;
  const rz = fx;
  const from = dir === 1 ? -1 : 1;
  const at = (side: number, back: number): P => ({ x: z.x + side * mid * rx - back * fx, z: z.z + side * mid * rz - back * fz });
  return [at(from, ALONG), at(from, 0), at(-from, 0), at(-from, ALONG)];
}

// A walk along one footpath of a road, or null where it would cross a junction or
// pass a place.
export function strollPath(n: Network, places: Place[], roadId: RoadId, s: number, dir: 1 | -1, side: -1 | 1, inset: number): P[] | null {
  const r = builtRoads(n).find((b) => b.road.id === roadId)!;
  const end = s + dir * STROLL_LENGTH;
  if (!r.road.closed && (Math.min(s, end) < 0 || Math.max(s, end) > r.length)) return null;
  const at = (d: number): P => {
    const p = pointAt(r, d);
    const h = headingAt(r, d);
    const lat = side * (r.road.halfWidth + inset);
    return { x: p.x - Math.sin(h) * lat, z: p.z + Math.cos(h) * lat };
  };
  const path = [at(s), at(s + (dir * STROLL_LENGTH) / 2), at(end)];
  const spots = places.map((p) => placeSpot(n, p));
  for (const pt of path) {
    if (n.junctions.some((j) => Math.max(Math.abs(pt.x - j.at[0]), Math.abs(pt.z - j.at[1])) < JUNCTION_BOX_HALF + JUNCTION_CLEAR)) return null;
    if (spots.some((sp) => Math.hypot(sp.x - pt.x, sp.z - pt.z) < PLACE_CLEAR)) return null;
  }
  return path;
}
