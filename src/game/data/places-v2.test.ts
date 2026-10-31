import { describe, expect, it } from "vitest";
import { placesAreValid, placeSpot } from "../logic/places";
import { NETWORK_V2 } from "./network-v2";
import { PLACES_V2 } from "./places-v2";

describe("the places of the big map", () => {
  it("are all valid on the network (30 m from junctions, 40 m apart)", () => {
    expect(placesAreValid(NETWORK_V2, PLACES_V2)).toEqual([]);
  });

  it("has unique ids and at least 38 places", () => {
    expect(new Set(PLACES_V2.map((p) => p.id)).size).toBe(PLACES_V2.length);
    expect(PLACES_V2.length).toBeGreaterThanOrEqual(38);
  });

  it("keeps the depot on the ring and moves Station Road places for its longer road", () => {
    const depot = PLACES_V2.find((p) => p.id === "depot")!;
    expect(depot.road).toBe("ring");
    expect(depot.s).toBe(100);
    expect(PLACES_V2.find((p) => p.id === "hospital")!.s).toBe(270);
    expect(PLACES_V2.find((p) => p.id === "temple")!.s).toBe(530);
  });

  it("puts every place on a road that exists", () => {
    const roads = new Set(NETWORK_V2.roads.map((r) => r.id));
    for (const p of PLACES_V2) expect(roads.has(p.road), p.id).toBe(true);
  });

  it("has a city side and a dam side", () => {
    const eastern = PLACES_V2.filter((p) => placeSpot(NETWORK_V2, p).x > 1000);
    expect(eastern.length).toBeGreaterThanOrEqual(20);
    expect(PLACES_V2.some((p) => placeSpot(NETWORK_V2, p).z < -100)).toBe(true);
  });
});
