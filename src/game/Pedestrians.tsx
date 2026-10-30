"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import { roadAngle, roadCenterZ, roadHalfWidthAt, FOOTPATH_WIDTH } from "./logic/road";
import { roadFeatures } from "./logic/roadside";
import { Person } from "./Person";
import { specFor } from "./Stops";

const ZEBRAS = roadFeatures(ROUTE_V1).zebras;
const SPEED = 1.4; // m/s
const NEAR = 140; // only crossings this close to the bus get walkers
const MAX_WALKERS = 4;
const KERB = 0.15;

type Ped = { id: number; zebra: number; dir: 1 | -1 };

function Crosser({ ped, onDone }: { ped: Ped; onDone: (id: number) => void }) {
  const group = useRef<Group>(null);
  const phase = useRef(0);
  const t = useRef(0);
  const done = useRef(false);
  const x0 = ZEBRAS[ped.zebra];
  const half = roadHalfWidthAt(x0);
  const reach = half + FOOTPATH_WIDTH * 0.5;
  const dur = (reach * 2) / SPEED;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    t.current += dt;
    phase.current += dt * 8;
    const u = Math.min(1, t.current / dur);
    const off = (-reach + 2 * reach * u) * ped.dir;
    // they cross on the stripes, at right angles to the road
    const ang = roadAngle(x0);
    if (group.current) {
      group.current.position.set(x0, Math.abs(off) > half ? KERB : 0, roadCenterZ(x0) + off);
      group.current.rotation.y = ped.dir === 1 ? 0 - ang : Math.PI - ang;
    }
    if (u >= 1 && !done.current) {
      done.current = true;
      onDone(ped.id);
    }
  });

  return (
    <group ref={group}>
      <Person spec={specFor(`ped-${ped.id}`)} phase={phase} />
    </group>
  );
}

// People who use the zebra crossings. Pedestrians only ever cross there, and
// only the crossings near the bus are populated.
export function Pedestrians() {
  const [peds, setPeds] = useState<Ped[]>([]);
  const timers = useRef<number[]>(ZEBRAS.map((_, i) => 3 + i * 2.3));
  const seq = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    ZEBRAS.forEach((x, i) => {
      timers.current[i] -= dt;
      if (timers.current[i] > 0) return;
      seq.current += 1;
      timers.current[i] = 8 + ((seq.current * 7) % 11);
      if (Math.abs(x - busPose.x) > NEAR) return;
      setPeds((cur) =>
        cur.length >= MAX_WALKERS
          ? cur
          : [...cur, { id: seq.current, zebra: i, dir: seq.current % 2 === 0 ? 1 : -1 }],
      );
    });
  });

  const finish = (id: number) => setPeds((cur) => cur.filter((p) => p.id !== id));
  return (
    <>
      {peds.map((p) => (
        <Crosser key={p.id} ped={p} onDone={finish} />
      ))}
    </>
  );
}
