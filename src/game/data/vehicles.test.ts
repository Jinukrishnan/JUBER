import { describe, expect, it } from "vitest";
import { VEHICLES, VEHICLE_KINDS, isVehicleKind } from "./vehicles";

describe("VEHICLES", () => {
  it("carries 1 passenger on the bike, 2 in the auto and 3 in the car", () => {
    expect(VEHICLE_KINDS).toEqual(["bike", "auto", "car"]);
    expect(VEHICLE_KINDS.map((k) => VEHICLES[k].capacity)).toEqual([1, 2, 3]);
  });
  it("names them as Indian riders know them", () => {
    expect(VEHICLES.bike.name).toBe("Yamaha R15");
    expect(VEHICLES.auto.name).toBe("Auto-rickshaw");
    expect(VEHICLES.car.name).toBe("Maruti Swift Dzire");
  });
  it("has a top speed of 22, 14 and 18 m/s", () => {
    expect(VEHICLE_KINDS.map((k) => VEHICLES[k].maxSpeed)).toEqual([22, 14, 18]);
  });
  it("sets the rent below the goal so a day can be profitable", () => {
    for (const k of VEHICLE_KINDS) expect(VEHICLES[k].rent).toBeLessThan(VEHICLES[k].goal);
  });
  it("charges more per 100 m the bigger the vehicle", () => {
    expect(VEHICLES.bike.farePer100m).toBeLessThan(VEHICLES.auto.farePer100m);
    expect(VEHICLES.auto.farePer100m).toBeLessThan(VEHICLES.car.farePer100m);
  });
  it("gives every vehicle its own kind", () => {
    for (const k of VEHICLE_KINDS) expect(VEHICLES[k].kind).toBe(k);
  });
});

describe("isVehicleKind", () => {
  it("accepts the three kinds and nothing else", () => {
    expect(isVehicleKind("bike")).toBe(true);
    expect(isVehicleKind("car")).toBe(true);
    expect(isVehicleKind("bus")).toBe(false);
    expect(isVehicleKind(undefined)).toBe(false);
    expect(isVehicleKind(3)).toBe(false);
  });
});

describe("rider seats", () => {
  it("has one seat for every passenger the vehicle holds", () => {
    for (const k of VEHICLE_KINDS) expect(VEHICLES[k].riderSeats).toHaveLength(VEHICLES[k].capacity);
  });
  it("keeps every seat inside the vehicle's body", () => {
    for (const k of VEHICLE_KINDS) {
      const v = VEHICLES[k];
      for (const [x, y, z] of v.riderSeats) {
        expect(Math.abs(x)).toBeLessThanOrEqual(v.length / 2);
        expect(Math.abs(z)).toBeLessThanOrEqual(v.width / 2);
        expect(y).toBeGreaterThan(0.4);
      }
    }
  });
  it("seats nobody twice in the same place", () => {
    for (const k of VEHICLE_KINDS) {
      const keys = VEHICLES[k].riderSeats.map((s) => s.join(","));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
