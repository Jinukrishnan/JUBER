"use client";

import { useMemo } from "react";
import { Instances, type Item } from "./Instances";
import type { FlowerPlacement, Placement, TreePlacement } from "./logic/layout";
import { flowerParts, grassParts } from "./plants";
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

// Sunflower, hibiscus and marigold clusters.
export function Flowers({ placements }: { placements: Placement[] }) {
  const parts = useMemo(() => {
    const stem: Item[] = [];
    const head: Item[] = [];
    const bush: Item[] = [];
    for (const p of placements) {
      if (p.kind !== "flowers") continue;
      const f = flowerParts(p as FlowerPlacement);
      stem.push(...f.stem);
      head.push(...f.head);
      bush.push(...f.bush);
    }
    return { stem, head, bush };
  }, [placements]);

  return (
    <group>
      <Instances items={parts.stem}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={parts.head}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial />
      </Instances>
      <Instances items={parts.bush}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial />
      </Instances>
    </group>
  );
}

// Grass tufts and the odd bush along the verges of one cell, kept off
// anything else that already stands there. Far cells get half the tufts.
export function Grass({
  spots,
  detail,
  isGroundFree,
}: {
  spots: { x: number; z: number; seed: number }[];
  detail: Detail;
  isGroundFree: (x: number, z: number, radius: number) => boolean;
}) {
  const parts = useMemo(() => grassParts(spots, detail, isGroundFree), [spots, detail, isGroundFree]);

  return (
    <group>
      <Instances items={parts.tufts}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial side={2} />
      </Instances>
      <Instances items={parts.bushes}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial />
      </Instances>
    </group>
  );
}
