"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { MeshBasicMaterial } from "three";
import { useCanvasTexture, type Draw } from "./canvasTex";
import type { Junction } from "./data/network-v1";
import { lightFor } from "./logic/lights";
import { builtRoads } from "./logic/network";
import type { Light } from "./logic/signals";
import { allowedTurns, approachesOf, type Approach } from "./logic/turns";
import { useGame } from "./state/store";
import { NETWORK } from "./world";

const LIT: Record<Light, string> = { red: "#ff2a1a", yellow: "#ffc21a", green: "#22e05a" };
const DARK: Record<Light, string> = { red: "#3a0d0a", yellow: "#3a2c08", green: "#0a2e17" };
const ORDER: Light[] = ["red", "yellow", "green"];
const GLYPH = { left: "↰", straight: "↑", right: "↱" } as const;
const TURN_ORDER = ["left", "straight", "right"] as const;

// The plate under the lamps: one white arrow for each turn the approach allows.
function platePainter(turns: readonly string[]): Draw {
  return (g, w, h) => {
    g.fillStyle = "#14171a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#f4f1e6";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `700 ${Math.round(h * 0.7)}px system-ui, sans-serif`;
    const shown = TURN_ORDER.filter((t) => turns.includes(t));
    shown.forEach((t, i) => g.fillText(GLYPH[t], ((i + 0.5) * w) / shown.length, h * 0.52));
  };
}

function ArrowPlate({ turns }: { turns: readonly string[] }) {
  const draw = useMemo(() => platePainter(turns), [turns]);
  const tex = useCanvasTexture(192, 64, draw);
  return (
    <mesh position={[0, 2.5, 0.205]}>
      <planeGeometry args={[0.6, 0.2]} />
      <meshBasicMaterial map={tex} />
    </mesh>
  );
}

// A signal pole stands on the left footpath of every approach, just before the
// stop line, with its lamps turned toward the oncoming traffic.
function Head({ junction, approach }: { junction: Junction; approach: Approach }) {
  const lamps = useRef<(MeshBasicMaterial | null)[]>([]);
  const shown = useRef<Light | null>(null);
  const turns = useMemo(() => allowedTurns(NETWORK, junction.id, approach.id), [junction.id, approach.id]);
  const hw = builtRoads(NETWORK).find((r) => r.road.id === approach.road)!.road.halfWidth;

  useFrame(() => {
    const light = lightFor(junction, useGame.getState().signalTime, approach.axis);
    if (light === shown.current) return;
    shown.current = light;
    ORDER.forEach((l, i) => lamps.current[i]?.color.set(l === light ? LIT[l] : DARK[l]));
  });

  const fx = Math.cos(approach.heading);
  const fz = Math.sin(approach.heading);
  const off = hw + 1.2; // left of the direction of travel, on the footpath
  const x = approach.stopLineAt.x + fz * off;
  const z = approach.stopLineAt.z - fx * off;
  return (
    <group position={[x, 0, z]} rotation={[0, Math.atan2(-fx, -fz), 0]}>
      <mesh position={[0, 1.7, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 3.4, 8]} />
        <meshStandardMaterial color="#444a50" />
      </mesh>
      <mesh position={[0, 3.55, 0]}>
        <boxGeometry args={[0.5, 1.35, 0.4]} />
        <meshStandardMaterial color="#1c1f22" />
      </mesh>
      {ORDER.map((l, i) => (
        <mesh key={l} position={[0, 3.95 - i * 0.4, 0.22]}>
          <circleGeometry args={[0.16, 16]} />
          <meshBasicMaterial ref={(m) => { lamps.current[i] = m; }} color={DARK[l]} />
        </mesh>
      ))}
      <ArrowPlate turns={turns} />
    </group>
  );
}

export function SignalHeads() {
  return (
    <group>
      {NETWORK.junctions
        .filter((j) => j.signal !== false)
        .flatMap((j) => approachesOf(NETWORK, j.id).map((a) => <Head key={`${j.id}-${a.id}`} junction={j} approach={a} />))}
    </group>
  );
}
