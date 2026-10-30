import { describe, expect, it } from "vitest";
import type { Junction } from "../data/junctions-v1";
import { armStopDistance, localToWorld, resolveJunction, stopLineDistance } from "./junction";
import { redViolation, stopLineCrossed, BUS_HALF_LENGTH } from "./redlight";
import type { Approach } from "./signals";

const r = resolveJunction({ id: "t", x: 400, arms: "both", signal: { offset: 0 } } as Junction);
const RED_FOR_MAIN = 40; // main red (9 s old), cross green
const RED_FOR_CROSS = 10; // cross red (12 s old), main green

// the bus with its front `f` metres past the stop line, `lat` across the approach
function pose(a: Approach, f: number, lat = 0.5) {
  const L = a.startsWith("main") ? stopLineDistance(r) : armStopDistance();
  const along = -L + f;
  const dir = { mainForward: [1, 0], mainBackward: [-1, 0], armLeft: [0, 1], armRight: [0, -1] }[a];
  const head = { mainForward: 0, mainBackward: Math.PI, armLeft: Math.PI / 2, armRight: -Math.PI / 2 }[a];
  const main = a.startsWith("main");
  const w = localToWorld(r, (main ? dir[0] * along : lat) - dir[0] * BUS_HALF_LENGTH, (main ? lat : dir[1] * along) - dir[1] * BUS_HALF_LENGTH);
  return { x: w.x, z: w.z, heading: r.angle + head };
}

const approaches: Approach[] = ["mainForward", "mainBackward", "armLeft", "armRight"];

describe("stopLineCrossed", () => {
  for (const a of approaches) {
    it(`sees the front cross the line on ${a}`, () => {
      expect(stopLineCrossed(r, a, pose(a, -0.3), pose(a, 0.3))).toBe(true);
    });
    it(`ignores a bus that stays before the line on ${a}`, () => {
      expect(stopLineCrossed(r, a, pose(a, -3), pose(a, -1))).toBe(false);
    });
    it(`ignores a bus already past the line on ${a}`, () => {
      expect(stopLineCrossed(r, a, pose(a, 1), pose(a, 2))).toBe(false);
    });
  }
  it("does not count reversing back across the line", () => {
    expect(stopLineCrossed(r, "mainForward", pose("mainForward", 0.3), pose("mainForward", -0.3))).toBe(false);
  });
  it("does not count a bus facing the other way that reverses over it", () => {
    const a = pose("mainBackward", -0.3);
    const b = pose("mainBackward", 0.3);
    // same positions, but the bus faces forward (it is reversing)
    expect(stopLineCrossed(r, "mainBackward", { ...a, heading: r.angle }, { ...b, heading: r.angle })).toBe(false);
  });
  it("ignores traffic on the other road", () => {
    expect(stopLineCrossed(r, "armLeft", pose("mainForward", -0.3), pose("mainForward", 0.3))).toBe(false);
  });
});

describe("redViolation", () => {
  it("fines crossing on red from every approach", () => {
    for (const a of approaches) {
      const t = a.startsWith("main") ? RED_FOR_MAIN : RED_FOR_CROSS;
      expect(redViolation(r, a, pose(a, -0.3), pose(a, 0.3), t)).toBe(true);
    }
  });
  it("does not fine on green", () => {
    expect(redViolation(r, "mainForward", pose("mainForward", -0.3), pose("mainForward", 0.3), RED_FOR_CROSS)).toBe(false);
  });
  it("does not fine on yellow", () => {
    expect(redViolation(r, "mainForward", pose("mainForward", -0.3), pose("mainForward", 0.3), 29)).toBe(false);
  });
  it("gives a moment of grace just after the light turns red", () => {
    expect(redViolation(r, "mainForward", pose("mainForward", -0.3), pose("mainForward", 0.3), 31.2)).toBe(false);
    expect(redViolation(r, "mainForward", pose("mainForward", -0.3), pose("mainForward", 0.3), 31.6)).toBe(true);
  });
  it("never fines at a junction without a signal", () => {
    const free = resolveJunction({ id: "f", x: 400, arms: "both", signal: false });
    expect(redViolation(free, "mainForward", pose("mainForward", -0.3), pose("mainForward", 0.3), RED_FOR_MAIN)).toBe(false);
  });
});
