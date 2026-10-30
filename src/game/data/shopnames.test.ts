import { describe, expect, it } from "vitest";
import { SHOP_NAMES, shopNameFor } from "./shopnames";

describe("shop names", () => {
  it("each have a Malayalam name and an English one", () => {
    expect(SHOP_NAMES.length).toBeGreaterThanOrEqual(8);
    for (const n of SHOP_NAMES) {
      expect(n.ml).toMatch(/[ഀ-ൿ]/);
      expect(n.en.trim().length).toBeGreaterThan(2);
    }
  });

  it("are chosen the same way every time for a given seed", () => {
    expect(shopNameFor(5)).toEqual(shopNameFor(5));
    expect(shopNameFor(-5)).toEqual(shopNameFor(5));
  });

  it("vary from shop to shop", () => {
    const seen = new Set(Array.from({ length: 31 }, (_, i) => shopNameFor(i).en));
    expect(seen.size).toBeGreaterThanOrEqual(5);
  });
});
