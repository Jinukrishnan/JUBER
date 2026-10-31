import { beforeAll, describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { keepOutZones, overlaps } from "./footprint";
import { footprintOf, layoutScenery, type BuildingPlacement, type Placement, type TreePlacement } from "./layout";
import { drivable } from "./network";
import { placeSpot } from "./places";
import { roadFeatures } from "./roadside";
import { LANDMARKS } from "../data/landmarks-v1";
import { ZONES } from "../data/zones-v1";
import { FEATURES, NETWORK, ACTIVE_PLACES } from "../world";
import { zoneKindAt } from "./zones";

const N = NETWORK_V1;
const SEED = 20261030;
const features = roadFeatures(N, PLACES);
const zones = keepOutZones(N, PLACES, features);
let layout: ReturnType<typeof layoutScenery>;
let placements: Placement[];

beforeAll(() => {
  layout = layoutScenery(SEED, N, PLACES, features);
  placements = layout.placements;
});

const isTree = (p: Placement): p is TreePlacement => ["coconut", "mango", "gulmohar", "banana", "jackfruit"].includes(p.kind);
const isBuilding = (p: Placement): p is BuildingPlacement => p.kind === "house" || p.kind === "shop";

describe("layoutScenery", () => {
  it("is deterministic for a seed and differs between seeds", () => {
    expect(layoutScenery(SEED, N, PLACES, features).placements).toEqual(placements);
    expect(layoutScenery(SEED + 1, N, PLACES, features).placements).not.toEqual(placements);
  });

  it("fills the whole loop: trees, flowers, houses and shops", () => {
    expect(placements.filter(isTree).length).toBeGreaterThan(300);
    expect(placements.filter((p) => p.kind === "flowers").length).toBeGreaterThan(50);
    expect(placements.filter(isBuilding).length).toBeGreaterThan(40);
    expect(placements.some((p) => p.kind === "shop")).toBe(true);
    expect(placements.some((p) => p.kind === "house")).toBe(true);
  });

  it("builds whole compounds: each building has two walls and a gate", () => {
    for (const b of placements.filter(isBuilding)) {
      const mates = placements.filter((p) => "compound" in p && p.compound === b.compound);
      expect(mates.map((m) => m.kind).sort()).toEqual([b.kind, "gate", "wall", "wall"].sort());
    }
  });

  it("keeps every placement out of every keep-out zone", () => {
    for (const p of placements) {
      const f = footprintOf(p);
      expect(zones.some((z) => overlaps(f, z)), `${p.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe(false);
    }
  });

  it("never overlaps one placement with another, apart from a compound's own parts", () => {
    const shapes = placements.map((p) => ({ p, f: footprintOf(p) }));
    for (let i = 0; i < shapes.length; i++) {
      for (let k = i + 1; k < shapes.length; k++) {
        const a = shapes[i];
        const b = shapes[k];
        if ("compound" in a.p && "compound" in b.p && a.p.compound === b.p.compound) continue;
        if (Math.hypot(a.p.x - b.p.x, a.p.z - b.p.z) > 30) continue;
        expect(overlaps(a.f, b.f), `${a.p.kind} vs ${b.p.kind} near ${a.p.x.toFixed(0)},${a.p.z.toFixed(0)}`).toBe(false);
      }
    }
  });

  it("stands nothing on tarmac", () => {
    for (const p of placements) expect(drivable(N, p.x, p.z), `${p.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`).toBe(false);
  });

  it("gathers shops near the shelters and lets houses fill in between", () => {
    const shelters = PLACES.filter((p) => p.shelter).map((p) => placeSpot(N, p));
    const d = (p: Placement) => Math.min(...shelters.map((s) => Math.hypot(s.x - p.x, s.z - p.z)));
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const shops = placements.filter((p) => p.kind === "shop").map(d);
    const houses = placements.filter((p) => p.kind === "house").map(d);
    expect(avg(shops)).toBeLessThan(avg(houses));
  });

  it("offers grass spots all round the loop", () => {
    expect(layout.grass.length).toBeGreaterThan(1500);
  });
});

describe("isGroundFree", () => {
  it("is false where a plant stands, on the road and in the mouth of a side road", () => {
    const t = placements.filter(isTree)[0];
    expect(layout.isGroundFree(t.x, t.z, 0.2)).toBe(false);
    expect(layout.isGroundFree(200, 0, 1)).toBe(false);
    expect(layout.isGroundFree(395, 40, 0.6)).toBe(false); // on Station Road, just below the north T
  });

  it("is true on open ground well away from any road", () => {
    expect(layout.isGroundFree(200, 120, 1)).toBe(true);
  });
});

describe("layoutScenery by zone (the big world)", () => {
  const big = layoutScenery(SEED, NETWORK, ACTIVE_PLACES, FEATURES, { zones: ZONES, landmarks: LANDMARKS });

  it("builds the city: catalogue buildings, none in the village", () => {
    const city = big.placements.filter((p) => p.kind === "city");
    expect(city.length).toBeGreaterThan(100);
    for (const p of city) expect(p.x, `city building at ${p.x},${p.z}`).toBeGreaterThan(1000);
  });

  it("keeps houses and shops (with walls and gates) to the village", () => {
    for (const p of big.placements) {
      if (p.kind === "house" || p.kind === "shop" || p.kind === "wall" || p.kind === "gate") expect(p.x, p.kind).toBeLessThan(1000);
    }
  });

  it("puts nothing in the lake or the countryside", () => {
    for (const p of big.placements) expect(["lake", "hills"], `${p.kind} at ${p.x},${p.z}`).not.toContain(zoneKindAt(p.x, p.z));
  });

  it("puts nothing on the lake side of Dam Road", () => {
    for (const p of big.placements) if (p.z < -150 && p.x > 100 && p.x < 1300) throw new Error(`${p.kind} at ${p.x},${p.z}`);
  });

  it("includes every landmark", () => {
    for (const l of LANDMARKS) expect(big.placements.some((p) => p.kind === "landmark" && p.place === l.place), l.place).toBe(true);
  });

  it("is deterministic", () => {
    expect(layoutScenery(SEED, NETWORK, ACTIVE_PLACES, FEATURES, { zones: ZONES, landmarks: LANDMARKS }).placements).toEqual(big.placements);
  });
});
