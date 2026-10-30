import { describe, expect, it } from "vitest";
import {
  MAX_FORWARD_SPEED,
  MAX_REVERSE_SPEED,
  stepVehicle,
  type Inputs,
  type VehicleState,
} from "./vehicle";
import { roadCenterZ } from "./road";

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
    expect(state.steerAngle).toBeLessThan(0.1);
    expect(state.heading).toBeLessThan(0.02);
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

describe("roadCenterZ", () => {
  it("is 0 at the depot and gently bounded", () => {
    expect(roadCenterZ(0)).toBe(0);
    for (let x = 0; x < 3500; x += 50) {
      expect(Math.abs(roadCenterZ(x))).toBeLessThanOrEqual(25);
    }
  });
});
