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
import { createJunctionWatch } from "./logic/driveRules";
import { lampState } from "./logic/lamps";
import { clampToDrivable } from "./logic/network";
import { stepVehicle, type VehicleState } from "./logic/vehicle";
import { useGame } from "./state/store";
import { useHeldKeys, useKeyPress } from "./useKeys";
import { NETWORK } from "./world";

const CRASH_SPEED_KEPT = 0.3; // fraction of speed left after hitting someone

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
  const watch = useRef(createJunctionWatch(NETWORK));

  const dayId = useGame((g) => g.dayId);
  const kind = useGame((g) => g.vehicle);

  // a new day (first load or restart) puts the vehicle back at the depot
  useEffect(() => {
    resetBusPose();
    state.current = depotPose();
    watch.current.reset();
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
      const holding = game.ride.phase === "atPickup" || game.ride.phase === "boarding" || game.ride.phase === "alighting";
      const r = stepVehicle(
        before,
        // the vehicle stays put while the customer talks, gets in or gets out
        { throttle: holding ? 0 : k.throttle, steer: k.steer, handbrake: k.handbrake || holding },
        dt,
        6,
        0,
        (x, z) => clampToDrivable(NETWORK, x, z),
        spec,
      );
      state.current = r.state;
      // red lights run and turns made that the junction does not allow
      const seen = watch.current.step(before, r.state, game.signalTime, spec.length / 2);
      for (let i = 0; i < seen.redLights; i++) game.registerViolation();
      for (let i = 0; i < seen.wrongTurns; i++) game.registerWrongTurn();
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
      game.setVehicleState({ x: r.state.x, z: r.state.z, speed: r.state.speed, heading: r.state.heading });
    }

    const v = state.current;
    const live = game.phase === "running";
    updateEngine({ speed: v.speed, throttle: keys.current.throttle, live, kind: game.vehicle });
    setHorn(live && keys.current.horn);
    busPose.x = v.x;
    busPose.z = v.z;
    busPose.heading = v.heading;
    busPose.speed = v.speed;
    const lamps = lampState(live ? keys.current.throttle : 0, live && keys.current.handbrake, v.speed);
    busPose.braking = lamps.braking;
    busPose.reversing = lamps.reversing;

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
