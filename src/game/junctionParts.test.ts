import { describe, expect, it } from "vitest";
import { armFootpath, junctionParts } from "./junctionParts";
import { TURN_AROUND_RADIUS, armStopDistance, resolveJunction, stopLineDistance } from "./logic/junction";

const both = resolveJunction({ id: "b", x: 400, arms: "both" });
const right = resolveJunction({ id: "r", x: 400, arms: "right" });

describe("junctionParts", () => {
  it("puts stop lines on the main road both ways and on each arm", () => {
    expect(junctionParts(both).stopLines).toHaveLength(2 + 2);
    expect(junctionParts(right).stopLines).toHaveLength(2 + 1);
  });
  it("puts the main stop lines at the stop distance, one each side", () => {
    const xs = junctionParts(both).stopLines.filter((s) => s.sx === 0.4).map((s) => s.x).sort((a, b) => a - b);
    expect(xs).toEqual([-stopLineDistance(both), stopLineDistance(both)]);
  });
  it("puts arm stop lines at the arm stop distance", () => {
    const zs = junctionParts(right).stopLines.filter((s) => s.sz === 0.4).map((s) => s.z);
    expect(zs).toEqual([armStopDistance()]);
  });
  it("paints a crossing on every road into the junction", () => {
    expect(junctionParts(both).zebra.length).toBeGreaterThan(junctionParts(right).zebra.length);
  });
  it("keeps the arm paint on the side the arm is on", () => {
    expect(junctionParts(right).dashes.every((d) => d.z > 0)).toBe(true);
    expect(junctionParts(right).kerbs.every((k) => k.z > 0)).toBe(true);
  });
  it("starts the arm footpath beyond the main footpath", () => {
    const f = armFootpath(right, 1, 1);
    expect(f.z - f.len / 2).toBeCloseTo(6 + 3.6);
    expect(f.z + f.len / 2).toBeCloseTo(right.armLength - TURN_AROUND_RADIUS);
  });
});
