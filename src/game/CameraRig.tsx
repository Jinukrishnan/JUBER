"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import { busPose } from "./busPose";
import { VEHICLES } from "./data/vehicles";
import { chaseScale, isReversing, stepChaseYaw } from "./logic/camera";
import { useGame } from "./state/store";
import { useKeyPress } from "./useKeys";

export const CAMERA_MODES = ["chase", "high", "driver"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

// chase / high: distance behind the vehicle along the camera yaw, height, and how
// far ahead of it (along the same yaw) the camera looks. These are for a 10 m
// bus and shrink with the vehicle's length.
const FOLLOW = {
  chase: { back: 15, height: 6.5, look: 8 },
  high: { back: 10, height: 28, look: 8 },
} as const;


function local(o: readonly [number, number, number], out: Vector3) {
  const c = Math.cos(busPose.heading);
  const s = Math.sin(busPose.heading);
  return out.set(
    busPose.x + o[0] * c - o[2] * s,
    o[1],
    busPose.z + o[0] * s + o[2] * c,
  );
}

export function CameraRig() {
  const [mode, setMode] = useState<CameraMode>("chase");
  const yaw = useRef(0);
  const pos = useRef(new Vector3());
  const look = useRef(new Vector3());
  const smoothPos = useRef(new Vector3(-15, 6.5, -3.7));
  const smoothLook = useRef(new Vector3(8, 1.8, 0));

  useKeyPress(["KeyC"], () =>
    setMode((m) => CAMERA_MODES[(CAMERA_MODES.indexOf(m) + 1) % CAMERA_MODES.length]),
  );

  useFrame(({ camera }, dt) => {
    const reversing = isReversing(busPose.speed);
    const spec = VEHICLES[useGame.getState().vehicle];
    const scale = chaseScale(spec.length);
    const [ex, ey, ez] = spec.eye;
    // driver view looks forward; while reversing it moves to the back and looks behind
    const SEAT = { pos: [ex, ey, ez], look: [40, ey - 0.2, ez] } as const;
    const REAR = { pos: [-spec.length / 2 + 0.3, ey + 0.1, ez * 0.5], look: [-40, ey - 0.3, ez * 0.5] } as const;

    if (mode === "driver") {
      const view = reversing ? REAR : SEAT;
      local(view.pos, pos.current);
      local(view.look, look.current);
      yaw.current = busPose.heading;
    } else {
      yaw.current = stepChaseYaw(yaw.current, busPose.heading, busPose.speed, dt);
      const f = FOLLOW[mode];
      const dx = Math.cos(yaw.current);
      const dz = Math.sin(yaw.current);
      const back = f.back * scale;
      const ahead = f.look * scale;
      pos.current.set(busPose.x - dx * back, mode === "high" ? f.height : f.height * scale, busPose.z - dz * back);
      look.current.set(busPose.x + dx * ahead, mode === "high" ? 0 : 1.1, busPose.z + dz * ahead);
    }

    const k = Math.min(1, dt * (mode === "driver" ? 10 : 6));
    smoothPos.current.lerp(pos.current, k);
    smoothLook.current.lerp(look.current, k);
    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothLook.current);
  });

  return null;
}
