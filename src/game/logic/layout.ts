import { keepOutZones, overlaps, type Shape } from "./footprint";
import type { ResolvedJunction } from "./junction";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";
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

// A coarse grid along the route so a shape is only compared with its neighbours
// instead of everything: the layout has hundreds of shapes.
const CELL = 25;
function reach(s: Shape): number {
  return s.kind === "circle" ? s.r : Math.hypot(s.w, s.d) / 2;
}
class Grid {
  private cells = new Map<number, Shape[]>();
  add(s: Shape) {
    const r = reach(s);
    for (let c = Math.floor((s.x - r) / CELL); c <= Math.floor((s.x + r) / CELL); c++) {
      const list = this.cells.get(c);
      if (list) list.push(s);
      else this.cells.set(c, [s]);
    }
  }
  // true if any stored shape that could be near `s` overlaps it
  hits(s: Shape): boolean {
    const r = reach(s);
    for (let c = Math.floor((s.x - r) / CELL); c <= Math.floor((s.x + r) / CELL); c++) {
      const list = this.cells.get(c);
      if (list && list.some((o) => overlaps(s, o))) return true;
    }
    return false;
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
const SLOT = 9; // metres between plant slots along the road
const JITTER = 2; // keep well under SLOT/2 so slots stay in order along the road
const BUILDING_SLOT = 20; // metres between building plots along the road
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

export function layoutScenery(
  seed: number,
  stops: Stop[],
  features: RoadFeatures,
  junctions: ResolvedJunction[] = [],
): {
  placements: Placement[];
  isGroundFree(x: number, z: number, radius: number): boolean;
} {
  const r = mulberry32(seed);
  const zones = keepOutZones(stops, features, junctions);
  const placements: Placement[] = [];
  const zoneGrid = new Grid();
  zones.forEach((z) => zoneGrid.add(z));
  const placedGrid = new Grid();

  const accept = (p: Placement): boolean => {
    const s = footprintOf(p);
    if (zoneGrid.hits(s) || placedGrid.hits(s)) return false;
    placements.push(p);
    placedGrid.add(s);
    return true;
  };

  const firstStop = stops[0].position;
  const lastStop = stops[stops.length - 1].position;
  const first = firstStop - 30;
  const last = lastStop + 30;
  const verge = (x: number) => roadHalfWidthAt(x) + FOOTPATH_WIDTH + VERGE_WIDTH;
  const nearestStop = (x: number) => Math.min(...stops.map((s) => Math.abs(s.position - x)));
  const nearestEnd = (x: number) => Math.min(Math.abs(x - firstStop), Math.abs(x - lastStop));

  // ---- houses and shops, each in a walled compound with a gate ----
  let compound = 0;
  for (const side of [-1, 1] as Side[]) {
    for (let slot = first + (side === 1 ? BUILDING_SLOT / 2 : 0); slot <= last; slot += BUILDING_SLOT) {
      const x = slot + (r() - 0.5) * 6;
      // fewer buildings toward the ends of the route
      const near = nearestStop(x);
      const buildChance = nearestEnd(x) < 120 ? 0.25 : near <= 60 ? 0.5 : 0.55;
      if (r() > buildChance) continue;
      // shops gather around the stops, houses fill in between
      const d = near;
      const shopChance = d <= 60 ? 0.85 : d > 120 ? 0.08 : 0.85 - ((d - 60) / 60) * 0.77;
      const shop = r() < shopChance;
      const width = shop ? 8 + r() * 2 : 8 + r() * 3;
      const depth = shop ? 7 + r() * 2 : 6 + r() * 2;
      const floors = shop ? 2 + Math.floor(r() * 3) : 1;
      const bseed = Math.floor(r() * 1e9);
      const jitter = r() * 1.5;

      const a = roadAngle(x);
      const perpX = -Math.sin(a);
      const perpZ = Math.cos(a);
      const roadZ = roadCenterZ(x);
      // a point `lateral` metres from the road centreline, measured square to the road
      const at = (lateral: number, along = 0) => ({
        x: x + side * lateral * perpX + along * Math.cos(a),
        z: roadZ + side * lateral * perpZ + along * Math.sin(a),
      });
      const id = compound;
      const bc = at(verge(x) + SETBACK + jitter + depth / 2);
      const wallBase = verge(x) + WALL_SETBACK;
      const wallLen = (width + 4 - GATE_WIDTH) / 2;
      const offset = GATE_WIDTH / 2 + 0.05 + wallLen / 2; // a 5 cm gap so wall and gate never touch
      const parts: Placement[] = [
        { kind: shop ? "shop" : "house", side, x: bc.x, z: bc.z, heading: a, width, depth, floors, seed: bseed, compound: id },
        { kind: "wall", side, ...at(wallBase, -offset), heading: a, length: wallLen, compound: id },
        { kind: "wall", side, ...at(wallBase, offset), heading: a, length: wallLen, compound: id },
        { kind: "gate", side, ...at(wallBase), heading: a, compound: id },
      ];
      // the whole compound goes in, or none of it
      const fits = parts.every((p, i) => {
        const s = footprintOf(p);
        return !zoneGrid.hits(s) && !placedGrid.hits(s) && !parts.slice(0, i).some((q) => overlaps(s, footprintOf(q)));
      });
      if (!fits) continue;
      parts.forEach((p) => accept(p));
      compound += 1;
    }
  }

  // ---- trees and flowers fill in around them ----
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
      return !placedGrid.hits(probe);
    },
  };
}
