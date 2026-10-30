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
  it("barely notices a few expired passengers", () => {
    expect(computeRating({ ...clean, expiredPassengers: 2 })).toBe(5);
  });
  it("caps the expired-passenger penalty at half a star", () => {
    expect(computeRating({ ...clean, expiredPassengers: 500 })).toBe(4.5);
  });
  it("never goes below 1", () => {
    expect(computeRating({ ...clean, missedStops: 100 })).toBe(1);
  });
});
