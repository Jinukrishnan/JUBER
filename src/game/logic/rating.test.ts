import { describe, expect, it } from "vitest";
import { computeRating } from "./rating";

const clean = { harshEvents: 0, expiredPickups: 0, accidents: 0, violations: 0 };

describe("computeRating", () => {
  it("gives 5 for a perfect day", () => {
    expect(computeRating(clean)).toBe(5);
  });
  it("loses a full star for each accident", () => {
    expect(computeRating({ ...clean, accidents: 1 })).toBe(4);
    expect(computeRating({ ...clean, accidents: 3 })).toBe(2);
  });
  it("loses half a star for each red light", () => {
    expect(computeRating({ ...clean, violations: 1 })).toBe(4.5);
    expect(computeRating({ ...clean, violations: 3 })).toBe(3.5);
  });
  it("loses a quarter star for each customer who gave up waiting, at most one star", () => {
    expect(computeRating({ ...clean, expiredPickups: 2 })).toBe(4.5);
    expect(computeRating({ ...clean, expiredPickups: 20 })).toBe(4);
  });
  it("barely notices a scrape against the kerb", () => {
    expect(computeRating({ ...clean, harshEvents: 2 })).toBe(5);
    expect(computeRating({ ...clean, harshEvents: 5 })).toBe(4.5);
  });
  it("never goes below 1", () => {
    expect(computeRating({ ...clean, accidents: 100 })).toBe(1);
  });
});
