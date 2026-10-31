import { describe, expect, it } from "vitest";
import { NETWORK_V1, type Road } from "../data/network-v1";
import { autoJunctions } from "./junctions";

const road = (id: string, points: [number, number][], closed = false): Road => ({ id, name: id, ml: id, points, closed, cornerRadius: 0, halfWidth: 6 });

describe("autoJunctions", () => {
  it("makes one junction where two roads cross", () => {
    const js = autoJunctions([road("a", [[0, 100], [200, 100]]), road("b", [[100, 0], [100, 200]])]);
    expect(js).toHaveLength(1);
    expect(js[0].at).toEqual([100, 100]);
    expect([...js[0].roads].sort()).toEqual(["a", "b"]);
    expect(js[0].id).toBe("a+b");
  });

  it("makes a junction where a road ends on another road", () => {
    const js = autoJunctions([road("a", [[0, 100], [200, 100]]), road("b", [[100, 100], [100, 300]])]);
    expect(js).toHaveLength(1);
    expect(js[0].at).toEqual([100, 100]);
  });

  it("makes none for parallel roads", () => {
    expect(autoJunctions([road("a", [[0, 0], [200, 0]]), road("b", [[0, 50], [200, 50]])])).toEqual([]);
  });

  it("finds the four ring junctions and the centre, but none at the rounded corners", () => {
    const js = autoJunctions(NETWORK_V1.roads);
    const at = js.map((j) => j.at.join(",")).sort();
    expect(at).toEqual(["0,250", "400,0", "400,250", "400,500", "800,250"].sort());
  });

  it("applies overrides by crossing position", () => {
    const js = autoJunctions(NETWORK_V1.roads, { "400,0": { id: "north", allowed: { "ring:1": ["left", "straight"] } } });
    const north = js.find((j) => j.at.join(",") === "400,0")!;
    expect(north.id).toBe("north");
    expect(north.allowed).toEqual({ "ring:1": ["left", "straight"] });
  });

  it("gives every junction its own signal offset below the 52 s cycle", () => {
    const js = autoJunctions(NETWORK_V1.roads);
    const offsets = js.map((j) => (j.signal === false ? -1 : (j.signal.offset ?? 0)));
    expect(new Set(offsets).size).toBe(js.length);
    for (const o of offsets) {
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(52);
    }
  });

  it("leaves a bend (two roads meeting end to end) unsignalled", () => {
    const js = autoJunctions([road("a", [[0, 0], [100, 0]]), road("b", [[100, 0], [100, 100]])]);
    expect(js).toHaveLength(1);
    expect(js[0].signal).toBe(false);
  });

  it("refuses roads that lie along the same line and touch", () => {
    expect(() => autoJunctions([road("a", [[0, 0], [100, 0]]), road("b", [[100, 0], [200, 0]])])).toThrow(/same line/);
    expect(() => autoJunctions([road("a", [[0, 0], [100, 0]]), road("b", [[50, 0], [200, 0]])])).toThrow(/same line/);
  });

  it("numbers repeated road pairs and refuses roads that are not axis-aligned", () => {
    const u = [road("a", [[0, 100], [300, 100]]), road("b", [[100, 0], [100, 200], [200, 200], [200, 0]])];
    expect(autoJunctions(u).map((j) => j.id)).toEqual(["a+b", "a+b#2"]);
    expect(() => autoJunctions([road("d", [[0, 0], [100, 100]])])).toThrow(/d/);
  });
});
