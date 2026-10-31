import { describe, expect, it } from "vitest";
import type { FlowerPlacement } from "./logic/layout";
import { bushParts, flowerParts, tuftParts } from "./plants";

const flowers = (species: FlowerPlacement["species"], side: 1 | -1 = 1, count = 9): FlowerPlacement => ({
  kind: "flowers", species, side, x: 200, z: 30, count, seed: 777,
});
const near = (it: { x: number; z: number }, x: number, z: number) => Math.hypot(it.x - x, it.z - z);

describe("sunflowers", () => {
  it("are one tall stem per head, each with a brown disc ringed by yellow petals", () => {
    const p = flowerParts(flowers("sunflower"));
    expect(p.stem).toHaveLength(9);
    expect(p.head.filter((h) => h.color.toLowerCase() === "#4a2d12")).toHaveLength(9);
    expect(p.head.filter((h) => h.color.toLowerCase().startsWith("#f") || h.color.toLowerCase().startsWith("#e")).length).toBeGreaterThanOrEqual(9);
    for (const s of p.stem) {
      expect(s.sy).toBeGreaterThanOrEqual(1.4);
      expect(s.sy).toBeLessThanOrEqual(2.4);
    }
  });

  it("turn their faces to the road, whichever side and direction it runs", () => {
    const p = flowerParts({ ...flowers("sunflower", 1), heading: Math.PI / 2 });
    for (const h of p.head) expect(Math.cos((h.ry ?? 0) + Math.PI / 2)).toBeCloseTo(-1, 9);
    for (const side of [1, -1] as const) {
      const p = flowerParts(flowers("sunflower", side));
      for (const h of p.head) expect(Math.cos(h.ry ?? 0)).toBeCloseTo(side === 1 ? -1 : 1, 9);
    }
  });
});

describe("hibiscus and marigold", () => {
  it("are bushes with one bloom per head in the right colours", () => {
    const hib = flowerParts(flowers("hibiscus", 1, 12));
    expect(hib.head).toHaveLength(12);
    for (const h of hib.head) expect(h.color.toLowerCase()).toMatch(/^#(d|e|f)/);
    expect(hib.bush).toHaveLength(4);
    const mar = flowerParts(flowers("marigold", 1, 7));
    expect(mar.head).toHaveLength(7);
    expect(mar.bush).toHaveLength(3);
    for (const h of mar.head) expect(h.color.toLowerCase()).toMatch(/^#f/);
  });
});

describe("clusters stay together and are repeatable", () => {
  it("keep every piece within 0.75 m of the cluster centre", () => {
    for (const sp of ["sunflower", "hibiscus", "marigold"] as const) {
      const p = flowerParts(flowers(sp));
      for (const it of [...p.stem, ...p.head, ...p.bush]) expect(near(it, 200, 30)).toBeLessThanOrEqual(0.75);
    }
  });
  it("are the same every time", () => {
    expect(flowerParts(flowers("hibiscus"))).toEqual(flowerParts(flowers("hibiscus")));
    expect(tuftParts(5, 10, 10)).toEqual(tuftParts(5, 10, 10));
    expect(bushParts(5, 10, 10)).toEqual(bushParts(5, 10, 10));
  });
});

describe("grass tufts and bushes", () => {
  it("tufts are crossed blades within 3 m of their spot", () => {
    const t = tuftParts(9, 50, 8);
    expect(t.length).toBeGreaterThanOrEqual(6);
    for (const it of t) expect(near(it, 50, 8)).toBeLessThanOrEqual(3);
    expect(new Set(t.map((it) => (it.ry ?? 0).toFixed(2))).size).toBeGreaterThanOrEqual(3);
  });

  it("bushes are a few overlapping spheres within 1.5 m", () => {
    const b = bushParts(3, 50, 8);
    expect(b.length).toBeGreaterThanOrEqual(3);
    expect(b.length).toBeLessThanOrEqual(4);
    for (const it of b) expect(near(it, 50, 8)).toBeLessThanOrEqual(1.5);
  });
});
