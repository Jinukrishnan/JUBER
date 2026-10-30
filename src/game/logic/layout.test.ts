import { beforeAll, describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { keepOutZones, overlaps } from "./footprint";
import {
  footprintOf,
  layoutScenery,
  type BuildingPlacement,
  type FlowerPlacement,
  type GatePlacement,
  type Placement,
  type TreePlacement,
  type WallPlacement,
} from "./layout";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";
import { roadFeatures } from "./roadside";

const SEED = 20261030;
const features = roadFeatures(ROUTE_V1);
const zones = keepOutZones(ROUTE_V1, features);
let layout: ReturnType<typeof layoutScenery>;
let placements: Placement[];

beforeAll(() => {
  layout = layoutScenery(SEED, ROUTE_V1, features);
  placements = layout.placements;
});

const isTree = (p: Placement): p is TreePlacement =>
  ["coconut", "mango", "gulmohar", "banana", "jackfruit"].includes(p.kind);
const isFlowers = (p: Placement): p is FlowerPlacement => p.kind === "flowers";
const verge = (x: number) => roadHalfWidthAt(x) + FOOTPATH_WIDTH + VERGE_WIDTH;
const lateral = (p: { x: number; z: number }) => Math.abs(p.z - roadCenterZ(p.x));

describe("layoutScenery determinism", () => {
  it("gives the same layout for the same seed", () => {
    expect(layoutScenery(SEED, ROUTE_V1, features).placements).toEqual(placements);
  });
  it("gives a different layout for a different seed", () => {
    expect(layoutScenery(SEED + 1, ROUTE_V1, features).placements).not.toEqual(placements);
  });
});

describe("vegetation", () => {
  const trees = () => placements.filter(isTree);
  const flowers = () => placements.filter(isFlowers);

  it("is all finite and on the side it says", () => {
    for (const p of [...trees(), ...flowers()]) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
      expect(Math.sign(p.z - roadCenterZ(p.x))).toBe(p.side);
    }
  });

  it("stands back from the verge by a believable distance", () => {
    for (const t of trees()) {
      const d = lateral(t) - verge(t.x);
      expect(d).toBeGreaterThanOrEqual(1.5 - 1e-6);
      expect(d).toBeLessThanOrEqual(7.5 + 1e-6);
    }
    for (const f of flowers()) {
      const d = lateral(f) - verge(f.x);
      expect(d).toBeGreaterThanOrEqual(1.0 - 1e-6);
      expect(d).toBeLessThanOrEqual(1.8 + 1e-6);
    }
  });

  it("never overlaps another plant or any keep-out zone", () => {
    const plants = [...trees(), ...flowers()];
    for (let i = 0; i < plants.length; i++) {
      const a = footprintOf(plants[i]);
      for (const z of zones) expect(overlaps(a, z)).toBe(false);
      for (let j = i + 1; j < plants.length; j++) expect(overlaps(a, footprintOf(plants[j]))).toBe(false);
    }
  });

  it("includes every tree species and every flower", () => {
    expect(new Set(trees().map((t) => t.kind))).toEqual(
      new Set(["coconut", "mango", "gulmohar", "banana", "jackfruit"]),
    );
    expect(new Set(flowers().map((f) => f.species))).toEqual(new Set(["sunflower", "hibiscus", "marigold"]));
  });

  it("gives flower clusters between 6 and 14 heads", () => {
    for (const f of flowers()) {
      expect(f.count).toBeGreaterThanOrEqual(6);
      expect(f.count).toBeLessThanOrEqual(14);
    }
  });

  it("never lines up more than three of the same kind in a row on one side", () => {
    for (const side of [-1, 1]) {
      const kinds = placements
        .filter((p) => (isTree(p) || isFlowers(p)) && p.side === side)
        .sort((a, b) => a.x - b.x)
        .map((p) => p.kind);
      for (let i = 3; i < kinds.length; i++) {
        expect(new Set(kinds.slice(i - 3, i + 1)).size).toBeGreaterThan(1);
      }
    }
  });
});

const buildings = () => placements.filter((p): p is BuildingPlacement => p.kind === "house" || p.kind === "shop");
const walls = () => placements.filter((p): p is WallPlacement => p.kind === "wall");
const gates = () => placements.filter((p): p is GatePlacement => p.kind === "gate");
const nearestStop = (x: number) => Math.min(...ROUTE_V1.map((st) => Math.abs(st.position - x)));
const FIRST = ROUTE_V1[0].position;
const LAST = ROUTE_V1[ROUTE_V1.length - 1].position;

// shortest distance from a point to the road centreline
function roadDistance(x: number, z: number) {
  let best = Infinity;
  for (let sx = x - 10; sx <= x + 10; sx += 0.25) best = Math.min(best, Math.hypot(x - sx, z - roadCenterZ(sx)));
  return best;
}

describe("buildings", () => {
  it("includes both houses and shops", () => {
    expect(new Set(buildings().map((b) => b.kind))).toEqual(new Set(["house", "shop"]));
  });

  it("have sizes in range", () => {
    for (const b of buildings()) {
      if (b.kind === "house") {
        expect(b.floors).toBe(1);
        expect(b.width).toBeGreaterThanOrEqual(8);
        expect(b.width).toBeLessThanOrEqual(11);
        expect(b.depth).toBeGreaterThanOrEqual(6);
        expect(b.depth).toBeLessThanOrEqual(8);
      } else {
        expect(b.floors).toBeGreaterThanOrEqual(2);
        expect(b.floors).toBeLessThanOrEqual(4);
        expect(b.width).toBeGreaterThanOrEqual(8);
        expect(b.width).toBeLessThanOrEqual(10);
        expect(b.depth).toBeGreaterThanOrEqual(7);
        expect(b.depth).toBeLessThanOrEqual(9);
      }
    }
  });

  it("follow the road: heading equals the road angle and the front faces the road", () => {
    for (const b of buildings()) {
      // the heading is the road angle at the building's station; its centre sits a little off to the side
      expect(Math.abs(b.heading - roadAngle(b.x))).toBeLessThan(0.005);
      expect(Math.sign(b.z - roadCenterZ(b.x))).toBe(b.side);
    }
  });

  it("have their front at least 3 m behind the verge edge", () => {
    for (const b of buildings()) {
      const perpX = -Math.sin(b.heading);
      const perpZ = Math.cos(b.heading);
      const frontX = b.x - b.side * (b.depth / 2) * perpX;
      const frontZ = b.z - b.side * (b.depth / 2) * perpZ;
      const edge = roadHalfWidthAt(frontX) + FOOTPATH_WIDTH + VERGE_WIDTH;
      expect(roadDistance(frontX, frontZ)).toBeGreaterThanOrEqual(edge + 3 - 0.05);
    }
  });

  it("each stand in a compound of two wall pieces and one gate, all in line", () => {
    for (const b of buildings()) {
      const w = walls().filter((p) => p.compound === b.compound);
      const g = gates().filter((p) => p.compound === b.compound);
      expect(w).toHaveLength(2);
      expect(g).toHaveLength(1);
      const perpX = -Math.sin(b.heading);
      const perpZ = Math.cos(b.heading);
      const offsets = [...w, ...g].map((p) => (p.x - b.x) * perpX + (p.z - b.z) * perpZ);
      for (const o of offsets) expect(o).toBeCloseTo(offsets[0], 6);
      expect(Math.abs(offsets[0])).toBeGreaterThan(b.depth / 2);
      for (const p of [...w, ...g]) expect(p.heading).toBeCloseTo(b.heading, 9);
    }
  });

  it("never overlap each other, their walls, plants or any keep-out zone, even on the steepest bends", () => {
    const all = placements;
    for (let i = 0; i < all.length; i++) {
      const a = footprintOf(all[i]);
      for (const z of zones) expect(overlaps(a, z)).toBe(false);
      for (let j = i + 1; j < all.length; j++) expect(overlaps(a, footprintOf(all[j]))).toBe(false);
    }
    expect(buildings().some((b) => Math.abs(b.heading) >= 0.09)).toBe(true);
  });

  it("cluster as shops around the bus stops and as houses away from them", () => {
    const near = buildings().filter((b) => nearestStop(b.x) <= 60);
    const far = buildings().filter((b) => nearestStop(b.x) > 120);
    expect(near.length).toBeGreaterThan(10);
    expect(far.length).toBeGreaterThan(10);
    expect(near.filter((b) => b.kind === "shop").length / near.length).toBeGreaterThanOrEqual(0.5);
    expect(far.filter((b) => b.kind === "shop").length / far.length).toBeLessThanOrEqual(0.2);
  });

  it("thin out toward both ends of the route", () => {
    const per100 = (from: number, to: number) => buildings().filter((b) => b.x >= from && b.x < to).length / ((to - from) / 100);
    const mid = per100(500, 1200);
    expect(per100(FIRST - 30, FIRST + 120)).toBeLessThan(mid);
    expect(per100(LAST - 120, LAST + 30)).toBeLessThan(mid);
  });
});

describe("the village is balanced", () => {
  it("has more houses than shops, with shops kept for the stops", () => {
    const houses = buildings().filter((b) => b.kind === "house").length;
    expect(houses).toBeGreaterThanOrEqual(buildings().length - houses);
  });

  it("leaves room for trees and flowers between the compounds", () => {
    const species = (k: string) => placements.filter((p) => p.kind === k).length;
    expect(placements.filter(isFlowers).length).toBeGreaterThanOrEqual(40);
    expect(species("gulmohar")).toBeGreaterThanOrEqual(12);
    expect(species("mango")).toBeGreaterThanOrEqual(30);
    expect(placements.filter(isTree).length).toBeGreaterThanOrEqual(buildings().length * 1.4);
  });
});

describe("isGroundFree", () => {
  it("is false where a plant stands and true on open ground", () => {
    const t = placements.filter(isTree)[0];
    expect(layout.isGroundFree(t.x, t.z, 0.2)).toBe(false);
    expect(layout.isGroundFree(500, roadCenterZ(500) + 60, 1)).toBe(true);
  });

  it("is false at the centre of a house", () => {
    const b = buildings()[0];
    expect(layout.isGroundFree(b.x, b.z, 0.5)).toBe(false);
    expect(layout.isGroundFree(500, roadCenterZ(500), 1)).toBe(true);
  });
});
