import { describe, expect, it } from "vitest";
import {
  MAX_FORWARD_SPEED,
  MAX_REVERSE_SPEED,
  stepVehicle,
  type Inputs,
  type VehicleState,
} from "./vehicle";

const still: VehicleState = { x: 0, z: 0, heading: 0, speed: 0, steerAngle: 0 };
const none: Inputs = { throttle: 0, steer: 0, handbrake: false };

function run(s: VehicleState, i: Inputs, seconds: number, half = 6) {
  let state = s;
  let hit = false;
  for (let t = 0; t < seconds; t += 1 / 60) {
    const r = stepVehicle(state, i, 1 / 60, half);
    state = r.state;
    hit = hit || r.hitEdge;
  }
  return { state, hit };
}

describe("stepVehicle", () => {
  it("stays put with no input", () => {
    const { state } = run(still, none, 2);
    expect(state.speed).toBe(0);
    expect(state.x).toBe(0);
  });

  it("accelerates forward up to the cap", () => {
    const { state } = run(still, { ...none, throttle: 1 }, 10);
    expect(state.speed).toBeGreaterThan(5);
    expect(state.speed).toBeLessThanOrEqual(MAX_FORWARD_SPEED);
    expect(state.x).toBeGreaterThan(0);
  });

  it("reverses slower than it drives forward", () => {
    const { state } = run(still, { ...none, throttle: -1 }, 10);
    expect(state.speed).toBeLessThan(0);
    expect(Math.abs(state.speed)).toBeLessThanOrEqual(MAX_REVERSE_SPEED);
    expect(MAX_REVERSE_SPEED).toBeLessThan(MAX_FORWARD_SPEED);
  });

  it("does not turn while stationary", () => {
    const { state } = run(still, { ...none, steer: 1 }, 2);
    expect(state.heading).toBe(0);
  });

  it("steers right (positive heading) while moving", () => {
    const moving = { ...still, speed: 10 };
    const { state } = run(moving, { ...none, steer: 1 }, 1);
    expect(state.heading).toBeGreaterThan(0);
  });

  it("brakes to a stop with the handbrake and never reverses from it", () => {
    const moving = { ...still, speed: 12 };
    const { state } = run(moving, { ...none, handbrake: true }, 3);
    expect(state.speed).toBe(0);
  });

  it("coasts to a stop without input", () => {
    const moving = { ...still, speed: 8 };
    const { state } = run(moving, none, 10);
    expect(state.speed).toBe(0);
  });

  it("clamps to the road edge, flags the hit and scrubs speed", () => {
    const off: VehicleState = { x: 0, z: 5.9, heading: Math.PI / 2, speed: 10, steerAngle: 0 };
    const { state, hit } = run(off, none, 1, 6);
    expect(hit).toBe(true);
    expect(Math.abs(state.z)).toBeLessThanOrEqual(6);
    expect(state.speed).toBeLessThan(10);
  });

  it("measures the edge against the road centre when given one", () => {
    const r = stepVehicle({ x: 0, z: 20, heading: 0, speed: 0, steerAngle: 0 }, none, 1 / 60, 6, 20);
    expect(r.hitEdge).toBe(false);
    expect(r.state.z).toBe(20);
  });
});

describe("steering feel", () => {
  it("ramps the steering in gradually instead of snapping to full lock", () => {
    const { state } = run({ ...still, speed: 5 }, { ...none, steer: 1 }, 0.1);
    expect(state.steerAngle).toBeGreaterThan(0);
    expect(state.steerAngle).toBeLessThan(0.2);
    expect(state.heading).toBeLessThan(0.03);
  });

  it("cannot whip the bus round at cruising speed", () => {
    const { state } = run({ ...still, speed: 14 }, { ...none, steer: 1, throttle: 0.4 }, 3, 400);
    // 3 seconds of full lock at ~14 m/s turns well under half a radian
    expect(state.heading).toBeGreaterThan(0.05);
    expect(state.heading).toBeLessThan(0.7);
  });

  it("turns tighter at walking pace than at speed", () => {
    const slow = run({ ...still, speed: 3 }, { ...none, steer: 1, throttle: 0.2 }, 2, 400).state.heading;
    const fast = run({ ...still, speed: 14 }, { ...none, steer: 1, throttle: 0.4 }, 2, 400).state.heading;
    expect(slow).toBeGreaterThan(fast);
  });

  it("straightens the wheels again when steering is released", () => {
    const turned = run({ ...still, speed: 6 }, { ...none, steer: 1 }, 1, 400).state;
    const { state } = run(turned, none, 3, 400);
    expect(Math.abs(state.steerAngle)).toBeLessThan(0.01);
  });

  it("reverses the turn direction when backing up", () => {
    const { state } = run({ ...still, speed: -3 }, { ...none, steer: 1, throttle: -0.2 }, 1.5, 400);
    expect(state.heading).toBeLessThan(0);
  });
});


describe("stepVehicle with a bounds function", () => {
  const start = { x: 0, z: 0, heading: 0, speed: 5, steerAngle: 0 };
  it("lets the bounds replace the road edge", () => {
    const r = stepVehicle({ ...start, z: 7 }, { throttle: 0, steer: 0, handbrake: false }, 0.1, 6, 0, (x, z) => ({ x, z, clamped: false }));
    expect(r.hitEdge).toBe(false);
    expect(r.state.z).toBeCloseTo(7);
  });
  it("moves the vehicle to the point the bounds give and scrubs speed", () => {
    const r = stepVehicle(start, { throttle: 0, steer: 0, handbrake: false }, 0.1, 6, 0, (x) => ({ x, z: 3, clamped: true }));
    expect(r.hitEdge).toBe(true);
    expect(r.state.z).toBe(3);
    expect(r.state.speed).toBeLessThan(5);
  });
});

import { VEHICLES, VEHICLE_KINDS } from "../data/vehicles";

describe("stepVehicle with a vehicle spec", () => {
  const drive = (spec: (typeof VEHICLES)["bike"], seconds: number, steer = 0, start = still) => {
    let s = start;
    for (let t = 0; t < seconds; t += 1 / 60) {
      s = stepVehicle(s, { throttle: 1, steer, handbrake: false }, 1 / 60, 1000, 0, undefined, spec).state;
    }
    return s;
  };

  it("lets the bike reach 22 m/s and no more", () => {
    const s = drive(VEHICLES.bike, 12);
    expect(s.speed).toBeCloseTo(22, 5);
  });
  it("caps the auto at 14 m/s", () => {
    expect(drive(VEHICLES.auto, 12).speed).toBeCloseTo(14, 5);
  });
  it("still caps at the old 16 m/s when no spec is given", () => {
    let s = still;
    for (let t = 0; t < 12; t += 1 / 60) s = stepVehicle(s, { throttle: 1, steer: 0, handbrake: false }, 1 / 60, 1000).state;
    expect(s.speed).toBeCloseTo(MAX_FORWARD_SPEED, 5);
  });
  it("accelerates the bike faster than the auto", () => {
    expect(drive(VEHICLES.bike, 2).speed).toBeGreaterThan(drive(VEHICLES.auto, 2).speed);
  });
  it("turns the bike tighter than the car at the same speed", () => {
    const at = { ...still, speed: 6 };
    const turned = (spec: (typeof VEHICLES)["bike"]) => {
      let s = at;
      for (let t = 0; t < 3; t += 1 / 60) {
        s = stepVehicle({ ...s, speed: 6 }, { throttle: 0, steer: 1, handbrake: false }, 1 / 60, 1000, 0, undefined, spec).state;
      }
      return Math.abs(s.heading);
    };
    expect(turned(VEHICLES.bike)).toBeGreaterThan(turned(VEHICLES.car));
  });
});

describe("steering response", () => {
  it("reaches nearly full lock within half a second, so a junction turn starts at once", () => {
    let s = { x: 0, z: 0, heading: 0, speed: 3, steerAngle: 0 };
    for (let i = 0; i < 15; i++) {
      s = stepVehicle(s, { throttle: 0.3, steer: 1, handbrake: false }, 1 / 30, 6, 0, undefined, VEHICLES.car).state;
    }
    expect(s.steerAngle).toBeGreaterThan(0.9 * VEHICLES.car.maxSteer);
  });

  it("completes a 90 degree turn inside a 16 m junction at walking-to-trotting pace, for every vehicle", () => {
    for (const k of VEHICLE_KINDS) {
      let s = { x: 0, z: 0, heading: 0, speed: 4, steerAngle: 0 };
      let steps = 0;
      while (Math.abs(s.heading) < Math.PI / 2 && steps < 600) {
        s = stepVehicle(s, { throttle: s.speed < 4 ? 0.5 : 0, steer: 1, handbrake: false }, 1 / 30, 50, 0, undefined, VEHICLES[k]).state;
        steps++;
      }
      expect(Math.hypot(s.x, s.z), k).toBeLessThan(16);
      expect(steps / 30, k).toBeLessThan(4);
    }
  });
});
