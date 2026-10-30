"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { busLocalToWorld } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import type { PersonSpec } from "./logic/people";
import { Person } from "./Person";
import { queueSlot, shelterToWorld, specFor } from "./Stops";
import { useGame, type GameEvent } from "./state/store";

// Passenger doorway on the bus's left (kerb) side, just outside the door.
const DOOR = { x: 3.55, z: -1.9 };
const BOARD_S = 1.1;
const ALIGHT_S = 2.8;
const WALK_SPEED_PHASE = 9;

type Walker = { id: number; kind: "board" | "alight"; spec: PersonSpec; event: GameEvent };

function WalkerFigure({ w, onDone }: { w: Walker; onDone: (id: number) => void }) {
  const group = useRef<Group>(null);
  const phase = useRef(0);
  const t = useRef(0);
  const done = useRef(false);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    t.current += dt;
    phase.current += dt * WALK_SPEED_PHASE;
    const e = w.event;
    const stopPos = ROUTE_V1[e.stop].position;
    const door = busLocalToWorld(DOOR.x, DOOR.z);
    const slotFrom = queueSlot(e.slot);
    const slot = shelterToWorld(stopPos, e.side, slotFrom.x, slotFrom.z);

    let from: { x: number; z: number };
    let to: { x: number; z: number };
    let u: number;
    let dur: number;
    if (w.kind === "board") {
      from = slot;
      to = door;
      dur = BOARD_S;
      u = t.current / dur;
    } else {
      // step off, walk to the shelter, then carry on past it and away
      const away = shelterToWorld(stopPos, e.side, slotFrom.x + 1.5, slotFrom.z - 3.2);
      dur = ALIGHT_S;
      const split = 0.55;
      const p = t.current / dur;
      if (p < split) {
        from = door;
        to = slot;
        u = p / split;
      } else {
        from = slot;
        to = away;
        u = (p - split) / (1 - split);
      }
    }

    const k = Math.min(1, Math.max(0, u));
    const x = from.x + (to.x - from.x) * k;
    const z = from.z + (to.z - from.z) * k;
    if (group.current) {
      group.current.position.set(x, 0, z);
      group.current.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
    }
    if (t.current >= dur && !done.current) {
      done.current = true;
      onDone(w.id);
    }
  });

  return (
    <group ref={group}>
      <Person spec={w.spec} phase={phase} />
    </group>
  );
}

export function Walkers() {
  const [walkers, setWalkers] = useState<Walker[]>([]);

  useEffect(() => {
    let seen = useGame.getState().eventSeq;
    return useGame.subscribe((s) => {
      if (s.eventSeq === seen) return;
      const fresh = s.events.filter((e) => e.id > seen);
      seen = s.eventSeq;
      if (fresh.length === 0) return;
      setWalkers((cur) => [
        ...cur,
        ...fresh.map((event) => ({
          id: event.id,
          kind: event.type,
          spec: specFor(event.passengerId),
          event,
        })),
      ]);
    });
  }, []);

  const finish = (id: number) => setWalkers((cur) => cur.filter((w) => w.id !== id));

  return (
    <>
      {walkers.map((w) => (
        <WalkerFigure key={w.id} w={w} onDone={finish} />
      ))}
    </>
  );
}
