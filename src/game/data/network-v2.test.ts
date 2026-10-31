import { describe, expect, it } from "vitest";
import { validateNetwork } from "../logic/network";
import { NETWORK_V2 } from "./network-v2";

const at = (x: number, z: number) => NETWORK_V2.junctions.find((j) => j.at[0] === x && j.at[1] === z);

describe("the big road network", () => {
  it("passes validation without a single problem", () => {
    const { problems, valid } = validateNetwork(NETWORK_V2, []);
    expect(problems).toEqual([]);
    expect(valid.roads).toHaveLength(NETWORK_V2.roads.length);
    expect(valid.junctions).toHaveLength(NETWORK_V2.junctions.length);
  });

  it("has about thirty signalled junctions", () => {
    expect(NETWORK_V2.junctions.length).toBeGreaterThanOrEqual(26);
    expect(NETWORK_V2.junctions.length).toBeLessThanOrEqual(32);
    for (const j of NETWORK_V2.junctions) expect(j.signal).not.toBe(false);
  });

  it("starts Station Road at the Dam Road", () => {
    const ns = NETWORK_V2.roads.find((r) => r.id === "ns")!;
    expect(ns.points[0]).toEqual([400, -150]);
  });

  it("has junctions where the village, the dam and the city meet", () => {
    for (const [x, z] of [[400, -150], [1100, -150], [1300, -150], [2300, 900], [400, 0], [800, 250]]) {
      expect(at(x, z), `junction at ${x},${z}`).toBeTruthy();
    }
    expect(at(400, 0)!.roads.sort()).toEqual(["ns", "ring"]);
  });

  it("keeps the village rules and adds city ones", () => {
    expect(at(400, 0)!.allowed).toEqual({ "ring:1": ["left", "straight"] });
    expect(at(400, 250)!.allowed["ns:-1"]).toEqual(["left", "straight"]);
    expect(at(1500, 250)!.allowed["ew:1"]).toEqual(["left", "straight"]);
  });

  it("spans the village and the city", () => {
    const xs = NETWORK_V2.roads.flatMap((r) => r.points.map((p) => p[0]));
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(2300);
  });
});
