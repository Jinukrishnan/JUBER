import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { BAY_OFFSET, BAY_WIDTH } from "./bay";
import { ShapeGrid, keepOutZones, overlaps, type Shape } from "./footprint";
import { FOOTPATH_WIDTH, VERGE_WIDTH, headingAt, builtRoads, pointAt } from "./network";
import { roadFeatures } from "./roadside";

const circle = (x: number, z: number, r: number): Shape => ({ kind: "circle", x, z, r });
const rect = (x: number, z: number, w: number, d: number, heading = 0): Shape => ({ kind: "rect", x, z, w, d, heading });

describe("overlaps", () => {
  it("circles overlap when closer than their radii", () => {
    expect(overlaps(circle(0, 0, 0.6), circle(1, 0, 0.6))).toBe(true);
    expect(overlaps(circle(0, 0, 0.6), circle(2, 0, 0.6))).toBe(false);
  });

  it("a circle overlaps a rectangle it touches, including at a corner", () => {
    const r = rect(0, 0, 4, 2);
    expect(overlaps(circle(2.5, 0, 0.6), r)).toBe(true);
    expect(overlaps(circle(3, 0, 0.5), r)).toBe(false);
    expect(overlaps(circle(2.3, 1.3, 0.5), r)).toBe(true);
    expect(overlaps(circle(2.6, 1.6, 0.5), r)).toBe(false);
  });

  it("is symmetric", () => {
    const r = rect(0, 0, 4, 2);
    const c = circle(2.5, 0, 0.6);
    expect(overlaps(r, c)).toBe(overlaps(c, r));
  });

  it("rectangles overlap or miss according to their rotation", () => {
    const a = rect(0, 0, 4, 1);
    expect(overlaps(a, rect(0, 1.2, 4, 1))).toBe(false);
    expect(overlaps(a, rect(0, 1.2, 4, 1, Math.PI / 4))).toBe(true);
    expect(overlaps(a, rect(6, 0, 4, 1))).toBe(false);
  });
});

describe("ShapeGrid", () => {
  it("finds a neighbour and ignores a far shape, in both directions", () => {
    const g = new ShapeGrid();
    g.add(circle(100, 100, 1));
    expect(g.hits(circle(100.5, 100, 1))).toBe(true);
    expect(g.hits(circle(100, 130, 1))).toBe(false);
    expect(g.hits(circle(130, 100, 1))).toBe(false);
  });
});

describe("keepOutZones", () => {
  const N = NETWORK_V1;
  const zones = keepOutZones(N, PLACES, roadFeatures(N, PLACES));
  const covered = (x: number, z: number) => zones.some((s) => overlaps(circle(x, z, 0.1), s));

  it("covers the road, footpath and verge on every road but not the open ground", () => {
    expect(covered(200, 0)).toBe(true);
    expect(covered(200, 6 + FOOTPATH_WIDTH + VERGE_WIDTH - 0.2)).toBe(true);
    expect(covered(200, 6 + FOOTPATH_WIDTH + VERGE_WIDTH + 2.5)).toBe(false);
    expect(covered(400, 120)).toBe(true); // Station Road
  });

  it("covers every shelter on its place's kerb", () => {
    const edge = BAY_OFFSET + BAY_WIDTH / 2 + 2.2;
    for (const p of PLACES.filter((x) => x.shelter)) {
      const r = builtRoads(N).find((b) => b.road.id === p.road)!;
      const c = pointAt(r, p.s + 0.3);
      const h = headingAt(r, p.s);
      expect(covered(c.x - Math.sin(h) * p.side * edge, c.z + Math.cos(h) * p.side * edge)).toBe(true);
    }
  });

  it("covers every sign and pole", () => {
    const f = roadFeatures(N, PLACES);
    for (const s of [...f.signs, ...f.poles]) expect(covered(s.x, s.z)).toBe(true);
  });
});
