"use client";

import { useMemo } from "react";
import { cityParts, windowGeometry } from "./cityParts";
import { useCanvasTexture, type Draw } from "./canvasTex";
import { Instances, type Item } from "./Instances";
import type { CityPlacement, LandmarkPlacement, Placement } from "./logic/layout";

// One window of a facade: the wall is white (the building's colour shows through), the glass a dark blue with
// a pale sill, so a tall facade reads as rows of windows.
const drawWindow: Draw = (g, w, h) => {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  g.fillStyle = "#26384a";
  g.fillRect(w * 0.18, h * 0.2, w * 0.64, h * 0.56);
  g.fillStyle = "#8fb0c8";
  g.fillRect(w * 0.18, h * 0.2, w * 0.64, h * 0.12);
  g.fillStyle = "#d9d9d4";
  g.fillRect(w * 0.14, h * 0.78, w * 0.72, h * 0.06);
};

const isCity = (p: Placement): p is CityPlacement | LandmarkPlacement => p.kind === "city" || p.kind === "landmark";

// The tech city's buildings: bodies in one instanced mesh per number of floors (each shares a window-tiled box),
// roofs, podiums and entrance bands in one plain instanced mesh. Only the nearest cells cast shadows.
export function CityBuildings({ placements, detail }: { placements: Placement[]; detail: "full" | "lite" }) {
  const windows = useCanvasTexture(64, 64, drawWindow, undefined, true);

  const parts = useMemo(() => {
    const bodies = new Map<number, Item[]>();
    const plain: Item[] = [];
    for (const p of placements) {
      if (!isCity(p)) continue;
      const parts = cityParts(p);
      const list = bodies.get(p.floors) ?? [];
      list.push(parts.body);
      bodies.set(p.floors, list);
      plain.push(...parts.roof);
      if (parts.podium) plain.push(parts.podium);
      if (parts.band) plain.push(parts.band);
    }
    return { bodies, plain };
  }, [placements]);

  if (parts.bodies.size === 0) return null;
  return (
    <group>
      {[...parts.bodies.entries()].map(([floors, items]) => (
        <Instances key={floors} items={items} shadows={detail === "full"}>
          <primitive object={windowGeometry(floors)} attach="geometry" />
          <meshStandardMaterial map={windows} roughness={0.55} />
        </Instances>
      ))}
      <Instances items={parts.plain} shadows={detail === "full"}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
    </group>
  );
}
