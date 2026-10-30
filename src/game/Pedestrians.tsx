"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { busPose } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import type { P } from "./logic/path";
import { FOOTPATH_WIDTH, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { roadFeatures } from "./logic/roadside";
import { WalkingPerson } from "./WalkingPerson";

const ZEBRAS = roadFeatures(ROUTE_V1).zebras;
const FIRST = ROUTE_V1[0].position;
const LAST = ROUTE_V1[ROUTE_V1.length - 1].position;
const WALK = 1.4; // m/s
const NEAR = 140; // only crossings this close to the bus get walkers
const MAX_WALKERS = 6;
const ALONG = 10; // metres they walk along the footpath before and after crossing

type Walker = { id: number; key: string; path: P[]; speed: number };

// A point on a footpath: side -1 is the left kerb, +1 the right; `inset` is how far in from the kerb.
function onFootpath(x: number, side: 1 | -1, inset: number): P {
  return { x, z: roadCenterZ(x) + side * (roadHalfWidthAt(x) + inset) };
}

// Along the footpath to the zebra, over the stripes, and on along the other footpath.
function crossingPath(x0: number, dir: 1 | -1): P[] {
  const from = dir === 1 ? -1 : 1;
  const mid = FOOTPATH_WIDTH / 2;
  const a = dir === 1 ? x0 - ALONG : x0 + ALONG;
  const b = dir === 1 ? x0 + ALONG : x0 - ALONG;
  return [
    onFootpath(a, from, mid),
    onFootpath(x0, from, mid),
    onFootpath(x0, (-from) as 1 | -1, mid),
    onFootpath(b, (-from) as 1 | -1, mid),
  ];
}

// A walk along one footpath, keeping clear of the bus stops (shelters and queues stand there).
function strollPath(x: number, dir: 1 | -1, side: 1 | -1, inset: number): P[] | null {
  const len = 28;
  const end = x + dir * len;
  const lo = Math.min(x, end) - 8;
  const hi = Math.max(x, end) + 8;
  if (lo < FIRST || hi > LAST) return null;
  if (ROUTE_V1.some((s) => s.position > lo && s.position < hi)) return null;
  const mid = x + (dir * len) / 2;
  return [onFootpath(x, side, inset), onFootpath(mid, side, inset), onFootpath(end, side, inset)];
}

// People on the pavements. Pedestrians only ever cross at the zebra crossings,
// reaching them along the footpath, and only the ones near the bus are populated.
export function Pedestrians() {
  const [walkers, setWalkers] = useState<Walker[]>([]);
  const timers = useRef<number[]>(ZEBRAS.map((_, i) => 3 + i * 2.3));
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
    ZEBRAS.forEach((x, i) => {
      timers.current[i] -= dt;
      if (timers.current[i] > 0) return;
      timers.current[i] = 8 + rnd() * 10;
      if (Math.abs(x - busPose.x) > NEAR) return;
      const dir: 1 | -1 = rnd() < 0.5 ? 1 : -1;
      add({ key: `ped-${seq.current}`, path: crossingPath(x, dir), speed: WALK });
    });

    stroll.current -= dt;
    if (stroll.current <= 0) {
      stroll.current = 5 + rnd() * 6;
      const ahead = rnd() < 0.5 ? 1 : -1;
      const x = busPose.x + ahead * (30 + rnd() * 90);
      const path = strollPath(x, rnd() < 0.5 ? 1 : -1, rnd() < 0.5 ? 1 : -1, 0.9 + rnd() * 1.6);
      if (path) add({ key: `stroll-${seq.current}`, path, speed: WALK * (0.8 + rnd() * 0.4) });
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
