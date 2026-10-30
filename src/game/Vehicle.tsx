"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { armAudio, setHorn, stopAudio, updateEngine } from "./audio";
import { busPose, depotPose, resetBusPose } from "./busPose";
import { VEHICLES, type VehicleKind } from "./data/vehicles";
import { Auto } from "./models/Auto";
import { Bike } from "./models/Bike";
import { Car } from "./models/Car";
import { clampToDrivable } from "./logic/junction";
import { redViolation } from "./logic/redlight";
import { roadCenterZ, roadHalfWidthAt } from "./logic/road";
import type { Approach } from "./logic/signals";
import { stepVehicle, type VehicleState } from "./logic/vehicle";
import { useGame } from "./state/store";
import { useHeldKeys, useKeyPress } from "./useKeys";
import { JUNCTIONS } from "./world";

const CRASH_SPEED_KEPT = 0.3; // fraction of speed left after hitting someone
const APPROACHES: Approach[] = ["mainForward", "mainBackward", "armLeft", "armRight"];

function Model({ kind }: { kind: VehicleKind }) {
  if (kind === "bike") return <Bike />;
  if (kind === "car") return <Car />;
  return <Auto />;
}

// The vehicle the driver chose: reads the keys, steps the physics with that
// vehicle's handling, keeps it on the paved area, and reports red-light
// crossings, scrapes and its pose to the rest of the game.
export function Vehicle() {
  const group = useRef<Group>(null);
  const keys = useHeldKeys();
  const state = useRef<VehicleState>(depotPose());
  const edgeCooldown = useRef(0);

  const dayId = useGame((g) => g.dayId);
  const kind = useGame((g) => g.vehicle);

  // a new day (first load or restart) puts the vehicle back at the depot
  useEffect(() => {
    resetBusPose();
    state.current = depotPose();
  }, [dayId]);

  useEffect(() => {
    const spec = VEHICLES[kind];
    busPose.length = spec.length;
    busPose.width = spec.width;
  }, [kind]);

  useEffect(() => {
    const disarm = armAudio();
    return () => {
      disarm();
      stopAudio();
    };
  }, []);

  useKeyPress(["KeyL"], () => useGame.getState().toggleHeadlights());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const game = useGame.getState();
    const spec = VEHICLES[game.vehicle];
    if (game.phase === "running") {
      const k = keys.current;
      const before = state.current;
      const r = stepVehicle(
        before,
        { throttle: k.throttle, steer: k.steer, handbrake: k.handbrake },
        dt,
        roadHalfWidthAt(before.x),
        roadCenterZ(before.x),
        (x, z) => clampToDrivable(JUNCTIONS, x, z),
        spec,
      );
      state.current = r.state;
      // the front crossing a stop line while that light is red
      for (const j of JUNCTIONS) {
        if (!j.plan || Math.abs(j.x - r.state.x) > 60) continue;
        for (const a of APPROACHES) {
          if (redViolation(j, a, before, r.state, game.signalTime, spec.length / 2)) game.registerViolation();
        }
      }
      // hitting someone knocks the speed off (the collision itself is detected where the people are)
      if (busPose.bump) {
        busPose.bump = false;
        state.current = { ...state.current, speed: state.current.speed * CRASH_SPEED_KEPT };
      }
      edgeCooldown.current -= dt;
      if (r.hitEdge && edgeCooldown.current <= 0) {
        edgeCooldown.current = 1;
        game.registerHarsh();
      }
      game.setBusState(r.state.x, Math.abs(r.state.speed), null);
    }

    const v = state.current;
    const live = game.phase === "running";
    updateEngine({ speed: v.speed, throttle: keys.current.throttle, live, kind: game.vehicle });
    setHorn(live && keys.current.horn);
    busPose.x = v.x;
    busPose.z = v.z;
    busPose.heading = v.heading;
    busPose.speed = v.speed;

    if (group.current) {
      group.current.position.set(v.x, 0, v.z);
      group.current.rotation.y = -v.heading;
    }
  });

  return (
    <group ref={group}>
      <Model kind={kind} />
    </group>
  );
}
