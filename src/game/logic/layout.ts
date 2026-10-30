import { keepOutZones, overlaps, type Shape } from "./footprint";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadCenterZ, roadHalfWidthAt } from "./road";
import type { RoadFeatures } from "./roadside";
import type { Stop } from "./route";

// Where the roadside scenery goes. Pure and seeded: the same seed always gives
// the same village, nothing here knows about three.js, and every placement is
// checked against the keep-out zones (road, shelters, signs, poles) and
// against every other placement, so nothing can overlap anything.
export type Side = -1 | 1; // -1 left (-z), +1 right (+z)
export type TreeKind = "coconut" | "mango" | "gulmohar" | "banana" | "jackfruit";
export type FlowerKind = "sunflower" | "hibiscus" | "marigold";

export type TreePlacement = {
  kind: TreeKind;
  side: Side;
  x: number;
  z: number;
  scale: number;
  lean: number;
  seed: number;
};
export type FlowerPlacement = {
  kind: "flowers";
  species: FlowerKind;
  side: Side;
  x: number;
  z: number;
  count: number;
  seed: number;
};
export type Placement = TreePlacement | FlowerPlacement;

// crown radius at scale 1, metres
export const TREE_RADIUS: Record<TreeKind, number> = {
  coconut: 0.8,
  mango: 3.0,
  gulmohar: 3.5,
  banana: 1.2,
  jackfruit: 2.0,
};
// A cluster of heads is about a metre across; its centre stands 1.0-1.8 m beyond the verge
// edge, so the nearest flowers are 0.4-1.2 m from it.
const FLOWER_RADIUS = 0.6;

export function footprintOf(p: Placement): Shape {
  if (p.kind === "flowers") return { kind: "circle", x: p.x, z: p.z, r: FLOWER_RADIUS };
  return { kind: "circle", x: p.x, z: p.z, r: TREE_RADIUS[p.kind] * p.scale };
}

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Kind = TreeKind | "flowers";
const WEIGHTS: [Kind, number][] = [
  ["coconut", 0.34],
  ["mango", 0.2],
  ["gulmohar", 0.1],
  ["banana", 0.14],
  ["jackfruit", 0.08],
  ["flowers", 0.14],
];
const FLOWERS: FlowerKind[] = ["sunflower", "hibiscus", "marigold"];
const SLOT = 9; // metres between plant slots along the road
const JITTER = 2; // keep well under SLOT/2 so slots stay in order along the road

function pickKind(r: () => number, avoid: Kind | null): Kind {
  for (let tries = 0; tries < 8; tries++) {
    let u = r();
    for (const [k, w] of WEIGHTS) {
      if (u < w) {
        if (k !== avoid) return k;
        break;
      }
      u -= w;
    }
  }
  return WEIGHTS.find(([k]) => k !== avoid)![0];
}

export function layoutScenery(
  seed: number,
  stops: Stop[],
  features: RoadFeatures,
): {
  placements: Placement[];
  isGroundFree(x: number, z: number, radius: number): boolean;
} {
  const r = mulberry32(seed);
  const zones = keepOutZones(stops, features);
  const placements: Placement[] = [];
  const shapes: Shape[] = [];

  const free = (s: Shape) => !zones.some((z) => overlaps(s, z)) && !shapes.some((o) => overlaps(s, o));
  const accept = (p: Placement): boolean => {
    const s = footprintOf(p);
    if (!free(s)) return false;
    placements.push(p);
    shapes.push(s);
    return true;
  };

  const first = stops[0].position - 30;
  const last = stops[stops.length - 1].position + 30;
  const verge = (x: number) => roadHalfWidthAt(x) + FOOTPATH_WIDTH + VERGE_WIDTH;

  for (const side of [-1, 1] as Side[]) {
    const recent: Kind[] = [];
    for (let slot = first; slot <= last; slot += SLOT) {
      const x = slot + (r() - 0.5) * 2 * JITTER;
      // never a fourth of the same kind in a row
      const avoid = recent.length >= 3 && recent.slice(-3).every((k) => k === recent[recent.length - 1]) ? recent[recent.length - 1] : null;
      const kind = pickKind(r, avoid);
      const seedN = Math.floor(r() * 1e9);
      const ahead = r();
      const at = (lat: number) => ({ side, x, z: roadCenterZ(x) + side * (verge(x) + lat) });

      let ok: boolean;
      if (kind === "flowers") {
        ok = accept({
          kind: "flowers",
          species: FLOWERS[Math.floor(r() * FLOWERS.length)],
          count: 6 + Math.floor(r() * 9),
          seed: seedN,
          ...at(1.0 + ahead * 0.8),
        });
      } else {
        ok = accept({ kind, scale: 0.85 + r() * 0.4, lean: (r() - 0.5) * 0.24, seed: seedN, ...at(1.5 + ahead * 6) });
      }
      if (ok) recent.push(kind);
    }
  }

  return {
    placements,
    isGroundFree: (x, z, radius) => {
      const probe: Shape = { kind: "circle", x, z, r: radius };
      return !shapes.some((s) => overlaps(probe, s));
    },
  };
}
