import { describe, expect, it } from "vitest";
import { NETWORK_V1, type Network } from "../data/network-v1";
import { JUNCTION_BOX_HALF, drivable } from "./network";
import { allowedTurns, approachesOf, classifyTurn, exitsOf, isWrongTurn, moveAt, type Approach } from "./turns";

const N = NETWORK_V1;
const E = 0;
const S = Math.PI / 2;
const W = Math.PI;
const NORTH = -Math.PI / 2;

describe("approaches", () => {
  it("a T has 3 approaches and the four-way 4", () => {
    for (const id of ["north", "south", "west", "east"]) expect(approachesOf(N, id).length).toBe(3);
    expect(approachesOf(N, "centre").length).toBe(4);
  });

  it("ids name the road and the direction of travel", () => {
    expect(approachesOf(N, "north").map((a) => a.id).sort()).toEqual(["ns:-1", "ring:-1", "ring:1"]);
    expect(approachesOf(N, "centre").map((a) => a.id).sort()).toEqual(["ew:-1", "ew:1", "ns:-1", "ns:1"]);
  });

  it("headings point into the junction", () => {
    const h = Object.fromEntries(approachesOf(N, "centre").map((a) => [a.id, a.heading]));
    expect(h["ew:1"]).toBeCloseTo(E, 6);
    expect(Math.abs(Math.abs(h["ew:-1"]) - W)).toBeLessThan(1e-6);
    expect(h["ns:1"]).toBeCloseTo(S, 6);
    expect(h["ns:-1"]).toBeCloseTo(NORTH, 6);
  });

  it("puts the stop line 7 m before the box and the zebra between", () => {
    const a = approachesOf(N, "centre").find((x) => x.id === "ew:1")!;
    expect(a.stopLineAt.x).toBeCloseTo(400 - (JUNCTION_BOX_HALF + 7), 6);
    expect(a.zebraAt.x).toBeCloseTo(400 - (JUNCTION_BOX_HALF + 3.65), 6);
    expect(a.stopLineAt.z).toBeCloseTo(250, 6);
    expect(drivable(N, a.stopLineAt.x, a.stopLineAt.z)).toBe(true);
  });

  it("groups the ring pair of a T as main and the stem as cross; ew is main at the four-way", () => {
    const north = approachesOf(N, "north");
    expect(north.filter((a) => a.axis === "main").map((a) => a.road)).toEqual(["ring", "ring"]);
    expect(north.find((a) => a.road === "ns")!.axis).toBe("cross");
    const centre = approachesOf(N, "centre");
    expect(centre.filter((a) => a.axis === "main").every((a) => a.road === "ew")).toBe(true);
    expect(centre.filter((a) => a.axis === "cross").every((a) => a.road === "ns")).toBe(true);
  });
});

describe("classifyTurn", () => {
  it("gives left, straight, right and u-turn", () => {
    expect(classifyTurn(E, E)).toBe("straight");
    expect(classifyTurn(E, S)).toBe("right"); // +z is the driver's right facing east
    expect(classifyTurn(E, NORTH)).toBe("left");
    expect(classifyTurn(E, W)).toBe("uturn");
    expect(classifyTurn(S, E)).toBe("left");
    expect(classifyTurn(NORTH, E)).toBe("right");
    expect(classifyTurn(W - 0.2, -W + 0.2)).toBe("straight"); // across the +-pi seam
  });
});

describe("allowed turns", () => {
  const turns = (j: string, a: string) => [...allowedTurns(N, j, a)].sort();

  it("lists the exits that exist for an approach", () => {
    expect(exitsOf(N, "north", approachesOf(N, "north").find((a) => a.id === "ns:-1")!).length).toBe(2);
    expect(turns("south", "ring:1")).toEqual(["right", "straight"]); // heading west, the stem is to the right
  });

  it("honours the default rules", () => {
    expect(turns("centre", "ns:-1")).toEqual(["left", "straight"]); // from the south: no right
    expect(turns("centre", "ns:1")).toEqual(["right", "straight"]); // from the north: no left
    expect(turns("centre", "ew:1")).toEqual(["left", "right", "straight"]);
    expect(turns("north", "ns:-1")).toEqual(["left", "right"]);
    expect(turns("north", "ring:1")).toEqual(["straight"]); // from the west: no right into the stem
  });

  it("a rule cannot allow a turn that does not exist", () => {
    const bad: Network = { ...N, junctions: N.junctions.map((j) => (j.id === "north" ? { ...j, allowed: { "ns:-1": ["straight", "left"] } } : j)) };
    expect(allowedTurns(bad, "north", "ns:-1")).toEqual(["left"]);
  });

  it("isWrongTurn is true for a forbidden turn and false otherwise", () => {
    expect(isWrongTurn(N, "centre", "ns:-1", "right")).toBe(true);
    expect(isWrongTurn(N, "centre", "ns:-1", "left")).toBe(false);
    expect(isWrongTurn(N, "centre", "ns:-1", "uturn")).toBe(false); // handled elsewhere
  });
});

// a vehicle path through the box, as poses
function drive(junction: string, from: string, to: string, steps = 60) {
  const j = N.junctions.find((x) => x.id === junction)!;
  const a = approachesOf(N, junction).find((x) => x.id === from)!;
  const e = exitsOf(N, junction, a).find((x) => x.id === to)!;
  const poses: { x: number; z: number; heading: number }[] = [];
  const p0 = { x: a.stopLineAt.x, z: a.stopLineAt.z };
  const p1 = { x: j.at[0] + (e.exitAt.x - j.at[0]) * 2, z: j.at[1] + (e.exitAt.z - j.at[1]) * 2 };
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // go to the junction centre, then out to the exit
    const k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const from0 = t < 0.5 ? p0 : { x: j.at[0], z: j.at[1] };
    const to0 = t < 0.5 ? { x: j.at[0], z: j.at[1] } : p1;
    const heading = t < 0.5 ? a.heading : e.heading;
    poses.push({ x: from0.x + (to0.x - from0.x) * k, z: from0.z + (to0.z - from0.z) * k, heading });
  }
  return poses;
}

function run(junction: string, poses: { x: number; z: number; heading: number }[]) {
  let state: Approach | null = null;
  const moves = [];
  for (let i = 1; i < poses.length; i++) {
    const r = moveAt(N, junction, state, poses[i - 1], poses[i]);
    state = r.state;
    if (r.move) moves.push(r.move);
  }
  return moves;
}

describe("moveAt", () => {
  it("reports exactly one move for a crossing, with the turn", () => {
    const moves = run("centre", drive("centre", "ew:1", "ns:1"));
    expect(moves.length).toBe(1);
    expect(moves[0]).toMatchObject({ junction: "centre", turn: "right" });
    expect(moves[0].approach.id).toBe("ew:1");
  });

  it("reports straight on and left", () => {
    expect(run("centre", drive("centre", "ew:1", "ew:1"))[0].turn).toBe("straight");
    expect(run("centre", drive("centre", "ew:1", "ns:-1"))[0].turn).toBe("left");
  });

  it("flags the forbidden exit through isWrongTurn", () => {
    const m = run("centre", drive("centre", "ns:-1", "ew:1"))[0]; // from the south, turning right
    expect(m.turn).toBe("right");
    expect(isWrongTurn(N, m.junction, m.approach.id, m.turn)).toBe(true);
    const ok = run("centre", drive("centre", "ns:-1", "ew:-1"))[0];
    expect(isWrongTurn(N, ok.junction, ok.approach.id, ok.turn)).toBe(false);
  });

  it("reports nothing when the vehicle only touches the box edge and comes back", () => {
    const a = approachesOf(N, "centre").find((x) => x.id === "ew:1")!;
    const y = 250;
    const path = [
      { x: 400 - JUNCTION_BOX_HALF - 3, z: y, heading: a.heading },
      { x: 400 - JUNCTION_BOX_HALF + 1, z: y, heading: a.heading },
      { x: 400 - JUNCTION_BOX_HALF - 3, z: y, heading: a.heading },
    ];
    expect(run("centre", path)).toEqual([]);
  });

  it("reports nothing when reversing out the way it came in", () => {
    const poses = drive("centre", "ew:1", "ew:1").slice(0, 31);
    const back = [...poses, ...poses.slice(0, -1).reverse()];
    expect(run("centre", back)).toEqual([]);
  });

  it("reports nothing for a vehicle that never enters", () => {
    const path = Array.from({ length: 30 }, (_, i) => ({ x: 380 + i, z: 100, heading: E }));
    expect(run("centre", path)).toEqual([]);
  });
});
