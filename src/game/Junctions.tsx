"use client";

import { useMemo } from "react";
import { DoubleSide } from "three";
import { useNoiseTexture } from "./canvasTex";
import { Instances } from "./Instances";
import { armFootpath, junctionParts } from "./junctionParts";
import { TURN_AROUND_RADIUS, armSigns } from "./logic/junction";
import { KERB_HEIGHT } from "./logic/road";
import { JUNCTIONS } from "./world";

const ASPHALT = { size: 256, base: [62, 64, 68] as [number, number, number], spread: 22, dots: 2200, seed: 5, repeat: [1, 1] as [number, number] };
const PAVING = {
  size: 256,
  base: [168, 164, 154] as [number, number, number],
  spread: 14,
  dots: 600,
  seed: 7,
  repeat: [1, 1] as [number, number],
  lines: { every: 64, color: "rgba(80,76,68,0.55)" },
};

// The side roads: asphalt, footpaths, kerbs, crossings and stop lines, built in
// each junction's own frame (x along the main road, z across it).
export function Junctions() {
  const asphalt = useNoiseTexture(ASPHALT);
  const paving = useNoiseTexture(PAVING);
  const parts = useMemo(() => JUNCTIONS.map((r) => junctionParts(r)), []);

  return (
    <group>
      {JUNCTIONS.map((r, i) => (
        <group key={r.id} position={[r.x, 0, r.z]} rotation={[0, -r.angle, 0]}>
          {armSigns(r.arms).map((s) => (
            <group key={s}>
              <mesh position={[0, 0.02, (s * r.armLength) / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[2 * r.armHalfWidth, r.armLength]} />
                <meshStandardMaterial map={asphalt} side={DoubleSide} roughness={0.95} />
              </mesh>
              <mesh position={[0, 0.02, s * r.armLength]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[TURN_AROUND_RADIUS, 40]} />
                <meshStandardMaterial map={asphalt} side={DoubleSide} roughness={0.95} />
              </mesh>
              {[-1, 1].map((side) => {
                const f = armFootpath(r, s, side as -1 | 1);
                return (
                  <mesh key={side} position={[f.x, KERB_HEIGHT, f.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <planeGeometry args={[f.w, f.len]} />
                    <meshStandardMaterial map={paving} side={DoubleSide} />
                  </mesh>
                );
              })}
            </group>
          ))}
          <Instances items={parts[i].kerbs}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial />
          </Instances>
          <Instances items={parts[i].zebra}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </Instances>
          <Instances items={parts[i].stopLines}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </Instances>
          <Instances items={parts[i].dashes}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial />
          </Instances>
        </group>
      ))}
    </group>
  );
}
