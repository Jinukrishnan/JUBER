import { describe, expect, it } from "vitest";
import { LINES, lineFor, pitchFor, type AgentKind, type Mood } from "./trafficTalk";

const KINDS: AgentKind[] = ["car", "auto", "bike", "bus"];
const MOODS: Mood[] = ["waiting", "general"];
const MALAYALAM = /[ഀ-ൿ]/;

describe("trafficTalk", () => {
  it("has at least three lines for every kind and mood, in Malayalam with an English meaning", () => {
    for (const k of KINDS) {
      for (const m of MOODS) {
        const lines = LINES[k][m];
        expect(lines.length, `${k} ${m}`).toBeGreaterThanOrEqual(3);
        for (const l of lines) {
          expect(MALAYALAM.test(l.ml)).toBe(true);
          expect(l.en.length).toBeGreaterThan(3);
        }
      }
    }
  });

  it("is the same line for the same seed and reaches more than one line across seeds", () => {
    for (const k of KINDS) {
      expect(lineFor(k, "general", 42)).toEqual(lineFor(k, "general", 42));
      const seen = new Set(Array.from({ length: 40 }, (_, i) => lineFor(k, "general", i).ml));
      expect(seen.size).toBeGreaterThan(1);
    }
  });

  it("scolds about the signal when the driver was waiting at a red light", () => {
    for (const k of KINDS) {
      for (const l of LINES[k].waiting) expect(/signal|red/i.test(l.en), l.en).toBe(true);
    }
  });

  it("gives every voice a pitch in range, a bus deepest and a bike highest on average", () => {
    const avg = (k: AgentKind) => Array.from({ length: 30 }, (_, i) => pitchFor(k, i)).reduce((a, b) => a + b, 0) / 30;
    for (const k of KINDS) {
      for (let i = 0; i < 30; i++) {
        const p = pitchFor(k, i);
        expect(p).toBeGreaterThanOrEqual(0.85);
        expect(p).toBeLessThanOrEqual(1.2);
      }
    }
    expect(avg("bus")).toBeLessThan(avg("car"));
    expect(avg("car")).toBeLessThan(avg("bike"));
  });
});
