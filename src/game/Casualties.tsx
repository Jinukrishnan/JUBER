"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import type { Group } from "three";
import { groundY } from "./logic/network";
import { NETWORK } from "./world";
import { accidentLine } from "./logic/speech";
import { Person } from "./Person";
import { Speech } from "./SpeechBubble";
import { useGame, type Casualty } from "./state/store";
import { specFor } from "./Stops";

const FALL_S = 0.5; // time to go down
const THROWN_M = 1.8; // how far the impact carries them
const SLIDE_S = 0.8;
const SPEECH_S = 4.5;
const LIE_S = 7; // time on the ground before they are tidied away

// Someone the bus has hit: thrown to the side, falls flat, cries out in a speech
// bubble, and lands on whatever is under them, the footpath or the road.
function Fallen({ c }: { c: Casualty }) {
  const root = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const bubble = useRef<Group>(null);
  const t = useRef(0);
  const [speaking, setSpeaking] = useState(true);
  const landX = c.x + c.dx * THROWN_M;
  const landZ = c.z + c.dz * THROWN_M;
  const landY = groundY(NETWORK, landX, landZ);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    t.current += dt;
    const g = root.current;
    if (!g) return;
    const down = Math.min(1, t.current / FALL_S);
    const slideU = Math.min(1, t.current / SLIDE_S);
    const slide = THROWN_M * (1 - (1 - slideU) * (1 - slideU));
    const x = c.x + c.dx * slide;
    const z = c.z + c.dz * slide;
    const y = c.y + (landY - c.y) * slideU + 0.08 * down;
    g.position.set(x, y, z);
    g.rotation.y = Math.atan2(c.dx, c.dz);
    if (tilt.current) tilt.current.rotation.x = (Math.PI / 2) * down;
    if (bubble.current) bubble.current.position.set(x, y + 2.4, z);
    if (t.current > SPEECH_S && speaking) setSpeaking(false);
    if (t.current >= LIE_S) useGame.getState().clearCasualty(c.id);
  });

  return (
    <>
      <group ref={root}>
        <group ref={tilt}>
          <Person spec={specFor(c.personKey)} />
        </group>
      </group>
      <group ref={bubble}>{speaking && <Speech line={accidentLine(c.line)} />}</group>
    </>
  );
}

export function Casualties() {
  useGame((s) => s.casualties.map((c) => c.id).join(","));
  const casualties = useGame.getState().casualties;
  return (
    <>
      {casualties.map((c) => (
        <Fallen key={c.id} c={c} />
      ))}
    </>
  );
}
