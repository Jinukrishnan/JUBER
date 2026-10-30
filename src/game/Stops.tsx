"use client";

import { ROUTE_V1 } from "./data/route-v1";
import { ROAD_HALF_WIDTH, roadCenterZ } from "./logic/road";
import { ZONE_RADIUS } from "./constants";
import { useGame } from "./state/store";

const MAX_FIGURES = 12;
const SHIRTS = ["#e63946", "#2a9d8f", "#e9c46a", "#457b9d", "#f4a261", "#8e5ba6", "#3d8b5a"];

function shirtFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SHIRTS[h % SHIRTS.length];
}

function Shelter() {
  return (
    <group>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[6, 0.2, 2.4]} />
        <meshStandardMaterial color="#c8281a" />
      </mesh>
      {[-2.8, 2.8].map((x) => (
        <mesh key={x} position={[x, 1.3, 1]} castShadow>
          <boxGeometry args={[0.15, 2.6, 0.15]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      <mesh position={[0, 1.2, -1.1]}>
        <boxGeometry args={[6, 2.4, 0.1]} />
        <meshStandardMaterial color="#cfd8dc" transparent opacity={0.55} />
      </mesh>
      <mesh position={[0, 0.5, -0.7]}>
        <boxGeometry args={[4, 0.12, 0.7]} />
        <meshStandardMaterial color="#8a6a42" />
      </mesh>
      {/* sign post */}
      <mesh position={[3.6, 1.8, 0.9]}>
        <boxGeometry args={[0.1, 3.6, 0.1]} />
        <meshStandardMaterial color="#444" />
      </mesh>
      <mesh position={[3.6, 3.4, 0.9]}>
        <boxGeometry args={[0.9, 0.9, 0.08]} />
        <meshStandardMaterial color="#1565c0" />
      </mesh>
    </group>
  );
}

function Figure({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.26, 1.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#b9855a" />
      </mesh>
    </group>
  );
}

export function Stops() {
  const waiting = useGame((s) => s.waitingByStop);
  const doorOpen = useGame((s) => s.doorOpen);

  return (
    <group>
      {ROUTE_V1.map((stop, i) => {
        const cz = roadCenterZ(stop.position);
        const queue = waiting[i] ?? [];
        return (
          <group key={stop.id}>
            {/* stop zone marker on the road, kerb lane */}
            <mesh position={[stop.position, 0.05, cz - 3]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[ZONE_RADIUS * 2, 4]} />
              <meshBasicMaterial color={doorOpen ? "#4caf50" : "#f2b705"} transparent opacity={0.35} />
            </mesh>
            <group position={[stop.position, 0, cz - ROAD_HALF_WIDTH - 2.2]}>
              <Shelter />
              {queue.slice(0, MAX_FIGURES).map((p, k) => (
                <Figure
                  key={p.id}
                  x={-2.4 + (k % 6) * 0.95}
                  z={1.6 + Math.floor(k / 6) * 0.9}
                  color={shirtFor(p.id)}
                />
              ))}
            </group>
          </group>
        );
      })}
    </group>
  );
}
