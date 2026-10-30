"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect } from "react";
import { Bus } from "./Bus";
import { CameraRig } from "./CameraRig";
import { Road } from "./Road";
import { Stops } from "./Stops";
import { useGame } from "./state/store";

function GameLoop() {
  useFrame((_, dt) => {
    useGame.getState().tick(Math.min(dt, 0.1));
  });
  return null;
}

export default function GameCanvas() {
  useEffect(() => {
    useGame.getState().startDay();
  }, []);

  return (
    <Canvas
      shadows
      camera={{ fov: 60, near: 0.1, far: 900, position: [-15, 6.5, 0] }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#bfe3f5"]} />
      <fog attach="fog" args={["#bfe3f5", 80, 420]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[60, 120, 40]} intensity={1.6} castShadow />
      <Road />
      <Stops />
      <Bus />
      <CameraRig />
      <GameLoop />
    </Canvas>
  );
}
