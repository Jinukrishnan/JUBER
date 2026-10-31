import { describe, expect, it } from "vitest";
import { validateNetwork } from "../logic/network";
import { allowedTurns, approachesOf, exitsOf } from "../logic/turns";
import { NETWORK_V2 } from "./network-v2";

const at = (x: number, z: number) => NETWORK_V2.junctions.find((j) => j.at[0] === x && j.at[1] === z);

describe("the big road network", () => {
  it("passes validation without a single problem", () => {
    const { problems, valid } = validateNetwork(NETWORK_V2, []);
    expect(problems).toEqual([]);
    expect(valid.roads).toHaveLength(NETWORK_V2.roads.length);
    expect(valid.junctions).toHaveLength(NETWORK_V2.junctions.length);
  });

  it("has about thirty junctions, signalled except where two roads simply bend into each other", () => {
    expect(NETWORK_V2.junctions.length).toBeGreaterThanOrEqual(26);
    expect(NETWORK_V2.junctions.length).toBeLessThanOrEqual(32);
    const bends = NETWORK_V2.junctions.filter((j) => j.signal === false).map((j) => j.at.join(","));
    expect(bends.sort()).toEqual(["1100,900", "1300,-150", "2300,0", "2300,900", "400,-150"].sort());
  });

  it("has no road end that leads nowhere", () => {
    for (const r of NETWORK_V2.roads) {
      if (r.closed) continue;
      for (const end of [r.points[0], r.points[r.points.length - 1]]) {
        const j = NETWORK_V2.junctions.find((x) => x.at[0] === end[0] && x.at[1] === end[1] && x.roads.includes(r.id));
        expect(j, `road ${r.id} ends at ${end.join(",")} with no junction`).toBeTruthy();
      }
    }
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

  // what a rule means, not just what it says: the turn banned is the one the comments describe
  it("bans the turns the data comments describe", () => {
    const banned = (x: number, z: number, approach: string) => {
      const j = NETWORK_V2.junctions.find((q) => q.at[0] === x && q.at[1] === z)!;
      const from = approachesOf(NETWORK_V2, j.id).find((a) => a.id === approach)!;
      const exits = exitsOf(NETWORK_V2, j.id, from);
      const allowed = allowedTurns(NETWORK_V2, j.id, approach);
      return exits.filter((e) => !allowed.includes(e.turn as "left")).map((e) => e.id);
    };
    expect(banned(1500, 250, "ew:1")).toEqual(["c1500:1"]); // east on the avenue: no right, into the street going south
    expect(banned(1900, 550, "c1900:1")).toEqual(["r550:-1"]); // south: no right, west (the park side)
    expect(banned(1300, 0, "r0:-1")).toEqual(["c1300:-1"]); // west: no right, north towards the dam
  });

  it("spans the village and the city", () => {
    const xs = NETWORK_V2.roads.flatMap((r) => r.points.map((p) => p[0]));
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(2300);
  });
});
