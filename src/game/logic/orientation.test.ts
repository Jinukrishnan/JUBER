import { describe, expect, it } from "vitest";
import { needsLandscape } from "./orientation";

describe("needsLandscape", () => {
  it("asks a phone held upright to turn", () => {
    expect(needsLandscape({ width: 390, height: 844, touch: true })).toBe(true);
  });

  it("asks a tablet held upright to turn, up to 1024 px wide", () => {
    expect(needsLandscape({ width: 820, height: 1180, touch: true })).toBe(true);
    expect(needsLandscape({ width: 1024, height: 1366, touch: true })).toBe(true);
  });

  it("leaves a phone held sideways alone", () => {
    expect(needsLandscape({ width: 844, height: 390, touch: true })).toBe(false);
  });

  it("never bothers a desktop, even in a tall narrow window", () => {
    expect(needsLandscape({ width: 500, height: 900, touch: false })).toBe(false);
  });

  it("leaves a wide tall screen alone", () => {
    expect(needsLandscape({ width: 1400, height: 1500, touch: true })).toBe(false);
  });

  it("treats a square screen as landscape", () => {
    expect(needsLandscape({ width: 800, height: 800, touch: true })).toBe(false);
  });
});
