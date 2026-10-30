import { describe, expect, it } from "vitest";
import { PLACES } from "../data/places-v1";
import { dialogueFor } from "./dialogue";
import type { Request } from "./requests";

const req = (n: number, group: 1 | 2 | 3 = 1, drop = PLACES[3]): Request => ({
  id: `r${n}`,
  customer: "Priya",
  pickup: PLACES[1],
  drop,
  group,
  fare: 100,
  distance: 400,
  expiresIn: 45,
});

describe("dialogueFor", () => {
  it("asks for the drop place by its Malayalam name, with the English alongside", () => {
    const d = dialogueFor(req(1));
    expect(d.ml).toContain(PLACES[3].ml);
    expect(d.en).toContain(PLACES[3].name);
    expect(d.ml).toMatch(/[ഀ-ൿ]/);
  });
  it("names the customer", () => {
    expect(dialogueFor(req(1)).name).toBe("Priya");
  });
  it("says the same thing every time for the same request", () => {
    expect(dialogueFor(req(7, 2))).toEqual(dialogueFor(req(7, 2)));
  });
  it("varies the wording between requests", () => {
    const lines = new Set(Array.from({ length: 60 }, (_, i) => dialogueFor(req(i)).ml));
    expect(lines.size).toBeGreaterThanOrEqual(3);
  });
  it("says how many there are when it is a group", () => {
    const one = dialogueFor(req(5, 1));
    const two = dialogueFor(req(5, 2));
    const three = dialogueFor(req(5, 3));
    expect(two.ml).toContain("രണ്ടുപേർ");
    expect(two.en).toMatch(/two of us/i);
    expect(three.ml).toContain("മൂന്നുപേർ");
    expect(three.en).toMatch(/three of us/i);
    expect(one.ml).not.toMatch(/രണ്ടുപേർ|മൂന്നുപേർ/);
    expect(one.en).not.toMatch(/of us/i);
  });
  it("still names the place when it is a group", () => {
    expect(dialogueFor(req(5, 3)).ml).toContain(PLACES[3].ml);
  });
  it("works for every place, with no unfilled gaps", () => {
    for (const p of PLACES) {
      for (let i = 0; i < 8; i++) {
        const d = dialogueFor(req(i, 2, p));
        expect(d.ml).toContain(p.ml);
        expect(d.en).toContain(p.name);
        expect(d.ml + d.en).not.toMatch(/[{}]|undefined/);
      }
    }
  });
  it("gives a short line for the speech bubble naming the place", () => {
    const d = dialogueFor(req(1));
    expect(d.bubble.ml).toContain(PLACES[3].ml);
    expect(d.bubble.en).toContain(PLACES[3].name);
    expect(d.bubble.ml.length).toBeLessThan(d.ml.length);
  });
});
