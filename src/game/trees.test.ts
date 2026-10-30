import { describe, expect, it } from "vitest";
import type { TreeKind, TreePlacement } from "./logic/layout";
import { treeParts } from "./trees";

const KINDS: TreeKind[] = ["coconut", "mango", "gulmohar", "banana", "jackfruit"];
const make = (kind: TreeKind, seed = 12345): TreePlacement => ({ kind, side: 1, x: 100, z: 20, scale: 1, lean: 0.1, seed });
const count = (p: ReturnType<typeof treeParts>) => p.trunk.length + p.crown.length + p.frond.length + p.blossom.length;

describe("treeParts", () => {
  it("is the same every time for the same tree", () => {
    for (const k of KINDS) expect(treeParts(make(k), "full")).toEqual(treeParts(make(k), "full"));
  });

  it("gives every species a trunk and some foliage", () => {
    for (const k of KINDS) {
      const p = treeParts(make(k), "full");
      expect(p.trunk.length).toBeGreaterThan(0);
      expect(p.crown.length + p.frond.length).toBeGreaterThan(0);
    }
  });

  it("keeps every piece finite and within 12 m of where the tree stands", () => {
    for (const k of KINDS) {
      const p = treeParts(make(k), "full");
      for (const it of [...p.trunk, ...p.crown, ...p.frond, ...p.blossom]) {
        for (const v of [it.x, it.y, it.z, it.sx, it.sy, it.sz]) expect(Number.isFinite(v)).toBe(true);
        expect(Math.hypot(it.x - 100, it.z - 20)).toBeLessThanOrEqual(12);
        expect(it.y).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("draws fewer pieces from far away", () => {
    for (const k of KINDS) expect(count(treeParts(make(k), "lite"))).toBeLessThan(count(treeParts(make(k), "full")));
  });

  it("builds the coconut palm with a curved trunk, drooping fronds and coconuts", () => {
    const p = treeParts(make("coconut"), "full");
    expect(p.trunk.length).toBeGreaterThanOrEqual(3);
    expect(p.frond.length).toBeGreaterThanOrEqual(10);
    expect(p.frond.every((f) => (f.rz ?? 0) < 0)).toBe(true); // tilted downward
    // later trunk segments lean further than the first: the trunk curves
    const lean = p.trunk.map((t) => Math.abs(t.rz ?? 0));
    expect(lean[lean.length - 1]).toBeGreaterThan(lean[0]);
    expect(p.crown.some((c) => c.color.toLowerCase().startsWith("#5") || c.color.toLowerCase().startsWith("#6"))).toBe(true);
  });

  it("builds the mango with a thick trunk and a dense rounded crown in two greens", () => {
    const p = treeParts(make("mango"), "full");
    expect(p.crown.length).toBeGreaterThanOrEqual(5);
    expect(new Set(p.crown.map((c) => c.color)).size).toBeGreaterThanOrEqual(2);
    expect(p.trunk[0].sx).toBeGreaterThan(0.6);
  });

  it("covers the gulmohar's wide crown in red-orange blossom", () => {
    const p = treeParts(make("gulmohar"), "full");
    expect(p.blossom.length).toBeGreaterThanOrEqual(12);
    for (const b of p.blossom) expect(b.color.toLowerCase()).toMatch(/^#(e|f)/);
    const width = Math.max(...p.crown.map((c) => c.sx * 2)); // sx is the radius
    expect(width).toBeGreaterThan(5);
  });

  it("gives the banana a stout pale stem and long drooping leaves", () => {
    const p = treeParts(make("banana"), "full");
    expect(p.frond.length).toBeGreaterThanOrEqual(6);
    expect(p.frond.every((f) => f.sx > 1.5)).toBe(true);
  });
});
