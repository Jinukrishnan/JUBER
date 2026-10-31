import type { Network } from "../data/network-v1";
import type { Place } from "../data/places-v1";
import { ShapeGrid, keepOutZones, overlaps, type Shape } from "./footprint";
import { FOOTPATH_WIDTH, VERGE_WIDTH, builtRoads, headingAt, pointAt } from "./network";
import { placeSpot } from "./places";
import type { RoadFeatures } from "./roadside";

// Where the roadside scenery goes, along every road of the network. Pure and seeded: the same seed always gives
// the same village, nothing here knows about three.js, and every placement is
// checked against the keep-out zones (road, shelters, signs, poles) and
// against every other placement, so nothing can overlap anything.
export type Side = -1 | 1; // -1 left of the direction a road runs, +1 right
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
  heading?: number; // the road's direction here, so the heads can face it
};
// A house or shop. `heading` is the road's direction at its station; `width`
// runs along the road and `depth` back from it, with the front facing the road.
export type BuildingPlacement = {
  kind: "house" | "shop";
  side: Side;
  x: number;
  z: number;
  heading: number;
  width: number;
  depth: number;
  floors: number;
  seed: number;
  compound: number;
};
// A compound has two wall pieces and a gate between them, in front of the building.
export type WallPlacement = {
  kind: "wall";
  side: Side;
  x: number;
  z: number;
  heading: number;
  length: number;
  compound: number;
};
export type GatePlacement = {
  kind: "gate";
  side: Side;
  x: number;
  z: number;
  heading: number;
  compound: number;
};
export type Placement = TreePlacement | FlowerPlacement | BuildingPlacement | WallPlacement | GatePlacement;

// crown radius at scale 1, metres
export const TREE_RADIUS: Record<TreeKind, number> = {
  coconut: 0.8,
  mango: 3.0,
  gulmohar: 3.5,
  banana: 1.8,
  jackfruit: 2.0,
};
// A cluster of heads is about a metre across; its centre stands 1.0-1.8 m beyond the verge
// edge, so the nearest flowers are 0.4-1.2 m from it.
const FLOWER_RADIUS = 0.6;
const WALL_THICKNESS = 0.3;
export const GATE_WIDTH = 3;
const GATE_DEPTH = 0.5;

export function footprintOf(p: Placement): Shape {
  switch (p.kind) {
    case "flowers":
      return { kind: "circle", x: p.x, z: p.z, r: FLOWER_RADIUS };
    case "house":
    case "shop": {
      // the drawn extent, not just the walls: a house's veranda and roof reach 1.8 m toward the
      // road, a shop's balcony 1.3 m, and both overhang a little behind and to the sides
      const front = p.kind === "house" ? 1.8 : 1.3;
      const back = p.kind === "house" ? 0.7 : 0.2;
      const side = p.kind === "house" ? 0.6 : 0.2;
      const shift = (front - back) / 2; // the extent is centred this far toward the road
      return {
        kind: "rect",
        x: p.x + p.side * Math.sin(p.heading) * shift,
        z: p.z - p.side * Math.cos(p.heading) * shift,
        w: p.width + 2 * side,
        d: p.depth + front + back,
        heading: p.heading,
      };
    }
    case "wall":
      return { kind: "rect", x: p.x, z: p.z, w: p.length, d: WALL_THICKNESS, heading: p.heading };
    case "gate":
      return { kind: "rect", x: p.x, z: p.z, w: GATE_WIDTH, d: GATE_DEPTH, heading: p.heading };
    default:
      return { kind: "circle", x: p.x, z: p.z, r: TREE_RADIUS[p.kind] * p.scale };
  }
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
  ["coconut", 0.27],
  ["mango", 0.2],
  ["gulmohar", 0.11],
  ["banana", 0.12],
  ["jackfruit", 0.08],
  ["flowers", 0.22],
];
const FLOWERS: FlowerKind[] = ["sunflower", "hibiscus", "marigold"];
const SLOT = 9; // metres between plant slots along a road
const JITTER = 2; // keep well under SLOT/2 so slots stay in order along the road
const BUILDING_SLOT = 20; // metres between building plots along a road
const SETBACK = 3.6; // building front behind the verge edge, metres
const WALL_SETBACK = 1.2; // compound wall behind the verge edge

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

export type GrassSpot = { x: number; z: number; seed: number };

// Where grass and bushes grow along every verge: every ~3 m, just beyond its edge.
function grassSpotsFor(n: Network, seed: number): GrassSpot[] {
  const r = mulberry32(seed ^ 0x51ed);
  const out: GrassSpot[] = [];
  for (const road of builtRoads(n)) {
    for (const side of [-1, 1] as const) {
      for (let s = 0; s < road.length; s += 3) {
        const at = s + r() * 1.8;
        const lat = road.road.halfWidth + FOOTPATH_WIDTH + VERGE_WIDTH + 0.4 + r() * 0.8;
        const p = pointAt(road, at);
        const h = headingAt(road, at);
        out.push({ x: p.x - Math.sin(h) * side * lat, z: p.z + Math.cos(h) * side * lat, seed: Math.floor(r() * 1e9) });
      }
    }
  }
  return out;
}

export function layoutScenery(
  seed: number,
  n: Network,
  places: Place[],
  features: RoadFeatures,
): {
  placements: Placement[];
  grass: GrassSpot[];
  isGroundFree(x: number, z: number, radius: number): boolean;
} {
  const r = mulberry32(seed);
  const zones = keepOutZones(n, places, features);
  const placements: Placement[] = [];
  const zoneGrid = new ShapeGrid();
  zones.forEach((z) => zoneGrid.add(z));
  const placedGrid = new ShapeGrid();

  const accept = (p: Placement): boolean => {
    const s = footprintOf(p);
    if (zoneGrid.hits(s) || placedGrid.hits(s)) return false;
    placements.push(p);
    placedGrid.add(s);
    return true;
  };

  const shelterSpots = places.filter((p) => p.shelter).map((p) => placeSpot(n, p));
  const nearestShelter = (x: number, z: number) => Math.min(...shelterSpots.map((s) => Math.hypot(s.x - x, s.z - z)), 1e9);

  let compound = 0;
  for (const road of builtRoads(n)) {
    const verge = road.road.halfWidth + FOOTPATH_WIDTH + VERGE_WIDTH;
    const straight = road.segments;
    // a point `lateral` metres from the road centreline (square to it) and `along` metres on, at distance s
    const at = (s: number, side: Side, lateral: number, along = 0) => {
      const p = pointAt(road, s + along);
      const h = headingAt(road, s);
      return { x: p.x - Math.sin(h) * side * lateral, z: p.z + Math.cos(h) * side * lateral, h };
    };
    const onStraight = (s: number, half: number) => straight.some((g) => s - half >= g.s0 && s + half <= g.s0 + g.len);

    // ---- houses and shops, each in a walled compound with a gate (straight stretches only) ----
    for (const side of [-1, 1] as Side[]) {
      for (let slot = side === 1 ? BUILDING_SLOT / 2 : 0; slot <= road.length; slot += BUILDING_SLOT) {
        const s = slot + (r() - 0.5) * 6;
        const buildChance = 0.55;
        if (r() > buildChance) continue;
        const centre = at(s, side, verge + 10);
        const shopChance = Math.max(0.08, Math.min(0.85, 0.85 - ((nearestShelter(centre.x, centre.z) - 60) / 60) * 0.77));
        const shop = r() < shopChance;
        const width = shop ? 8 + r() * 2 : 8 + r() * 3;
        const depth = shop ? 7 + r() * 2 : 6 + r() * 2;
        const floors = shop ? 2 + Math.floor(r() * 3) : 1;
        const bseed = Math.floor(r() * 1e9);
        const jitter = r() * 1.5;
        if (!onStraight(s, width / 2 + 3)) continue;

        const bc = at(s, side, verge + SETBACK + jitter + depth / 2);
        const wallBase = verge + WALL_SETBACK;
        const wallLen = (width + 4 - GATE_WIDTH) / 2;
        const offset = GATE_WIDTH / 2 + 0.05 + wallLen / 2; // a 5 cm gap so wall and gate never touch
        const a = bc.h;
        const parts: Placement[] = [
          { kind: shop ? "shop" : "house", side, x: bc.x, z: bc.z, heading: a, width, depth, floors, seed: bseed, compound },
          { kind: "wall", side, ...at(s, side, wallBase, -offset), heading: a, length: wallLen, compound },
          { kind: "wall", side, ...at(s, side, wallBase, offset), heading: a, length: wallLen, compound },
          { kind: "gate", side, ...at(s, side, wallBase), heading: a, compound },
        ];
        // the whole compound goes in, or none of it
        const fits = parts.every((p, i) => {
          const sh = footprintOf(p);
          return !zoneGrid.hits(sh) && !placedGrid.hits(sh) && !parts.slice(0, i).some((q) => overlaps(sh, footprintOf(q)));
        });
        if (!fits) continue;
        parts.forEach((p) => accept(p));
        compound += 1;
      }
    }

    // ---- trees and flowers fill in around them ----
    for (const side of [-1, 1] as Side[]) {
      const recent: Kind[] = [];
      for (let slot = 0; slot <= road.length; slot += SLOT) {
        const s = slot + (r() - 0.5) * 2 * JITTER;
        const avoid = recent.length >= 3 && recent.slice(-3).every((k) => k === recent[recent.length - 1]) ? recent[recent.length - 1] : null;
        const kind = pickKind(r, avoid);
        const seedN = Math.floor(r() * 1e9);
        const ahead = r();
        let ok: boolean;
        if (kind === "flowers") {
          const p = at(s, side, verge + 1.0 + ahead * 0.8);
          ok = accept({ kind: "flowers", species: FLOWERS[Math.floor(r() * FLOWERS.length)], count: 6 + Math.floor(r() * 9), seed: seedN, side, x: p.x, z: p.z, heading: p.h });
        } else {
          const p = at(s, side, verge + 1.5 + ahead * 6);
          ok = accept({ kind, scale: 0.85 + r() * 0.4, lean: (r() - 0.5) * 0.24, seed: seedN, side, x: p.x, z: p.z });
        }
        if (ok) recent.push(kind);
      }
    }
  }

  return {
    placements,
    grass: grassSpotsFor(n, seed),
    isGroundFree: (x, z, radius) => {
      const probe: Shape = { kind: "circle", x, z, r: radius };
      return !placedGrid.hits(probe) && !zoneGrid.hits(probe);
    },
  };
}
