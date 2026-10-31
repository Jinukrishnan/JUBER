"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { busPose } from "./busPose";
import { Buildings, useSignAtlas, type SignAtlas } from "./Buildings";
import { Flowers, Grass, Trees } from "./Foliage";
import { Instances, type Item } from "./Instances";
import type { Placement } from "./logic/layout";
import { FOOTPATH_WIDTH, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { isNear, SLICE_LENGTH, slicesFor, sliceOf, visibleSlices } from "./logic/slices";
import { buildScenery, scenePoles } from "./world";


// Electric poles along the right-hand verge, joined by three wires. They are
// few enough to draw all the time.
function buildPoles() {
  const poles: Item[] = [];
  const wires: Item[] = [];
  const pts = scenePoles().map(({ x }) => ({
    x,
    z: roadCenterZ(x) + roadHalfWidthAt(x) + FOOTPATH_WIDTH + 0.9,
  }));
  for (const p of pts) {
    poles.push({ x: p.x, y: 4.25, z: p.z, sx: 0.28, sy: 8.5, sz: 0.28, color: "#b5b0a4" });
    poles.push({ x: p.x, y: 7.9, z: p.z, sx: 0.12, sy: 0.12, sz: 2.4, color: "#6b5a44" });
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const ang = -Math.atan2(b.z - a.z, b.x - a.x);
    for (const off of [-0.9, 0, 0.9]) {
      wires.push({ x: (a.x + b.x) / 2, y: 7.8, z: (a.z + b.z) / 2 + off, sx: len, sy: 0.03, sz: 0.03, ry: ang, color: "#222" });
    }
  }
  return { poles, wires };
}

// One 100 m slice of the roadside: trees, flowers, houses, shops and verge grass.
function SceneSlice({
  slice,
  placements,
  detail,
  isGroundFree,
  signs,
}: {
  slice: number;
  placements: Placement[];
  signs: SignAtlas;
  detail: "full" | "lite";
  isGroundFree: (x: number, z: number, r: number) => boolean;
}) {
  return (
    <group>
      <Trees placements={placements} detail={detail} />
      <Flowers placements={placements} />
      <Buildings placements={placements} signs={signs} />
      <Grass slice={slice} detail={detail} isGroundFree={isGroundFree} />
    </group>
  );
}

export function Scenery() {
  // the whole village is laid out once, then dealt into route slices
  const layout = useMemo(() => buildScenery(), []);
  const bySlice = useMemo(() => {
    // each item lives in the slice it stands in; with 260 m of draw range and
    // items under ~10 m across, nothing is ever visible half-missing
    const idx = slicesFor(layout.placements, () => 0);
    return new Map([...idx].map(([s, list]) => [s, list.map((i) => layout.placements[i])]));
  }, [layout]);
  const fixed = useMemo(() => buildPoles(), []);
  const signs = useSignAtlas();

  // re-render only when the bus crosses into another slice
  const [busSlice, setBusSlice] = useState(() => sliceOf(busPose.x));
  const last = useRef(busSlice);
  useFrame(() => {
    const s = sliceOf(busPose.x);
    if (s !== last.current) {
      last.current = s;
      setBusSlice(s);
    }
  });
  const centre = busSlice * SLICE_LENGTH + SLICE_LENGTH / 2;
  const visible = visibleSlices(centre);

  return (
    <group>
      {visible.map((s) => {
        const list = bySlice.get(s);
        if (!list) return null;
        return (
          <SceneSlice
            key={s}
            slice={s}
            placements={list}
            detail={isNear(s, centre) ? "full" : "lite"}
            isGroundFree={layout.isGroundFree}
            signs={signs}
          />
        );
      })}
      <Instances items={fixed.poles}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={fixed.wires}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
    </group>
  );
}
