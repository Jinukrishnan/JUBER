import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { VEHICLES } from "../data/vehicles";
import { createJunctionWatch } from "./driveRules";
import { planOfJunction } from "./lights";
import { clampToDrivable, drivable } from "./network";
import { signalAt } from "./signals";
import { stepVehicle, type VehicleState } from "./vehicle";

const N = NETWORK_V1;
const spec = VEHICLES.car;

// a time when the cross axis is green and the main axis red at the centre junction
function greenTime(axis: "main" | "cross"): number {
  const plan = planOfJunction(N.junctions.find((j) => j.id === "centre")!)!;
  for (let t = 0; t < 100; t += 0.1) if (signalAt(plan, t)[axis] === "green") return t;
  throw new Error("never green");
}

type Run = { wrongTurns: number; redLights: number; final: VehicleState; off: boolean };

// Drive the real physics along waypoints with a simple pursuit steer, at about 6 m/s.
function drive(start: VehicleState, waypoints: [number, number][], t: number, opts: { reverseAfter?: number } = {}): Run {
  const watch = createJunctionWatch(N);
  let s = start;
  let wi = 0;
  let wrong = 0;
  let red = 0;
  let off = false;
  for (let i = 0; i < 4000 && wi < waypoints.length; i++) {
    const [wx, wz] = waypoints[wi];
    if (Math.hypot(wx - s.x, wz - s.z) < 6) {
      wi++;
      continue;
    }
    const want = Math.atan2(wz - s.z, wx - s.x);
    let err = want - s.heading;
    err = Math.atan2(Math.sin(err), Math.cos(err));
    const reversing = opts.reverseAfter !== undefined && i > opts.reverseAfter;
    const throttle = reversing ? -1 : s.speed < 6 ? 1 : 0;
    const steer = reversing ? 0 : Math.max(-1, Math.min(1, err * 2));
    const r = stepVehicle(s, { throttle, steer, handbrake: false }, 1 / 30, 6, 0, (x, z) => clampToDrivable(N, x, z), spec);
    const res = watch.step(s, r.state, t, spec.length / 2);
    wrong += res.wrongTurns;
    red += res.redLights;
    if (!drivable(N, r.state.x, r.state.z)) off = true;
    s = r.state;
    if (reversing && s.speed < -3) break;
  }
  return { wrongTurns: wrong, redLights: red, final: s, off };
}

// heading north up Station Road in the left (west) lane, 90 m below the centre junction
const north = { x: 396.3, z: 340, heading: -Math.PI / 2, speed: 0, steerAngle: 0 };

describe("a drive through the centre junction", () => {
  const t = greenTime("cross");

  it("fines a right turn that is not allowed from the south, exactly once", () => {
    const r = drive(north, [[396.3, 270], [399, 256], [408, 246.3], [440, 246.3], [520, 246.3]], t);
    expect(r.wrongTurns).toBe(1);
    expect(r.redLights).toBe(0);
  });

  it("does not fine the left turn", () => {
    const r = drive(north, [[396.3, 270], [394, 258], [386, 253.7], [360, 253.7], [280, 253.7]], t);
    expect(r.wrongTurns).toBe(0);
  });

  it("does not fine going straight on", () => {
    const r = drive(north, [[396.3, 200], [396.3, 120]], t);
    expect(r.wrongTurns).toBe(0);
  });

  it("does not fine reversing out of the box the way it came in", () => {
    const r = drive(north, [[396.3, 262]], t);
    expect(r.wrongTurns).toBe(0);
    const back = drive({ ...r.final, speed: 0 }, [[396.3, 340]], t, { reverseAfter: 0 });
    expect(back.wrongTurns).toBe(0);
  });
});

describe("red lights while driving", () => {
  it("fines running the stop line on red, once", () => {
    const red = greenTime("cross"); // the cross axis is green, so the main axis (the ew approaches) is red
    const start = { x: 300, z: 246.3, heading: 0, speed: 0, steerAngle: 0 };
    const r = drive(start, [[380, 246.3], [440, 246.3], [520, 246.3]], red);
    expect(r.redLights).toBe(1);
  });

  it("does not fine on green", () => {
    const start = { x: 300, z: 246.3, heading: 0, speed: 0, steerAngle: 0 };
    const r = drive(start, [[380, 246.3], [440, 246.3], [520, 246.3]], greenTime("main"));
    expect(r.redLights).toBe(0);
  });
});

describe("the road edge", () => {
  it("clamps a vehicle driven 50 m past the end of Station Road at the ring", () => {
    const start = { x: 396.3, z: 40, heading: -Math.PI / 2, speed: 0, steerAngle: 0 };
    const watch = createJunctionWatch(N);
    let s = start;
    for (let i = 0; i < 600; i++) {
      const r = stepVehicle(s, { throttle: 1, steer: 0, handbrake: false }, 1 / 30, 6, 0, (x, z) => clampToDrivable(N, x, z), spec);
      watch.step(s, r.state, 0, 5);
      s = r.state;
      expect(drivable(N, s.x, s.z)).toBe(true);
    }
    expect(s.z).toBeGreaterThanOrEqual(-6.001);
  });
});
