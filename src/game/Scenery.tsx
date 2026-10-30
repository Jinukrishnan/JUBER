"use client";

import { useMemo } from "react";
import { ROUTE_V1 } from "./data/route-v1";
import { Instances, type Item } from "./Instances";
import { FOOTPATH_WIDTH, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { polePositions } from "./logic/roadside";

const FIRST = ROUTE_V1[0].position;
const LAST = ROUTE_V1[ROUTE_V1.length - 1].position;

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WALLS = ["#efe3c2", "#e9c9a6", "#cfe3c8", "#e8d27a", "#bcd0e0", "#efb9b0", "#f3efe4"];
const SHUTTERS = ["#2f6db5", "#2f9a5a", "#c0392b", "#d4a017"];
const FROND = ["#2f7d32", "#3b8f3a", "#2a6e2e"];
const TILE = "#a8432b";

function build() {
  const r = mulberry(11);
  const trunks: Item[] = [];
  const fronds: Item[] = [];
  const walls: Item[] = [];
  const roofs: Item[] = [];
  const details: Item[] = [];
  const poles: Item[] = [];
  const wires: Item[] = [];

  // coconut palms, Kerala houses with tiled roofs, and a few concrete shops,
  // set back behind the footpath and dirt verge on both sides
  for (let x = FIRST - 4; x <= LAST + 4; x += 15) {
    for (const side of [-1, 1]) {
      const px = x + (r() - 0.5) * 8;
      const cz = roadCenterZ(px);
      const lat0 = roadHalfWidthAt(px) + FOOTPATH_WIDTH + 2.4;
      const pick = r();

      if (pick < 0.5) {
        const lat = lat0 + 0.5 + r() * 5;
        const h = 8 + r() * 5;
        const lean = (r() - 0.5) * 0.3;
        const bz = cz + side * lat;
        trunks.push({
          x: px - Math.sin(lean) * (h / 2), y: (Math.cos(lean) * h) / 2, z: bz,
          sx: 0.42, sy: h, sz: 0.42, rz: lean, color: "#7a5a38",
        });
        const crownX = px - Math.sin(lean) * h;
        const crownY = Math.cos(lean) * h;
        const n = 8;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + r() * 0.4;
          const tilt = 0.45 + r() * 0.25;
          const len = 3.2 + r() * 0.8;
          fronds.push({
            x: crownX + Math.cos(a) * (len / 2) * Math.cos(tilt),
            y: crownY + 0.2 - (len / 2) * Math.sin(tilt),
            z: bz + Math.sin(a) * (len / 2) * Math.cos(tilt),
            sx: len, sy: 0.05, sz: 0.75, ry: -a, rz: -tilt,
            color: FROND[k % FROND.length],
          });
        }
      } else if (pick < 0.78) {
        const lat = lat0 + 4 + r() * 8;
        const w = 7 + r() * 3;
        const d = 6 + r() * 2;
        const wallH = 3 + r() * 0.8;
        const bz = cz + side * lat;
        walls.push({ x: px, y: wallH / 2, z: bz, sx: w, sy: wallH, sz: d, color: WALLS[Math.floor(r() * WALLS.length)] });
        // gable roof: two sloping slabs meeting at the ridge
        const pitch = 0.5;
        const slab = d / 2 / Math.cos(pitch) + 0.5;
        for (const s of [-1, 1]) {
          roofs.push({
            x: px, y: wallH + 0.75, z: bz + s * (d / 4 + 0.1),
            sx: w + 1.2, sy: 0.14, sz: slab, rx: s * pitch, color: TILE,
          });
        }
        // door and windows on the face toward the road
        const face = bz - side * (d / 2 + 0.03);
        details.push({ x: px, y: 1.05, z: face, sx: 1.0, sy: 2.1, sz: 0.1, color: "#5a3a22" });
        for (const dx of [-w / 3, w / 3]) {
          details.push({ x: px + dx, y: 1.7, z: face, sx: 1.2, sy: 1.0, sz: 0.1, color: "#28425a" });
        }
      } else if (pick < 0.9) {
        const lat = lat0 + 3 + r() * 4;
        const w = 9;
        const d = 8;
        const h = 6 + r() * 3;
        const bz = cz + side * lat;
        walls.push({ x: px, y: h / 2, z: bz, sx: w, sy: h, sz: d, color: WALLS[Math.floor(r() * WALLS.length)] });
        const face = bz - side * (d / 2 + 0.03);
        details.push({ x: px, y: 1.3, z: face, sx: w * 0.8, sy: 2.4, sz: 0.1, color: SHUTTERS[Math.floor(r() * SHUTTERS.length)] });
        details.push({ x: px, y: h - 1.4, z: face, sx: w * 0.8, sy: 1.1, sz: 0.1, color: "#28425a" });
        roofs.push({ x: px, y: h + 0.1, z: bz, sx: w + 0.4, sy: 0.2, sz: d + 0.4, color: "#9a958a" });
      }
    }
  }

  // electric poles along the right-hand verge, joined by three wires
  const polePts: { x: number; z: number }[] = [];
  for (const x of polePositions(ROUTE_V1)) {
    polePts.push({ x, z: roadCenterZ(x) + roadHalfWidthAt(x) + FOOTPATH_WIDTH + 0.9 });
  }
  for (const p of polePts) {
    poles.push({ x: p.x, y: 4.25, z: p.z, sx: 0.28, sy: 8.5, sz: 0.28, color: "#b5b0a4" });
    poles.push({ x: p.x, y: 7.9, z: p.z, sx: 0.12, sy: 0.12, sz: 2.4, color: "#6b5a44" });
  }
  for (let i = 1; i < polePts.length; i++) {
    const a = polePts[i - 1];
    const b = polePts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = -Math.atan2(b.z - a.z, b.x - a.x);
    for (const off of [-0.9, 0, 0.9]) {
      wires.push({
        x: (a.x + b.x) / 2, y: 7.8, z: (a.z + b.z) / 2 + off,
        sx: len, sy: 0.03, sz: 0.03, ry: ang, color: "#222",
      });
    }
  }
  return { trunks, fronds, walls, roofs, details, poles, wires };
}

export function Scenery() {
  const s = useMemo(() => build(), []);
  return (
    <group>
      <Instances items={s.trunks} shadows>
        <cylinderGeometry args={[0.5, 0.7, 1, 7]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.fronds}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.walls} shadows>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.roofs}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.details}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.poles}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={s.wires}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
    </group>
  );
}
