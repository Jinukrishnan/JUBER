import { describe, expect, it } from "vitest";
import { computeRating } from "./rating";

const clean = { missedStops: 0, expiredPassengers: 0, harshEvents: 0, carried: 10 };

describe("computeRating", () => {
  it("gives 5 for a perfect run", () => {
    expect(computeRating(clean)).toBe(5);
  });
  it("loses 0.5 per missed stop", () => {
    expect(computeRating({ ...clean, missedStops: 4 })).toBe(3);
  });
  it("loses 0.25 per expired passenger, rounded to the nearest half", () => {
    expect(computeRating({ ...clean, expiredPassengers: 2 })).toBe(4.5);
  });
  it("never goes below 1", () => {
    expect(computeRating({ ...clean, missedStops: 100 })).toBe(1);
  });
});
