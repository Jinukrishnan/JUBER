import { describe, expect, it } from "vitest";
import { CAPACITY } from "../constants";
import { firstFreeSeat, SEATS } from "./seats";

describe("SEATS", () => {
  it("has a place for every passenger the bus can carry", () => {
    expect(SEATS).toHaveLength(CAPACITY);
  });

  it("has no two people in the same spot, all inside the bus", () => {
    const keys = new Set(SEATS.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`));
    expect(keys.size).toBe(SEATS.length);
    for (const s of SEATS) {
      expect(Math.abs(s.x)).toBeLessThan(4.6);
      expect(Math.abs(s.z)).toBeLessThan(1.2);
    }
  });

  it("fills from the front door backwards, sitting before standing", () => {
    const door = 3.55;
    const seated = SEATS.filter((s) => !s.standing);
    const standing = SEATS.filter((s) => s.standing);
    expect(seated.length).toBeGreaterThan(standing.length);
    expect(SEATS.slice(0, seated.length).every((s) => !s.standing)).toBe(true);
    const dist = seated.map((s) => Math.abs(s.x - door));
    expect(dist).toEqual([...dist].sort((a, b) => a - b));
  });
});

describe("firstFreeSeat", () => {
  it("starts with the seat nearest the door", () => {
    expect(firstFreeSeat([])).toBe(0);
  });

  it("skips seats that are taken and reuses ones that were freed", () => {
    expect(firstFreeSeat([0, 1, 2])).toBe(3);
    expect(firstFreeSeat([0, 2, 3])).toBe(1);
  });

  it("is null once every place is taken", () => {
    expect(firstFreeSeat(SEATS.map((_, i) => i))).toBeNull();
  });
});
