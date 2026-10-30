"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import { BAY_LENGTH, BAY_OFFSET, BAY_WIDTH, type Side } from "./logic/bay";
import { travelSide } from "./logic/boarding";
import { personFor, type PersonSpec } from "./logic/people";
import { roadAngle, roadCenterZ } from "./logic/road";
import { Person } from "./Person";
import { useGame } from "./state/store";

const SIDES: Side[] = ["forward", "backward"];

// A person never changes look, so build each spec once.
const specs = new Map<string, PersonSpec>();
export function specFor(id: string): PersonSpec {
  let s = specs.get(id);
  if (!s) {
    s = personFor(id);
    specs.set(id, s);
  }
  return s;
}
const MAX_VISIBLE = 6; // people drawn per shelter
const DRAW_RANGE = 170; // only stops this close to the bus are drawn
const SHELTER_GAP = 2.2; // shelter set back from the bay's outer edge

// Where the k-th person in a shelter queue stands, in the shelter's local frame
// (+z toward the road).
export function queueSlot(k: number): { x: number; z: number } {
  return { x: -1.6 + (k % 3) * 1.0, z: 0.9 + Math.floor(k / 3) * 0.9 };
}

// World x/z of a shelter-local point. The back-kerb shelter is turned 180 degrees.
export function shelterToWorld(stopPos: number, side: Side, lx: number, lz: number) {
  const cz = roadCenterZ(stopPos);
  const edge = BAY_OFFSET + BAY_WIDTH / 2 + SHELTER_GAP;
  return side === "forward"
    ? { x: stopPos + lx, z: cz - edge + lz }
    : { x: stopPos - lx, z: cz + edge - lz };
}

function Shelter() {
  return (
    <group>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[6, 0.2, 2.4]} />
        <meshStandardMaterial color="#c8281a" />
      </mesh>
      {[-2.8, 2.8].map((x) => (
        <mesh key={x} position={[x, 1.3, 1]}>
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

// The painted bay: bus-length yellow rectangle that turns green once the bus
// is completely inside it, lined up, and on the right kerb.
function Bay({ stopPos, side, occupied }: { stopPos: number; side: Side; occupied: boolean }) {
  const cz = roadCenterZ(stopPos) + (side === "forward" ? -BAY_OFFSET : BAY_OFFSET);
  return (
    <group position={[stopPos, 0, cz]} rotation={[0, -roadAngle(stopPos), 0]}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BAY_LENGTH + 0.4, BAY_WIDTH + 0.4]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BAY_LENGTH - 0.2, BAY_WIDTH - 0.2]} />
        <meshBasicMaterial color={occupied ? "#2fcf5b" : "#f2c200"} />
      </mesh>
    </group>
  );
}

export function Stops() {
  // The store rebuilds the waiting lists every frame to count patience down, so
  // subscribe to who is waiting (ids) rather than the arrays themselves.
  useGame((s) => s.waitingByStop.map((q) => q.slice(0, 40).map((p) => p.id).join(",")).join("|"));
  const waiting = useGame.getState().waitingByStop;
  const parked = useGame((s) => s.parked);
  const groups = useRef<(Group | null)[]>([]);

  // draw only the stops near the bus; a bus line is long and people are not cheap
  useFrame(() => {
    ROUTE_V1.forEach((stop, i) => {
      const g = groups.current[i];
      if (g) g.visible = Math.abs(stop.position - busPose.x) < DRAW_RANGE;
    });
  });

  return (
    <group>
      {ROUTE_V1.map((stop, i) => {
        const queue = waiting[i] ?? [];
        return (
          <group key={stop.id} ref={(g) => { groups.current[i] = g; }}>
            {SIDES.map((side) => {
              const here = queue.filter((p) => travelSide(p) === side).slice(0, MAX_VISIBLE);
              const edge = BAY_OFFSET + BAY_WIDTH / 2 + SHELTER_GAP;
              const cz = roadCenterZ(stop.position);
              return (
                <group key={side}>
                  <Bay
                    stopPos={stop.position}
                    side={side}
                    occupied={parked !== null && parked.stop === i && parked.side === side}
                  />
                  <group
                    position={[stop.position, 0, side === "forward" ? cz - edge : cz + edge]}
                    rotation={[0, side === "forward" ? 0 : Math.PI, 0]}
                  >
                    <Shelter />
                    {here.map((p, k) => {
                      const slot = queueSlot(k);
                      return (
                        <group key={p.id} position={[slot.x, 0, slot.z]}>
                          <Person spec={specFor(p.id)} />
                        </group>
                      );
                    })}
                  </group>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
