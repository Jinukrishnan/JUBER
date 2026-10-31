import type { Network, RoadId } from "../data/network-v1";
import { JUNCTION_BOX_HALF, builtRoads, headingAt, pointAt } from "./network";
import type { AgentKind } from "./trafficTalk";

export type { AgentKind } from "./trafficTalk";

// Other vehicles on the loop: they keep to the left lane of a road, follow the
// vehicle ahead, stop at red lights and take the turns a junction allows. Pure and
// seeded: the same seed always gives the same traffic. Drawing lives in Traffic.tsx.
export const LANE = 3.7; // metres left of the road centreline

export const KINDS: Record<AgentKind, { length: number; width: number; cruise: number }> = {
  bike: { length: 2.1, width: 0.8, cruise: 9 },
  car: { length: 4.4, width: 1.8, cruise: 8.5 },
  auto: { length: 2.7, width: 1.4, cruise: 6.5 },
  bus: { length: 10, width: 2.6, cruise: 7 },
};

const PAINT: Record<AgentKind, string[]> = {
  car: ["#f1f1ef", "#b8bcc2", "#2f6fd0", "#d7263d", "#2f9e6b"],
  auto: ["#16a34a", "#f2c200"],
  bike: ["#16181b", "#c0392b", "#6b7280", "#1d4ed8"],
  bus: ["#c0392b", "#d97706"],
};

export type AgentNext = { junction: string; exitRoad: RoadId; exitDir: 1 | -1; turn: "left" | "straight" | "right" };

export type Agent = {
  id: number;
  kind: AgentKind;
  road: RoadId;
  dir: 1 | -1; // 1 travelling the way the road's points run, -1 against
  s: number; // distance along the road, always measured the way its points run
  speed: number; // m/s, never negative
  cruise: number; // this vehicle's own cruising speed
  hold: number; // seconds left standing still after a hit
  seed: number;
  paint: string;
  waiting: boolean; // stopped at a red light
  braking: boolean; // slowing down: the brake lamps glow
  next: AgentNext | null; // the turn chosen for the next junction
  turns: number; // junctions passed, so each choice is a fresh roll
  hitAt: number; // time of the last contact with the player
};

function mulberry32(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ORDER: AgentKind[] = [
  ...Array<AgentKind>(6).fill("car"),
  ...Array<AgentKind>(3).fill("auto"),
  ...Array<AgentKind>(3).fill("bike"),
  ...Array<AgentKind>(2).fill("bus"),
];
const MIN_SPACING = 25; // metres between two on the same road and direction at the start
const DEPOT_CLEAR = 40;
const JUNCTION_CLEAR = JUNCTION_BOX_HALF + 22;

export function agentPose(n: Network, a: Pick<Agent, "road" | "dir" | "s">): { x: number; z: number; heading: number } {
  const r = builtRoads(n).find((b) => b.road.id === a.road)!;
  const p = pointAt(r, a.s);
  const h = headingAt(r, a.s) + (a.dir === -1 ? Math.PI : 0);
  const heading = Math.atan2(Math.sin(h), Math.cos(h));
  // left of the direction of travel
  return { x: p.x + Math.sin(heading) * LANE, z: p.z - Math.cos(heading) * LANE, heading };
}

export function createTraffic(n: Network, seed: number, avoid: { x: number; z: number }): Agent[] {
  const rnd = mulberry32(seed);
  const roads = builtRoads(n);
  const total = roads.reduce((sum, r) => sum + r.length, 0);
  const agents: Agent[] = [];

  ORDER.forEach((kind, i) => {
    for (let tries = 0; tries < 400; tries++) {
      let u = rnd() * total;
      const road = roads.find((r) => (u -= r.length) < 0) ?? roads[0];
      const dir = (rnd() < 0.5 ? 1 : -1) as 1 | -1;
      const s = rnd() * road.length;
      const cand = { road: road.road.id, dir, s };
      const p = agentPose(n, cand);
      if (Math.hypot(p.x - avoid.x, p.z - avoid.z) < DEPOT_CLEAR) continue;
      if (n.junctions.some((j) => Math.max(Math.abs(p.x - j.at[0]), Math.abs(p.z - j.at[1])) < JUNCTION_CLEAR)) continue;
      const crowded = agents.some((o) => {
        if (o.road !== cand.road || o.dir !== dir) return false;
        let d = Math.abs(o.s - s);
        if (road.road.closed) d = Math.min(d, road.length - d);
        return d < MIN_SPACING;
      });
      if (crowded) continue;
      const palette = PAINT[kind];
      agents.push({
        id: i + 1,
        kind,
        ...cand,
        speed: 0,
        cruise: KINDS[kind].cruise * (0.85 + rnd() * 0.25),
        hold: 0,
        seed: Math.floor(rnd() * 1e9),
        paint: palette[Math.floor(rnd() * palette.length)],
        waiting: false,
        braking: false,
        next: null,
        turns: 0,
        hitAt: -1e9,
      });
      return;
    }
    throw new Error(`could not place a ${kind}`);
  });
  return agents;
}
