import { describe, expect, it } from "vitest";
import { ACTIVE_PLACES, NETWORK } from "../world";
import { buildGraph, route } from "./roadgraph";
import { placeSpot } from "./places";
import { TRAFFIC_COUNT, agentPose, createTraffic, stepTraffic, type Player } from "./traffic";
import { isWrongTurn } from "./turns";

const N = NETWORK;
const spot = (id: string) => placeSpot(N, ACTIVE_PLACES.find((p) => p.id === id)!);
const place = (id: string) => ACTIVE_PLACES.find((p) => p.id === id)!;
const graph = buildGraph(N, ACTIVE_PLACES);
const FAR: Player = { x: 9000, z: 9000, heading: 0, speed: 0, length: 4.4, width: 1.8 };

describe("routes on the big network", () => {
  it("exist between every pair of places and use no forbidden turn", () => {
    const bad: string[] = [];
    for (const a of ACTIVE_PLACES) {
      for (const b of ACTIVE_PLACES) {
        if (a === b) continue;
        const r = route(graph, placeSpot(N, a), b);
        if (!(r.length > 0) || !Number.isFinite(r.length)) bad.push(`${a.id} -> ${b.id}: length ${r.length}`);
        for (const m of r.moves) if (isWrongTurn(N, m.junction, m.approachId, m.turn)) bad.push(`${a.id} -> ${b.id}: ${m.turn} at ${m.junction} from ${m.approachId}`);
      }
    }
    expect(bad).toEqual([]);
  }, 60000);

  it("make the depot to the stadium a real drive", () => {
    expect(route(graph, spot("depot"), place("stadium")).length).toBeGreaterThan(1500);
  });

  it("never turn right off the avenue going east at Park West Street", () => {
    const rules = N.junctions.find((j) => j.at[0] === 1500 && j.at[1] === 250)!;
    expect(rules.allowed["ew:1"]).toEqual(["left", "straight"]);
    for (const a of ACTIVE_PLACES) {
      for (const b of ACTIVE_PLACES) {
        if (a === b) continue;
        for (const m of route(graph, placeSpot(N, a), b).moves) {
          if (m.junction === rules.id && m.approachId === "ew:1") expect(m.turn).not.toBe("right");
        }
      }
    }
  }, 60000);
});

describe("traffic on the big network", () => {
  it("is 80 vehicles", () => {
    expect(TRAFFIC_COUNT).toBe(80);
  });

  it("starts without overlaps and keeps clear of the depot", () => {
    const depot = spot("depot");
    const agents = createTraffic(N, 7, depot);
    expect(agents).toHaveLength(80);
    const poses = agents.map((a) => agentPose(N, a));
    for (let i = 0; i < poses.length; i++) {
      expect(Math.hypot(poses[i].x - depot.x, poses[i].z - depot.z)).toBeGreaterThan(25);
      for (let j = i + 1; j < poses.length; j++) expect(Math.hypot(poses[i].x - poses[j].x, poses[i].z - poses[j].z)).toBeGreaterThan(6);
    }
  });

  it("steps all 80 in a small fraction of a frame", () => {
    const agents = createTraffic(N, 4, spot("depot"));
    const t0 = performance.now();
    const frames = 600;
    for (let i = 0; i < frames; i++) stepTraffic(N, agents, 1 / 60, i / 60, FAR);
    const perFrame = (performance.now() - t0) / frames;
    console.log(`80 vehicles: ${perFrame.toFixed(2)} ms per frame`);
    expect(perFrame).toBeLessThan(3);
  });

  it("keeps moving for ten minutes: no long overlaps, no gridlock, no forbidden turn", () => {
    const agents = createTraffic(N, 11, spot("depot"));
    const bad: string[] = [];
    const overlapFor = new Map<string, number>();
    let before: { x: number; z: number }[] = [];
    for (let step = 0; step < 6000; step++) {
      const t = step * 0.1;
      if (step === 4800) before = agents.map((a) => agentPose(N, a)); // the last two minutes
      const { moves } = stepTraffic(N, agents, 0.1, t, FAR);
      for (const m of moves) if (isWrongTurn(N, m.junction, m.approachId, m.turn)) bad.push(`${m.turn} at ${m.junction} from ${m.approachId}`);
      if (step % 10 === 0) {
        const poses = agents.map((a) => agentPose(N, a));
        for (let i = 0; i < agents.length; i++) {
          for (let j = i + 1; j < agents.length; j++) {
            const key = `${agents[i].id}|${agents[j].id}`;
            if (Math.hypot(poses[i].x - poses[j].x, poses[i].z - poses[j].z) < 1.5) overlapFor.set(key, (overlapFor.get(key) ?? 0) + 1);
            else overlapFor.delete(key);
          }
        }
        for (const [key, secs] of overlapFor) if (secs > 20) bad.push(`overlap ${key} for ${secs} s at t=${t.toFixed(0)}`);
      }
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // stuck: not moved 5 m in two minutes (a red light lasts about a minute), judged by position
    // (`travelled` also counts speed while held at a road end, so it cannot show this)
    const after = agents.map((a) => agentPose(N, a));
    const stuck = agents.filter((_, i) => Math.hypot(after[i].x - before[i].x, after[i].z - before[i].z) < 5).length;
    expect(stuck / agents.length).toBeLessThanOrEqual(0.05);
  }, 120000);
});
