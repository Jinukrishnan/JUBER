import { describe, expect, it } from "vitest";
import { resolvePlan, signalAt, redAge } from "./signals";

const plan = resolvePlan({}); // 28 / 3 / 2 / 14 / 3 / 2 = 52 s

describe("signalAt", () => {
  it("runs main green, main yellow, all red, cross green, cross yellow, all red", () => {
    const at = (t: number) => signalAt(plan, t);
    expect([at(0).main, at(0).cross]).toEqual(["green", "red"]);
    expect([at(28).main, at(28).cross]).toEqual(["yellow", "red"]);
    expect([at(31).main, at(31).cross]).toEqual(["red", "red"]);
    expect([at(33).main, at(33).cross]).toEqual(["red", "green"]);
    expect([at(47).main, at(47).cross]).toEqual(["red", "yellow"]);
    expect([at(50).main, at(50).cross]).toEqual(["red", "red"]);
    expect([at(52).main, at(52).cross]).toEqual(["green", "red"]);
  });
  it("never shows green to both roads", () => {
    for (let t = 0; t < 200; t += 0.25) {
      const s = signalAt(plan, t);
      expect(s.main === "green" && s.cross === "green").toBe(false);
      expect(s.main !== "red" && s.cross !== "red").toBe(false);
    }
  });
  it("reports the seconds until the light changes", () => {
    expect(signalAt(plan, 0).nextChange).toBeCloseTo(28);
    expect(signalAt(plan, 27.5).nextChange).toBeCloseTo(0.5);
    expect(signalAt(plan, 33).nextChange).toBeCloseTo(14);
  });
  it("starts later or earlier with an offset", () => {
    const p = resolvePlan({ offset: 12 });
    expect(signalAt(p, 0).main).toBe("green");
    expect(signalAt(p, 0).nextChange).toBeCloseTo(16);
    expect(signalAt(p, 40).main).toBe("green");
  });
  it("wraps for negative times without breaking", () => {
    expect(signalAt(plan, -1).main).toBe("red");
  });
});

describe("redAge", () => {
  it("counts seconds since the light turned red", () => {
    expect(redAge(plan, 31.5, "main")).toBeCloseTo(0.5);
    expect(redAge(plan, 1, "cross")).toBeGreaterThan(1);
    expect(redAge(plan, 10, "main")).toBe(0);
  });
});

import { untilChange } from "./signals";
describe("untilChange", () => {
  it("counts down to the next time this road's light changes", () => {
    expect(untilChange(plan, 0, "main")).toBeCloseTo(28);
    expect(untilChange(plan, 29, "main")).toBeCloseTo(2); // yellow to red
  });
  it("skips phases where this road's light stays the same", () => {
    // main is red from 31 s to 52 s, through the cross phases
    expect(untilChange(plan, 32, "main")).toBeCloseTo(20);
    expect(untilChange(plan, 33, "cross")).toBeCloseTo(14);
  });
});
