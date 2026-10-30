import { describe, expect, it } from "vitest";
import { ACCIDENT_LINES, accidentLine } from "./speech";

describe("accident lines", () => {
  it("each have a Malayalam cry and an English one", () => {
    for (const l of ACCIDENT_LINES) {
      expect(l.ml).toMatch(/[ഀ-ൿ]/);
      expect(l.en.length).toBeGreaterThan(2);
    }
  });

  it("include the cries people actually shout", () => {
    const english = ACCIDENT_LINES.map((l) => l.en).join(" | ");
    expect(english).toMatch(/Oh my God/);
    expect(english).toMatch(/Help me/);
  });

  it("pick the same line for the same person and vary between people", () => {
    expect(accidentLine(7)).toEqual(accidentLine(7));
    const seen = new Set(Array.from({ length: 20 }, (_, i) => accidentLine(i).en));
    expect(seen.size).toBeGreaterThan(2);
  });
});
