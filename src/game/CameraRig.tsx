"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import { busPose } from "./busPose";
import { useKeyPress } from "./useKeys";

export const CAMERA_MODES = ["chase", "high", "driver"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

// Offsets are in bus-local space: +x forward, +y up, +z right (driver side).
const OFFSETS: Record<CameraMode, { pos: [number, number, number]; look: [number, number, number] }> = {
  chase: { pos: [-15, 6.5, 0], look: [8, 1.8, 0] },
  high: { pos: [-10, 28, 0], look: [8, 0, 0] },
  driver: { pos: [3.6, 2.7, 0.7], look: [40, 2.3, 0.7] },
};

function toWorld(local: [number, number, number], out: Vector3) {
  const c = Math.cos(busPose.heading);
  const s = Math.sin(busPose.heading);
  return out.set(
    busPose.x + local[0] * c - local[2] * s,
    local[1],
    busPose.z + local[0] * s + local[2] * c,
  );
}

export function CameraRig() {
  const [mode, setMode] = useState<CameraMode>("chase");
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const smooth = useRef(new Vector3(-15, 6.5, 0));

  useKeyPress(["KeyC"], () =>
    setMode((m) => CAMERA_MODES[(CAMERA_MODES.indexOf(m) + 1) % CAMERA_MODES.length]),
  );

  useFrame(({ camera }, dt) => {
    const o = OFFSETS[mode];
    toWorld(o.pos, pos.current);
    toWorld(o.look, look.current);
    const k = mode === "driver" ? 1 : Math.min(1, dt * 5);
    smooth.current.lerp(pos.current, k);
    camera.position.copy(smooth.current);
    camera.lookAt(look.current);
  });

  return null;
}
