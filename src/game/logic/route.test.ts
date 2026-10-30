import { describe, expect, it } from "vitest";
import { ROUTE_V1 } from "../data/route-v1";
import {
  flipDirection,
  nextStopIndex,
  stopsAhead,
  stopsBetween,
  zoneAt,
} from "./route";

describe("ROUTE_V1", () => {
  it("has 7 stops with strictly ascending positions starting at 0", () => {
    expect(ROUTE_V1).toHaveLength(7);
    expect(ROUTE_V1[0].position).toBe(0);
    for (let i = 1; i < ROUTE_V1.length; i++) {
      expect(ROUTE_V1[i].position).toBeGreaterThan(ROUTE_V1[i - 1].position);
    }
  });
});

describe("nextStopIndex", () => {
  it("finds the next stop ahead going forward", () => {
    expect(nextStopIndex(ROUTE_V1, 100, "forward")).toBe(1);
  });
  it("finds the next stop ahead going backward", () => {
    expect(nextStopIndex(ROUTE_V1, 100, "backward")).toBe(0);
  });
  it("returns null past the terminus", () => {
    expect(nextStopIndex(ROUTE_V1, 3400, "forward")).toBeNull();
    expect(nextStopIndex(ROUTE_V1, -10, "backward")).toBeNull();
  });
});

describe("flipDirection", () => {
  it("swaps direction", () => {
    expect(flipDirection("forward")).toBe("backward");
    expect(flipDirection("backward")).toBe("forward");
  });
});

describe("stopsAhead", () => {
  it("is true only when the target lies ahead in the direction", () => {
    expect(stopsAhead(2, 4, "forward")).toBe(true);
    expect(stopsAhead(2, 4, "backward")).toBe(false);
    expect(stopsAhead(4, 2, "backward")).toBe(true);
    expect(stopsAhead(3, 3, "forward")).toBe(false);
  });
});

describe("stopsBetween", () => {
  it("is the absolute index distance", () => {
    expect(stopsBetween(5, 2)).toBe(3);
    expect(stopsBetween(2, 5)).toBe(3);
  });
});

describe("zoneAt", () => {
  it("returns the stop whose zone contains the position", () => {
    expect(zoneAt(ROUTE_V1, 1010, 25)).toBe(2);
  });
  it("returns null between stops", () => {
    expect(zoneAt(ROUTE_V1, 700, 25)).toBeNull();
  });
});
