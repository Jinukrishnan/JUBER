import { describe, expect, it } from "vitest";
import { MIN_HIT_SPEED, busHitsPerson } from "./collision";

// bus centred at the origin facing +x, 10 m long and 2.6 m wide
const bus = { x: 0, z: 0, heading: 0, speed: 8 };

describe("busHitsPerson", () => {
  it("hits someone standing in the bus's path", () => {
    expect(busHitsPerson(bus, { x: 5.2, z: 0 })).not.toBeNull();
  });

  it("hits someone alongside the bus body", () => {
    expect(busHitsPerson(bus, { x: 1, z: 1.5 })).not.toBeNull();
    expect(busHitsPerson(bus, { x: -2, z: -1.5 })).not.toBeNull();
  });

  it("misses someone clear of the bus", () => {
    expect(busHitsPerson(bus, { x: 8, z: 0 })).toBeNull();
    expect(busHitsPerson(bus, { x: 0, z: 3 })).toBeNull();
    expect(busHitsPerson(bus, { x: -7, z: 0 })).toBeNull();
  });

  it("does not count a bus that is parked or creeping", () => {
    expect(busHitsPerson({ ...bus, speed: 0 }, { x: 5.2, z: 0 })).toBeNull();
    expect(busHitsPerson({ ...bus, speed: MIN_HIT_SPEED - 0.1 }, { x: 5.2, z: 0 })).toBeNull();
  });

  it("counts a bus that is reversing into someone", () => {
    expect(busHitsPerson({ ...bus, speed: -3 }, { x: -5.2, z: 0 })).not.toBeNull();
  });

  it("follows the bus's heading", () => {
    const turned = { ...bus, heading: Math.PI / 2 }; // now facing +z
    expect(busHitsPerson(turned, { x: 0, z: 5.2 })).not.toBeNull();
    expect(busHitsPerson(turned, { x: 5.2, z: 0 })).toBeNull();
  });

  it("reports which side the person was on, so they can be thrown clear", () => {
    expect(busHitsPerson(bus, { x: 0, z: 1.4 })?.side).toBe(1);
    expect(busHitsPerson(bus, { x: 0, z: -1.4 })?.side).toBe(-1);
  });
});
