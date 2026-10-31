import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { RED_GRACE_S, lightFor, nextSignalAhead, planOfJunction, redViolationAt, untilChangeFor } from "./lights";
import { redAge, signalAt } from "./signals";
import { approachesOf, allowedTurns } from "./turns";

const N = NETWORK_V1;

function timeWhen(junctionId: string, axis: "main" | "cross", light: "green" | "yellow" | "red", minRedAge = 0): number {
  const plan = planOfJunction(N.junctions.find((j) => j.id === junctionId)!)!;
  for (let t = 0; t < 200; t += 0.1) {
    if (signalAt(plan, t)[axis] === light && (light !== "red" || redAge(plan, t, axis) >= minRedAge)) return t;
  }
  throw new Error("no such time");
}

// the vehicle front crosses the stop line between the two poses
function crossing(junctionId: string, approachId: string, half = 5) {
  const a = approachesOf(N, junctionId).find((x) => x.id === approachId)!;
  const ux = Math.cos(a.heading);
  const uz = Math.sin(a.heading);
  const pose = (f: number) => ({ x: a.stopLineAt.x + ux * (f - half), z: a.stopLineAt.z + uz * (f - half), heading: a.heading });
  return { a, before: pose(-0.5), after: pose(0.5), pose };
}

describe("light per approach", () => {
  it("a T never shows the stem and a ring approach both green or both non-red", () => {
    for (const id of ["north", "south", "west", "east"]) {
      const j = N.junctions.find((x) => x.id === id)!;
      const ax = approachesOf(N, id);
      const ring = ax.find((a) => a.road === "ring")!;
      const stem = ax.find((a) => a.road !== "ring")!;
      for (let t = 0; t < 120; t += 0.5) {
        const r = lightFor(j, t, ring.axis);
        const s = lightFor(j, t, stem.axis);
        expect(r === "green" && s === "green").toBe(false);
        expect(r !== "red" && s !== "red").toBe(false);
      }
    }
  });

  it("untilChangeFor counts down to the next colour", () => {
    const j = N.junctions[0];
    const t = timeWhen("north", "main", "green");
    expect(untilChangeFor(j, t, "main")).toBeGreaterThan(0);
  });
});

describe("red light on every approach", () => {
  for (const j of N.junctions) {
    for (const a of approachesOf(N, j.id)) {
      it(`${j.id} ${a.id}: fines on red, not on green or yellow`, () => {
        const { before, after } = crossing(j.id, a.id);
        const red = timeWhen(j.id, a.axis, "red", RED_GRACE_S + 0.1);
        expect(redViolationAt(N, j.id, a.id, before, after, red)).toBe(true);
        expect(redViolationAt(N, j.id, a.id, before, after, timeWhen(j.id, a.axis, "green"))).toBe(false);
        expect(redViolationAt(N, j.id, a.id, before, after, timeWhen(j.id, a.axis, "yellow"))).toBe(false);
      });
    }
  }

  it("gives a light that has only just turned red a grace", () => {
    const { before, after } = crossing("centre", "ew:1");
    const plan = planOfJunction(N.junctions.find((j) => j.id === "centre")!)!;
    let t = timeWhen("centre", "main", "red", 0);
    // first moment of red
    while (redAge(plan, t - 0.05, "main") > 0 && redAge(plan, t - 0.05, "main") < redAge(plan, t, "main")) t -= 0.05;
    expect(redViolationAt(N, "centre", "ew:1", before, after, t + 0.05)).toBe(false);
  });

  it("does not fine when reversing across the line", () => {
    const { before, after } = crossing("centre", "ew:1");
    const red = timeWhen("centre", "main", "red", 1);
    expect(redViolationAt(N, "centre", "ew:1", after, before, red)).toBe(false);
  });

  it("does not fine a vehicle facing the other way across the line", () => {
    const { before, after } = crossing("centre", "ew:1");
    const red = timeWhen("centre", "main", "red", 1);
    const flip = (p: typeof before) => ({ ...p, heading: p.heading + Math.PI });
    expect(redViolationAt(N, "centre", "ew:1", flip(before), flip(after), red)).toBe(false);
  });

  it("does not fine a junction without a signal", () => {
    const open = { ...N, junctions: N.junctions.map((j) => (j.id === "centre" ? { ...j, signal: false as const } : j)) };
    const { before, after } = crossing("centre", "ew:1");
    expect(redViolationAt(open, "centre", "ew:1", before, after, timeWhen("centre", "main", "red", 1))).toBe(false);
  });
});

describe("nextSignalAhead", () => {
  it("sees the signal ahead with the approach's allowed turns", () => {
    const { a, pose } = crossing("centre", "ns:-1");
    const p = pose(-100);
    const s = nextSignalAhead(N, p, 0)!;
    expect(s.id).toBe("centre");
    expect(s.approachId).toBe("ns:-1");
    expect(s.distance).toBeCloseTo(100, 4);
    expect(s.turns).toEqual(allowedTurns(N, "centre", a.id));
    expect(["green", "yellow", "red"]).toContain(s.light);
  });

  it("ignores a signal behind and one too far off", () => {
    const { pose } = crossing("centre", "ew:1");
    expect(nextSignalAhead(N, pose(40), 0)?.id).not.toBe("centre"); // already past the line
    expect(nextSignalAhead(N, pose(-300), 0)?.id).not.toBe("centre"); // beyond the sight distance
  });

  it("ignores junctions on a road the vehicle is not on", () => {
    // on the ring top edge near x=200 heading east: the next signal is north (400,0), not centre
    const s = nextSignalAhead(N, { x: 200, z: 3, heading: 0 }, 0)!;
    expect(s.id).toBe("north");
    expect(s.approachId).toBe("ring:1");
  });

  it("returns null in open country", () => {
    expect(nextSignalAhead(N, { x: 200, z: 120, heading: 0 }, 0)).toBeNull();
  });
});
