import { describe, expect, it } from "vitest";
import { lampState } from "./lamps";

describe("lampState", () => {
  it("shows the brake light while the brake key is held, at any speed", () => {
    expect(lampState(-1, false, 8).braking).toBe(true);
    expect(lampState(-1, false, 0).braking).toBe(true);
  });
  it("shows the brake light for the handbrake", () => {
    expect(lampState(0, true, 5).braking).toBe(true);
  });
  it("shows it while reversing, and lights the white reverse lamp", () => {
    const s = lampState(-1, false, -2);
    expect(s.braking).toBe(true);
    expect(s.reversing).toBe(true);
  });
  it("is dark while driving on the throttle or coasting", () => {
    expect(lampState(1, false, 8)).toEqual({ braking: false, reversing: false });
    expect(lampState(0, false, 8)).toEqual({ braking: false, reversing: false });
  });
  it("does not call a crawl backwards reversing", () => {
    expect(lampState(0, false, -0.1).reversing).toBe(false);
  });
});
