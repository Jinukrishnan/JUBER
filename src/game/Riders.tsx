"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Group } from "three";
import { busLocalToWorld, busPose } from "./busPose";
import { VEHICLES } from "./data/vehicles";
import { customerSpot } from "./logic/places";
import { KERB_HEIGHT } from "./logic/road";
import type { Request } from "./logic/requests";
import { Person } from "./Person";
import { specFor } from "./Stops";
import { useGame } from "./state/store";
import { JUNCTIONS } from "./world";

const STAGGER_S = 0.7; // each person starts this long after the one before
const WALK_S = 1.6;
const SIT_DROP = 0.78; // a standing figure sits this far below the seat top
const STEP_PHASE = 9;

// Everything the customer group does around the vehicle: walk from the footpath
// to their seats, ride, and walk back out at the drop. Boarding and alighting
// finish when the last person has walked in or out.
function Rider({ request, k, mode, clock }: { request: Request; k: number; mode: "board" | "ride" | "alight"; clock: RefObject<number> }) {
  const group = useRef<Group>(null);
  const phase = useRef(0);
  const kind = useGame((s) => s.vehicle);
  const seat = VEHICLES[kind].riderSeats[k];

  useFrame((_, rawDt) => {
    const g = group.current;
    if (!g || !seat) return;
    const dt = Math.min(rawDt, 0.05);
    const place = mode === "board" ? request.pickup : request.drop;
    const c = customerSpot(place, JUNCTIONS, k);
    const s = busLocalToWorld(seat[0], seat[2]);
    const seatY = seat[1] - SIT_DROP;
    const footY = KERB_HEIGHT + 0.12;

    // 0 at the footpath, 1 in the seat
    let u = 1;
    if (mode === "board") u = Math.min(1, Math.max(0, (clock.current - k * STAGGER_S) / WALK_S));
    if (mode === "alight") u = 1 - Math.min(1, Math.max(0, (clock.current - k * STAGGER_S) / WALK_S));
    const walking = u > 0 && u < 1;
    if (walking) phase.current += dt * STEP_PHASE;

    g.position.x = c.x + (s.x - c.x) * u;
    g.position.z = c.z + (s.z - c.z) * u;
    // step up into the vehicle over the last part of the walk
    const lift = Math.min(1, Math.max(0, (u - 0.6) / 0.4));
    g.position.y = footY + (seatY - footY) * lift;
    if (u >= 1) g.rotation.y = Math.PI / 2 - busPose.heading;
    else {
      const dx = s.x - c.x;
      const dz = s.z - c.z;
      const back = mode === "alight" ? -1 : 1;
      g.rotation.y = Math.atan2(dx * back, dz * back);
    }
  });

  return (
    <group ref={group}>
      <Person spec={specFor(`${request.id}-${k}`)} phase={phase} />
    </group>
  );
}

export function Riders() {
  const ride = useGame((s) => s.ride);
  const clock = useRef(0);
  const lastPhase = useRef(ride.phase);
  const finished = useRef(false);
  const request = ride.request;
  const mode = ride.phase === "boarding" ? "board" : ride.phase === "riding" ? "ride" : ride.phase === "alighting" ? "alight" : null;

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const g = useGame.getState();
    if (g.ride.phase !== lastPhase.current) {
      lastPhase.current = g.ride.phase;
      clock.current = 0;
      finished.current = false;
    }
    if (g.phase !== "running" || !g.ride.request) return;
    if (g.ride.phase !== "boarding" && g.ride.phase !== "alighting") return;
    clock.current += dt;
    if (!finished.current && clock.current >= (g.ride.request.group - 1) * STAGGER_S + WALK_S) {
      finished.current = true;
      if (g.ride.phase === "boarding") g.finishBoarding();
      else g.finishAlighting();
    }
  });

  if (!request || !mode) return null;
  return (
    <group>
      {Array.from({ length: request.group }, (_, k) => (
        <Rider key={`${request.id}-${k}-${mode}`} request={request} k={k} mode={mode} clock={clock} />
      ))}
    </group>
  );
}
