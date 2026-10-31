import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { buildRoad, headingAt, pointAt, roadLength } from "./network";

const road = (id: string) => buildRoad(NETWORK_V1.roads.find((r) => r.id === id)!);
const ring = road("ring");

describe("road geometry", () => {
  it("measures the ring, 800 by 500 with 40 m rounded corners", () => {
    expect(Math.abs(roadLength(ring) - 2531.3)).toBeLessThan(1);
  });

  it("measures the cross roads", () => {
    expect(roadLength(road("ns"))).toBeCloseTo(500, 6);
    expect(roadLength(road("ew"))).toBeCloseTo(800, 6);
  });

  it("closes the ring: the end is the start", () => {
    const a = pointAt(ring, 0);
    const b = pointAt(ring, roadLength(ring));
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
  });

  it("wraps distances on a closed road", () => {
    const a = pointAt(ring, 100);
    const b = pointAt(ring, 100 + roadLength(ring));
    const c = pointAt(ring, 100 - roadLength(ring));
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(c.z).toBeCloseTo(a.z, 6);
  });

  it("clamps distances on an open road", () => {
    const ns = road("ns");
    expect(pointAt(ns, -50)).toEqual({ x: 400, z: 0 });
    expect(pointAt(ns, 900).z).toBeCloseTo(500, 6);
  });

  it("starts the ring on the top edge, heading east", () => {
    const start = pointAt(ring, 0);
    expect(start.x).toBeCloseTo(40, 6);
    expect(start.z).toBeCloseTo(0, 6);
    expect(headingAt(ring, 0)).toBeCloseTo(0, 6);
  });

  it("follows the straights: the ring's four sides head east, south, west, north", () => {
    expect(headingAt(ring, 400)).toBeCloseTo(0, 6); // top edge
    const [top, right, bottom, left] = [0, 1, 2, 3].map((i) => {
      const s0 = ring.pieces.filter((p) => p.kind === "seg")[i].s0;
      return headingAt(ring, s0 + 1);
    });
    expect(top).toBeCloseTo(0, 6);
    expect(right).toBeCloseTo(Math.PI / 2, 6);
    expect(Math.abs(Math.abs(bottom) - Math.PI)).toBeLessThan(1e-6);
    expect(left).toBeCloseTo(-Math.PI / 2, 6);
  });

  it("turns 90 degrees smoothly over each corner arc", () => {
    for (const arc of ring.arcs) {
      const h0 = headingAt(ring, arc.s0 + 1e-6);
      const h1 = headingAt(ring, arc.s0 + arc.len - 1e-6);
      let d = h1 - h0;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      expect(d).toBeCloseTo(Math.PI / 2, 4);
      const mid = headingAt(ring, arc.s0 + arc.len / 2);
      let m = mid - h0;
      m = Math.atan2(Math.sin(m), Math.cos(m));
      expect(m).toBeCloseTo(Math.PI / 4, 4);
    }
  });

  it("keeps arc points 40 m from the arc centre", () => {
    for (const arc of ring.arcs) {
      for (const k of [0, 0.25, 0.5, 0.75, 1]) {
        const p = pointAt(ring, arc.s0 + arc.len * k);
        expect(Math.hypot(p.x - arc.cx, p.z - arc.cz)).toBeCloseTo(40, 6);
      }
    }
  });

  it("is continuous across every join", () => {
    for (let s = 0; s < roadLength(ring); s += 7) {
      const a = pointAt(ring, s);
      const b = pointAt(ring, s + 0.5);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(0.51);
    }
  });
});
