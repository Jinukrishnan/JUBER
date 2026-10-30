import { describe, expect, it } from "vitest";
import { arrowFor, describeStep, roundDistance } from "./navtext";
import type { Step } from "./roadgraph";

const step = (turn: Step["turn"], side?: "left" | "right"): Step => ({ turn, at: { x: 0, z: 0 }, distanceFromStart: 0, side });

describe("roundDistance", () => {
  it("rounds to 10 m above 100 m and 5 m below", () => {
    expect(roundDistance(487)).toBe(490);
    expect(roundDistance(103)).toBe(100);
    expect(roundDistance(47)).toBe(45);
    expect(roundDistance(2)).toBe(0);
  });
});

describe("describeStep", () => {
  it("tells you to turn, with how far", () => {
    expect(describeStep(step("left"), 80, "Paddy Farm")).toBe("Turn left in 80 m");
    expect(describeStep(step("right"), 312, "Paddy Farm")).toBe("Turn right in 310 m");
  });
  it("says turn now when it is right here", () => {
    expect(describeStep(step("left"), 6, "x")).toBe("Turn left now");
  });
  it("tells you to make a U-turn", () => {
    expect(describeStep(step("uturn"), 0, "x")).toBe("Make a U-turn");
    expect(describeStep(step("uturn"), 60, "x")).toBe("Make a U-turn in 60 m");
  });
  it("names the place and the side on arrival", () => {
    expect(describeStep(step("arrive", "left"), 120, "Paddy Farm")).toBe("Paddy Farm on the left in 120 m");
    expect(describeStep(step("arrive", "right"), 3, "Paddy Farm")).toBe("Paddy Farm is here on the right");
  });
  it("copes with an arrival side that is not known", () => {
    expect(describeStep(step("arrive"), 120, "Paddy Farm")).toBe("Paddy Farm in 120 m");
  });
});

describe("arrowFor", () => {
  it("has a different arrow for each turn", () => {
    const arrows = (["left", "right", "uturn", "arrive"] as const).map(arrowFor);
    expect(new Set(arrows).size).toBe(4);
  });
});
