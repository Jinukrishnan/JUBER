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
