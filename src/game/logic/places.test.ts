import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { BAY_OFFSET } from "./bay";
import { JUNCTION_BOX_HALF, drivable, groundY, nearest } from "./network";
import { customerSpot, placeSpot, placesAreValid, usablePlaces, type Place } from "./places";

const N = NETWORK_V1;

describe("the place list", () => {
  it("has about 14 places with unique ids and both names", () => {
    expect(PLACES.length).toBe(14);
    expect(new Set(PLACES.map((p) => p.id)).size).toBe(PLACES.length);
    for (const p of PLACES) {
      expect(p.name.length).toBeGreaterThan(2);
      expect(p.ml.length).toBeGreaterThan(1);
    }
  });

  it("keeps the old names and puts the depot on the ring", () => {
    const depot = PLACES.find((p) => p.id === "depot")!;
    expect(depot.name).toBe("Aanawadi Depot");
    expect(depot.road).toBe("ring");
    for (const id of ["panchayat", "church", "paddy", "masjid", "hospital", "temple", "school", "nellimala"]) {
      expect(PLACES.some((p) => p.id === id)).toBe(true);
    }
  });

  it("is valid on the default map", () => {
    expect(placesAreValid(N, PLACES)).toEqual([]);
    expect(usablePlaces(N, PLACES).length).toBe(PLACES.length);
  });

  it("spreads over the ring and both cross roads", () => {
    const roads = new Set(PLACES.map((p) => p.road));
    expect(roads).toEqual(new Set(["ring", "ns", "ew"]));
  });
});

describe("spots", () => {
  it("puts every vehicle spot on the road, on the place's kerb", () => {
    for (const p of PLACES) {
      const s = placeSpot(N, p);
      expect(drivable(N, s.x, s.z)).toBe(true);
      const near = nearest(N, s.x, s.z);
      expect(near.road).toBe(p.road);
      expect(near.side).toBe(p.side);
      expect(near.distance).toBeCloseTo(BAY_OFFSET, 4);
    }
  });

  it("faces the way traffic on that kerb travels (keep left)", () => {
    const left: Place = { id: "l", name: "L", ml: "L", road: "ew", s: 200, side: -1 };
    const right: Place = { ...left, id: "r", side: 1 };
    expect(placeSpot(N, left).heading).toBeCloseTo(0, 6); // east, left kerb is north
    expect(Math.abs(placeSpot(N, right).heading)).toBeCloseTo(Math.PI, 6);
    expect(placeSpot(N, left).z).toBeCloseTo(250 - BAY_OFFSET, 6);
    expect(placeSpot(N, right).z).toBeCloseTo(250 + BAY_OFFSET, 6);
  });

  it("puts customers on the footpath, never in the road, spaced out", () => {
    for (const p of PLACES) {
      const spots = [1, 2, 3].map((k) => customerSpot(N, p, k));
      for (const c of spots) {
        expect(drivable(N, c.x, c.z)).toBe(false);
        expect(groundY(N, c.x, c.z)).toBe(0.15);
        expect(nearest(N, c.x, c.z).side).toBe(p.side);
      }
      expect(Math.hypot(spots[1].x - spots[0].x, spots[1].z - spots[0].z)).toBeCloseTo(0.9, 4);
    }
  });

  it("keeps spots 30 m from a junction box and 40 m from each other", () => {
    const spots = PLACES.map((p) => placeSpot(N, p));
    for (const s of spots) {
      for (const j of N.junctions) {
        expect(Math.max(Math.abs(s.x - j.at[0]), Math.abs(s.z - j.at[1])) - JUNCTION_BOX_HALF).toBeGreaterThanOrEqual(30);
      }
    }
    for (let i = 0; i < spots.length; i++) {
      for (let k = i + 1; k < spots.length; k++) {
        expect(Math.hypot(spots[i].x - spots[k].x, spots[i].z - spots[k].z)).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

describe("placesAreValid", () => {
  const base: Place = { id: "x", name: "X", ml: "X", road: "ew", s: 200, side: -1 };

  it("reports a place beyond its road", () => {
    expect(placesAreValid(N, [{ ...base, s: 900 }]).join(" ")).toMatch(/"x".*beyond/);
  });

  it("reports a road that does not exist", () => {
    expect(placesAreValid(N, [{ ...base, road: "nope" }]).join(" ")).toMatch(/"x".*nope/);
  });

  it("reports a place too near a junction", () => {
    expect(placesAreValid(N, [{ ...base, s: 395 }]).join(" ")).toMatch(/junction/);
  });

  it("reports two places too near each other", () => {
    expect(placesAreValid(N, [base, { ...base, id: "y", s: 220 }]).join(" ")).toMatch(/"y".*"x"/);
  });

  it("usablePlaces leaves out the bad ones", () => {
    expect(usablePlaces(N, [base, { ...base, id: "bad", s: 900 }]).map((p) => p.id)).toEqual(["x"]);
  });
});
