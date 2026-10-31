import { describe, expect, it } from "vitest";
import { NETWORK_V1 } from "../data/network-v1";
import { PLACES } from "../data/places-v1";
import { planOfJunction } from "./lights";
import { builtRoads, drivable, nearestOnRoad } from "./network";
import { placeSpot } from "./places";
import { signalAt } from "./signals";
import { KINDS, agentPose, createTraffic, shout, stepTraffic, type Agent, type Player } from "./traffic";
import { LINES } from "./trafficTalk";
import { isWrongTurn } from "./turns";

const N = NETWORK_V1;
const depot = placeSpot(N, PLACES.find((p) => p.id === "depot")!);
const FAR: Player = { x: 5000, z: 5000, heading: 0, speed: 0, length: 4.4, width: 1.8 };
const ring = builtRoads(N).find((r) => r.road.id === "ring")!;
const sOn = (road: string, junction: string) => nearestOnRoad(builtRoads(N).find((r) => r.road.id === road)!, N.junctions.find((j) => j.id === junction)!.at[0], N.junctions.find((j) => j.id === junction)!.at[1]).s;

let nextId = 100;
function mk(over: Partial<Agent>): Agent {
  return {
    id: nextId++, kind: "car", road: "ring", dir: 1, s: 100, speed: 0, cruise: 8.5, hold: 0, seed: 1, paint: "#fff",
    waiting: false, braking: false, reversing: false, passed: null, box: null, boxD: null, arc: null, next: null, turns: 0, hitAt: -1e9, travelled: 0, ...over,
  };
}

function run(agents: Agent[], seconds: number, player: Player = FAR, t0 = 0, dt = 0.1, each?: (t: number) => void) {
  const moves: { junction: string; approachId: string; turn: "left" | "straight" | "right" }[] = [];
  const hits: Agent[] = [];
  for (let t = t0; t < t0 + seconds; t += dt) {
    const r = stepTraffic(N, agents, dt, t, player);
    moves.push(...r.moves);
    hits.push(...r.hits);
    each?.(t);
  }
  return { moves, hits };
}

// when a junction's main (or cross) light is red, green or yellow, and the first second it is red
function timeOf(junction: string, axis: "main" | "cross", light: "red" | "green" | "yellow"): number {
  const plan = planOfJunction(N.junctions.find((j) => j.id === junction)!)!;
  for (let t = 0; t < 120; t += 0.05) {
    const here = signalAt(plan, t)[axis] === light;
    const before = signalAt(plan, t - 0.05)[axis] !== light;
    if (here && before) return t;
  }
  throw new Error("none");
}

const along = (a: Agent, b: Agent) => {
  let d = (b.s - a.s) * a.dir;
  d = ((d % ring.length) + ring.length) % ring.length;
  return d;
};

describe("cruising", () => {
  it("accelerates to its own cruise speed and keeps it on a straight", () => {
    const a = mk({ s: 50, cruise: 8 });
    run([a], 20);
    expect(a.speed).toBeGreaterThan(7.7);
    expect(a.speed).toBeLessThanOrEqual(8.001);
  });

  it("slows for the ring's corners and recovers", () => {
    const a = mk({ s: 640, cruise: 9 }); // the top edge, 80 m before the north-east corner (arc from s=720)
    let onArc = 0;
    let maxOnArc = 0;
    run([a], 25, FAR, 0, 0.1, () => {
      if (a.s > 724 && a.s < 778) {
        onArc++;
        maxOnArc = Math.max(maxOnArc, a.speed);
      }
    });
    expect(onArc).toBeGreaterThan(5);
    expect(maxOnArc).toBeLessThanOrEqual(6.3);
    run([a], 40);
    expect(a.speed).toBeGreaterThan(8);
  });

  it("never reverses", () => {
    const agents = createTraffic(N, 3, depot);
    let min = 0;
    run(agents, 60, FAR, 0, 0.1, () => agents.forEach((a) => (min = Math.min(min, a.speed))));
    expect(min).toBeGreaterThanOrEqual(0);
  });
});

describe("following", () => {
  it("never overlaps in a crowded start, 14 vehicles packed on 150 m, over two minutes", () => {
    const agents = createTraffic(N, 5, depot, 14).map((a, i) => ({ ...a, road: "ring", dir: 1 as const, s: 100 + i * 11, speed: 0 }));
    let worst = Infinity;
    run(agents, 120, FAR, 0, 0.1, () => {
      for (const a of agents) {
        for (const b of agents) {
          if (a === b) continue;
          const d = along(a, b);
          if (d < 60) worst = Math.min(worst, d - (KINDS[a.kind].length + KINDS[b.kind].length) / 2);
        }
      }
    });
    expect(worst).toBeGreaterThan(0.2);
  });

  it("stops behind the player standing in its lane", () => {
    const lead = agentPose(N, { road: "ring", dir: 1, s: 200 });
    const player: Player = { ...lead, speed: 0, length: 4.4, width: 1.8 };
    const a = mk({ s: 100 });
    const r = run([a], 40, player);
    expect(a.s).toBeLessThan(200 - 4.4 - 3);
    expect(a.speed).toBeLessThan(0.1);
    expect(r.hits).toEqual([]);
  });

  it("is not held up by the player in the other lane or on another road", () => {
    const other = agentPose(N, { road: "ring", dir: -1, s: 200 });
    const a = mk({ s: 100 });
    run([a], 25, { ...other, speed: 0, length: 4.4, width: 1.8 });
    expect(a.s).toBeGreaterThan(220);
    const b = mk({ s: 100 });
    run([b], 25, { x: 400, z: 120, heading: Math.PI / 2, speed: 0, length: 4.4, width: 1.8 });
    expect(b.s).toBeGreaterThan(220);
  });

  it("sees a vehicle ahead on the road it is about to turn onto", () => {
    // ring heading south down the right edge, turning right (west) onto Temple Road at the east junction
    const sEast = sOn("ring", "east");
    const a = mk({ s: sEast - 40, speed: 6, next: { junction: "east", exitRoad: "ew", exitDir: -1, turn: "right" } });
    const lead = mk({ road: "ew", dir: -1, s: 790, hold: 1000 });
    run([a, lead], 30);
    expect(a.road).toBe("ring");
    expect(a.s).toBeLessThan(sEast);
    expect(a.speed).toBeLessThan(0.2);
  });
});

describe("signals", () => {
  const sNorth = sOn("ring", "north");

  it("stops at the stop line on red, then goes on green", () => {
    const a = mk({ s: sNorth - 60, speed: 8 });
    const tRed = timeOf("north", "main", "red");
    run([a], 15, FAR, tRed + 0.2);
    expect(a.road).toBe("ring");
    expect(a.s + KINDS.car.length / 2).toBeLessThanOrEqual(sNorth - 15 + 0.01);
    expect(a.waiting).toBe(true);
    // the next green for the main road
    const plan = planOfJunction(N.junctions.find((j) => j.id === "north")!)!;
    let tGreen = tRed + 15;
    while (signalAt(plan, tGreen).main !== "green") tGreen += 0.05;
    run([a], 8, FAR, tGreen);
    expect(a.turns).toBe(1);
  });

  it("lets a queue of four away in order on green", () => {
    const queue = [0, 1, 2, 3].map((i) => mk({ s: sNorth - 62 + i * 9, speed: 6, kind: "car" })).reverse();
    const tRed = timeOf("north", "main", "red");
    const order: number[] = [];
    const seen = new Set<number>();
    run(queue, 14, FAR, tRed + 0.2);
    const plan = planOfJunction(N.junctions.find((j) => j.id === "north")!)!;
    let tGreen = tRed + 14;
    while (signalAt(plan, tGreen).main !== "green") tGreen += 0.05;
    run(queue, 25, FAR, tGreen, 0.1, () => {
      for (const a of queue) if (a.turns > 0 && !seen.has(a.id)) {
        seen.add(a.id);
        order.push(a.id);
      }
    });
    // queue[0] is the front of the line (largest s)
    expect(order).toEqual(queue.map((a) => a.id));
  });

  it("goes through on yellow when it is too close to stop", () => {
    const a = mk({ s: sNorth - 15 - 2.2 - 3, speed: 8 });
    const tYellow = timeOf("north", "main", "yellow");
    run([a], 1.5, FAR, tYellow + 0.1);
    expect(a.speed).toBeGreaterThan(5);
  });

  it("is not stopped by a light on the other axis", () => {
    const a = mk({ s: sNorth - 80, speed: 8 });
    const tGreen = timeOf("north", "main", "green");
    run([a], 12, FAR, tGreen);
    expect(a.turns).toBe(1);
  });
});

describe("ten minutes of traffic", () => {
  function history(seed: number) {
    const agents = createTraffic(N, seed, depot);
    const moves: { junction: string; approachId: string; turn: "left" | "straight" | "right" }[] = [];
    let worst = Infinity;
    let off = 0;
    for (let t = 0; t < 600; t += 0.2) {
      const r = stepTraffic(N, agents, 0.2, t, FAR);
      moves.push(...r.moves);
      if (Math.round(t * 5) % 5 === 0) {
        for (const a of agents) {
          const p = agentPose(N, a);
          if (!drivable(N, p.x, p.z)) off++;
          for (const b of agents) {
            if (a === b || a.road !== b.road || a.dir !== b.dir) continue;
            let d = (b.s - a.s) * a.dir;
            const L = builtRoads(N).find((x) => x.road.id === a.road)!.length;
            if (builtRoads(N).find((x) => x.road.id === a.road)!.road.closed) d = ((d % L) + L) % L;
            if (d > 0 && d < 40) worst = Math.min(worst, d - (KINDS[a.kind].length + KINDS[b.kind].length) / 2);
          }
        }
      }
    }
    return { agents, moves, worst, off };
  }

  const h = history(11);

  it("never makes a turn a junction forbids", () => {
    expect(h.moves.length).toBeGreaterThan(30);
    for (const m of h.moves) expect(isWrongTurn(N, m.junction, m.approachId, m.turn), `${m.junction} ${m.approachId} ${m.turn}`).toBe(false);
  });

  it("keeps every vehicle on the road and out of the one in front", () => {
    expect(h.off).toBe(0);
    expect(h.worst).toBeGreaterThan(-0.05);
  });

  it("never gridlocks: every vehicle covers real ground", () => {
    for (const a of h.agents) expect(a.travelled, `${a.kind} ${a.id}`).toBeGreaterThan(800);
  });

  it("takes every kind of turn somewhere in ten minutes", () => {
    const kinds = new Set(h.moves.map((m) => m.turn));
    expect(kinds.has("straight")).toBe(true);
    expect(kinds.has("left") || kinds.has("right")).toBe(true);
  });

  it("repeats exactly for the same seed", () => {
    const again = history(11);
    expect(again.agents.map((a) => [a.road, a.dir, Math.round(a.s * 1000)])).toEqual(h.agents.map((a) => [a.road, a.dir, Math.round(a.s * 1000)]));
  });
});

describe("contact", () => {
  const playerAt = (a: Agent, speed: number): Player => ({ ...agentPose(N, a), speed, length: 4.4, width: 1.8 });

  it("is a hit at speed, once, and not again at once", () => {
    const a = mk({ s: 300 });
    const first = run([a], 0.1, playerAt(a, 5));
    expect(first.hits).toHaveLength(1);
    const next = run([a], 0.5, playerAt(a, 5), 0.1);
    expect(next.hits).toEqual([]);
  });

  it("is not a hit when the player is nearly stopped", () => {
    const a = mk({ s: 300, speed: 0 });
    expect(run([a], 0.1, playerAt(a, 1)).hits).toEqual([]);
  });

  it("is not a hit from the other lane", () => {
    const a = mk({ s: 300 });
    const o = agentPose(N, { road: "ring", dir: -1, s: 300 });
    expect(run([a], 0.1, { ...o, speed: 6, length: 4.4, width: 1.8 }).hits).toEqual([]);
  });

  it("stops the hit vehicle for four seconds, then it drives on; a second hit waits out the cooldown", () => {
    const a = mk({ s: 300, speed: 0 });
    run([a], 0.1, playerAt(a, 5), 10);
    expect(a.hold).toBeGreaterThan(3.5);
    run([a], 3, FAR, 10.1);
    expect(a.speed).toBe(0);
    run([a], 3, FAR, 13.1);
    expect(a.speed).toBeGreaterThan(1);
    const again = mk({ s: 300, speed: 0, hitAt: 10 });
    expect(run([again], 0.1, playerAt(again, 5), 15).hits).toEqual([]);
    expect(run([again], 0.1, playerAt(again, 5), 19).hits).toHaveLength(1);
  });

  it("returns both vehicles when two are hit at once", () => {
    const a = mk({ s: 300 });
    const b = mk({ s: 302 });
    const r = run([a, b], 0.1, { ...agentPose(N, { road: "ring", dir: 1, s: 301 }), speed: 6, length: 4.4, width: 1.8 });
    expect(r.hits).toHaveLength(2);
  });

  it("shouts about the signal if it was waiting at red, otherwise a general line", () => {
    const waiting = mk({ waiting: true, kind: "auto", seed: 7 });
    const moving = mk({ waiting: false, kind: "auto", seed: 7 });
    expect(LINES.auto.waiting.map((l) => l.ml)).toContain(shout(waiting).ml);
    expect(LINES.auto.general.map((l) => l.ml)).toContain(shout(moving).ml);
    expect(shout(waiting).pitch).toBeGreaterThanOrEqual(0.85);
  });

});

describe("review fixes", () => {
  const centreS = (road: string) => sOn(road, "centre");

  it("crosses a junction it is a hair's breadth from, at the end of an open road", () => {
    const a = mk({ road: "ns", dir: -1, s: 0.0005, speed: 5 });
    run([a], 8, FAR, timeOf("north", "cross", "green"));
    expect(a.road).toBe("ring");
    expect(a.turns).toBe(1);
  });

  it("never parks at the end of an open road, over ten minutes at 60 frames a second, for several seeds", () => {
    for (const seed of [1, 6, 8]) {
      const agents = createTraffic(N, seed, depot);
      const roads = new Map(builtRoads(N).map((r) => [r.road.id, r]));
      let stuck = 0;
      for (let step = 0; step < 600 * 60; step++) {
        stepTraffic(N, agents, 1 / 60, step / 60, FAR);
        if (step % 120 === 0) {
          for (const a of agents) {
            const r = roads.get(a.road)!;
            if (!r.road.closed && (a.s <= 0.001 || a.s >= r.length - 0.001)) stuck++;
          }
        }
      }
      expect(stuck, `seed ${seed}`).toBe(0);
    }
  }, 60000);

  it("lets one of two vehicles merging into the same exit lane go first, never both together", () => {
    // at the centre junction both Station Road approaches are green together; one turns right, one left, both into Temple Road westbound
    const tGreen = timeOf("centre", "cross", "green");
    const sC = centreS("ns");
    const a = mk({ road: "ns", dir: 1, s: sC - 40, speed: 0, next: { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "right" } });
    const b = mk({ road: "ns", dir: -1, s: sC + 40, speed: 0, next: { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "left" } });
    const agents = [a, b];
    let worst = Infinity;
    run(agents, 25, FAR, tGreen, 0.1, () => {
      if (a.road === "ew" && b.road === "ew" && a.dir === b.dir) {
        worst = Math.min(worst, Math.abs(a.s - b.s) - (KINDS[a.kind].length + KINDS[b.kind].length) / 2);
      }
    });
    expect(a.road).toBe("ew");
    expect(b.road).toBe("ew");
    expect(worst).toBeGreaterThan(0.5);
  });

  it("does not enter a junction it cannot leave: it waits at the line behind a stopped vehicle on its exit road", () => {
    const sEast = sOn("ring", "east");
    const a = mk({ s: sEast - 40, speed: 6, next: { junction: "east", exitRoad: "ew", exitDir: -1, turn: "right" } });
    const lead = mk({ road: "ew", dir: -1, s: 800 - 12, hold: 1000 });
    run([a, lead], 40, FAR, timeOf("east", "main", "green"));
    expect(a.road).toBe("ring");
    expect(a.s + KINDS.car.length / 2).toBeLessThanOrEqual(sEast - 15 + 0.01);
  });

  it("is not driven through a player stopped across its lane, or one stopped past the junction", () => {
    const lane = agentPose(N, { road: "ring", dir: 1, s: 200 });
    const across: Player = { ...lane, heading: lane.heading + (70 * Math.PI) / 180, speed: 0, length: 4.4, width: 1.8 };
    const a = mk({ s: 100, speed: 8 });
    const r = run([a], 40, across);
    expect(r.hits).toEqual([]);
    expect(a.s).toBeLessThan(200);

    const facing: Player = { ...lane, heading: lane.heading + Math.PI, speed: 0, length: 4.4, width: 1.8 };
    const b = mk({ s: 100, speed: 8 });
    run([b], 40, facing);
    expect(b.s).toBeLessThan(200);

    // stopped on the exit road, 7 m past the east junction, while the light is green
    const sEast = sOn("ring", "east");
    const exitPose = agentPose(N, { road: "ew", dir: -1, s: 793 });
    const c = mk({ s: sEast - 30, speed: 8, next: { junction: "east", exitRoad: "ew", exitDir: -1, turn: "right" } });
    const rc = run([c], 30, { ...exitPose, speed: 0, length: 4.4, width: 1.8 }, timeOf("east", "main", "green"));
    expect(rc.hits).toEqual([]);
  });
});

describe("turning through a junction", () => {
  function sample(from: { road: string; dir: 1 | -1; s: number }, next: Agent["next"], light: "cross" | "main", junction: string) {
    const a = mk({ ...from, speed: 7, next });
    const poses: { x: number; z: number; heading: number }[] = [];
    const t0 = timeOf(junction, light, "green");
    for (let t = t0; t < t0 + 14; t += 0.05) {
      stepTraffic(N, [a], 0.05, t, FAR);
      poses.push(agentPose(N, a));
    }
    return { a, poses };
  }

  const cases: [string, { road: string; dir: 1 | -1; s: number }, Agent["next"], "cross" | "main", string][] = [
    ["a left turn from the south at the centre", { road: "ns", dir: -1, s: 250 + 40 }, { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "left" }, "cross", "centre"],
    ["a right turn from the north at the centre", { road: "ns", dir: 1, s: 250 - 40 }, { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "right" }, "cross", "centre"],
    ["a left turn from the west at the centre", { road: "ew", dir: 1, s: 400 - 40 }, { junction: "centre", exitRoad: "ns", exitDir: -1, turn: "left" }, "main", "centre"],
    ["a right turn from the west at the centre", { road: "ew", dir: 1, s: 400 - 40 }, { junction: "centre", exitRoad: "ns", exitDir: 1, turn: "right" }, "main", "centre"],
  ];

  for (const [name, from, next, light, junction] of cases) {
    it(`curves round ${name}: no jump, no spin, ends square to the exit road, always on the road`, () => {
      const { a, poses } = sample(from, next, light, junction);
      expect(a.road).toBe(next!.exitRoad);
      let jump = 0;
      let spin = 0;
      for (let i = 1; i < poses.length; i++) {
        jump = Math.max(jump, Math.hypot(poses[i].x - poses[i - 1].x, poses[i].z - poses[i - 1].z));
        spin = Math.max(spin, Math.abs(Math.atan2(Math.sin(poses[i].heading - poses[i - 1].heading), Math.cos(poses[i].heading - poses[i - 1].heading))));
      }
      expect(jump).toBeLessThan(0.05 * 9.5);
      expect(spin).toBeLessThan(0.1);
      for (const p of poses) expect(drivable(N, p.x, p.z), `${p.x.toFixed(1)},${p.z.toFixed(1)}`).toBe(true);
      const last = poses[poses.length - 1];
      const exitHeading = agentPose(N, { road: next!.exitRoad, dir: next!.exitDir, s: a.s }).heading;
      expect(Math.abs(Math.atan2(Math.sin(last.heading - exitHeading), Math.cos(last.heading - exitHeading)))).toBeLessThan(0.05);
    });
  }
});

describe("a player beside a road is not on it", () => {
  it("a player standing on the ring just beyond the start of Temple Road does not hold up a car turning onto it", () => {
    const sWest = sOn("ring", "west");
    // southbound on the ring (dir -1) from the north, turning left (east) onto Temple Road
    const a = mk({ s: sWest + 30, dir: -1, speed: 6, next: { junction: "west", exitRoad: "ew", exitDir: 1, turn: "left" } });
    const player: Player = { x: -4, z: 249.7, heading: -Math.PI / 2, speed: 0, length: 4.4, width: 1.8 };
    run([a], 40, player, timeOf("west", "cross", "green"));
    expect(a.road).toBe("ew");
  });
});

describe("a long vehicle on green is not held up by a short one waiting at red", () => {
  it("a bus at its stop line turns onto the exit a car on the red cross road is also waiting for", () => {
    const sC = sOn("ns", "centre");
    const sEw = sOn("ew", "centre");
    const bus = mk({ kind: "bus", road: "ns", dir: -1, s: sC + 15 + 5.5 + 1.5, speed: 0, cruise: 7, next: { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "left" } });
    // a car at the red stop line of Temple Road westbound, going straight on onto the same exit
    const car = mk({ road: "ew", dir: -1, s: sEw + 15 + 2.2 + 1.5, speed: 0, next: { junction: "centre", exitRoad: "ew", exitDir: -1, turn: "straight" } });
    const tGreen = timeOf("centre", "cross", "green");
    run([bus, car], 12, FAR, tGreen);
    expect(car.waiting).toBe(true);
    expect(bus.turns).toBe(1);
  });
});

describe("a full town", () => {
  it("never overlaps in a crowded start with all the vehicles of a busy day, over two minutes", () => {
    const agents = createTraffic(N, 5, depot).map((a, i) => ({ ...a, road: "ring", dir: 1 as const, s: 20 + i * 12, speed: 0 }));
    expect(agents.length).toBeGreaterThanOrEqual(45);
    let worst = Infinity;
    run(agents, 120, FAR, 0, 0.1, () => {
      for (const a of agents) {
        for (const b of agents) {
          if (a === b || a.road !== b.road || a.dir !== b.dir) continue;
          const d = along(a, b);
          if (d < 60) worst = Math.min(worst, d - (KINDS[a.kind].length + KINDS[b.kind].length) / 2);
        }
      }
    });
    expect(worst).toBeGreaterThan(-0.05);
  });
});
