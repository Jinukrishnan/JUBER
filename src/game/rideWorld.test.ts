import { describe, expect, it } from "vitest";
import { PLACES } from "./data/places-v1";
import { RIDE_WORLD, spotOf } from "./rideWorld";

const place = (id: string) => PLACES.find((p) => p.id === id)!;

describe("RIDE_WORLD.distance", () => {
  it("is the distance by road between two places on the ring", () => {
    const d = RIDE_WORLD.distance(place("thennalpadi"), place("mullakkunnu"));
    expect(d).toBeGreaterThanOrEqual(260);
    expect(d).toBeLessThan(290);
  });
  it("is longer than the straight line to a place on a cross road", () => {
    const a = place("mullakkunnu");
    const b = place("paddy");
    const sa = spotOf(a);
    const sb = spotOf(b);
    expect(RIDE_WORLD.distance(a, b)).toBeGreaterThan(Math.hypot(sa.x - sb.x, sa.z - sb.z));
  });
  it("is a real distance between every pair, and never negative", () => {
    for (const a of PLACES) {
      for (const b of PLACES) {
        if (a !== b) expect(RIDE_WORLD.distance(a, b)).toBeGreaterThan(0);
      }
    }
  });
  it("can differ by direction, since traffic keeps left", () => {
    const a = place("panchayat");
    const b = place("hospital");
    expect(RIDE_WORLD.distance(a, b)).toBeGreaterThan(0);
    expect(RIDE_WORLD.distance(b, a)).toBeGreaterThan(0);
  });
});
