import type { Junction, Network, RoadId } from "../data/network-v1";
import { overlaps } from "./footprint";
import { lightFor } from "./lights";
import { JUNCTION_BOX_HALF, builtRoads, headingAt, nearestOnRoad, pointAt, type BuiltRoad } from "./network";
import { lineFor, pitchFor, type AgentKind } from "./trafficTalk";
import { allowedTurns, approachesOf, exitsOf, type Approach } from "./turns";

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
  reversing: false; // never: traffic does not reverse (the lamp source of the models)
  next: AgentNext | null; // the turn chosen for the next junction
  turns: number; // junctions passed, so each choice is a fresh roll
  hitAt: number; // time of the last contact with the player
  travelled: number; // metres driven
  passed: string | null; // the junction it last drove through, so it is not crossed twice
  box: AgentNext | null; // set while it is between its stop line and the junction centre: its exit is claimed
  boxD: number | null; // metres driven since it entered the junction box on a turn, while it follows `arc`
  arc: TurnArc | null; // the curve it follows through the box
};

// A turn through a junction box: a quadratic curve from the approach lane to the exit lane.
export type TurnArc = { x0: number; z0: number; cx: number; cz: number; x1: number; z1: number; us: number[] }; // us: the curve parameter at equal steps of distance

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

export function agentPose(n: Network, a: Pick<Agent, "road" | "dir" | "s"> & Partial<Pick<Agent, "arc" | "boxD">>): { x: number; z: number; heading: number } {
  if (a.arc && a.boxD !== null && a.boxD !== undefined) {
    const { x0, z0, cx, cz, x1, z1 } = a.arc;
    const f = Math.max(0, Math.min(1, a.boxD / (2 * JUNCTION_BOX_HALF))) * (a.arc.us.length - 1);
    const i = Math.min(a.arc.us.length - 2, Math.floor(f));
    const u = a.arc.us[i] + (a.arc.us[i + 1] - a.arc.us[i]) * (f - i);
    const w = 1 - u;
    const tx = 2 * w * (cx - x0) + 2 * u * (x1 - cx);
    const tz = 2 * w * (cz - z0) + 2 * u * (z1 - cz);
    return { x: w * w * x0 + 2 * w * u * cx + u * u * x1, z: w * w * z0 + 2 * w * u * cz + u * u * z1, heading: Math.atan2(tz, tx) };
  }
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
        reversing: false,
        next: null,
        turns: 0,
        hitAt: -1e9,
        travelled: 0,
        passed: null,
        box: null,
        boxD: null,
        arc: null,
      });
      return;
    }
    throw new Error(`could not place a ${kind}`);
  });
  return agents;
}

// Evenly spaced steps of distance along the curve, so a vehicle moves along it at its own speed.
function arcWithTable(a: Omit<TurnArc, "us">): TurnArc {
  const N = 48;
  const pts: { x: number; z: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const w = 1 - u;
    pts.push({ x: w * w * a.x0 + 2 * w * u * a.cx + u * u * a.x1, z: w * w * a.z0 + 2 * w * u * a.cz + u * u * a.z1 });
  }
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  const us: number[] = [];
  const STEPS = 16;
  let k = 0;
  for (let j = 0; j <= STEPS; j++) {
    const target = (cum[N] * j) / STEPS;
    while (k < N - 1 && cum[k + 1] < target) k++;
    const span = cum[k + 1] - cum[k] || 1;
    us.push((k + (target - cum[k]) / span) / N);
  }
  return { ...a, us };
}

// ---- driving ----
export type Player = { x: number; z: number; heading: number; speed: number; length: number; width: number };
export type Move = { junction: string; approachId: string; turn: "left" | "straight" | "right" };

export const MIN_HIT_SPEED = 1.5; // m/s of closing speed
export const HIT_COOLDOWN_S = 8;
export const HIT_STOP_S = 4;
const MIN_GAP = 6; // metres between bumpers when stopped...
const TIME_GAP = 0.8; // ...plus this many seconds of speed
const BRAKE = 5; // comfortable braking, m/s2
const HARD = 8; // hardest braking
const ACCEL = 2.5;
const ARC_SPEED = 6; // speed round the corners of the ring
const TURN_SPEED = 6; // speed through a junction on a left or right turn
const LOOK = 100; // how far ahead a leader matters
const STOP_LINE = JUNCTION_BOX_HALF + 7; // metres from the junction centre to the stop line
const CHOOSE_AT = 120; // choose the next turn this far from the junction

type ExitInfo = { road: RoadId; dir: 1 | -1; turn: "left" | "straight" | "right"; s: number };
type Ctx = {
  roads: Map<string, BuiltRoad>;
  junction: Map<string, Junction>;
  onRoad: Map<string, { id: string; s: number }[]>;
  approach: Map<string, Approach>;
  exits: Map<string, ExitInfo[]>;
  junctionS: Map<string, number>; // `${junction}|${road}`
};
const ctxCache = new WeakMap<Network, Ctx>();

function ctxFor(n: Network): Ctx {
  let c = ctxCache.get(n);
  if (c) return c;
  const roads = new Map(builtRoads(n).map((r) => [r.road.id, r]));
  const junction = new Map(n.junctions.map((j) => [j.id, j]));
  const onRoad = new Map<string, { id: string; s: number }[]>();
  const junctionS = new Map<string, number>();
  for (const j of n.junctions) {
    for (const id of j.roads) {
      const s = nearestOnRoad(roads.get(id)!, j.at[0], j.at[1]).s;
      junctionS.set(`${j.id}|${id}`, s);
      const list = onRoad.get(id) ?? [];
      list.push({ id: j.id, s });
      onRoad.set(id, list);
    }
  }
  const approach = new Map<string, Approach>();
  const exits = new Map<string, ExitInfo[]>();
  for (const j of n.junctions) {
    for (const a of approachesOf(n, j.id)) {
      const key = `${j.id}|${a.id}`;
      approach.set(key, a);
      const allowed = allowedTurns(n, j.id, a.id);
      exits.set(
        key,
        exitsOf(n, j.id, a)
          .filter((e) => e.turn !== "uturn" && allowed.includes(e.turn))
          .map((e) => ({ road: e.road, dir: e.dir, turn: e.turn as ExitInfo["turn"], s: junctionS.get(`${j.id}|${e.road}`)! })),
      );
    }
  }
  c = { roads, junction, onRoad, approach, exits, junctionS };
  ctxCache.set(n, c);
  return c;
}

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// metres to go from s0 to s1 travelling `dir` (round the loop on a closed road); Infinity if behind on an open road
function alongDir(r: BuiltRoad, s0: number, s1: number, dir: 1 | -1): number {
  const d = (s1 - s0) * dir;
  if (r.road.closed) return ((d % r.length) + r.length) % r.length;
  return d >= -1e-6 ? Math.max(0, d) : Infinity;
}

function mix(seed: number, salt: number): number {
  let h = Math.imul((seed | 0) ^ salt, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

function nextJunction(ctx: Ctx, a: Agent): { id: string; s: number; d: number } | null {
  const road = ctx.roads.get(a.road)!;
  let best: { id: string; s: number; d: number } | null = null;
  for (const j of ctx.onRoad.get(a.road) ?? []) {
    let d = alongDir(road, a.s, j.s, a.dir);
    if (!Number.isFinite(d)) continue;
    if (d < 1e-3 && a.passed === j.id) d = road.road.closed ? road.length : Infinity; // the one just passed
    if (Number.isFinite(d) && (!best || d < best.d)) best = { id: j.id, s: j.s, d };
  }
  return best;
}

function chooseExit(ctx: Ctx, junction: string, approachId: string, seed: number, turns: number): ExitInfo | null {
  const list = ctx.exits.get(`${junction}|${approachId}`) ?? [];
  if (list.length === 0) return null;
  const straight = list.filter((e) => e.turn === "straight");
  const others = list.filter((e) => e.turn !== "straight");
  if (straight.length && (others.length === 0 || mix(seed, turns * 2 + 1) < 0.6)) return straight[0];
  return others[Math.floor(mix(seed, turns * 2 + 2) * others.length)];
}

// metres from the front of `a` to the back of the nearest leader, or Infinity
function gapAhead(ctx: Ctx, agents: Agent[], a: Agent, nj: { id: string; d: number } | null, player: Player): number {
  const road = ctx.roads.get(a.road)!;
  const la = KINDS[a.kind].length;
  let gap = Infinity;
  for (const b of agents) {
    if (b === a) continue;
    const lb = KINDS[b.kind].length;
    if (b.road === a.road && b.dir === a.dir) {
      const d = alongDir(road, a.s, b.s, a.dir);
      if (d > 1e-6 && d < LOOK) gap = Math.min(gap, d - (la + lb) / 2);
    } else if (a.next && nj && nj.id === a.next.junction && b.road === a.next.exitRoad && b.dir === a.next.exitDir) {
      const exitRoad = ctx.roads.get(b.road)!;
      const db = alongDir(exitRoad, ctx.junctionS.get(`${nj.id}|${b.road}`)!, b.s, b.dir);
      if (db < LOOK) gap = Math.min(gap, nj.d + db - (la + lb) / 2);
    }
  }
  // the player, when in this lane, whichever way it faces (stopped across the lane or the wrong way is still in the way)
  const inLane = (r: BuiltRoad, dir: 1 | -1) => {
    const near = nearestOnRoad(r, player.x, player.z);
    return near.distance > 0.5 && Math.abs(near.distance - LANE) < 2.2 && near.side * dir === -1 ? near : null;
  };
  const here = inLane(road, a.dir);
  if (here) {
    const d = alongDir(road, a.s, here.s, a.dir);
    if (d > 1e-6 && d < LOOK) gap = Math.min(gap, d - (la + player.length) / 2);
  }
  // ...and on the road it is about to turn onto
  if (a.next && nj && nj.id === a.next.junction) {
    const exitRoad = ctx.roads.get(a.next.exitRoad)!;
    const there = inLane(exitRoad, a.next.exitDir);
    if (there) {
      const db = alongDir(exitRoad, ctx.junctionS.get(`${nj.id}|${a.next.exitRoad}`)!, there.s, a.next.exitDir);
      if (db < LOOK) gap = Math.min(gap, nj.d + db - (la + player.length) / 2);
    }
  }
  return gap;
}

// metres from the junction centre to the back of the nearest vehicle on the exit road (or the player), Infinity if none
function exitRoom(ctx: Ctx, agents: Agent[], a: Agent, nj: { id: string }, player: Player): number {
  const nx = a.next!;
  const exitRoad = ctx.roads.get(nx.exitRoad)!;
  const js = ctx.junctionS.get(`${nj.id}|${nx.exitRoad}`)!;
  let room = Infinity;
  for (const b of agents) {
    if (b === a || b.road !== nx.exitRoad || b.dir !== nx.exitDir) continue;
    const db = alongDir(exitRoad, js, b.s, nx.exitDir);
    if (db < LOOK) room = Math.min(room, db - KINDS[b.kind].length / 2);
  }
  const near = nearestOnRoad(exitRoad, player.x, player.z);
  if (near.distance > 0.5 && Math.abs(near.distance - LANE) < 2.2 && near.side * nx.exitDir === -1) {
    const db = alongDir(exitRoad, js, near.s, nx.exitDir);
    if (db < LOOK) room = Math.min(room, db - player.length / 2);
  }
  return room;
}

function bendAt(road: BuiltRoad, s: number): boolean {
  return Math.abs(norm(headingAt(road, s + 3) - headingAt(road, s - 3))) > 0.03;
}

// How fast the road allows here: the corners of the ring are taken slowly, braking for them in good time.
function bendLimit(road: BuiltRoad, a: Agent): number {
  let limit = Infinity;
  for (let d = 0; d <= 50; d += 10) {
    let s = a.s + a.dir * d;
    if (road.road.closed) s = ((s % road.length) + road.length) % road.length;
    else if (s < 0 || s > road.length) break;
    if (bendAt(road, s)) limit = Math.min(limit, Math.sqrt(ARC_SPEED * ARC_SPEED + 2 * BRAKE * d));
  }
  return limit;
}

export function stepTraffic(n: Network, agents: Agent[], dt: number, t: number, player: Player): { hits: Agent[]; moves: Move[] } {
  const ctx = ctxFor(n);
  const moves: Move[] = [];
  const hits: Agent[] = [];
  // how far each vehicle is from its next junction, so the one nearer to an exit goes first
  const toJunction = new Map<Agent, { id: string; d: number }>();
  for (const a of agents) {
    const j = nextJunction(ctx, a);
    if (j) toJunction.set(a, { id: j.id, d: j.d });
  }

  for (const a of agents) {
    if (a.hold > 0) {
      a.hold = Math.max(0, a.hold - dt);
      a.speed = 0;
      a.braking = true;
      continue;
    }
    const road = ctx.roads.get(a.road)!;
    const half = KINDS[a.kind].length / 2;
    const nj = nextJunction(ctx, a);
    const approachId = `${a.road}:${a.dir}`;

    // choose the turn well before the junction, and keep it
    if (nj && nj.d < CHOOSE_AT && (!a.next || a.next.junction !== nj.id)) {
      const e = chooseExit(ctx, nj.id, approachId, a.seed, a.turns);
      a.next = e ? { junction: nj.id, exitRoad: e.road, exitDir: e.dir, turn: e.turn } : null;
    }

    // a red or yellow light ahead: stop at the line if it can still be done
    let stopFree = Infinity;
    let atRed = false;
    if (nj) {
      const j = ctx.junction.get(nj.id)!;
      const ap = ctx.approach.get(`${nj.id}|${approachId}`);
      if (j.signal !== false && ap) {
        const light = lightFor(j, t, ap.axis);
        const toLine = nj.d - STOP_LINE - half;
        // not into a junction it cannot get out of, nor onto an exit lane another vehicle is already using
        let blocked = false;
        if (a.next && a.next.junction === nj.id && toLine > -0.5) {
          blocked = exitRoom(ctx, agents, a, nj, player) < JUNCTION_BOX_HALF + 2 * half + 1;
          for (const b of agents) {
            if (b === a || !b.next || b.next.junction !== nj.id || b.next.exitRoad !== a.next.exitRoad || b.next.exitDir !== a.next.exitDir) continue;
            // already in the junction heading for the same exit, or nearer to it (the lower id goes first when level)
            const bj = toJunction.get(b);
            const nearer = bj && bj.id === nj.id && bj.d < 70 && (bj.d < nj.d - 0.01 || (Math.abs(bj.d - nj.d) <= 0.01 && b.id < a.id));
            if (b.box || nearer) blocked = true;
          }
        }
        if (blocked) {
          stopFree = Math.min(stopFree, toLine - 1);
          atRed = false;
        }
        if (light !== "green" && toLine > -0.5) {
          const need = (a.speed * a.speed) / (2 * (light === "red" ? HARD : BRAKE));
          if (toLine >= need - 0.3 || a.speed < 0.5) {
            stopFree = Math.min(stopFree, toLine - 1);
            atRed = true;
          }
        }
      }
    }

    const leaderFree = gapAhead(ctx, agents, a, nj, player) - MIN_GAP - TIME_GAP * a.speed;
    const free = Math.min(leaderFree, stopFree);
    const follow = free <= 0 ? 0 : Math.sqrt(2 * BRAKE * free);
    // slow for a turn: down to a turning speed by the time it reaches the junction box, and through it
    let turnLimit = Infinity;
    if (a.boxD !== null) turnLimit = TURN_SPEED;
    else if (nj && a.next && a.next.junction === nj.id && a.next.turn !== "straight") {
      turnLimit = Math.sqrt(TURN_SPEED * TURN_SPEED + 2 * BRAKE * Math.max(0, nj.d - JUNCTION_BOX_HALF));
    }
    const desired = Math.min(a.cruise, bendLimit(road, a), follow, turnLimit);
    a.braking = desired < a.speed - 0.2 || (a.speed < 0.3 && free < 3);
    a.speed = desired > a.speed ? Math.min(desired, a.speed + ACCEL * dt) : Math.max(desired, a.speed - HARD * dt);
    a.waiting = atRed && a.speed < 0.3 && stopFree < 3;

    // drive on, through the junction if the move crosses its centre
    const move = a.speed * dt;
    a.travelled += move;
    if (a.boxD !== null) {
      a.boxD += move;
    } else if (nj && a.next && a.next.junction === nj.id && a.next.turn !== "straight" && nj.d - move <= JUNCTION_BOX_HALF) {
      const exitRoad = a.next.exitRoad;
      const p0 = agentPose(n, { road: a.road, dir: a.dir, s: nj.s - a.dir * JUNCTION_BOX_HALF });
      const p1 = agentPose(n, { road: exitRoad, dir: a.next.exitDir, s: ctx.junctionS.get(`${nj.id}|${exitRoad}`)! + a.next.exitDir * JUNCTION_BOX_HALF });
      const d0 = { x: Math.cos(p0.heading), z: Math.sin(p0.heading) };
      const d1 = { x: Math.cos(p1.heading), z: Math.sin(p1.heading) };
      const det = d0.x * d1.z - d0.z * d1.x;
      if (Math.abs(det) > 1e-6) {
        const r = ((p1.x - p0.x) * d1.z - (p1.z - p0.z) * d1.x) / det;
        a.arc = arcWithTable({ x0: p0.x, z0: p0.z, cx: p0.x + r * d0.x, cz: p0.z + r * d0.z, x1: p1.x, z1: p1.z });
        a.boxD = Math.max(0, JUNCTION_BOX_HALF - (nj.d - move));
      }
    }
    if (a.boxD !== null && a.boxD >= 2 * JUNCTION_BOX_HALF) {
      a.boxD = null;
      a.arc = null;
    }
    if (nj && move >= nj.d - 1e-9) {
      const e =
        a.next && a.next.junction === nj.id
          ? { road: a.next.exitRoad, dir: a.next.exitDir, turn: a.next.turn, s: ctx.junctionS.get(`${nj.id}|${a.next.exitRoad}`)! }
          : chooseExit(ctx, nj.id, approachId, a.seed, a.turns);
      if (e) {
        moves.push({ junction: nj.id, approachId, turn: e.turn });
        a.road = e.road;
        a.dir = e.dir;
        const exitRoad = ctx.roads.get(e.road)!;
        a.s = e.s + e.dir * (move - nj.d);
        if (exitRoad.road.closed) a.s = ((a.s % exitRoad.length) + exitRoad.length) % exitRoad.length;
        a.next = null;
        a.box = null;
        a.passed = nj.id;
        a.turns += 1;
        continue;
      }
    }
    a.s += a.dir * move;
    a.box = nj && a.next && a.next.junction === nj.id && nj.d - move - STOP_LINE - half <= -0.5 ? a.next : null;
    if (road.road.closed) a.s = ((a.s % road.length) + road.length) % road.length;
    else a.s = Math.max(0, Math.min(road.length, a.s));
  }

  // contact with the player
  const pv = { x: Math.cos(player.heading) * player.speed, z: Math.sin(player.heading) * player.speed };
  const pr = { kind: "rect" as const, x: player.x, z: player.z, w: player.length, d: player.width, heading: player.heading };
  for (const a of agents) {
    if (t - a.hitAt < HIT_COOLDOWN_S) continue;
    const pose = agentPose(n, a);
    const k = KINDS[a.kind];
    if (!overlaps(pr, { kind: "rect", x: pose.x, z: pose.z, w: k.length, d: k.width, heading: pose.heading })) continue;
    const av = { x: Math.cos(pose.heading) * a.speed, z: Math.sin(pose.heading) * a.speed };
    if (Math.hypot(pv.x - av.x, pv.z - av.z) < MIN_HIT_SPEED) continue;
    a.hitAt = t;
    a.hold = HIT_STOP_S;
    a.speed = 0;
    hits.push(a);
  }
  return { hits, moves };
}

// What the driver of a vehicle that was just hit shouts, and in which voice.
export function shout(a: Agent): { ml: string; en: string; pitch: number } {
  const line = lineFor(a.kind, a.waiting ? "waiting" : "general", a.seed ^ Math.floor(a.hitAt * 10));
  return { ...line, pitch: pitchFor(a.kind, a.seed) };
}

// Is this vehicle within `range` metres of a point (the player), close enough to draw?
export function inRange(n: Network, a: Agent, x: number, z: number, range: number): boolean {
  const p = agentPose(n, a);
  return Math.hypot(p.x - x, p.z - z) <= range;
}

// The traffic of the day in play, shared with the radar (set by Traffic.tsx).
export const liveTraffic: { agents: Agent[] } = { agents: [] };
