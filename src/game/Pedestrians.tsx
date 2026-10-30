"use client";

import { Billboard } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import type { Group } from "three";
import { playCrash } from "./audio";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import { busPose } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import { busHitsPerson } from "./logic/collision";
import { FOOTPATH_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { roadFeatures } from "./logic/roadside";
import { accidentLine, type Line } from "./logic/speech";
import { Person } from "./Person";
import { useGame } from "./state/store";
import { specFor } from "./Stops";

const ZEBRAS = roadFeatures(ROUTE_V1).zebras;
const SPEED = 1.4; // m/s
const NEAR = 140; // only crossings this close to the bus get walkers
const MAX_WALKERS = 4;
const KERB = 0.15;
const FALL_S = 0.5; // time to go down
const THROWN_M = 1.8; // how far the impact carries them
const SPEECH_S = 4.5;
const LIE_S = 7; // time on the ground before they are gone

type Ped = { id: number; zebra: number; dir: 1 | -1 };

function bubbleDrawer(line: Line): Draw {
  return (g, w, h) => {
    const tail = 34;
    const bh = h - tail;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffffff";
    g.strokeStyle = "#d32020";
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(6, 6, w - 12, bh - 6, 36);
    g.fill();
    g.stroke();
    // little tail pointing down at the person
    g.beginPath();
    g.moveTo(w / 2 - 26, bh - 4);
    g.lineTo(w / 2, h - 4);
    g.lineTo(w / 2 + 26, bh - 4);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = "#ffffff";
    g.fillRect(w / 2 - 22, bh - 12, 44, 14);
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#b91c1c";
    g.font = malayalamFont(800, 66);
    g.fillText(line.ml, w / 2, bh * 0.38);
    g.fillStyle = "#111";
    g.font = "bold 44px Arial, sans-serif";
    g.fillText(line.en, w / 2, bh * 0.77);
  };
}

// A speech bubble over someone's head, drawn in the scene so it always faces the camera.
export function Speech({ line }: { line: Line }) {
  const draw = useMemo(() => bubbleDrawer(line), [line]);
  const tex = useCanvasTexture(640, 280, draw, line.ml);
  return (
    <Billboard>
      <mesh renderOrder={50}>
        <planeGeometry args={[3.0, 1.3125]} />
        <meshBasicMaterial map={tex} transparent depthTest={false} />
      </mesh>
    </Billboard>
  );
}

function Crosser({ ped, onDone }: { ped: Ped; onDone: (id: number) => void }) {
  const root = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const bubble = useRef<Group>(null);
  const phase = useRef(0);
  const t = useRef(0);
  const done = useRef(false);
  const fall = useRef<{ x: number; z: number; dx: number; dz: number; at: number } | null>(null);
  const [speech, setSpeech] = useState<Line | null>(null);

  const x0 = ZEBRAS[ped.zebra];
  const half = roadHalfWidthAt(x0);
  const reach = half + FOOTPATH_WIDTH * 0.5;
  const dur = (reach * 2) / SPEED;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = root.current;
    if (!g) return;

    if (!fall.current) {
      t.current += dt;
      phase.current += dt * 8;
      const u = Math.min(1, t.current / dur);
      const off = (-reach + 2 * reach * u) * ped.dir;
      const px = x0;
      const pz = roadCenterZ(x0) + off;
      g.position.set(px, Math.abs(off) > half ? KERB : 0, pz);
      g.rotation.y = (ped.dir === 1 ? 0 : Math.PI) - roadAngle(x0);

      // struck by the bus: thrown clear to the side, and they cry out
      const hit = useGame.getState().phase === "running" ? busHitsPerson(busPose, { x: px, z: pz }) : null;
      if (hit) {
        const fwd = Math.sign(busPose.speed) || 1;
        const fx = Math.cos(busPose.heading) * fwd * 0.5;
        const fz = Math.sin(busPose.heading) * fwd * 0.5;
        const sx = -Math.sin(busPose.heading) * hit.side * 0.9;
        const sz = Math.cos(busPose.heading) * hit.side * 0.9;
        const len = Math.hypot(fx + sx, fz + sz) || 1;
        fall.current = { x: px, z: pz, dx: (fx + sx) / len, dz: (fz + sz) / len, at: 0 };
        busPose.bump = true;
        useGame.getState().registerAccident();
        playCrash();
        setSpeech(accidentLine(ped.id));
      }
      if (u >= 1 && !done.current) {
        done.current = true;
        onDone(ped.id);
      }
      return;
    }

    // down on the ground, a little way from where they were hit
    const f = fall.current;
    f.at += dt;
    const down = Math.min(1, f.at / FALL_S);
    const slide = THROWN_M * (1 - Math.pow(1 - Math.min(1, f.at / 0.8), 2));
    g.position.set(f.x + f.dx * slide, 0.08 * down, f.z + f.dz * slide);
    g.rotation.y = Math.atan2(f.dx, f.dz);
    if (tilt.current) tilt.current.rotation.x = (Math.PI / 2) * down;
    if (bubble.current) bubble.current.position.set(g.position.x, 2.4, g.position.z);
    if (f.at > SPEECH_S && speech) setSpeech(null);
    if (f.at >= LIE_S && !done.current) {
      done.current = true;
      onDone(ped.id);
    }
  });

  return (
    <>
      <group ref={root}>
        <group ref={tilt}>
          <Person spec={specFor(`ped-${ped.id}`)} phase={phase} />
        </group>
      </group>
      <group ref={bubble}>{speech && <Speech line={speech} />}</group>
    </>
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
