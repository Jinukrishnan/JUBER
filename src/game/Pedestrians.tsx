"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { busPose } from "./busPose";
import type { P } from "./logic/path";
import { nearest } from "./logic/network";
import { crossingPath, strollPath } from "./logic/walks";
import { WalkingPerson } from "./WalkingPerson";
import { ACTIVE_PLACES, FEATURES, NETWORK } from "./world";

const ZEBRAS = FEATURES.zebras;
const WALK = 1.4; // m/s
const NEAR = 140; // only crossings this close to the vehicle get walkers
const MAX_WALKERS = 6;

type Walker = { id: number; key: string; path: P[]; speed: number };

// People on the pavements. Pedestrians only ever cross at the zebra crossings,
// reaching them along the footpath, and only the ones near the vehicle are populated.
export function Pedestrians() {
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const timers = useRef<number[]>(ZEBRAS.map((_, i) => 3 + i * 0.9));
  const stroll = useRef(2);
  const seq = useRef(0);

  const rnd = () => {
    seq.current += 1;
    return ((seq.current * 7919) % 1000) / 1000;
  };
  const add = (w: Omit<Walker, "id">) =>
    setWalkers((cur) => (cur.length >= MAX_WALKERS ? cur : [...cur, { ...w, id: ++seq.current }]));

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    ZEBRAS.forEach((z, i) => {
      timers.current[i] -= dt;
      if (timers.current[i] > 0) return;
      timers.current[i] = 8 + rnd() * 10;
      if (Math.hypot(z.x - busPose.x, z.z - busPose.z) > NEAR) return;
      add({ key: `ped-${seq.current}`, path: crossingPath(NETWORK, z, rnd() < 0.5 ? 1 : -1), speed: WALK });
    });

    stroll.current -= dt;
    if (stroll.current <= 0) {
      stroll.current = 5 + rnd() * 6;
      // somewhere 30 to 120 m from the vehicle, on whichever road is nearest
      const a = rnd() * Math.PI * 2;
      const d = 30 + rnd() * 90;
      const near = nearest(NETWORK, busPose.x + Math.cos(a) * d, busPose.z + Math.sin(a) * d);
      if (near.distance < 25) {
        const path = strollPath(NETWORK, ACTIVE_PLACES, near.road, near.s, rnd() < 0.5 ? 1 : -1, rnd() < 0.5 ? 1 : -1, 0.9 + rnd() * 1.6);
        if (path) add({ key: `stroll-${seq.current}`, path, speed: WALK * (0.8 + rnd() * 0.4) });
      }
    }
  });

  const finish = (id: number) => setWalkers((cur) => cur.filter((w) => w.id !== id));
  return (
    <>
      {walkers.map((w) => (
        <WalkingPerson key={w.id} personKey={w.key} path={w.path} speed={w.speed} onDone={() => finish(w.id)} />
      ))}
    </>
  );
}
