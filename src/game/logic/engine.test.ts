import { describe, expect, it } from "vitest";
import { MAX_FORWARD_SPEED } from "./vehicle";
import { beepOn, engineGain, firingHz, gearFor, IDLE_RPM, rpmFor, tireGain } from "./engine";

describe("gearFor", () => {
  it("climbs through the gears as the bus speeds up", () => {
    expect([1, 4, 8, 11, 15].map(gearFor)).toEqual([1, 2, 3, 4, 5]);
  });
  it("treats reversing like going forward at the same speed", () => {
    expect(gearFor(-4)).toBe(gearFor(4));
  });
  it("tops out in fifth at the bus's top speed", () => {
    expect(gearFor(MAX_FORWARD_SPEED)).toBe(5);
  });
});

describe("rpmFor", () => {
  it("idles when stopped", () => {
    expect(rpmFor(0, 0)).toBe(IDLE_RPM);
    expect(rpmFor(0.1, 0)).toBe(IDLE_RPM);
  });
  it("rises through a gear and drops when the next one engages", () => {
    expect(rpmFor(2.5, 0)).toBeGreaterThan(rpmFor(1, 0));
    expect(rpmFor(2.99, 0)).toBeGreaterThan(rpmFor(3.01, 0) + 500);
  });
  it("revs a little higher under power", () => {
    expect(rpmFor(5, 1)).toBeGreaterThan(rpmFor(5, 0));
  });
  it("stays inside a diesel's working range", () => {
    for (let v = 0; v <= MAX_FORWARD_SPEED; v += 0.25) {
      for (const t of [0, 1]) {
        const r = rpmFor(v, t);
        expect(r).toBeGreaterThanOrEqual(IDLE_RPM);
        expect(r).toBeLessThanOrEqual(2700);
      }
    }
  });
});

describe("firingHz", () => {
  it("is three firing strokes per revolution for a six-cylinder", () => {
    expect(firingHz(600)).toBe(30);
    expect(firingHz(1200)).toBe(60);
  });
});

describe("loudness", () => {
  it("engine is audible at idle, louder under load, and never harsh", () => {
    expect(engineGain(0, 0)).toBeGreaterThan(0.02);
    expect(engineGain(8, 1)).toBeGreaterThan(engineGain(8, 0));
    expect(engineGain(MAX_FORWARD_SPEED, 1)).toBeLessThanOrEqual(0.3);
  });
  it("tyre noise is silent when stopped and grows with speed", () => {
    expect(tireGain(0)).toBe(0);
    expect(tireGain(12)).toBeGreaterThan(tireGain(4));
    expect(tireGain(-12)).toBe(tireGain(12));
    expect(tireGain(MAX_FORWARD_SPEED)).toBeLessThanOrEqual(0.12);
  });
});

describe("beepOn", () => {
  it("beeps in a steady on/off rhythm only while reversing", () => {
    expect(beepOn(0, true)).toBe(true);
    expect(beepOn(400, true)).toBe(false);
    expect(beepOn(800, true)).toBe(true);
    expect(beepOn(0, false)).toBe(false);
  });
});
