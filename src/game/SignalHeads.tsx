"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { MeshBasicMaterial } from "three";
import { armStopDistance, armSigns, stopLineDistance, type ResolvedJunction } from "./logic/junction";
import { ROAD_HALF_WIDTH } from "./logic/road";
import { approachLight, type Approach, type Light } from "./logic/signals";
import { useGame } from "./state/store";
import { JUNCTIONS } from "./world";

const LIT: Record<Light, string> = { red: "#ff2a1a", yellow: "#ffc21a", green: "#22e05a" };
const DARK: Record<Light, string> = { red: "#3a0d0a", yellow: "#3a2c08", green: "#0a2e17" };
const ORDER: Light[] = ["red", "yellow", "green"];

type Spot = { approach: Approach; u: number; v: number; facing: number };

// A signal pole stands on the left footpath of every approach, just before the
// stop line, with its lamps turned toward the traffic.
function spotsFor(r: ResolvedJunction): Spot[] {
  const a = r.armHalfWidth;
  const spots: Spot[] = [
    { approach: "mainForward", u: -stopLineDistance(r), v: -(ROAD_HALF_WIDTH + 1.2), facing: -Math.PI / 2 },
    { approach: "mainBackward", u: stopLineDistance(r), v: ROAD_HALF_WIDTH + 1.2, facing: Math.PI / 2 },
  ];
  const arms = armSigns(r.arms);
  if (arms.includes(1)) spots.push({ approach: "armRight", u: -(a + 1.6), v: armStopDistance(), facing: 0 });
  if (arms.includes(-1)) spots.push({ approach: "armLeft", u: a + 1.6, v: -armStopDistance(), facing: Math.PI });
  return spots;
}

function Head({ r, spot }: { r: ResolvedJunction; spot: Spot }) {
  const lamps = useRef<(MeshBasicMaterial | null)[]>([]);
  const shown = useRef<Light | null>(null);
  useFrame(() => {
    const light = approachLight({ id: r.id, x: r.x, arms: r.arms, signal: r.plan ?? false }, useGame.getState().signalTime, spot.approach);
    if (light === shown.current) return;
    shown.current = light;
    ORDER.forEach((l, i) => lamps.current[i]?.color.set(l === light ? LIT[l] : DARK[l]));
  });
  return (
    <group position={[spot.u, 0, spot.v]} rotation={[0, spot.facing, 0]}>
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
    </group>
  );
}

export function SignalHeads() {
  return (
    <group>
      {JUNCTIONS.filter((r) => r.plan).map((r) => (
        <group key={r.id} position={[r.x, 0, r.z]} rotation={[0, -r.angle, 0]}>
          {spotsFor(r).map((spot) => (
            <Head key={spot.approach} r={r} spot={spot} />
          ))}
        </group>
      ))}
    </group>
  );
}
