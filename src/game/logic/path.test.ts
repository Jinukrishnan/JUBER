import { describe, expect, it } from "vitest";
import { pathLength, pointAlong } from "./path";

// an L: 10 m along +x, then 5 m along +z
const L = [
  { x: 0, z: 0 },
  { x: 10, z: 0 },
  { x: 10, z: 5 },
];

describe("pathLength", () => {
  it("adds up the segments", () => {
    expect(pathLength(L)).toBe(15);
    expect(pathLength([{ x: 1, z: 1 }])).toBe(0);
  });
});

describe("pointAlong", () => {
  it("starts at the first point", () => {
    expect(pointAlong(L, 0)).toMatchObject({ x: 0, z: 0, done: false });
  });

  it("walks along a segment", () => {
    const p = pointAlong(L, 4);
    expect(p.x).toBeCloseTo(4);
    expect(p.z).toBeCloseTo(0);
  });

  it("turns the corner", () => {
    const p = pointAlong(L, 12);
    expect(p.x).toBeCloseTo(10);
    expect(p.z).toBeCloseTo(2);
  });

  it("faces the way it is walking (rotation.y: 0 faces +z, pi/2 faces +x)", () => {
    expect(pointAlong(L, 4).heading).toBeCloseTo(Math.PI / 2);
    expect(pointAlong(L, 12).heading).toBeCloseTo(0);
  });

  it("stops at the end and says it is done", () => {
    const p = pointAlong(L, 99);
    expect(p).toMatchObject({ x: 10, z: 5, done: true });
  });

  it("copes with a path of one point or zero-length steps", () => {
    expect(pointAlong([{ x: 3, z: 4 }], 5)).toMatchObject({ x: 3, z: 4, done: true });
    const p = pointAlong([{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 2 }], 1);
    expect(p.z).toBeCloseTo(1);
  });
});
