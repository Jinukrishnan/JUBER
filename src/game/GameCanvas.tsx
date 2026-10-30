"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { Casualties } from "./Casualties";
import { CameraRig } from "./CameraRig";
import { Ground } from "./Ground";
import { Junctions } from "./Junctions";
import { Pedestrians } from "./Pedestrians";
import { Road } from "./Road";
import { SignalHeads } from "./SignalHeads";
import { Signs } from "./Signs";
import { Stops } from "./Stops";
import type { VehicleKind } from "./data/vehicles";
import { useGame } from "./state/store";
import { Vehicle } from "./Vehicle";
import { Walkers } from "./Walkers";
import { Weather } from "./Weather";

function GameLoop() {
  useFrame((_, dt) => {
    useGame.getState().tick(Math.min(dt, 0.1));
  });
  return null;
}

export default function GameCanvas({ vehicle }: { vehicle?: VehicleKind }) {
  useEffect(() => {
    useGame.getState().startDay(vehicle);
  }, [vehicle]);

  return (
    <Canvas
      shadows="percentage"
      camera={{ fov: 60, near: 0.1, far: 1600, position: [-15, 6.5, 0] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <Weather />
      <Ground />
      <Road />
      <Junctions />
      <SignalHeads />
      <Signs />
      <Stops />
      <Pedestrians />
      <Casualties />
      <Vehicle />
      <Walkers />
      <CameraRig />
      <GameLoop />
    </Canvas>
  );
}
