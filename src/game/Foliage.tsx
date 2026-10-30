"use client";

import { useMemo } from "react";
import { Instances, type Item } from "./Instances";
import type { Placement, TreePlacement } from "./logic/layout";
import { treeParts, type Detail } from "./trees";

const isTree = (p: Placement): p is TreePlacement =>
  p.kind === "coconut" || p.kind === "mango" || p.kind === "gulmohar" || p.kind === "banana" || p.kind === "jackfruit";

// Every tree in the list, drawn as four instanced meshes (trunks, crowns,
// fronds and leaves, blossom and fruit) however many trees there are.
export function Trees({ placements, detail }: { placements: Placement[]; detail: Detail }) {
  const parts = useMemo(() => {
    const trunk: Item[] = [];
    const crown: Item[] = [];
    const frond: Item[] = [];
    const blossom: Item[] = [];
    for (const p of placements) {
      if (!isTree(p)) continue;
      const t = treeParts(p, detail);
      trunk.push(...t.trunk);
      crown.push(...t.crown);
      frond.push(...t.frond);
      blossom.push(...t.blossom);
    }
    return { trunk, crown, frond, blossom };
  }, [placements, detail]);

  return (
    <group>
      <Instances items={parts.trunk} shadows>
        <cylinderGeometry args={[0.5, 0.7, 1, 7]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={parts.crown}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={parts.frond}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={parts.blossom}>
        <sphereGeometry args={[1, 6, 5]} />
        <meshStandardMaterial />
      </Instances>
    </group>
  );
}
