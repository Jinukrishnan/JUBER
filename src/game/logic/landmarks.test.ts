import { describe, expect, it } from "vitest";
import { LANDMARKS } from "../data/landmarks-v1";
import { PLACES_V2 } from "../data/places-v2";
import { ACTIVE_PLACES, FEATURES, NETWORK } from "../world";
import { ShapeGrid, keepOutZones, overlaps, type Shape } from "./footprint";
import { landmarkFootprint, landmarkPlacements } from "./landmarks";
import { builtRoads, nearestOnRoad } from "./network";

const keepOut = keepOutZones(NETWORK, ACTIVE_PLACES, FEATURES);
const result = landmarkPlacements(NETWORK, ACTIVE_PLACES, keepOut, LANDMARKS);

describe("landmarks", () => {
  it("belong to places that exist", () => {
    for (const l of LANDMARKS) expect(PLACES_V2.some((p) => p.id === l.place), l.place).toBe(true);
  });

  it("all fit", () => {
    expect(result.missing).toEqual([]);
    expect(result.placements).toHaveLength(LANDMARKS.length);
  });

  it("do not overlap each other or any keep-out zone", () => {
    const grid = new ShapeGrid();
    keepOut.forEach((s) => grid.add(s));
    const shapes: Shape[] = result.placements.map(landmarkFootprint);
    shapes.forEach((s, i) => {
      expect(grid.hits(s), result.placements[i].place).toBe(false);
      shapes.slice(0, i).forEach((o, j) => expect(overlaps(s, o), `${result.placements[i].place} / ${result.placements[j].place}`).toBe(false));
    });
  });

  it("stand on the side of the road their place is on", () => {
    for (const p of result.placements) {
      const place = ACTIVE_PLACES.find((q) => q.id === p.place)!;
      const road = builtRoads(NETWORK).find((r) => r.road.id === place.road)!;
      const n = nearestOnRoad(road, p.x, p.z);
      expect(Math.sign(n.lateral), p.place).toBe(place.side);
    }
  });

  it("make the stadium the biggest", () => {
    const area = (p: { width: number; depth: number }) => p.width * p.depth;
    const stadium = result.placements.find((p) => p.landmark === "stadium")!;
    for (const p of result.placements) expect(area(p)).toBeLessThanOrEqual(area(stadium));
  });

  it("come out the same every time", () => {
    expect(landmarkPlacements(NETWORK, ACTIVE_PLACES, keepOut, LANDMARKS)).toEqual(result);
  });
});
