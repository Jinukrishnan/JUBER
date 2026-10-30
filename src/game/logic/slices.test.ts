import { describe, expect, it } from "vitest";
import { DRAW_RANGE, NEAR_RANGE, SLICE_LENGTH, isNear, sliceOf, slicesFor, visibleSlices } from "./slices";

describe("sliceOf", () => {
  it("cuts the route into 100 m slices, including behind the depot", () => {
    expect(SLICE_LENGTH).toBe(100);
    expect(sliceOf(0)).toBe(0);
    expect(sliceOf(99.9)).toBe(0);
    expect(sliceOf(100)).toBe(1);
    expect(sliceOf(-0.1)).toBe(-1);
  });
});

describe("visibleSlices", () => {
  it("covers everything within the draw range of the bus", () => {
    expect(DRAW_RANGE).toBe(260);
    expect(visibleSlices(0)).toEqual([-3, -2, -1, 0, 1, 2]);
  });

  it("is ascending and gap-free wherever the bus is", () => {
    for (const x of [-80, 0, 333, 1000, 1700, 1800]) {
      const v = visibleSlices(x);
      for (let i = 1; i < v.length; i++) expect(v[i] - v[i - 1]).toBe(1);
      expect(v).toContain(sliceOf(x));
    }
  });
});

describe("isNear", () => {
  it("is true for the bus's own slice and false far away", () => {
    expect(NEAR_RANGE).toBe(120);
    expect(isNear(sliceOf(1000), 1000)).toBe(true);
    expect(isNear(sliceOf(1400), 1000)).toBe(false);
  });
});

describe("slicesFor", () => {
  it("puts each item in the slice it stands in", () => {
    const m = slicesFor([{ x: 50 }, { x: 150 }, { x: 160 }], () => 0);
    expect(m.get(0)).toEqual([0]);
    expect(m.get(1)).toEqual([1, 2]);
  });

  it("lists an item near a boundary in both slices so it never pops out early", () => {
    const m = slicesFor([{ x: 98 }], () => 3);
    expect(m.get(0)).toEqual([0]);
    expect(m.get(1)).toEqual([0]);
  });
});
