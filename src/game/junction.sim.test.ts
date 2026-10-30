import { describe, expect, it } from "vitest";
import { clampToDrivable, localToWorld, resolveJunction } from "./logic/junction";
import { redViolation } from "./logic/redlight";
import { roadAngle, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import type { Approach } from "./logic/signals";
import { stepVehicle, type VehicleState } from "./logic/vehicle";
import { JUNCTIONS } from "./world";

const j = JUNCTIONS.find((x) => x.id === "j400")!; // both arms, signal offset 0
const APPROACHES: Approach[] = ["mainForward", "mainBackward", "armLeft", "armRight"];
const bounds = (x: number, z: number) => clampToDrivable(JUNCTIONS, x, z);

// drive in a straight line at 10 m/s and count the red-light fines
function drive(start: VehicleState, seconds: number, t0: number) {
  let s = start;
  let fines = 0;
  let edge = 0;
  for (let t = 0; t < seconds; t += 0.05) {
    const r = stepVehicle(s, { throttle: 1, steer: 0, handbrake: false }, 0.05, roadHalfWidthAt(s.x), roadCenterZ(s.x), bounds);
    for (const a of APPROACHES) if (redViolation(j, a, s, r.state, t0 + t)) fines++;
    if (r.hitEdge) edge++;
    s = { ...r.state, speed: 10 };
  }
  return { fines, edge, end: s };
}

const onMain = (x: number): VehicleState => ({ x, z: roadCenterZ(x) - 3, heading: roadAngle(x), speed: 10, steerAngle: 0 });

describe("driving through a junction", () => {
  it("is fined exactly once for running the red", () => {
    expect(drive(onMain(330), 12, 38).fines).toBe(1); // main is red from 31 to 52 s
  });
  it("is not fined on green", () => {
    expect(drive(onMain(330), 12, 2).fines).toBe(0);
  });
  it("can turn into the side road and drive down it without hitting an edge", () => {
    const w = localToWorld(j, 0, 30);
    const start: VehicleState = { x: w.x, z: w.z, heading: j.angle + Math.PI / 2, speed: 10, steerAngle: 0 };
    const r = drive(start, 10, 2);
    expect(r.edge).toBe(0);
    const out = localToWorld(j, 0, 0);
    expect(Math.hypot(r.end.x - out.x, r.end.z - out.z)).toBeGreaterThan(100);
  });
  it("cannot leave the paved area at the end of the side road", () => {
    const w = localToWorld(j, 0, 180);
    const start: VehicleState = { x: w.x, z: w.z, heading: j.angle + Math.PI / 2, speed: 10, steerAngle: 0 };
    const r = drive(start, 10, 2);
    expect(r.edge).toBeGreaterThan(0);
    expect(clampToDrivable(JUNCTIONS, r.end.x, r.end.z).clamped).toBe(false);
  });
  it("is fined coming out of a side road onto a red", () => {
    // the arm light is red while main is green (t = 2)
    const w = localToWorld(j, -2.5, 70);
    const start: VehicleState = { x: w.x, z: w.z, heading: j.angle - Math.PI / 2, speed: 10, steerAngle: 0 };
    expect(drive(start, 8, 2).fines).toBe(1);
  });
  it("is not fined driving the main road past a side road on green", () => {
    expect(resolveJunction({ id: "x", x: 400, arms: "both" }).plan).not.toBeNull();
    expect(drive(onMain(380), 4, 2).fines).toBe(0);
  });
});
