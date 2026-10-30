"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { reportHit } from "./hit";
import { busHitsPerson } from "./logic/collision";
import { pointAlong, type P } from "./logic/path";
import { groundY } from "./logic/road";
import { Person } from "./Person";
import { useGame } from "./state/store";
import { specFor } from "./Stops";

// Someone walking a fixed route (along a footpath, over a crossing). They keep
// to their path, step up and down the kerb, and if the bus hits them they are
// handed over to the casualty system and removed from here.
export function WalkingPerson({
  personKey,
  path,
  speed,
  onDone,
}: {
  personKey: string;
  path: P[];
  speed: number;
  onDone: () => void;
}) {
  const group = useRef<Group>(null);
  const phase = useRef(0);
  const dist = useRef(0);
  const y = useRef(0);
  const finished = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = group.current;
    if (!g || finished.current) return;
    dist.current += speed * dt;
    phase.current += dt * 8;
    const p = pointAlong(path, dist.current);
    // step up and down the kerb rather than jumping it
    y.current += (groundY(p.x, p.z) - y.current) * Math.min(1, dt * 14);
    g.position.set(p.x, y.current, p.z);
    g.rotation.y = p.heading;

    const hit = useGame.getState().phase === "running" ? busHitsPerson(busPose, p) : null;
    if (hit) {
      finished.current = true;
      reportHit(personKey, { x: p.x, z: p.z, y: y.current }, hit.side);
      onDone();
      return;
    }
    if (p.done) {
      finished.current = true;
      onDone();
    }
  });

  return (
    <group ref={group}>
      <Person spec={specFor(personKey)} phase={phase} />
    </group>
  );
}
