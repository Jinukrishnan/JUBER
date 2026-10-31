"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { DoubleSide } from "three";
import { busPose } from "./busPose";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import { PLACES, type Place } from "./data/places-v1";
import { reportHit } from "./hit";
import { busHitsPerson } from "./logic/collision";
import { customerSpot, placeSpot } from "./logic/places";
import { targetPlace } from "./logic/ride";
import { KERB_HEIGHT } from "./logic/network";
import { dialogueFor } from "./logic/dialogue";
import { Speech } from "./SpeechBubble";
import { specFor } from "./Stops";
import { Person } from "./Person";
import { useGame } from "./state/store";
import { NETWORK } from "./world";

// places without a shelter get a name board on a pole
const BOARD_PLACES = PLACES.filter((p) => !p.shelter);

function boardDrawer(place: Place): Draw {
  return (g, w, h) => {
    g.fillStyle = "#fffaf0";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#14532d";
    g.lineWidth = 8;
    g.strokeRect(6, 6, w - 12, h - 12);
    g.fillStyle = "#14532d";
    g.textAlign = "center";
    g.font = malayalamFont(700, 40);
    g.fillText(place.ml, w / 2, h * 0.45);
    g.font = "700 30px system-ui, sans-serif";
    g.fillText(place.name, w / 2, h * 0.82);
  };
}

// A name board on a pole beside a side-road place, turned toward the road.
function PlaceBoard({ place }: { place: Place }) {
  const draw = useMemo(() => boardDrawer(place), [place]);
  const tex = useCanvasTexture(512, 192, draw, place.ml);
  const c = customerSpot(NETWORK, place, 1);
  const spot = placeSpot(NETWORK, place);
  // stand a little behind the customers, facing across to the road
  const dx = spot.x - c.x;
  const dz = spot.z - c.z;
  const len = Math.hypot(dx, dz) || 1;
  const p = { x: c.x - (dx / len) * 1.2, z: c.z - (dz / len) * 1.2 };
  const rotY = Math.atan2(dx, dz);
  return (
    <group position={[p.x, KERB_HEIGHT, p.z]} rotation={[0, rotY, 0]}>
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.8, 8]} />
        <meshStandardMaterial color="#6b6f75" />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <planeGeometry args={[2.4, 0.9]} />
        <meshBasicMaterial map={tex} side={DoubleSide} />
      </mesh>
    </group>
  );
}

// The pillar of light over the place the driver is headed for.
function Beacon({ place, drop }: { place: Place; drop: boolean }) {
  const s = placeSpot(NETWORK, place);
  const color = drop ? "#2fe06a" : "#4aa3ff";
  return (
    <group position={[s.x, 0, s.z]}>
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 3.2, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 6, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 12, 20, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} depthWrite={false} side={DoubleSide} />
      </mesh>
    </group>
  );
}

// The customer or group waiting on the footpath at the pickup. Hit one and the
// booking is off.
function WaitingCustomers() {
  const ride = useGame((s) => s.ride);
  const request = ride.request;
  const waiting = request && (ride.phase === "toPickup" || ride.phase === "atPickup");

  useFrame(() => {
    if (!request || !waiting) return;
    for (let k = 0; k < request.group; k++) {
      const c = customerSpot(NETWORK, request.pickup, k);
      const hit = busHitsPerson(busPose, c);
      if (hit) {
        reportHit(`${request.id}-${k}`, { x: c.x, z: c.z, y: KERB_HEIGHT + 0.12 }, hit.side, true);
        return;
      }
    }
  });

  if (!request || !waiting) return null;
  const spot = placeSpot(NETWORK, request.pickup);
  const line = ride.phase === "atPickup" ? dialogueFor(request).bubble : null;
  return (
    <group>
      {Array.from({ length: request.group }, (_, k) => {
        const c = customerSpot(NETWORK, request.pickup, k);
        return (
          <group key={k} position={[c.x, KERB_HEIGHT + 0.12, c.z]} rotation={[0, Math.atan2(spot.x - c.x, spot.z - c.z), 0]}>
            <Person spec={specFor(`${request.id}-${k}`)} />
            {k === 0 && line && (
              <group position={[0, 2.5, 0]}>
                <Speech line={line} calm />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export function Places() {
  const ride = useGame((s) => s.ride);
  const target = targetPlace(ride);
  const drop = ride.phase === "riding" || ride.phase === "alighting";
  return (
    <group>
      {BOARD_PLACES.map((p) => (
        <PlaceBoard key={p.id} place={p} />
      ))}
      {target && <Beacon key={`${target.id}-${drop}`} place={target} drop={drop} />}
      <WaitingCustomers />
    </group>
  );
}
