import { describe, expect, it } from "vitest";
import { PLACES } from "./data/places-v1";
import { RIDE_WORLD, spotOf } from "./rideWorld";

const place = (id: string) => PLACES.find((p) => p.id === id)!;

describe("RIDE_WORLD.distance", () => {
  it("is the distance by road between two main-road places", () => {
    const d = RIDE_WORLD.distance(place("thennalpadi"), place("karimbanam"));
    expect(d).toBeGreaterThanOrEqual(600);
    expect(d).toBeLessThan(630);
  });
  it("is longer than the straight line to a place down a side road", () => {
    const a = place("mullakkunnu");
    const b = place("paddy");
    const sa = spotOf(a);
    const sb = spotOf(b);
    expect(RIDE_WORLD.distance(a, b)).toBeGreaterThan(Math.hypot(sa.x - sb.x, sa.z - sb.z));
  });
  it("is the same both ways", () => {
    const a = place("panchayat");
    const b = place("hospital");
    expect(RIDE_WORLD.distance(a, b)).toBeCloseTo(RIDE_WORLD.distance(b, a), 0);
  });
});
