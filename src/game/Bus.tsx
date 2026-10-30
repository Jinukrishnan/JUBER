"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { BusModel } from "./BusModel";
import { armAudio, setEngine, setHorn, stopAudio } from "./audio";
import { busPose, depotPose, resetBusPose } from "./busPose";
import { ROUTE_V1 } from "./data/route-v1";
import { bayAt } from "./logic/bay";
import { roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { MAX_FORWARD_SPEED, stepVehicle, type VehicleState } from "./logic/vehicle";
import { useGame } from "./state/store";
import { useHeldKeys, useKeyPress } from "./useKeys";

const WIDTH = 2.6;

export function Bus() {
  const group = useRef<Group>(null);
  const door = useRef<Group>(null);
  const keys = useHeldKeys();
  const vehicle = useRef<VehicleState>(depotPose());
  const edgeCooldown = useRef(0);

  const dayId = useGame((g) => g.dayId);

  // a new day (first load or restart) puts the bus back at the depot
  useEffect(() => {
    resetBusPose();
    vehicle.current = depotPose();
  }, [dayId]);

  useEffect(() => {
    const disarm = armAudio();
    return () => {
      disarm();
      stopAudio();
    };
  }, []);

  useKeyPress(["KeyE"], () => useGame.getState().toggleDoor());

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const game = useGame.getState();
    if (game.phase === "running") {
      const k = keys.current;
      const doorShut = !game.doorOpen;
      const r = stepVehicle(
        vehicle.current,
        {
          throttle: doorShut ? k.throttle : 0,
          steer: k.steer,
          handbrake: k.handbrake || !doorShut,
        },
        dt,
        roadHalfWidthAt(vehicle.current.x),
        roadCenterZ(vehicle.current.x),
      );
      vehicle.current = r.state;
      edgeCooldown.current -= dt;
      if (r.hitEdge && edgeCooldown.current <= 0) {
        edgeCooldown.current = 1;
        game.registerHarsh();
      }
      // the bus must be completely inside the painted bay for people to get on/off
      const bay = bayAt(ROUTE_V1, r.state.x, r.state.z, r.state.heading);
      game.setBusState(r.state.x, Math.abs(r.state.speed), bay);
    }

    const v = vehicle.current;
    const live = game.phase === "running";
    setEngine(live ? Math.abs(v.speed) / MAX_FORWARD_SPEED : 0);
    setHorn(live && keys.current.horn);
    busPose.x = v.x;
    busPose.z = v.z;
    busPose.heading = v.heading;
    busPose.speed = v.speed;

    if (group.current) {
      group.current.position.set(v.x, 0, v.z);
      group.current.rotation.y = -v.heading;
    }
    if (door.current) {
      const target = -WIDTH / 2 - (game.doorOpen ? 0.6 : 0);
      door.current.position.z += (target - door.current.position.z) * Math.min(1, dt * 8);
    }
  });

  return (
    <group ref={group}>
      <BusModel doorRef={door} />
    </group>
  );
}
