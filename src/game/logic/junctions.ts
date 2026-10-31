import type { Junction, Road } from "../data/network-v1";

type Edge = { road: string; x1: number; z1: number; x2: number; z2: number };

const CYCLE_S = 52; // 28 + 14 + 2 x (3 + 2): the signal plan
const OFFSET_STEP_S = 11;

function edgesOf(r: Road): Edge[] {
  const n = r.points.length;
  const count = r.closed ? n : n - 1;
  const out: Edge[] = [];
  for (let i = 0; i < count; i++) {
    const [x1, z1] = r.points[i];
    const [x2, z2] = r.points[(i + 1) % n];
    if (x1 !== x2 && z1 !== z2) throw new Error(`road ${r.id}: edge ${i} is not along an axis, so its junctions cannot be found`);
    out.push({ road: r.id, x1, z1, x2, z2 });
  }
  return out;
}

const within = (v: number, a: number, b: number) => v >= Math.min(a, b) && v <= Math.max(a, b);

// Every place where two roads cross or one ends on another, as a signalled junction.
// Roads run along the axes, so crossings are found edge by edge. `overrides` are keyed
// by "x,z" and may rename a junction or set which turns an approach may take.
export function autoJunctions(roads: Road[], overrides: Record<string, Partial<Pick<Junction, "id" | "allowed">>> = {}): Junction[] {
  const edges = roads.flatMap(edgesOf);
  const found = new Map<string, { at: [number, number]; roads: Set<string> }>();
  const note = (x: number, z: number, a: string, b: string) => {
    const key = `${x},${z}`;
    const f = found.get(key) ?? { at: [x, z] as [number, number], roads: new Set<string>() };
    f.roads.add(a).add(b);
    found.set(key, f);
  };
  for (const h of edges) {
    if (h.z1 !== h.z2) continue;
    for (const v of edges) {
      if (v.x1 !== v.x2 || v.road === h.road) continue;
      if (within(v.x1, h.x1, h.x2) && within(h.z1, v.z1, v.z2)) note(v.x1, h.z1, h.road, v.road);
    }
  }

  const ordered = [...found.values()].sort((a, b) => a.at[0] - b.at[0] || a.at[1] - b.at[1]);
  const seen = new Map<string, number>();
  return ordered.map((f, i) => {
    const ids = [...f.roads].sort();
    const base = ids.join("+");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const o = overrides[`${f.at[0]},${f.at[1]}`];
    return {
      id: o?.id ?? (n === 1 ? base : `${base}#${n}`),
      at: f.at,
      roads: ids,
      signal: { offset: (i * OFFSET_STEP_S) % CYCLE_S },
      allowed: o?.allowed ?? {},
    };
  });
}
