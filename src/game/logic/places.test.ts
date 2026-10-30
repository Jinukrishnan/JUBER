import { describe, expect, it } from "vitest";
import { PLACES } from "../data/places-v1";
import { ROUTE_V1 } from "../data/route-v1";
import { JUNCTIONS } from "../world";
import { drivable, onSideRoad } from "./junction";
import { placeSpot, placesAreValid } from "./places";
import { roadAngle, roadCenterZ } from "./road";

describe("PLACES", () => {
  it("has the seven main-road stops and at least three on side roads", () => {
    expect(PLACES.filter((p) => p.at.kind === "main")).toHaveLength(ROUTE_V1.length);
    expect(PLACES.filter((p) => p.at.kind === "arm").length).toBeGreaterThanOrEqual(3);
  });
  it("gives every place an English and a Malayalam name", () => {
    for (const p of PLACES) {
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.ml).toMatch(/[ഀ-ൿ]/);
    }
  });
  it("has unique ids", () => {
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
  });
  it("is valid against the junctions in the world", () => {
    expect(placesAreValid(PLACES, JUNCTIONS)).toEqual([]);
  });
});

describe("placeSpot", () => {
  it("puts every spot on drivable road", () => {
    for (const p of PLACES) {
      const s = placeSpot(p, JUNCTIONS);
      expect(drivable(JUNCTIONS, s.x, s.z)).toBe(true);
    }
  });
  it("puts side-road places on their arm", () => {
    for (const p of PLACES.filter((q) => q.at.kind === "arm")) {
      const s = placeSpot(p, JUNCTIONS);
      expect(onSideRoad(JUNCTIONS, s.x, s.z)).toBe(true);
    }
  });
  it("keeps spots at least 40 m apart", () => {
    const spots = PLACES.map((p) => placeSpot(p, JUNCTIONS));
    for (let i = 0; i < spots.length; i++) {
      for (let j = i + 1; j < spots.length; j++) {
        expect(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)).toBeGreaterThan(40);
      }
    }
  });
  it("puts a left-side main place on the kerb forward traffic keeps to, facing forward", () => {
    const p = PLACES.find((q) => q.at.kind === "main" && q.at.side === "left")!;
    const x = (p.at as { x: number }).x;
    const s = placeSpot(p, JUNCTIONS);
    expect(s.z).toBeLessThan(roadCenterZ(x));
    expect(s.heading).toBeCloseTo(roadAngle(x));
  });
  it("puts a right-side main place on the other kerb, facing back", () => {
    const p = PLACES.find((q) => q.at.kind === "main" && q.at.side === "right")!;
    const x = (p.at as { x: number }).x;
    const s = placeSpot(p, JUNCTIONS);
    expect(s.z).toBeGreaterThan(roadCenterZ(x));
    expect(Math.cos(s.heading - roadAngle(x))).toBeLessThan(-0.99);
  });
});

describe("placesAreValid", () => {
  it("reports a place on a junction that does not exist", () => {
    const bad = [{ id: "x", name: "Nowhere", ml: "എവിടെയോ", at: { kind: "arm" as const, junctionId: "j9", side: 1 as const, distance: 50 } }];
    expect(placesAreValid(bad, JUNCTIONS)[0]).toMatch(/junction/i);
  });
  it("reports a place on an arm side the junction does not have", () => {
    const left = JUNCTIONS.find((j) => j.arms === "left")!;
    const bad = [{ id: "x", name: "Nowhere", ml: "എവിടെയോ", at: { kind: "arm" as const, junctionId: left.id, side: 1 as const, distance: 50 } }];
    expect(placesAreValid(bad, JUNCTIONS)[0]).toMatch(/side/i);
  });
  it("reports a place beyond the end of its arm", () => {
    const j = JUNCTIONS[0];
    const bad = [{ id: "x", name: "Nowhere", ml: "എവിടെയോ", at: { kind: "arm" as const, junctionId: j.id, side: -1 as const, distance: j.armLength } }];
    expect(placesAreValid(bad, JUNCTIONS)[0]).toMatch(/arm/i);
  });
});
