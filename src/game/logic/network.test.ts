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

// ---- Task 3: queries, drivable area, validation ----
import type { Network } from "../data/network-v1";
import {
  FOOTPATH_WIDTH,
  JUNCTION_BOX_HALF,
  KERB_HEIGHT,
  VERGE_WIDTH,
  builtRoads,
  clampToDrivable,
  drivable,
  groundY,
  keepOutShapes,
  nearest,
  validateNetwork,
} from "./network";
import { overlaps } from "./footprint";

const N = NETWORK_V1;

describe("nearest", () => {
  it("finds the road and the side on a straight", () => {
    const a = nearest(N, 200, -3); // ring top edge, heading east: north of it is the left
    expect(a.road).toBe("ring");
    expect(a.s).toBeCloseTo(160, 4);
    expect(a.side).toBe(-1);
    expect(a.distance).toBeCloseTo(3, 6);
    const b = nearest(N, 200, 4);
    expect(b.side).toBe(1);
  });

  it("finds the road on the ns cross road, travelling south", () => {
    const a = nearest(N, 405, 100);
    expect(a.road).toBe("ns");
    expect(a.s).toBeCloseTo(100, 6);
    expect(a.side).toBe(-1); // heading south, +x is the driver's left
  });

  it("finds the distance along an arc", () => {
    const ring = builtRoads(N).find((r) => r.road.id === "ring")!;
    const arc = ring.arcs[0];
    const p = { x: arc.cx + 36 * Math.cos(arc.a0 + arc.sweep / 2), z: arc.cz + 36 * Math.sin(arc.a0 + arc.sweep / 2) };
    const a = nearest(N, p.x, p.z);
    expect(a.road).toBe("ring");
    expect(a.s).toBeCloseTo(arc.s0 + arc.len / 2, 4);
    expect(a.distance).toBeCloseTo(4, 6);
  });
});

describe("drivable", () => {
  it("is true along every centreline", () => {
    for (const r of builtRoads(N)) {
      for (let s = 0; s <= r.length; s += 5) {
        const p = pointAt(r, s);
        expect(drivable(N, p.x, p.z)).toBe(true);
      }
    }
  });

  it("is false just beyond the road edge and true just inside", () => {
    expect(drivable(N, 200, 6.1)).toBe(false);
    expect(drivable(N, 200, 5.9)).toBe(true);
    expect(drivable(N, 200, -6.1)).toBe(false);
  });

  it("includes the rounded corners of a four-way junction", () => {
    const h = JUNCTION_BOX_HALF - 0.01;
    for (const [dx, dz] of [[h, h], [-h, h], [h, -h], [-h, -h]]) expect(drivable(N, 400 + dx, 250 + dz)).toBe(true);
  });

  it("rounds only the corners of a T that have roads on both sides", () => {
    const h = JUNCTION_BOX_HALF - 0.01;
    // at the north T the stem leaves to the south: the two southern corners are paved, the northern ones are not
    expect(drivable(N, 400 + h, 0 + h)).toBe(true);
    expect(drivable(N, 400 - h, 0 + h)).toBe(true);
    expect(drivable(N, 400 + h, 0 - h)).toBe(false);
    expect(drivable(N, 400 - h, 0 - h)).toBe(false);
  });

  it("is false on the footpath, which is a raised kerb", () => {
    expect(drivable(N, 200, 6 + FOOTPATH_WIDTH / 2)).toBe(false);
    expect(groundY(N, 200, 6 + FOOTPATH_WIDTH / 2)).toBe(KERB_HEIGHT);
    expect(groundY(N, 200, 3)).toBe(0);
    expect(groundY(N, 200, 6 + FOOTPATH_WIDTH + 1)).toBe(0);
  });

  it("is false in the open ground inside and outside the ring", () => {
    expect(drivable(N, 200, 120)).toBe(false);
    expect(drivable(N, -100, -100)).toBe(false);
  });
});

describe("clampToDrivable", () => {
  it("leaves a paved point alone", () => {
    expect(clampToDrivable(N, 200, 1)).toEqual({ x: 200, z: 1, clamped: false });
  });

  it("brings a point back to the road edge", () => {
    const c = clampToDrivable(N, 200, 30);
    expect(c.clamped).toBe(true);
    expect(c.z).toBeCloseTo(6, 6);
    expect(c.x).toBeCloseTo(200, 6);
  });

  it("is idempotent and lands on pavement over a grid of 500 points", () => {
    let n = 0;
    for (let i = 0; i < 25; i++) {
      for (let j = 0; j < 20; j++) {
        const x = -60 + i * 37.5;
        const z = -60 + j * 31;
        const a = clampToDrivable(N, x, z);
        expect(drivable(N, a.x, a.z)).toBe(true);
        const b = clampToDrivable(N, a.x, a.z);
        expect(b.clamped).toBe(false);
        expect(b.x).toBeCloseTo(a.x, 9);
        expect(b.z).toBeCloseTo(a.z, 9);
        n++;
      }
    }
    expect(n).toBe(500);
  });

  it("handles corners and far outside the ring", () => {
    for (const [x, z] of [[-30, -30], [830, -30], [830, 530], [-30, 530], [400, -300], [2000, 2000]]) {
      const a = clampToDrivable(N, x, z);
      expect(drivable(N, a.x, a.z)).toBe(true);
    }
  });
});

describe("keepOutShapes", () => {
  const shapes = keepOutShapes(N);
  it("covers the road, footpath and verge but not the open ground", () => {
    const at = (x: number, z: number) => overlaps({ kind: "circle", x, z, r: 0.1 }, shapes[0]) || shapes.some((s) => overlaps({ kind: "circle", x, z, r: 0.1 }, s));
    expect(at(200, 0)).toBe(true);
    expect(at(200, 6 + FOOTPATH_WIDTH + VERGE_WIDTH - 0.2)).toBe(true);
    expect(at(200, 6 + FOOTPATH_WIDTH + VERGE_WIDTH + 2)).toBe(false);
  });
  it("covers a corner arc and a junction box", () => {
    const at = (x: number, z: number) => shapes.some((s) => overlaps({ kind: "circle", x, z, r: 0.1 }, s));
    const ring = builtRoads(N).find((r) => r.road.id === "ring")!;
    const arc = ring.arcs[1];
    const p = pointAt(ring, arc.s0 + arc.len / 2);
    expect(at(p.x, p.z)).toBe(true);
    expect(at(400 + 10, 250 + 10)).toBe(true);
  });
});

describe("validateNetwork", () => {
  it("accepts the default map", () => {
    const v = validateNetwork(N, []);
    expect(v.problems).toEqual([]);
    expect(v.valid.junctions.length).toBe(5);
  });

  it("flags a road that does not meet its junction", () => {
    const bad: Network = { ...N, junctions: [{ ...N.junctions[4], at: [400, 100] }] };
    const v = validateNetwork(bad, []);
    expect(v.problems.join(" ")).toMatch(/centre/);
    expect(v.valid.junctions).toEqual([]);
  });

  it("flags a corner radius over half the shorter neighbour", () => {
    const bad: Network = { ...N, roads: [{ ...N.roads[0], cornerRadius: 300 }, ...N.roads.slice(1)] };
    const v = validateNetwork(bad, []);
    expect(v.problems.join(" ")).toMatch(/ring.*radius/);
    expect(v.valid.roads.find((r) => r.id === "ring")).toBeUndefined();
    expect(v.valid.junctions.every((j) => !j.roads.includes("ring"))).toBe(true);
  });

  it("flags two junctions closer than 150 m on a road", () => {
    const extra = { id: "extra", at: [400, 120] as [number, number], roads: ["ns"], signal: false as const, allowed: {} };
    const v = validateNetwork({ ...N, junctions: [...N.junctions, extra] }, []);
    expect(v.problems.join(" ")).toMatch(/extra.*150/);
    expect(v.valid.junctions.find((j) => j.id === "extra")).toBeUndefined();
  });

  it("flags a place beyond its road and a rule for an approach that is not there", () => {
    const v = validateNetwork(N, [{ id: "far", road: "ns", s: 900 }, { id: "ghost", road: "nope", s: 10 }]);
    expect(v.problems.join(" ")).toMatch(/far/);
    expect(v.problems.join(" ")).toMatch(/ghost/);
    const rule: Network = { ...N, junctions: [{ ...N.junctions[0], allowed: { "ew:1": ["left"] } }, ...N.junctions.slice(1)] };
    expect(validateNetwork(rule, []).problems.join(" ")).toMatch(/north.*ew:1/);
  });
});
