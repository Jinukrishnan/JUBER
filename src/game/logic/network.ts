import type { Road } from "../data/network-v1";

// A road is a chain of straight pieces and quarter-circle arcs at its rounded
// corners. Distance `s` runs along the centreline; on a closed road it wraps.
export type Seg = { kind: "seg"; s0: number; len: number; ax: number; az: number; dx: number; dz: number };
export type Arc = { kind: "arc"; s0: number; len: number; cx: number; cz: number; r: number; a0: number; sweep: number };
export type Piece = Seg | Arc;
export type BuiltRoad = { road: Road; pieces: Piece[]; segments: Seg[]; arcs: Arc[]; length: number };

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export function buildRoad(road: Road): BuiltRoad {
  const pts = road.points;
  const n = pts.length;
  const closed = !!road.closed;
  const edges = closed ? n : n - 1;
  const dir = (i: number) => {
    const [ax, az] = pts[i % n];
    const [bx, bz] = pts[(i + 1) % n];
    const len = Math.hypot(bx - ax, bz - az);
    return { dx: (bx - ax) / len, dz: (bz - az) / len, len };
  };

  // corner k sits between edge k-1 and edge k; open roads have none at their ends
  const corner = (k: number) => {
    if (!closed && (k === 0 || k === n - 1)) return null;
    const d1 = dir((k - 1 + n) % n);
    const d2 = dir(k % n);
    const cross = d1.dx * d2.dz - d1.dz * d2.dx;
    const dot = d1.dx * d2.dx + d1.dz * d2.dz;
    if (road.cornerRadius <= 0 || Math.abs(cross) < 1e-9) return null;
    const sign = cross > 0 ? 1 : -1;
    const angle = Math.atan2(Math.abs(cross), dot);
    const tangent = road.cornerRadius * Math.tan(angle / 2);
    const [px, pz] = pts[k % n];
    const t1x = px - d1.dx * tangent;
    const t1z = pz - d1.dz * tangent;
    const cx = t1x + sign * -d1.dz * road.cornerRadius;
    const cz = t1z + sign * d1.dx * road.cornerRadius;
    return { tangent, cx, cz, a0: Math.atan2(t1z - cz, t1x - cx), sweep: sign * angle };
  };

  const pieces: Piece[] = [];
  let s = 0;
  const addSeg = (i: number) => {
    const d = dir(i);
    const startTrim = corner(i)?.tangent ?? 0;
    const endTrim = corner(i + 1)?.tangent ?? 0;
    const len = d.len - startTrim - endTrim;
    const [px, pz] = pts[i % n];
    if (len > 1e-9) {
      pieces.push({ kind: "seg", s0: s, len, ax: px + d.dx * startTrim, az: pz + d.dz * startTrim, dx: d.dx, dz: d.dz });
      s += len;
    }
  };
  const addArc = (k: number) => {
    const c = corner(k);
    if (!c) return;
    const len = Math.abs(c.sweep) * road.cornerRadius;
    pieces.push({ kind: "arc", s0: s, len, cx: c.cx, cz: c.cz, r: road.cornerRadius, a0: c.a0, sweep: c.sweep });
    s += len;
  };

  for (let i = 0; i < edges; i++) {
    addSeg(i);
    if (i + 1 < edges || closed) addArc((i + 1) % n);
  }

  return {
    road,
    pieces,
    segments: pieces.filter((p): p is Seg => p.kind === "seg"),
    arcs: pieces.filter((p): p is Arc => p.kind === "arc"),
    length: s,
  };
}

export const roadLength = (r: BuiltRoad): number => r.length;

function locate(r: BuiltRoad, s: number): { piece: Piece; u: number } {
  const len = r.length;
  const d = r.road.closed ? ((s % len) + len) % len : Math.max(0, Math.min(len, s));
  for (const piece of r.pieces) {
    if (d <= piece.s0 + piece.len || piece === r.pieces[r.pieces.length - 1]) {
      return { piece, u: Math.max(0, Math.min(piece.len, d - piece.s0)) };
    }
  }
  throw new Error("road has no pieces");
}

export function pointAt(r: BuiltRoad, s: number): { x: number; z: number } {
  const { piece, u } = locate(r, s);
  if (piece.kind === "seg") return { x: piece.ax + piece.dx * u, z: piece.az + piece.dz * u };
  const a = piece.a0 + piece.sweep * (u / piece.len);
  return { x: piece.cx + piece.r * Math.cos(a), z: piece.cz + piece.r * Math.sin(a) };
}

// Direction of travel, in the vehicle-heading convention (0 faces +x).
export function headingAt(r: BuiltRoad, s: number): number {
  const { piece, u } = locate(r, s);
  if (piece.kind === "seg") return Math.atan2(piece.dz, piece.dx);
  const a = piece.a0 + piece.sweep * (u / piece.len);
  return norm(a + Math.sign(piece.sweep) * (Math.PI / 2));
}
