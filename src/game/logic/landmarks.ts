import type { Landmark, LandmarkKind } from "../data/landmarks-v1";
import type { Network } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { ShapeGrid, overlaps, type Shape } from "./footprint";
import { FOOTPATH_WIDTH, VERGE_WIDTH, builtRoads, headingAt, pointAt } from "./network";
import { zoneKindAt } from "./zones";

export type { Landmark, LandmarkKind } from "../data/landmarks-v1";

// A landmark as the scenery layout holds it: where it stands and how big it is.
export type LandmarkPlacement = {
  kind: "landmark";
  landmark: LandmarkKind;
  place: string;
  side: -1 | 1;
  x: number;
  z: number;
  heading: number;
  width: number;
  depth: number;
  floors: number;
  color: string;
  seed: number;
};

const SETBACK = 4; // from the verge edge to the front of the building
const SLIDE_STEP = 5;
const SLIDE_MAX = 40;

export const landmarkFootprint = (p: Pick<LandmarkPlacement, "x" | "z" | "width" | "depth" | "heading">): Shape => ({
  kind: "rect",
  x: p.x,
  z: p.z,
  w: p.width,
  d: p.depth,
  heading: p.heading,
});

function insideCity(p: Pick<LandmarkPlacement, "x" | "z" | "width" | "depth" | "heading">): boolean {
  const u = { x: Math.cos(p.heading), z: Math.sin(p.heading) };
  const v = { x: -Math.sin(p.heading), z: Math.cos(p.heading) };
  for (const a of [-1, 1]) {
    for (const b of [-1, 1]) {
      const x = p.x + u.x * a * (p.width / 2) + v.x * b * (p.depth / 2);
      const z = p.z + u.z * a * (p.width / 2) + v.z * b * (p.depth / 2);
      if (zoneKindAt(x, z) !== "city") return false;
    }
  }
  return true;
}

// Every landmark, behind the footpath and verge of its place, centred on the place's distance along the road.
// One that hits a keep-out zone, another landmark or the edge of the city slides along the road up to 40 m
// each way; one that fits nowhere is listed in `missing`.
export function landmarkPlacements(n: Network, places: Place[], keepOut: Shape[], landmarks: Landmark[]): { placements: LandmarkPlacement[]; missing: string[] } {
  const zone = new ShapeGrid();
  keepOut.forEach((s) => zone.add(s));
  const placements: LandmarkPlacement[] = [];
  const missing: string[] = [];
  const roads = builtRoads(n);

  landmarks.forEach((l, index) => {
    const place = places.find((p) => p.id === l.place);
    const road = place && roads.find((r) => r.road.id === place.road);
    if (!place || !road) {
      missing.push(l.place);
      return;
    }
    const lateral = road.road.halfWidth + FOOTPATH_WIDTH + VERGE_WIDTH + SETBACK + l.depth / 2;
    for (let shift = 0; shift <= SLIDE_MAX; shift += SLIDE_STEP) {
      for (const sign of shift === 0 ? [1] : [1, -1]) {
        const s = place.s + sign * shift;
        const c = pointAt(road, s);
        const h = headingAt(road, s);
        const cand: LandmarkPlacement = {
          kind: "landmark",
          landmark: l.kind,
          place: l.place,
          side: place.side,
          x: c.x - Math.sin(h) * place.side * lateral,
          z: c.z + Math.cos(h) * place.side * lateral,
          heading: h,
          width: l.width,
          depth: l.depth,
          floors: l.floors,
          color: l.color,
          seed: 1000 + index,
        };
        const foot = landmarkFootprint(cand);
        if (zone.hits(foot) || !insideCity(cand) || placements.some((q) => overlaps(foot, landmarkFootprint(q)))) continue;
        placements.push(cand);
        return;
      }
    }
    missing.push(l.place);
  });
  return { placements, missing };
}
