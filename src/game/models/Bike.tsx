"use client";

import { Block, Driver, Headlamps, Wheel } from "./parts";

const BLUE = "#0284c7";
const BLUE_LIGHT = "#0ea5e9";
const BLACK = "#16181b";

// A Yamaha R15 style sports bike in cartoon blue: full blue and black fairing, small screen,
// split seat, upswept tail and a rider in a helmet. Length 2.1 m.
export function Bike() {
  return (
    <group>
      <Wheel x={0.72} z={0} r={0.32} w={0.13} />
      <Wheel x={-0.72} z={0} r={0.33} w={0.18} />
      {/* front fork and swing arm */}
      <Block p={[0.62, 0.52, 0]} s={[0.06, 0.7, 0.14]} color="#b8bcc2" rot={[0, 0, 0.35]} />
      <Block p={[-0.4, 0.38, 0]} s={[0.9, 0.07, 0.2]} color={BLACK} rot={[0, 0, -0.1]} />
      {/* engine and belly pan */}
      <Block p={[0.05, 0.42, 0]} s={[0.55, 0.32, 0.26]} color="#3a3d42" />
      <Block p={[0.35, 0.36, 0]} s={[0.55, 0.14, 0.3]} color={BLACK} />
      {/* fairing, tank and tail */}
      <Block p={[0.5, 0.82, 0]} s={[0.55, 0.42, 0.36]} color={BLUE} rot={[0, 0, -0.35]} />
      <Block p={[0.05, 0.92, 0]} s={[0.55, 0.22, 0.32]} color={BLUE_LIGHT} />
      <Block p={[-0.55, 0.98, 0]} s={[0.55, 0.16, 0.22]} color={BLUE} rot={[0, 0, 0.2]} />
      <Block p={[0.62, 0.86, 0.19]} s={[0.4, 0.1, 0.03]} color="#facc15" rot={[0, 0, -0.35]} />
      <Block p={[0.62, 0.86, -0.19]} s={[0.4, 0.1, 0.03]} color="#facc15" rot={[0, 0, -0.35]} />
      {/* screen, bars and mirrors */}
      <Block p={[0.62, 1.12, 0]} s={[0.04, 0.26, 0.24]} color="#222a33" opacity={0.7} rot={[0, 0, 0.5]} shadow={false} />
      <Block p={[0.36, 1.08, 0]} s={[0.05, 0.05, 0.62]} color={BLACK} />
      <Block p={[0.4, 1.17, 0.26]} s={[0.04, 0.1, 0.07]} color={BLACK} />
      <Block p={[0.4, 1.17, -0.26]} s={[0.04, 0.1, 0.07]} color={BLACK} />
      {/* seats */}
      <Block p={[-0.2, 0.96, 0]} s={[0.42, 0.08, 0.26]} color={BLACK} />
      <Block p={[-0.62, 1.04, 0]} s={[0.34, 0.07, 0.22]} color="#25272b" />
      {/* exhaust and tail lamp */}
      <mesh position={[-0.75, 0.42, 0.17]} rotation={[0, 0, Math.PI / 2 - 0.12]} castShadow>
        <cylinderGeometry args={[0.06, 0.07, 0.6, 10]} />
        <meshStandardMaterial color="#c9ccd1" metalness={0.7} roughness={0.3} />
      </mesh>
      <Block p={[-0.84, 1.02, 0]} s={[0.05, 0.07, 0.18]} color="#ff2a1a" emissive="#ff2a1a" />
      <Driver p={[-0.15, 0.98, 0]} shirt="#2b3a55" helmet="#e8e8e8" lean={0.55} />
      <Headlamps x={0.85} y={0.9} zs={[0]} reach={22} />
    </group>
  );
}
