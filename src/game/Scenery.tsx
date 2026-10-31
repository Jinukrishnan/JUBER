"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { busPose } from "./busPose";
import { Buildings, useSignAtlas, type SignAtlas } from "./Buildings";
import { Flowers, Grass, Trees } from "./Foliage";
import { Instances, type Item } from "./Instances";
import { cellKey, cellsAround, groupByCell, isNearCell } from "./logic/cells";
import type { GrassSpot, Placement } from "./logic/layout";
import { FEATURES, buildScenery } from "./world";

// Electric poles along the right-hand edge of every road, joined by three wires
// pole to pole along each road. They are few enough to draw all the time.
function buildPoles() {
  const poles: Item[] = [];
  const wires: Item[] = [];
  for (const p of FEATURES.poles) {
    poles.push({ x: p.x, y: 4.25, z: p.z, sx: 0.28, sy: 8.5, sz: 0.28, color: "#b5b0a4" });
    poles.push({ x: p.x, y: 7.9, z: p.z, sx: 2.4, sy: 0.12, sz: 0.12, ry: -p.heading, color: "#6b5a44" });
  }
  const pts = FEATURES.poles;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (a.road !== b.road || len > 60) continue; // a gap (a junction, or a new road): no wire
    const ang = -Math.atan2(b.z - a.z, b.x - a.x);
    const nx = -(b.z - a.z) / len;
    const nz = (b.x - a.x) / len;
    for (const off of [-0.9, 0, 0.9]) {
      wires.push({ x: (a.x + b.x) / 2 + nx * off, y: 7.8, z: (a.z + b.z) / 2 + nz * off, sx: len, sy: 0.03, sz: 0.03, ry: ang, color: "#222" });
    }
  }
  return { poles, wires };
}

// One 200 m cell of the roadside: trees, flowers, houses, shops and verge grass.
function SceneCell({
  placements,
  grass,
  detail,
  isGroundFree,
  signs,
}: {
  placements: Placement[];
  grass: GrassSpot[];
  signs: SignAtlas;
  detail: "full" | "lite";
  isGroundFree: (x: number, z: number, r: number) => boolean;
}) {
  return (
    <group>
      <Trees placements={placements} detail={detail} />
      <Flowers placements={placements} />
      <Buildings placements={placements} signs={signs} />
      <Grass spots={grass} detail={detail} isGroundFree={isGroundFree} />
    </group>
  );
}

export function Scenery() {
  // the whole town is laid out once, then dealt into cells
  const layout = useMemo(() => buildScenery(), []);
  const placementCells = useMemo(() => groupByCell(layout.placements), [layout]);
  const grassCells = useMemo(() => groupByCell(layout.grass), [layout]);
  const fixed = useMemo(() => buildPoles(), []);
  const signs = useSignAtlas();

  // re-render after the vehicle has moved 40 m, so scenery is always drawn about 260 m round it
  const [here, setHere] = useState(() => ({ x: busPose.x, z: busPose.z }));
  const last = useRef(here);
  useFrame(() => {
    if (Math.hypot(busPose.x - last.current.x, busPose.z - last.current.z) > 40) {
      last.current = { x: busPose.x, z: busPose.z };
      setHere(last.current);
    }
  });
  const cx = here.x;
  const cz = here.z;

  return (
    <group>
      {cellsAround(cx, cz).map((c) => {
        const key = cellKey(c.cx, c.cz);
        const list = placementCells.get(key);
        const grass = grassCells.get(key);
        if (!list && !grass) return null;
        return (
          <SceneCell
            key={key}
            placements={list ?? []}
            grass={grass ?? []}
            detail={isNearCell(c, cx, cz) ? "full" : "lite"}
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
