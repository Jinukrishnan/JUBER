import { beforeAll, describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { keepOutZones, overlaps } from "./footprint";
import {
  footprintOf,
  layoutScenery,
  type FlowerPlacement,
  type Placement,
  type TreePlacement,
} from "./layout";
import { FOOTPATH_WIDTH, VERGE_WIDTH, roadCenterZ, roadHalfWidthAt } from "./road";
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

describe("isGroundFree", () => {
  it("is false where a plant stands and true on open ground", () => {
    const t = placements.filter(isTree)[0];
    expect(layout.isGroundFree(t.x, t.z, 0.2)).toBe(false);
    expect(layout.isGroundFree(500, roadCenterZ(500) + 60, 1)).toBe(true);
  });
});
