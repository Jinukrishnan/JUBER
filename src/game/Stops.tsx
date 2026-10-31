"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { busPose } from "./busPose";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import { BAY_LENGTH, BAY_OFFSET, BAY_WIDTH } from "./logic/bay";
import { headingAt, builtRoads } from "./logic/network";
import { placeSpot, type Place } from "./logic/places";
import { targetPlace } from "./logic/ride";
import { personFor, type PersonSpec } from "./logic/people";
import { useGame } from "./state/store";
import { ACTIVE_PLACES, NETWORK } from "./world";

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

type Named = { ml: string; name: string };

function boardDrawer(stop: Named): Draw {
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
function Shelter({ stop }: { stop: Named }) {
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

// The painted bay: a vehicle-length yellow rectangle that turns green where the
// driver is headed.
function Bay({ place, occupied }: { place: Place; occupied: boolean }) {
  const spot = placeSpot(NETWORK, place);
  return (
    <group position={[spot.x, 0, spot.z]} rotation={[0, -spot.heading, 0]}>
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

const SHELTERS = ACTIVE_PLACES.filter((p) => p.shelter);

// The shelters and painted bays at the bus-stop style places, on the kerb the
// customers wait on. The bay turns green where the driver is headed.
export function Stops() {
  const ride = useGame((s) => s.ride);
  const groups = useRef<(Group | null)[]>([]);
  const target = targetPlace(ride);

  // draw only the shelters near the vehicle
  useFrame(() => {
    SHELTERS.forEach((p, i) => {
      const g = groups.current[i];
      if (!g) return;
      const spot = placeSpot(NETWORK, p);
      g.visible = Math.hypot(spot.x - busPose.x, spot.z - busPose.z) < DRAW_RANGE;
    });
  });

  return (
    <group>
      {SHELTERS.map((place, i) => {
        const road = builtRoads(NETWORK).find((b) => b.road.id === place.road)!;
        const h = headingAt(road, place.s);
        const spot = placeSpot(NETWORK, place);
        // the shelter stands behind the bay, outward from the road, with its front toward it
        const out = BAY_OFFSET + BAY_WIDTH / 2 + SHELTER_GAP - BAY_OFFSET;
        const rx = -Math.sin(h) * place.side;
        const rz = Math.cos(h) * place.side;
        const face = Math.atan2(-rx, -rz);
        return (
          <group key={place.id} ref={(g) => { groups.current[i] = g; }}>
            <Bay place={place} occupied={target?.id === place.id} />
            <group position={[spot.x + rx * out, FOOTPATH_HEIGHT, spot.z + rz * out]} rotation={[0, face, 0]}>
              <Shelter stop={place} />
            </group>
          </group>
        );
      })}
    </group>
  );
}
