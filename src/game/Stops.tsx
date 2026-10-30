"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import { PLACES } from "./data/places-v1";
import { ROUTE_V1 } from "./data/route-v1";
import { BAY_LENGTH, BAY_OFFSET, BAY_WIDTH, type Side } from "./logic/bay";
import { targetPlace } from "./logic/ride";
import { personFor, type PersonSpec } from "./logic/people";
import { roadAngle, roadCenterZ } from "./logic/road";
import type { Stop } from "./logic/route";
import { useGame } from "./state/store";

const SIDES: Side[] = ["forward", "backward"];
const DRAW_RANGE = 170; // only stops this close to the bus are drawn
const SHELTER_GAP = 2.2; // shelter set back from the bay's outer edge
export const FOOTPATH_HEIGHT = 0.15;

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

const CONCRETE = "#cfcabd";
const CREAM = "#efe6cf";
const GREEN = "#2f7d4a";
const TILE = "#b5412b";

function boardDrawer(stop: Stop): Draw {
  return (g, w, h) => {
    g.fillStyle = "#fffaf0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#14532d";
    g.lineWidth = 10;
    g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#b3302a";
    g.fillRect(10, h - 34, w - 20, 24);
    g.fillStyle = "#fffaf0";
    g.font = "bold 18px Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("AANAWADI  ·  PICK-UP POINT", w / 2, h - 22);
    g.fillStyle = "#14532d";
    g.font = malayalamFont(800, 88);
    g.fillText(stop.ml, w / 2, 62);
    g.fillStyle = "#222";
    g.font = "bold 34px Arial, sans-serif";
    g.fillText(stop.name.toUpperCase(), w / 2, 122);
  };
}

export const drawStopSign: Draw = (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1565c0";
  g.beginPath();
  g.arc(w / 2, h / 2, w / 2 - 10, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fff";
  g.fillRect(w * 0.27, h * 0.3, w * 0.46, h * 0.3);
  g.fillStyle = "#1565c0";
  g.fillRect(w * 0.31, h * 0.34, w * 0.38, h * 0.12);
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(w * 0.36, h * 0.64, w * 0.05, 0, Math.PI * 2);
  g.arc(w * 0.64, h * 0.64, w * 0.05, 0, Math.PI * 2);
  g.fill();
  g.font = "bold 22px Arial, sans-serif";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("PICK-UP", w / 2, h * 0.8);
};

// A Kerala-style waiting shed: concrete pillars, clay-tile roof, green-banded
// back wall, a bench, and a name board in Malayalam with the English below.
function Shelter({ stop }: { stop: Stop }) {
  const draw = useMemo(() => boardDrawer(stop), [stop]);
  const board = useCanvasTexture(1024, 192, draw, stop.ml);
  const sign = useCanvasTexture(128, 128, drawStopSign);

  return (
    <group>
      {/* plinth */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[6.8, 0.12, 2.7]} />
        <meshStandardMaterial color={CONCRETE} />
      </mesh>
      {/* pillars: concrete with a red band */}
      {[-3.0, 3.0].map((x) =>
        [-1.05, 1.05].map((z) => (
          <group key={`${x}${z}`} position={[x, 0, z]}>
            <mesh position={[0, 1.4, 0]} castShadow>
              <boxGeometry args={[0.2, 2.8, 0.2]} />
              <meshStandardMaterial color={CREAM} />
            </mesh>
            <mesh position={[0, 0.35, 0]}>
              <boxGeometry args={[0.215, 0.5, 0.215]} />
              <meshStandardMaterial color={TILE} />
            </mesh>
          </group>
        )),
      )}
      {/* back and side walls */}
      <mesh position={[0, 1.2, -1.08]}>
        <boxGeometry args={[6.0, 2.2, 0.14]} />
        <meshStandardMaterial color={CREAM} />
      </mesh>
      <mesh position={[0, 0.55, -1.0]}>
        <boxGeometry args={[6.0, 0.9, 0.16]} />
        <meshStandardMaterial color={GREEN} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.98, 1.2, -0.1]}>
          <boxGeometry args={[0.12, 2.2, 2.1]} />
          <meshStandardMaterial color={CREAM} />
        </mesh>
      ))}
      {/* clay-tile roof, sloping back, with a white fascia */}
      <mesh position={[0, 2.92, 0]} rotation={[0.08, 0, 0]} castShadow>
        <boxGeometry args={[7.0, 0.14, 3.4]} />
        <meshStandardMaterial color={TILE} />
      </mesh>
      {[-0.9, -0.3, 0.3, 0.9].map((z) => (
        <mesh key={z} position={[0, 3.0, z]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[7.0, 0.04, 0.05]} />
          <meshStandardMaterial color="#8a2f1d" />
        </mesh>
      ))}
      <mesh position={[0, 2.78, 1.66]}>
        <boxGeometry args={[7.0, 0.26, 0.1]} />
        <meshStandardMaterial color="#f2ece0" />
      </mesh>
      {/* the name board, hung under the roof edge and facing the road */}
      <mesh position={[0, 2.22, 1.68]}>
        <boxGeometry args={[5.5, 0.98, 0.06]} />
        <meshStandardMaterial color="#14532d" />
      </mesh>
      <mesh position={[0, 2.22, 1.715]}>
        <planeGeometry args={[5.4, 0.9]} />
        <meshBasicMaterial map={board} />
      </mesh>
      {[-2.5, 2.5].map((x) => (
        <mesh key={x} position={[x, 2.62, 1.66]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      ))}
      {/* bench */}
      <mesh position={[0, 0.5, -0.55]}>
        <boxGeometry args={[4.4, 0.07, 0.5]} />
        <meshStandardMaterial color="#8a6a42" />
      </mesh>
      <mesh position={[0, 0.85, -0.84]}>
        <boxGeometry args={[4.4, 0.42, 0.06]} />
        <meshStandardMaterial color="#8a6a42" />
      </mesh>
      {[-2.0, 0, 2.0].map((x) => (
        <mesh key={x} position={[x, 0.28, -0.55]}>
          <boxGeometry args={[0.08, 0.44, 0.45]} />
          <meshStandardMaterial color="#444" />
        </mesh>
      ))}
      {/* waste bin */}
      <mesh position={[2.4, 0.4, 0.5]}>
        <cylinderGeometry args={[0.22, 0.2, 0.7, 12]} />
        <meshStandardMaterial color="#2e7d32" />
      </mesh>
      {/* round bus-stop sign on a post, facing the traffic that approaches */}
      <mesh position={[3.9, 1.7, 0.9]}>
        <boxGeometry args={[0.07, 3.4, 0.07]} />
        <meshStandardMaterial color="#555" />
      </mesh>
      <mesh position={[3.9, 3.2, 0.9]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={sign} transparent alphaTest={0.05} />
      </mesh>
      <mesh position={[3.9, 3.2, 0.9]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.8, 0.8]} />
        <meshBasicMaterial map={sign} transparent alphaTest={0.05} />
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

// The shelters and painted bays at the main-road places. The bay turns green
// where the driver is headed.
export function Stops() {
  const ride = useGame((s) => s.ride);
  const groups = useRef<(Group | null)[]>([]);
  const target = targetPlace(ride);

  // draw only the shelters near the vehicle
  useFrame(() => {
    ROUTE_V1.forEach((stop, i) => {
      const g = groups.current[i];
      if (g) g.visible = Math.abs(stop.position - busPose.x) < DRAW_RANGE;
    });
  });

  return (
    <group>
      {ROUTE_V1.map((stop, i) => {
        const place = PLACES.find((p) => p.id === stop.id);
        // customers wait on one kerb only, so only that kerb gets a bay and a shelter
        const placeSide: Side | null = place?.at.kind === "main" ? (place.at.side === "left" ? "forward" : "backward") : null;
        const targetSide: Side | null = target && target.id === stop.id && place?.at.kind === "main" ? (place.at.side === "left" ? "forward" : "backward") : null;
        const edge = BAY_OFFSET + BAY_WIDTH / 2 + SHELTER_GAP;
        const cz = roadCenterZ(stop.position);
        return (
          <group key={stop.id} ref={(g) => { groups.current[i] = g; }}>
            {SIDES.filter((side) => !placeSide || side === placeSide).map((side) => (
              <group key={side}>
                <Bay stopPos={stop.position} side={side} occupied={targetSide === side} />
                <group position={[stop.position, FOOTPATH_HEIGHT, side === "forward" ? cz - edge : cz + edge]} rotation={[0, side === "forward" ? 0 : Math.PI, 0]}>
                  <Shelter stop={stop} />
                </group>
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}
