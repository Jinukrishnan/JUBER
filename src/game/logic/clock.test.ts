import { describe, expect, it } from "vitest";
import { advanceClock, formatClock } from "./clock";

describe("advanceClock", () => {
  it("starts at the day start hour", () => {
    expect(advanceClock(0, 0).hour).toBe(6);
  });
  it("reaches mid-day halfway through the real-time budget", () => {
    expect(advanceClock(240, 0).hour).toBe(13);
  });
  it("ends the day at the real-time budget", () => {
    expect(advanceClock(480, 0).ended).toBe(true);
    expect(advanceClock(479, 0).ended).toBe(false);
  });
  it("accumulates dt and clamps hour at the day end", () => {
    const r = advanceClock(100, 10);
    expect(r.elapsedRealS).toBe(110);
    expect(advanceClock(480, 50).hour).toBe(20);
  });
});

describe("formatClock", () => {
  it("formats fractional hours as HH:MM", () => {
    expect(formatClock(7.5)).toBe("07:30");
    expect(formatClock(13)).toBe("13:00");
  });
});
