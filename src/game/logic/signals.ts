import type { Junction } from "../data/junctions-v1";

export type Light = "green" | "yellow" | "red";
export type Approach = "mainForward" | "mainBackward" | "armLeft" | "armRight";
export type Group = "main" | "cross";

export type Plan = { offset: number; mainGreen: number; crossGreen: number; yellow: number; allRed: number };

export const DEFAULT_PLAN: Plan = { offset: 0, mainGreen: 28, crossGreen: 14, yellow: 3, allRed: 2 };

export function resolvePlan(p: Partial<Plan> | undefined): Plan {
  return { ...DEFAULT_PLAN, ...p };
}

export const groupOf = (a: Approach): Group => (a === "mainForward" || a === "mainBackward" ? "main" : "cross");

export function cycleLength(p: Plan): number {
  return p.mainGreen + p.crossGreen + 2 * p.yellow + 2 * p.allRed;
}

// Six phases in order: main green, main yellow, all red, cross green, cross yellow, all red.
function phases(p: Plan): { main: Light; cross: Light; len: number }[] {
  return [
    { main: "green", cross: "red", len: p.mainGreen },
    { main: "yellow", cross: "red", len: p.yellow },
    { main: "red", cross: "red", len: p.allRed },
    { main: "red", cross: "green", len: p.crossGreen },
    { main: "red", cross: "yellow", len: p.yellow },
    { main: "red", cross: "red", len: p.allRed },
  ];
}

function position(p: Plan, t: number): number {
  const c = cycleLength(p);
  return (((t + p.offset) % c) + c) % c;
}

export function signalAt(p: Plan, t: number): { main: Light; cross: Light; nextChange: number } {
  const c = position(p, t);
  let start = 0;
  for (const ph of phases(p)) {
    if (c < start + ph.len) return { main: ph.main, cross: ph.cross, nextChange: start + ph.len - c };
    start += ph.len;
  }
  return { main: "green", cross: "red", nextChange: 0 };
}

// Seconds since the group's light turned red (0 when it is not red).
export function redAge(p: Plan, t: number, group: Group): number {
  const s = signalAt(p, t);
  if (s[group] !== "red") return 0;
  const c = position(p, t);
  const len = cycleLength(p);
  const redStart = group === "main" ? p.mainGreen + p.yellow : p.mainGreen + p.yellow + p.allRed + p.crossGreen + p.yellow;
  return (c - redStart + len) % len;
}

export function planOf(j: Junction): Plan | null {
  return j.signal === false ? null : resolvePlan(j.signal);
}

export function approachLight(j: Junction, t: number, approach: Approach): Light {
  const plan = planOf(j);
  if (!plan) return "green";
  return signalAt(plan, t)[groupOf(approach)];
}
