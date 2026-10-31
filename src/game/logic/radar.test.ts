import { describe, expect, it } from "vitest";
import { toRadar, RADAR_RANGES } from "./radar";

const view = { x: 100, z: 0, heading: 0 }; // facing +x

describe("toRadar", () => {
  it("puts things ahead above the centre", () => {
    const p = toRadar(view, { x: 200, z: 0 }, 400, 100);
    expect(p.px).toBeCloseTo(0);
    expect(p.py).toBeCloseTo(-25);
    expect(p.inside).toBe(true);
  });
  it("puts things on the right of the bus on the right of the radar", () => {
    const p = toRadar(view, { x: 100, z: 100 }, 400, 100);
    expect(p.px).toBeCloseTo(25);
    expect(p.py).toBeCloseTo(0);
  });
  it("turns with the bus so ahead is always up", () => {
    const turned = { x: 0, z: 0, heading: Math.PI / 2 }; // facing +z
    const p = toRadar(turned, { x: 0, z: 100 }, 400, 100);
    expect(p.px).toBeCloseTo(0);
    expect(p.py).toBeCloseTo(-25);
  });
  it("holds things beyond the range on the rim in the same direction", () => {
    const p = toRadar(view, { x: 1100, z: 0 }, 400, 100);
    expect(p.inside).toBe(false);
    expect(Math.hypot(p.px, p.py)).toBeCloseTo(100);
    expect(p.py).toBeLessThan(0);
  });
  it("offers a few zoom levels, widest last", () => {
    expect([...RADAR_RANGES].sort((a, b) => a - b)).toEqual([...RADAR_RANGES]);
    expect(RADAR_RANGES.length).toBeGreaterThanOrEqual(3);
  });
});

import { toRadarRaw } from "./radar";
describe("toRadarRaw", () => {
  it("does not clamp to the rim", () => {
    const p = toRadarRaw(view, { x: 1100, z: 0 }, 0.25);
    expect(p.py).toBeCloseTo(-250);
  });
});

import { NETWORK_V1 } from "../data/network-v1";
import { roadPolylines } from "./network";
import { roadsToRadar } from "./radar";

describe("roadPolylines", () => {
  const lines = roadPolylines(NETWORK_V1);
  it("has a polyline for every road, the ring closed", () => {
    expect(lines.map((l) => l.road).sort()).toEqual(["ew", "ns", "ring"]);
    const ring = lines.find((l) => l.road === "ring")!;
    expect(ring.pts[0].x).toBeCloseTo(ring.pts[ring.pts.length - 1].x, 6);
    expect(ring.pts[0].z).toBeCloseTo(ring.pts[ring.pts.length - 1].z, 6);
    expect(ring.pts.length).toBeGreaterThan(150);
  });
  it("starts and ends the cross roads on the ring", () => {
    const ns = lines.find((l) => l.road === "ns")!;
    expect(ns.pts[0]).toEqual({ x: 400, z: 0 });
    expect(ns.pts[ns.pts.length - 1].z).toBeCloseTo(500, 6);
  });
});

describe("roadsToRadar", () => {
  const lines = roadPolylines(NETWORK_V1);
  it("turns with the vehicle: a road ahead is drawn above the centre", () => {
    const out = roadsToRadar({ x: 200, z: 0, heading: 0 }, lines, 400, 100);
    const ring = out.find((l) => l.road === "ring")!;
    const ahead = ring.pts.filter((p) => Math.abs(p.px) < 1 && p.py < -20);
    expect(ahead.length).toBeGreaterThan(0);
  });
  it("leaves out a road that is wholly beyond the range", () => {
    const out = roadsToRadar({ x: 9000, z: 9000, heading: 0 }, lines, 150, 100);
    expect(out).toEqual([]);
  });
  it("keeps the ring in view at the widest zoom, closed", () => {
    const out = roadsToRadar({ x: 400, z: 250, heading: 0 }, lines, 1000, 100);
    expect(out.length).toBe(3);
    const ring = out.find((l) => l.road === "ring")!;
    expect(ring.pts[0].px).toBeCloseTo(ring.pts[ring.pts.length - 1].px, 6);
  });
});
