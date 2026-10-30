import type { ArmSide, Junction } from "../data/junctions-v1";
import { ROAD_HALF_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./road";
import type { RoadFeatures } from "./roadside";
import type { Stop } from "./route";
import { planOf, type Plan } from "./signals";

export const TURN_AROUND_RADIUS = 14;
export const DEFAULT_ARM_LENGTH = 200;
export const DEFAULT_ARM_HALF_WIDTH = 5;
const EPS = 1e-6;
const NEAR = 80; // a junction further than this (along the route) cannot affect a point

const MIN_FROM_STOP = 90;
const MIN_FROM_ZEBRA = 45;
const MIN_FROM_JUNCTION = 150;
const MIN_FROM_ENDS = 60;

export type ResolvedJunction = {
  id: string;
  x: number;
  arms: ArmSide;
  armLength: number;
  armHalfWidth: number;
  plan: Plan | null;
  z: number; // road centre at the junction
  angle: number; // road direction at the junction
};

export function resolveJunction(j: Junction): ResolvedJunction {
  return {
    id: j.id,
    x: j.x,
    arms: j.arms,
    armLength: j.armLength ?? DEFAULT_ARM_LENGTH,
    armHalfWidth: j.armHalfWidth ?? DEFAULT_ARM_HALF_WIDTH,
    plan: planOf(j),
    z: roadCenterZ(j.x),
    angle: roadAngle(j.x),
  };
}

// -1 is the left (-z) side, +1 the right (+z) side.
export function armSigns(arms: ArmSide): (-1 | 1)[] {
  return arms === "left" ? [-1] : arms === "right" ? [1] : [-1, 1];
}

// Local frame: u along the road, v across it (+v is the right-hand side), origin on
// the road centre at the junction.
export function worldToLocal(r: ResolvedJunction, wx: number, wz: number): { u: number; v: number } {
  const dx = wx - r.x;
  const dz = wz - r.z;
  const c = Math.cos(r.angle);
  const s = Math.sin(r.angle);
  return { u: dx * c + dz * s, v: -dx * s + dz * c };
}

export function localToWorld(r: ResolvedJunction, u: number, v: number): { x: number; z: number } {
  const c = Math.cos(r.angle);
  const s = Math.sin(r.angle);
  return { x: r.x + u * c - v * s, z: r.z + u * s + v * c };
}

// How far from the junction centre the main road's stop lines sit, and how far
// from the road centre the arms' stop lines sit. Both leave room for a zebra crossing.
export const stopLineDistance = (r: ResolvedJunction): number => r.armHalfWidth + 7;
export const armStopDistance = (): number => ROAD_HALF_WIDTH + 7;

export function validateJunctions(
  junctions: Junction[],
  stops: Stop[],
  features: RoadFeatures,
): { problems: string[]; valid: ResolvedJunction[] } {
  const problems: string[] = [];
  const valid: ResolvedJunction[] = [];
  const first = stops[0].position;
  const last = stops[stops.length - 1].position;

  for (const j of junctions) {
    const bad = (why: string) => problems.push(`Junction "${j.id}" at ${j.x} m ignored: ${why}`);
    const armLength = j.armLength ?? DEFAULT_ARM_LENGTH;
    const plan = planOf(j);

    if (j.x < first + MIN_FROM_ENDS || j.x > last - MIN_FROM_ENDS) {
      bad(`outside the route (use ${first + MIN_FROM_ENDS} to ${last - MIN_FROM_ENDS} m)`);
    } else if (stops.some((s) => Math.abs(s.position - j.x) < MIN_FROM_STOP)) {
      bad(`too close to a bus stop (keep ${MIN_FROM_STOP} m clear)`);
    } else if (features.zebras.some((z) => Math.abs(z - j.x) < MIN_FROM_ZEBRA)) {
      bad(`too close to a zebra crossing (keep ${MIN_FROM_ZEBRA} m clear)`);
    } else if (valid.some((v) => Math.abs(v.x - j.x) < MIN_FROM_JUNCTION)) {
      bad(`too close to another junction (keep ${MIN_FROM_JUNCTION} m clear)`);
    } else if (!(armLength >= 40 && armLength <= 400)) {
      bad("arm length must be between 40 and 400 m");
    } else if (plan && ![plan.mainGreen, plan.crossGreen, plan.yellow, plan.allRed].every((n) => n > 0)) {
      bad("signal timings must all be above zero");
    } else {
      valid.push(resolveJunction(j));
    }
  }
  return { problems, valid };
}

// Is this spot on paved road: the main carriageway, or any arm and its turn-around?
export function drivable(list: ResolvedJunction[], x: number, z: number): boolean {
  if (Math.abs(z - roadCenterZ(x)) <= roadHalfWidthAt(x) + EPS) return true;
  for (const r of list) {
    if (Math.abs(x - r.x) > NEAR) continue;
    const { u, v } = worldToLocal(r, x, z);
    for (const s of armSigns(r.arms)) {
      const along = s * v;
      if (Math.abs(u) <= r.armHalfWidth + EPS && along >= -EPS && along <= r.armLength + EPS) return true;
      if (Math.hypot(u, v - s * r.armLength) <= TURN_AROUND_RADIUS + EPS) return true;
    }
  }
  return false;
}

// The nearest paved point, for a vehicle that has driven off the road.
export function clampToDrivable(list: ResolvedJunction[], x: number, z: number): { x: number; z: number; clamped: boolean } {
  if (drivable(list, x, z)) return { x, z, clamped: false };

  const cz = roadCenterZ(x);
  const half = roadHalfWidthAt(x);
  let best = { x, z: cz + Math.max(-half, Math.min(half, z - cz)) };
  let bestD = Math.abs(z - best.z);

  for (const r of list) {
    if (Math.abs(x - r.x) > NEAR) continue;
    const { u, v } = worldToLocal(r, x, z);
    for (const s of armSigns(r.arms)) {
      const cu = Math.max(-r.armHalfWidth, Math.min(r.armHalfWidth, u));
      const cv = s * Math.max(0, Math.min(r.armLength, s * v));
      const candidates: { u: number; v: number }[] = [{ u: cu, v: cv }];
      const dc = Math.hypot(u, v - s * r.armLength);
      if (dc > TURN_AROUND_RADIUS) {
        const k = TURN_AROUND_RADIUS / dc;
        candidates.push({ u: u * k, v: s * r.armLength + (v - s * r.armLength) * k });
      }
      for (const c of candidates) {
        const d = Math.hypot(c.u - u, c.v - v);
        if (d < bestD) {
          bestD = d;
          best = localToWorld(r, c.u, c.v);
        }
      }
    }
  }
  return { x: best.x, z: best.z, clamped: true };
}
