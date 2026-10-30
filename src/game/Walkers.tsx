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
// Doorway on the bus's left (kerb) side: outside the door, and just inside it.
const DOOR_OUT = { x: 3.55, z: -1.9 };
const DOOR_IN = { x: 3.55, z: -1.1 };
const FOOTPATH = 0.27; // kerb height plus the plinth the queue stands on
const STEP_UP = 0.55; // bus floor above the road
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
    const doorOut = busLocalToWorld(DOOR_OUT.x, DOOR_OUT.z);
    const doorIn = busLocalToWorld(DOOR_IN.x, DOOR_IN.z);
    const slotFrom = queueSlot(e.slot);
    const slot = shelterToWorld(stopPos, e.side, slotFrom.x, slotFrom.z);

    let from: { x: number; z: number };
    let to: { x: number; z: number };
    let u: number;
    let dur: number;
    let y = 0;
    if (w.kind === "board") {
      // out of the queue, to the door, then up the step and inside
      dur = BOARD_S;
      const split = 0.65;
      const p = t.current / dur;
      if (p < split) {
        from = slot;
        to = doorOut;
        u = p / split;
        y = FOOTPATH * (1 - Math.min(1, u * 1.5));
      } else {
        from = doorOut;
        to = doorIn;
        u = (p - split) / (1 - split);
        y = STEP_UP * u;
      }
    } else {
      // out of the doorway, down the step, across to the shelter, then away
      const away = shelterToWorld(stopPos, e.side, slotFrom.x + 1.5, slotFrom.z - 3.2);
      dur = ALIGHT_S;
      const split = 0.55;
      const p = t.current / dur;
      if (p < 0.15) {
        from = doorIn;
        to = doorOut;
        u = p / 0.15;
        y = STEP_UP * (1 - u);
      } else if (p < split) {
        from = doorOut;
        to = slot;
        u = (p - 0.15) / (split - 0.15);
        y = FOOTPATH * u;
      } else {
        from = slot;
        to = away;
        u = (p - split) / (1 - split);
        y = FOOTPATH;
      }
    }

    const k = Math.min(1, Math.max(0, u));
    const x = from.x + (to.x - from.x) * k;
    const z = from.z + (to.z - from.z) * k;
    if (group.current) {
      group.current.position.set(x, y, z);
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
