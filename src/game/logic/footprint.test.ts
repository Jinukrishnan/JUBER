import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import { BAY_OFFSET, BAY_WIDTH } from "./bay";
import { keepOutZones, overlaps, type Shape } from "./footprint";
import { FOOTPATH_WIDTH, roadCenterZ, roadHalfWidthAt } from "./road";
import { polePositions, roadFeatures } from "./roadside";
import { JUNCTIONS } from "../world";
import { localToWorld } from "./junction";

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

describe("polePositions", () => {
  const poles = polePositions(ROUTE_V1);
  const first = ROUTE_V1[0].position;
  const last = ROUTE_V1[ROUTE_V1.length - 1].position;
  it("start 10 m past the depot, every 45 m, and stop at the last stop", () => {
    expect(poles[0]).toBe(first + 10);
    for (let i = 1; i < poles.length; i++) expect(poles[i] - poles[i - 1]).toBe(45);
    expect(Math.max(...poles)).toBeLessThanOrEqual(last);
  });
});

describe("keepOutZones", () => {
  const features = roadFeatures(ROUTE_V1);
  const zones = keepOutZones(ROUTE_V1, features);
  const covered = (x: number, z: number) => zones.some((s) => overlaps(s, circle(x, z, 0.1)));

  it("covers the carriageway, footpath and verge along the route", () => {
    for (const x of [0, 137, 500, 1111, 1700]) {
      const cz = roadCenterZ(x);
      const edge = roadHalfWidthAt(x) + FOOTPATH_WIDTH + 1.5;
      expect(covered(x, cz)).toBe(true);
      expect(covered(x, cz - edge)).toBe(true);
      expect(covered(x, cz + edge)).toBe(true);
    }
  });

  it("covers the widened turn-around areas past both ends", () => {
    const last = ROUTE_V1[ROUTE_V1.length - 1].position;
    for (const x of [-60, last + 60]) {
      expect(covered(x, roadCenterZ(x) + roadHalfWidthAt(x) - 0.5)).toBe(true);
      expect(covered(x, roadCenterZ(x) - roadHalfWidthAt(x) + 0.5)).toBe(true);
    }
  });

  it("covers every shelter on both kerbs", () => {
    const edge = BAY_OFFSET + BAY_WIDTH / 2 + 2.2;
    for (const s of ROUTE_V1) {
      const cz = roadCenterZ(s.position);
      expect(covered(s.position, cz - edge)).toBe(true);
      expect(covered(s.position, cz + edge)).toBe(true);
      expect(covered(s.position + 3.9, cz - edge + 0.9)).toBe(true); // the sign post beside it
    }
  });

  it("covers every sign pole and electric pole", () => {
    for (const s of features.signs) {
      const cz = roadCenterZ(s.x);
      const lat = roadHalfWidthAt(s.x) + 0.9;
      expect(covered(s.x, s.side === "left" ? cz - lat : cz + lat)).toBe(true);
    }
    for (const x of polePositions(ROUTE_V1)) {
      expect(covered(x, roadCenterZ(x) + roadHalfWidthAt(x) + FOOTPATH_WIDTH + 0.9)).toBe(true);
    }
  });

  it("leaves open ground well back from the road free", () => {
    expect(covered(500, roadCenterZ(500) + 30)).toBe(false);
    expect(covered(500, roadCenterZ(500) - 30)).toBe(false);
  });
});

describe("keepOutZones with junctions", () => {
  const features = roadFeatures(ROUTE_V1);
  const zones = keepOutZones(ROUTE_V1, features, JUNCTIONS);
  const covered = (x: number, z: number) => zones.some((s) => overlaps(s, circle(x, z, 0.1)));
  const j = JUNCTIONS.find((r) => r.arms === "both")!;
  const at = (u: number, v: number) => {
    const w = localToWorld(j, u, v);
    return [w.x, w.z] as const;
  };

  it("covers each arm, its corners and its turn-around, on both sides", () => {
    for (const side of [-1, 1]) {
      expect(covered(...at(0, side * 60))).toBe(true);
      expect(covered(...at(9, side * 60))).toBe(true);
      expect(covered(...at(10, side * 12))).toBe(true);
      expect(covered(...at(10, side * (j.armLength + 5)))).toBe(true);
    }
  });
  it("only covers the arms the junction has", () => {
    const left = JUNCTIONS.find((r) => r.arms === "left")!;
    const w = localToWorld(left, 0, 60);
    const wr = localToWorld(left, 0, -60);
    const zs = keepOutZones(ROUTE_V1, features, [left]);
    const hit = (p: { x: number; z: number }) => zs.some((s) => overlaps(s, circle(p.x, p.z, 0.1)));
    expect(hit(wr)).toBe(true);
    expect(hit(w)).toBe(false);
  });
  it("leaves open ground beside an arm free", () => {
    expect(covered(...at(40, 60))).toBe(false);
  });
  it("keeps poles out of junctions", () => {
    for (const x of polePositions(ROUTE_V1, JUNCTIONS)) {
      for (const r of JUNCTIONS) expect(Math.abs(x - r.x)).toBeGreaterThan(r.armHalfWidth + 6);
    }
  });
});
