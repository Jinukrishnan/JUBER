"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  InstancedMesh,
  Object3D,
} from "three";
import { ROUTE_V1 } from "./data/route-v1";
import { ROAD_HALF_WIDTH, roadCenterZ } from "./logic/road";

const X_MIN = -80;
const X_MAX = 3400;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearStop(x: number) {
  return ROUTE_V1.some((s) => Math.abs(s.position - x) < 40);
}

type Item = { x: number; y: number; z: number; sx: number; sy: number; sz: number; color: string };

function Instances({
  items,
  children,
}: {
  items: Item[];
  children: React.ReactNode;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    const c = new Color();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z);
      o.scale.set(it.sx, it.sy, it.sz);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, c.set(it.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow>
      {children}
    </instancedMesh>
  );
}

export function Road() {
  const asphalt = useMemo(() => {
    const pos: number[] = [];
    const idx: number[] = [];
    let n = 0;
    for (let x = X_MIN; x <= X_MAX; x += 8) {
      const cz = roadCenterZ(x);
      pos.push(x, 0.01, cz - ROAD_HALF_WIDTH, x, 0.01, cz + ROAD_HALF_WIDTH);
      if (n > 0) {
        const a = (n - 1) * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
      n++;
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  const scenery = useMemo(() => {
    const rnd = mulberry32(7);
    const trunks: Item[] = [];
    const crowns: Item[] = [];
    const buildings: Item[] = [];
    const dashes: Item[] = [];
    const palette = ["#e8d9b5", "#d9a88a", "#c9d6c1", "#e3c36b", "#b7c4d6", "#e7b7b0"];

    for (let x = X_MIN; x <= X_MAX; x += 14) {
      dashes.push({ x, y: 0.03, z: roadCenterZ(x), sx: 5, sy: 0.02, sz: 0.25, color: "#f3ead6" });
    }
    for (let x = X_MIN; x <= X_MAX; x += 18) {
      if (nearStop(x)) continue;
      for (const side of [-1, 1]) {
        const jitter = rnd() * 10 - 5;
        const cx = x + jitter;
        const lateral = ROAD_HALF_WIDTH + 6 + rnd() * 8;
        const z = roadCenterZ(cx) + side * lateral;
        if (rnd() < 0.55) {
          const h = 5 + rnd() * 3;
          trunks.push({ x: cx, y: h / 2, z, sx: 0.35, sy: h, sz: 0.35, color: "#6b4a2b" });
          crowns.push({ x: cx, y: h + 0.8, z, sx: 3.2, sy: 1.6, sz: 3.2, color: rnd() < 0.5 ? "#2f7d32" : "#3f9142" });
        } else {
          const bx = ROAD_HALF_WIDTH + 16 + rnd() * 18;
          const bz = roadCenterZ(cx) + side * bx;
          const w = 7 + rnd() * 8;
          const h = 5 + rnd() * 12;
          buildings.push({ x: cx, y: h / 2, z: bz, sx: w, sy: h, sz: w, color: palette[Math.floor(rnd() * palette.length)] });
        }
      }
    }
    return { trunks, crowns, buildings, dashes };
  }, []);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1650, -0.02, 0]} receiveShadow>
        <planeGeometry args={[4200, 800]} />
        <meshStandardMaterial color="#6f9a4a" />
      </mesh>
      <mesh geometry={asphalt} receiveShadow>
        <meshStandardMaterial color="#3a3d42" side={DoubleSide} />
      </mesh>
      <Instances items={scenery.dashes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={scenery.trunks}>
        <cylinderGeometry args={[0.5, 0.5, 1, 6]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={scenery.crowns}>
        <coneGeometry args={[1, 1, 7]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={scenery.buildings}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
    </group>
  );
}
