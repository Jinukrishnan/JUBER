import { describe, expect, it } from "vitest";
import { JUNCTIONS_V1, type Junction } from "../data/junctions-v1";
import { ROUTE_V1 } from "../data/route-v1";
import { clampToDrivable, drivable } from "./junction";
import { armSigns, localToWorld, resolveJunction, stopLineDistance, validateJunctions, worldToLocal } from "./junction";
import { ROAD_HALF_WIDTH, roadCenterZ } from "./road";
import { roadFeatures } from "./roadside";

const features = roadFeatures(ROUTE_V1);
const j = (o: Partial<Junction> = {}): Junction => ({ id: "t", x: 400, arms: "both", ...o });

describe("resolveJunction", () => {
  it("fills in the defaults", () => {
    const r = resolveJunction(j());
    expect(r.armLength).toBe(200);
    expect(r.armHalfWidth).toBe(5);
    expect(r.plan).not.toBeNull();
  });
  it("has no plan when the signal is false", () => {
    expect(resolveJunction(j({ signal: false })).plan).toBeNull();
  });
});

describe("armSigns", () => {
  it("maps left to -z and right to +z", () => {
    expect(armSigns("left")).toEqual([-1]);
    expect(armSigns("right")).toEqual([1]);
    expect(armSigns("both")).toEqual([-1, 1]);
  });
});

describe("local frame", () => {
  it("round-trips world and local", () => {
    const r = resolveJunction(j());
    const w = localToWorld(r, 3, -7);
    const l = worldToLocal(r, w.x, w.z);
    expect(l.u).toBeCloseTo(3);
    expect(l.v).toBeCloseTo(-7);
  });
  it("puts the origin on the road centre at the junction", () => {
    const r = resolveJunction(j());
    const w = localToWorld(r, 0, 0);
    expect(w.x).toBeCloseTo(400);
    expect(w.z).toBeCloseTo(roadCenterZ(400));
  });
  it("has stop lines clear of the arm edge", () => {
    expect(stopLineDistance(resolveJunction(j()))).toBeGreaterThan(5 + 3.5);
  });
});

describe("validateJunctions", () => {
  it("accepts the default list", () => {
    expect(validateJunctions(JUNCTIONS_V1, ROUTE_V1, features).problems).toEqual([]);
  });
  it("flags a junction too close to a bus stop", () => {
    const { problems, valid } = validateJunctions([j({ x: 300 })], ROUTE_V1, features);
    expect(problems[0]).toMatch(/bus stop/i);
    expect(valid).toHaveLength(0);
  });
  it("flags a junction near a zebra crossing", () => {
    const { problems } = validateJunctions([j({ x: ROUTE_V1[3].position + 24 + 30 })], ROUTE_V1, features);
    expect(problems.join()).toMatch(/zebra|bus stop/i);
  });
  it("flags a junction outside the route", () => {
    expect(validateJunctions([j({ x: 20 })], ROUTE_V1, features).problems[0]).toMatch(/route/i);
    expect(validateJunctions([j({ x: 1690 })], ROUTE_V1, features).problems[0]).toMatch(/route/i);
  });
  it("flags two junctions too close together", () => {
    const { problems, valid } = validateJunctions([j({ id: "a", x: 400 }), j({ id: "b", x: 450 })], ROUTE_V1, features);
    expect(problems.join()).toMatch(/another junction/i);
    expect(valid.map((x) => x.id)).toEqual(["a"]);
  });
  it("flags a silly arm length and bad timings", () => {
    expect(validateJunctions([j({ armLength: 10 })], ROUTE_V1, features).problems[0]).toMatch(/arm/i);
    expect(validateJunctions([j({ signal: { yellow: 0 } })], ROUTE_V1, features).problems[0]).toMatch(/timing|signal/i);
  });
  it("names the junction in every message", () => {
    expect(validateJunctions([j({ id: "mine", x: 300 })], ROUTE_V1, features).problems[0]).toContain("mine");
  });
});

describe("drivable", () => {
  const r = resolveJunction(j());
  const at = (u: number, v: number) => {
    const w = localToWorld(r, u, v);
    return [w.x, w.z] as const;
  };
  const list = [r];
  it("is true on the main carriageway", () => {
    expect(drivable(list, 100, roadCenterZ(100) + 4)).toBe(true);
  });
  it("is false on the footpath away from a junction", () => {
    expect(drivable(list, 100, roadCenterZ(100) + ROAD_HALF_WIDTH + 2)).toBe(false);
  });
  it("is true inside an arm and false beside it", () => {
    expect(drivable(list, ...at(0, 60))).toBe(true);
    expect(drivable(list, ...at(0, -60))).toBe(true);
    expect(drivable(list, ...at(9, 60))).toBe(false);
  });
  it("only has the arms that were asked for", () => {
    const right = [resolveJunction(j({ arms: "right" }))];
    expect(drivable(right, ...at(0, 60))).toBe(true);
    expect(drivable(right, ...at(0, -60))).toBe(false);
  });
  it("is true in the turn-around and false past it", () => {
    expect(drivable(list, ...at(10, 200))).toBe(true);
    expect(drivable(list, ...at(0, 200 + 14.5))).toBe(false);
  });
});

describe("clampToDrivable", () => {
  const r = resolveJunction(j());
  const list = [r];
  it("leaves a paved point alone", () => {
    const z = roadCenterZ(100) + 2;
    expect(clampToDrivable(list, 100, z)).toEqual({ x: 100, z, clamped: false });
  });
  it("pulls a point off the footpath back onto the road", () => {
    const c = clampToDrivable(list, 100, roadCenterZ(100) + 9);
    expect(c.clamped).toBe(true);
    expect(drivable(list, c.x, c.z)).toBe(true);
    expect(c.z).toBeCloseTo(roadCenterZ(100) + ROAD_HALF_WIDTH);
  });
  it("pulls a point beside an arm onto the arm", () => {
    const w = localToWorld(r, 8, 60);
    const c = clampToDrivable(list, w.x, w.z);
    expect(drivable(list, c.x, c.z)).toBe(true);
    const l = worldToLocal(r, c.x, c.z);
    expect(l.u).toBeCloseTo(5, 1);
    expect(l.v).toBeCloseTo(60, 1);
  });
  it("is idempotent", () => {
    for (const [x, z] of [[100, 30], [401, 12], [405, -40], [400, 230], [388, 140]]) {
      const a = clampToDrivable(list, x, z);
      const b = clampToDrivable(list, a.x, a.z);
      expect(b.clamped).toBe(false);
      expect(b.x).toBeCloseTo(a.x, 6);
    }
  });
});
