"use client";

import { useMemo } from "react";
import { ZONES } from "./data/zones-v1";
import { Instances, type Item } from "./Instances";
import { Trees } from "./Foliage";
import type { Placement } from "./logic/layout";
import { layoutPark } from "./logic/park";

const PARK_SEED = 20261101;
const park = ZONES.find((z) => z.id === "park")!;

// The central park: a lawn, two paths, a fountain, a playground, benches and trees. Small enough to draw all
// the time (about 150 instanced boxes and 90 trees).
export function Park() {
  const p = useMemo(() => layoutPark(park, PARK_SEED), []);
  const trees = useMemo<Placement[]>(
    () => p.trees.map((t, i) => ({ kind: t.kind, side: 1, x: t.x, z: t.z, scale: t.scale, lean: 0, seed: 7000 + i })),
    [p],
  );
  const boxes = useMemo(() => {
    const out: Item[] = [{ x: p.lawn.x, y: -0.04, z: p.lawn.z, sx: p.lawn.w, sy: 0.02, sz: p.lawn.d, color: "#7fbf58" }];
    for (const path of p.paths) out.push({ x: path.x, y: 0.02, z: path.z, sx: path.w, sy: 0.04, sz: path.d, color: "#ddd5c0" });
    // playground: sand, two swing frames, a slide
    const g = p.playground;
    out.push({ x: g.x, y: 0.03, z: g.z, sx: g.w, sy: 0.06, sz: g.d, color: "#e3cf9a" });
    for (const dx of [-6, 2]) {
      out.push({ x: g.x + dx, y: 1.1, z: g.z - 4, sx: 0.15, sy: 2.2, sz: 3, color: "#c0392b" });
      out.push({ x: g.x + dx + 3, y: 1.1, z: g.z - 4, sx: 0.15, sy: 2.2, sz: 3, color: "#c0392b" });
      out.push({ x: g.x + dx + 1.5, y: 2.2, z: g.z - 4, sx: 3.3, sy: 0.15, sz: 0.15, color: "#c0392b" });
    }
    out.push({ x: g.x + 8, y: 1.2, z: g.z + 3, sx: 1.2, sy: 2.4, sz: 1.2, color: "#2f6db5" });
    out.push({ x: g.x + 8, y: 0.9, z: g.z + 5.2, sx: 1, sy: 0.12, sz: 3.6, color: "#d4a017", rx: -0.5 });
    // benches: a seat and a back, along the path
    for (const b of p.benches) {
      const c = Math.cos(b.heading);
      const s = Math.sin(b.heading);
      const at = (lu: number, lv: number) => ({ x: b.x + lu * c - lv * s, z: b.z + lu * s + lv * c });
      out.push({ ...at(0, 0), y: 0.45, sx: 1.6, sy: 0.1, sz: 0.5, ry: -b.heading, color: "#7a5a3a" });
      out.push({ ...at(0, -0.25), y: 0.8, sx: 1.6, sy: 0.4, sz: 0.08, ry: -b.heading, color: "#7a5a3a" });
    }
    return out;
  }, [p]);
  const rim = useMemo<Item[]>(() => [{ x: p.fountain.x, y: 0.3, z: p.fountain.z, sx: 1, sy: 1, sz: 1, color: "#c9c4b4" }], [p]);

  return (
    <group>
      <Instances items={boxes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={rim}>
        <cylinderGeometry args={[p.fountain.r, p.fountain.r, 0.6, 24]} />
        <meshStandardMaterial />
      </Instances>
      <mesh position={[p.fountain.x, 0.62, p.fountain.z]}>
        <cylinderGeometry args={[p.fountain.r - 0.7, p.fountain.r - 0.7, 0.05, 24]} />
        <meshStandardMaterial color="#5aa7d6" roughness={0.2} metalness={0.2} />
      </mesh>
      <mesh position={[p.fountain.x, 1.4, p.fountain.z]}>
        <cylinderGeometry args={[0.35, 0.6, 1.6, 10]} />
        <meshStandardMaterial color="#c9c4b4" />
      </mesh>
      <Trees placements={trees} detail="lite" />
    </group>
  );
}
