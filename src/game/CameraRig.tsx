"use client";

import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import { Vector3 } from "three";
import { busPose } from "./busPose";
import { isReversing, stepChaseYaw } from "./logic/camera";
import { useKeyPress } from "./useKeys";

export const CAMERA_MODES = ["chase", "high", "driver"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

// chase / high: distance behind the bus along the camera yaw, height, and how
// far ahead of the bus (along the same yaw) the camera looks.
const FOLLOW = {
  chase: { back: 15, height: 6.5, look: 8 },
  high: { back: 10, height: 28, look: 8 },
} as const;

// Driver seat looks forward; while reversing the view moves to the rear window
// and looks back. Offsets are bus-local: +x forward, +y up, +z right.
const SEAT = { pos: [3.6, 2.7, 0.7], look: [40, 2.3, 0.7] } as const;
const REAR = { pos: [-4.7, 2.8, 0.4], look: [-40, 2.2, 0.4] } as const;

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
  const smoothPos = useRef(new Vector3(-15, 6.5, 0));
  const smoothLook = useRef(new Vector3(8, 1.8, 0));

  useKeyPress(["KeyC"], () =>
    setMode((m) => CAMERA_MODES[(CAMERA_MODES.indexOf(m) + 1) % CAMERA_MODES.length]),
  );

  useFrame(({ camera }, dt) => {
    const reversing = isReversing(busPose.speed);

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
      pos.current.set(busPose.x - dx * f.back, f.height, busPose.z - dz * f.back);
      look.current.set(busPose.x + dx * f.look, mode === "high" ? 0 : 1.8, busPose.z + dz * f.look);
    }

    const k = Math.min(1, dt * (mode === "driver" ? 10 : 6));
    smoothPos.current.lerp(pos.current, k);
    smoothLook.current.lerp(look.current, k);
    camera.position.copy(smoothPos.current);
    camera.lookAt(smoothLook.current);
  });

  return null;
}
