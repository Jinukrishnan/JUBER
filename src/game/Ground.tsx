"use client";

import { useMemo } from "react";
import { useNoiseTexture } from "./canvasTex";
import { ROUTE_V1 } from "./data/route-v1";
import { Instances, type Item } from "./Instances";
import { roadCenterZ } from "./logic/road";

const FIRST = ROUTE_V1[0].position;
const LAST = ROUTE_V1[ROUTE_V1.length - 1].position;
const MID = (FIRST + LAST) / 2;

const GRASS = {
  size: 256,
  base: [92, 142, 62] as [number, number, number],
  spread: 30,
  dots: 2600,
  seed: 3,
  repeat: [400, 200] as [number, number],
};

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Large soft patches of several greens, dry grass and bare earth, so the
// ground never reads as one flat colour.
const PATCH_COLORS = ["#6f9e45", "#5e8f3c", "#7eaa4f", "#4f8239", "#9aa44f", "#86a845", "#a99a62"];

function build() {
  const r = mulberry(31);
  const patches: Item[] = [];
  const paddies: Item[] = [];
  const bunds: Item[] = [];
  const hills: Item[] = [];

  for (let i = 0; i < 90; i++) {
    const x = FIRST - 250 + r() * (LAST - FIRST + 500);
    const side = r() < 0.5 ? -1 : 1;
    const z = roadCenterZ(x) + side * (15 + r() * 260);
    // each patch a hair higher than the last so overlapping ones never flicker
    patches.push({
      x, y: -0.06 + i * 0.0004, z,
      sx: 25 + r() * 70, sy: 20 + r() * 55, sz: 1,
      rx: -Math.PI / 2, ry: r() * Math.PI, color: PATCH_COLORS[Math.floor(r() * PATCH_COLORS.length)],
    });
  }

  // rice paddies set well back from the road and the houses; some flooded
  for (let i = 0; i < 16; i++) {
    const x = FIRST - 100 + r() * (LAST - FIRST + 200);
    const side = i % 2 === 0 ? -1 : 1;
    const w = 50 + r() * 70;
    const d = 30 + r() * 40;
    const z = roadCenterZ(x) + side * (60 + r() * 90);
    const flooded = r() < 0.4;
    paddies.push({ x, y: -0.045 + i * 0.0003, z, sx: w, sy: 1, sz: d, color: flooded ? "#7fb2b8" : "#76b043" });
    // bunds: the low earth walls dividing a paddy into plots
    for (let k = 1; k < 4; k++) {
      bunds.push({ x: x - w / 2 + (w * k) / 4, y: -0.02, z, sx: 0.5, sy: 0.12, sz: d, color: "#8a7a55" });
    }
    bunds.push({ x, y: -0.02, z: z - d / 2, sx: w, sy: 0.12, sz: 0.5, color: "#8a7a55" });
    bunds.push({ x, y: -0.02, z: z + d / 2, sx: w, sy: 0.12, sz: 0.5, color: "#8a7a55" });
  }

  // a haze of low hills on the horizon, further ones paler
  for (let i = 0; i < 44; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const far = 650 + r() * 250;
    const x = MID - 1000 + (i / 44) * 2200 + (r() - 0.5) * 60;
    const h = 40 + r() * 70;
    const t = (far - 650) / 250;
    hills.push({
      x, y: 0, z: side * far,
      sx: 150 + r() * 160, sy: h, sz: 120 + r() * 100,
      color: t < 0.5 ? "#4d7468" : "#6c8f88",
    });
  }
  return { patches, paddies, bunds, hills };
}

export function Ground() {
  const grass = useNoiseTexture(GRASS);
  const g = useMemo(() => build(), []);
  return (
    <group>
      {/* base ground, large enough that its edge is lost in the haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[MID, -0.07, 0]} receiveShadow>
        <planeGeometry args={[7000, 2400]} />
        <meshStandardMaterial map={grass} />
      </mesh>
      <Instances items={g.patches}>
        <circleGeometry args={[1, 18]} />
        <meshStandardMaterial transparent opacity={0.8} depthWrite={false} />
      </Instances>
      <Instances items={g.paddies}>
        <boxGeometry args={[1, 0.02, 1]} />
        <meshStandardMaterial roughness={0.35} metalness={0.15} />
      </Instances>
      <Instances items={g.bunds}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      {/* hills sit beyond the fog on purpose, so they read as distant */}
      <Instances items={g.hills}>
        <sphereGeometry args={[1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial fog={false} />
      </Instances>
    </group>
  );
}
