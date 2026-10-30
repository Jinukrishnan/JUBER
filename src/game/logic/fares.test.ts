import { describe, expect, it } from "vitest";
import { fareFor, makePassenger } from "./fares";

describe("fareFor", () => {
  it("charges Rs. 10 for the first stop and Rs. 5 per extra stop", () => {
    expect(fareFor(1)).toBe(10);
    expect(fareFor(2)).toBe(15);
    expect(fareFor(3)).toBe(20);
  });
  it("never goes below the minimum fare", () => {
    expect(fareFor(0)).toBe(10);
  });
});

describe("makePassenger", () => {
  it("derives the fare from stops travelled", () => {
    const p = makePassenger("p1", 1, 4, 30);
    expect(p).toEqual({
      id: "p1",
      origin: 1,
      destination: 4,
      fare: 20,
      patience: 30,
    });
  });
});
