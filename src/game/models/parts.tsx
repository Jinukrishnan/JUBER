"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useRef } from "react";
import { AdditiveBlending, DoubleSide, type MeshStandardMaterial, type Object3D, type SpotLight } from "three";
import { busPose } from "../busPose";
import { useGame } from "../state/store";

// Pieces every vehicle model shares. Models face +x, with +y up and +z to the
// driver's right, and sit with their wheels on y = 0.

export function Wheel({ x, z, r, w = 0.14, y }: { x: number; z: number; r: number; w?: number; y?: number }) {
  return (
    <group position={[x, y ?? r, z]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh castShadow>
        <cylinderGeometry args={[r, r, w, 18]} />
        <meshStandardMaterial color="#17181a" />
      </mesh>
      <mesh>
        <cylinderGeometry args={[r * 0.55, r * 0.55, w + 0.01, 14]} />
        <meshStandardMaterial color="#b8bcc2" metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function Block({
  p,
  s,
  color,
  rot,
  emissive,
  opacity,
  shadow = true,
  glow,
}: {
  p: [number, number, number];
  s: [number, number, number];
  color: string;
  rot?: [number, number, number];
  emissive?: string;
  opacity?: number;
  shadow?: boolean;
  glow?: number; // a soft self-glow in the block's own colour, so cartoon paint stays bright in any light
}) {
  return (
    <mesh position={p} rotation={rot} castShadow={shadow}>
      <boxGeometry args={s} />
      <meshStandardMaterial
        color={color}
        emissive={emissive ?? (glow ? color : "#000000")}
        emissiveIntensity={emissive ? 1.4 : (glow ?? 0)}
        transparent={opacity !== undefined}
        opacity={opacity ?? 1}
      />
    </mesh>
  );
}

// A seated driver: shirt, head and optionally a helmet.
export function Driver({
  p,
  shirt,
  helmet,
  lean = 0,
}: {
  p: [number, number, number]; // hip position
  shirt: string;
  helmet?: string;
  lean?: number; // forward lean in radians
}) {
  return (
    <group position={p} rotation={[0, 0, -lean]}>
      <Block p={[0, 0.3, 0]} s={[0.22, 0.52, 0.34]} color={shirt} />
      <Block p={[0, 0.7, 0]} s={[0.17, 0.17, 0.17]} color="#8a5a3c" />
      {helmet && (
        <mesh position={[0, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={helmet} />
        </mesh>
      )}
      <Block p={[0.18, 0.28, 0.2]} s={[0.4, 0.09, 0.09]} color={shirt} rot={[0, 0, -0.5]} />
      <Block p={[0.18, 0.28, -0.2]} s={[0.4, 0.09, 0.09]} color={shirt} rot={[0, 0, -0.5]} />
    </group>
  );
}

// Real beams (a spot light each) plus a faint visible cone, only while the
// lights are on. `x` is the lamp's forward position, `zs` its lateral ones.
export function Headlamps({ x, y, zs, reach = 22 }: { x: number; y: number; zs: number[]; reach?: number }) {
  const on = useGame((s) => s.headlights);
  const lights = useRef<(SpotLight | null)[]>([]);
  const aims = useRef<(Object3D | null)[]>([]);
  useLayoutEffect(() => {
    lights.current.forEach((l, i) => {
      const a = aims.current[i];
      if (l && a) l.target = a;
    });
  }, []);
  return (
    <>
      {zs.map((z, i) => (
        <group key={z}>
          <mesh position={[x, y, z]}>
            <sphereGeometry args={[0.07, 10, 8]} />
            <meshStandardMaterial color="#fffbe6" emissive="#fff3c4" emissiveIntensity={on ? 2.2 : 0.25} />
          </mesh>
          <spotLight
            ref={(l) => {
              lights.current[i] = l;
            }}
            position={[x + 0.1, y, z]}
            angle={0.5}
            penumbra={0.7}
            intensity={on ? 160 : 0}
            distance={55}
            decay={1.6}
            color="#fff3c4"
          />
          <object3D
            ref={(o) => {
              aims.current[i] = o;
            }}
            position={[x + reach, 0.2, z]}
          />
          {on && (
            <mesh position={[x + 0.1 + reach / 2.4, y, z]} rotation={[0, 0, Math.PI / 2]}>
              <coneGeometry args={[reach / 5, reach / 1.2, 18, 1, true]} />
              <meshBasicMaterial color="#fff3c4" transparent opacity={0.07} depthWrite={false} blending={AdditiveBlending} side={DoubleSide} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}

// Rear lamps: a dim red glow always, a bright red brake light while the brake or
// reverse key is held, and a small white reverse lamp while rolling backwards.
// `x` is the lamp's rear position, `zs` the lateral ones; `size` is x, y, z.
export function TailLamps({ x, y, zs, size }: { x: number; y: number; zs: number[]; size: [number, number, number] }) {
  const red = useRef<(MeshStandardMaterial | null)[]>([]);
  const white = useRef<(MeshStandardMaterial | null)[]>([]);
  const shown = useRef("");
  useFrame(() => {
    const key = `${busPose.braking}${busPose.reversing}`;
    if (key === shown.current) return;
    shown.current = key;
    red.current.forEach((m) => m && (m.emissiveIntensity = busPose.braking ? 4 : 0.7));
    white.current.forEach((m) => m && (m.emissiveIntensity = busPose.reversing ? 3 : 0));
  });
  return (
    <>
      {zs.map((z, i) => (
        <group key={z}>
          <mesh position={[x, y, z]}>
            <boxGeometry args={size} />
            <meshStandardMaterial ref={(m) => { red.current[i] = m; }} color="#ff2a1a" emissive="#ff1208" emissiveIntensity={0.7} />
          </mesh>
          {zs.length > 1 && i === 0 && (
            <mesh position={[x, y - size[1] * 0.9, z]}>
              <boxGeometry args={[size[0], size[1] * 0.45, size[2] * 0.5]} />
              <meshStandardMaterial ref={(m) => { white.current[0] = m; }} color="#f4f4f0" emissive="#ffffff" emissiveIntensity={0} />
            </mesh>
          )}
          {zs.length === 1 && (
            <mesh position={[x, y - size[1] * 0.9, z]}>
              <boxGeometry args={[size[0], size[1] * 0.45, size[2] * 0.6]} />
              <meshStandardMaterial ref={(m) => { white.current[0] = m; }} color="#f4f4f0" emissive="#ffffff" emissiveIntensity={0} />
            </mesh>
          )}
        </group>
      ))}
    </>
  );
}
