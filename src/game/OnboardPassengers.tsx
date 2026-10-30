"use client";

import { memo } from "react";
import { SEATS } from "./logic/seats";
import type { PersonSpec } from "./logic/people";
import { Hair } from "./Person";
import { specFor } from "./Stops";
import { useGame } from "./state/store";

// Passengers seen through the bus windows: head, shoulders and arms only,
// seated or standing at the place they were given when they boarded.
const FLOOR_Y = 0.79; // keep in step with BusModel
const Bust = memo(function Bust({ spec, seat }: { spec: PersonSpec; seat: number }) {
  const s = SEATS[seat];
  const torsoY = (s.standing ? 1.9 : 1.45) - FLOOR_Y;
  return (
    <group position={[s.x, FLOOR_Y, s.z]} rotation={[0, Math.PI / 2, 0]} scale={spec.scale}>
      <mesh position={[0, torsoY, 0]}>
        <boxGeometry args={[0.4, 0.5, 0.24]} />
        <meshStandardMaterial color={spec.top} />
      </mesh>
      {[-0.25, 0.25].map((x) => (
        <mesh key={x} position={[x, torsoY - 0.02, 0]}>
          <boxGeometry args={[0.09, 0.44, 0.12]} />
          <meshStandardMaterial color={spec.top} />
        </mesh>
      ))}
      <mesh position={[0, torsoY + 0.5, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color={spec.skin} />
      </mesh>
      <group position={[0, torsoY + 0.5, 0]}>
        <Hair spec={spec} />
      </group>
    </group>
  );
});

export function OnboardPassengers() {
  // re-render only when who is aboard (or where they sit) changes
  useGame((s) => s.onboard.map((p) => `${p.id}:${p.seat}`).join(","));
  const onboard = useGame.getState().onboard;
  return (
    <>
      {onboard.map((p) =>
        p.seat === undefined ? null : <Bust key={p.id} spec={specFor(p.id)} seat={p.seat} />,
      )}
    </>
  );
}
