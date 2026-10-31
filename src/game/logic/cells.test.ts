import { describe, expect, it } from "vitest";
import { CELL, cellKey, cellOf, cellsAround, groupByCell, isNearCell } from "./cells";

describe("cells", () => {
  it("puts a point in exactly one cell, with negatives rounding down", () => {
    expect(cellOf(10, 10)).toEqual({ cx: 0, cz: 0 });
    expect(cellOf(CELL + 1, -1)).toEqual({ cx: 1, cz: -1 });
    expect(cellKey(2, -3)).toBe("2,-3");
  });

  it("returns the cells within range of a point, including its own", () => {
    const keys = cellsAround(100, 100, 50).map((c) => cellKey(c.cx, c.cz));
    expect(keys).toContain("0,0");
    expect(keys.length).toBe(1);
    const wide = cellsAround(100, 100, 260).map((c) => cellKey(c.cx, c.cz));
    expect(wide).toContain("0,0");
    expect(wide).toContain("1,1");
    expect(wide).toContain("-1,-1"); // reaches the neighbours behind
    expect(new Set(wide).size).toBe(wide.length);
  });

  it("groups items so each lives in exactly one cell", () => {
    const items = [{ x: 5, z: 5 }, { x: CELL + 5, z: 5 }, { x: 6, z: 7 }];
    const g = groupByCell(items);
    expect([...g.values()].flat().length).toBe(3);
    expect(g.get("0,0")!.length).toBe(2);
  });

  it("says which cells are near enough for full detail", () => {
    expect(isNearCell({ cx: 0, cz: 0 }, 100, 100, 120)).toBe(true);
    expect(isNearCell({ cx: 5, cz: 5 }, 100, 100, 120)).toBe(false);
  });
});
