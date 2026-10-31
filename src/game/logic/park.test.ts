import { describe, expect, it } from "vitest";
import { ZONES } from "../data/zones-v1";
import { buildScenery } from "../world";
import { footprintOf, TREE_RADIUS } from "./layout";
import { overlaps, type Shape } from "./footprint";
import { layoutPark } from "./park";

const zone = ZONES.find((z) => z.id === "park")!;
const park = layoutPark(zone, 7);
const rect = (r: { x: number; z: number; w: number; d: number }): Shape => ({ kind: "rect", x: r.x, z: r.z, w: r.w, d: r.d, heading: 0 });
const crown = (t: { kind: "mango" | "gulmohar" | "coconut"; x: number; z: number; scale: number }): Shape => ({ kind: "circle", x: t.x, z: t.z, r: TREE_RADIUS[t.kind] * t.scale });

describe("layoutPark", () => {
  it("is the zone inset by 14 m, clear of the streets", () => {
    expect(park.lawn.x - park.lawn.w / 2).toBeCloseTo(zone.x0 + 14, 6);
    expect(park.lawn.x + park.lawn.w / 2).toBeCloseTo(zone.x1 - 14, 6);
    expect(park.lawn.z - park.lawn.d / 2).toBeCloseTo(zone.z0 + 14, 6);
    expect(park.lawn.z + park.lawn.d / 2).toBeCloseTo(zone.z1 - 14, 6);
  });

  it("keeps every part inside the lawn", () => {
    const inLawn = (s: Shape) => {
      const [hw, hd] = s.kind === "circle" ? [s.r, s.r] : [s.w / 2, s.d / 2];
      return s.x - hw >= park.lawn.x - park.lawn.w / 2 - 1e-6 && s.x + hw <= park.lawn.x + park.lawn.w / 2 + 1e-6 && s.z - hd >= park.lawn.z - park.lawn.d / 2 - 1e-6 && s.z + hd <= park.lawn.z + park.lawn.d / 2 + 1e-6;
    };
    for (const p of park.paths) expect(inLawn(rect(p))).toBe(true);
    expect(inLawn({ kind: "circle", ...park.fountain })).toBe(true);
    expect(inLawn(rect(park.playground))).toBe(true);
    for (const t of park.trees) expect(inLawn(crown(t))).toBe(true);
  });

  it("crosses two paths at the fountain", () => {
    expect(park.paths).toHaveLength(2);
    expect(park.fountain.x).toBeCloseTo(park.lawn.x, 6);
    expect(park.fountain.z).toBeCloseTo(park.lawn.z, 6);
    for (const p of park.paths) expect(overlaps(rect(p), { kind: "circle", ...park.fountain })).toBe(true);
  });

  it("keeps trees off the paths, the fountain and the playground", () => {
    for (const t of park.trees) {
      const c = crown(t);
      for (const p of park.paths) expect(overlaps(c, rect(p)), `tree ${t.x},${t.z} on a path`).toBe(false);
      expect(overlaps(c, { kind: "circle", ...park.fountain })).toBe(false);
      expect(overlaps(c, rect(park.playground))).toBe(false);
    }
  });

  it("has 70 to 110 trees", () => {
    expect(park.trees.length).toBeGreaterThanOrEqual(70);
    expect(park.trees.length).toBeLessThanOrEqual(110);
  });

  it("puts the playground south-west of the fountain, clear of the paths", () => {
    expect(park.playground.x).toBeLessThan(park.fountain.x);
    expect(park.playground.z).toBeGreaterThan(park.fountain.z);
    for (const p of park.paths) expect(overlaps(rect(park.playground), rect(p))).toBe(false);
  });

  it("puts benches beside the paths, 12 m or more apart", () => {
    expect(park.benches.length).toBeGreaterThanOrEqual(10);
    for (const [i, b] of park.benches.entries()) {
      const near = park.paths.some((p) => {
        const dx = Math.max(0, Math.abs(b.x - p.x) - p.w / 2);
        const dz = Math.max(0, Math.abs(b.z - p.z) - p.d / 2);
        return Math.hypot(dx, dz) <= 4;
      });
      expect(near, `bench ${i}`).toBe(true);
      for (const o of park.benches.slice(0, i)) expect(Math.hypot(b.x - o.x, b.z - o.z)).toBeGreaterThanOrEqual(12);
    }
  });

  it("is deterministic", () => {
    expect(layoutPark(zone, 7)).toEqual(park);
    expect(layoutPark(zone, 8).trees).not.toEqual(park.trees);
  });

  it("leaves no scenery building or tree inside the lawn", () => {
    const lawn = rect(park.lawn);
    const offenders = buildScenery()
      .placements.filter((p) => overlaps(footprintOf(p), lawn))
      .map((p) => `${p.kind} at ${p.x.toFixed(0)},${p.z.toFixed(0)}`);
    expect(offenders.slice(0, 5)).toEqual([]);
  });
});
