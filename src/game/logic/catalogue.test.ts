import { describe, expect, it } from "vitest";
import { CITY_CENTRE, CITY_TYPES } from "../data/buildings-v1";
import { heightFactor, pickCityBuilding } from "./catalogue";

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const picks = (x: number, z: number, n = 400, seed = 5) => {
  const r = rng(seed);
  return Array.from({ length: n }, () => pickCityBuilding(r, x, z));
};
const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;

describe("heightFactor", () => {
  it("is 1 at the centre and 0.15 from 900 m out", () => {
    expect(heightFactor(CITY_CENTRE.x, CITY_CENTRE.z)).toBeCloseTo(1, 6);
    expect(heightFactor(CITY_CENTRE.x + 900, CITY_CENTRE.z)).toBeCloseTo(0.15, 6);
    expect(heightFactor(CITY_CENTRE.x + 2000, CITY_CENTRE.z)).toBeCloseTo(0.15, 6);
  });
});

describe("pickCityBuilding", () => {
  it("is deterministic for a seed", () => {
    expect(picks(1700, 450, 20, 9)).toEqual(picks(1700, 450, 20, 9));
  });

  it("stays inside its type's ranges and palette", () => {
    for (const p of picks(1700, 450).concat(picks(2300, 900))) {
      const t = CITY_TYPES.find((c) => c.id === p.type)!;
      expect(p.width).toBeGreaterThanOrEqual(t.width[0]);
      expect(p.width).toBeLessThanOrEqual(t.width[1]);
      expect(p.depth).toBeGreaterThanOrEqual(t.depth[0]);
      expect(p.depth).toBeLessThanOrEqual(t.depth[1]);
      expect(p.floors).toBeGreaterThanOrEqual(1);
      expect(p.floors).toBeLessThanOrEqual(t.floors[1]);
      expect(t.palette).toContain(p.color);
    }
  });

  it("builds taller at the centre than at the edge", () => {
    const centre = mean(picks(1700, 450).map((p) => p.floors));
    const edge = mean(picks(2300, 900).map((p) => p.floors));
    expect(centre).toBeGreaterThan(edge * 2);
  });

  it("builds homes and apartments, not towers, at the edge", () => {
    const edge = picks(2300, 900);
    const low = edge.filter((p) => p.type === "home" || p.type === "apartment").length;
    expect(low).toBeGreaterThan(edge.filter((p) => p.type === "tower").length);
  });

  it("caps a tower at the edge at 60 percent of its range top", () => {
    const top = CITY_TYPES.find((t) => t.id === "tower")!.floors[1];
    for (const p of picks(2600, 450, 800)) if (p.type === "tower") expect(p.floors).toBeLessThanOrEqual(Math.ceil(top * 0.6) + 1);
  });
});
