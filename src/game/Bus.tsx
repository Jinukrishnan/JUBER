"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group } from "three";
import { armAudio, setEngine, setHorn, stopAudio } from "./audio";
import { busPose, resetBusPose } from "./busPose";
import { roadCenterZ, ROAD_HALF_WIDTH } from "./logic/road";
import { MAX_FORWARD_SPEED, stepVehicle, type VehicleState } from "./logic/vehicle";
import { useGame } from "./state/store";
import { useHeldKeys, useKeyPress } from "./useKeys";

const LENGTH = 10;
const WIDTH = 2.6;

export function Bus() {
  const group = useRef<Group>(null);
  const door = useRef<Group>(null);
  const keys = useHeldKeys();
  const vehicle = useRef<VehicleState>({ x: 0, z: 0, heading: 0, speed: 0 });
  const edgeCooldown = useRef(0);

  const dayId = useGame((g) => g.dayId);

  // a new day (first load or restart) puts the bus back at the depot
  useEffect(() => {
    resetBusPose();
    vehicle.current = { x: 0, z: 0, heading: 0, speed: 0 };
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
        ROAD_HALF_WIDTH,
        roadCenterZ(vehicle.current.x),
      );
      vehicle.current = r.state;
      edgeCooldown.current -= dt;
      if (r.hitEdge && edgeCooldown.current <= 0) {
        edgeCooldown.current = 1;
        game.registerHarsh();
      }
      game.setBusState(r.state.x, Math.abs(r.state.speed));
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
      {/* lower body (red) */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[LENGTH, 1.5, WIDTH]} />
        <meshStandardMaterial color="#c8281a" />
      </mesh>
      {/* upper body (cream) */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[LENGTH, 1.3, WIDTH]} />
        <meshStandardMaterial color="#f3ead6" />
      </mesh>
      {/* window band */}
      <mesh position={[0, 2.6, 0]}>
        <boxGeometry args={[LENGTH - 0.6, 0.8, WIDTH + 0.04]} />
        <meshStandardMaterial color="#1b2a38" metalness={0.3} roughness={0.2} />
      </mesh>
      {/* roof */}
      <mesh position={[0, 3.25, 0]}>
        <boxGeometry args={[LENGTH - 0.2, 0.15, WIDTH - 0.1]} />
        <meshStandardMaterial color="#d8cfba" />
      </mesh>
      {/* badge stripe */}
      <mesh position={[0, 1.75, 0]}>
        <boxGeometry args={[LENGTH + 0.02, 0.18, WIDTH + 0.02]} />
        <meshStandardMaterial color="#f2b705" />
      </mesh>
      {/* windscreen + headlights */}
      <mesh position={[LENGTH / 2 + 0.01, 2.5, 0]}>
        <boxGeometry args={[0.05, 1, WIDTH - 0.3]} />
        <meshStandardMaterial color="#26384a" />
      </mesh>
      {[-0.9, 0.9].map((z) => (
        <mesh key={z} position={[LENGTH / 2 + 0.02, 1.0, z]}>
          <boxGeometry args={[0.05, 0.3, 0.4]} />
          <meshStandardMaterial color="#fff6c2" emissive="#fff0a0" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* passenger door on the left kerb side (-z); driver sits on the right (+z) */}
      <group ref={door} position={[2.8, 1.6, -WIDTH / 2]}>
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[1.1, 2.3, 0.06]} />
          <meshStandardMaterial color="#8d1a10" />
        </mesh>
      </group>
      {/* wheels */}
      {[
        [3.2, 1.35],
        [3.2, -1.35],
        [-3.2, 1.35],
        [-3.2, -1.35],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, 0.55, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.55, 0.55, 0.4, 16]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      ))}
    </group>
  );
}
