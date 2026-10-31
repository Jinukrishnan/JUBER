"use client";

import { Block, Driver, Headlamps, Wheel } from "./parts";

const GREEN = "#1f7a3a";
const YELLOW = "#f2c200";
const BLACK = "#1b1d1f";

// The common Indian auto-rickshaw in cartoon colours: yellow canvas roof, green
// lower body, black hood at the back and a black nose, open sides with a yellow
// bench, one front wheel. Length 2.7 m.
export function Auto() {
  return (
    <group>
      <Wheel x={1.1} z={0} r={0.27} w={0.12} />
      <Wheel x={-0.85} z={0.68} r={0.28} w={0.14} />
      <Wheel x={-0.85} z={-0.68} r={0.28} w={0.14} />
      {/* green body: floor and sides, front cowl */}
      <Block p={[-0.4, 0.5, 0]} s={[1.9, 0.12, 1.3]} color={GREEN} />
      <Block p={[-0.4, 0.78, 0.62]} s={[1.9, 0.45, 0.08]} color={GREEN} />
      <Block p={[-0.4, 0.78, -0.62]} s={[1.9, 0.45, 0.08]} color={GREEN} />
      <Block p={[0.95, 0.72, 0]} s={[0.55, 0.62, 0.5]} color={BLACK} rot={[0, 0, -0.18]} />
      <Block p={[1.12, 0.46, 0]} s={[0.35, 0.16, 0.34]} color={BLACK} />
      {/* black hood over the back seat */}
      <Block p={[-1.25, 1.35, 0]} s={[0.5, 0.9, 1.3]} color={BLACK} rot={[0, 0, 0.1]} />
      {/* yellow roof and its pillars */}
      <Block p={[-0.28, 1.88, 0]} s={[1.9, 0.07, 1.42]} color={YELLOW} />
      <Block p={[0.5, 1.82, 0]} s={[0.4, 0.06, 1.2]} color={YELLOW} rot={[0, 0, -0.35]} />
      {[0.62, -0.62].map((z) => (
        <Block key={z} p={[0.35, 1.3, z]} s={[0.05, 1.1, 0.05]} color={BLACK} />
      ))}
      {[0.62, -0.62].map((z) => (
        <Block key={`r${z}`} p={[-1.0, 1.3, z]} s={[0.05, 1.1, 0.05]} color={BLACK} />
      ))}
      {/* windscreen */}
      <Block p={[0.62, 1.4, 0]} s={[0.04, 0.7, 1.0]} color="#9fc3d6" opacity={0.45} rot={[0, 0, 0.25]} shadow={false} />
      {/* seats: driver in front, a bench behind for two */}
      <Block p={[0.3, 0.66, 0]} s={[0.4, 0.12, 0.5]} color={BLACK} />
      <Block p={[0.1, 0.9, 0]} s={[0.08, 0.4, 0.5]} color={BLACK} />
      <Block p={[-0.7, 0.66, 0]} s={[0.5, 0.12, 1.1]} color="#e0b92a" />
      <Block p={[-0.95, 0.95, 0]} s={[0.08, 0.5, 1.1]} color="#e0b92a" />
      {/* handlebar, mirrors, tail lamps */}
      <Block p={[0.82, 1.05, 0]} s={[0.05, 0.05, 0.6]} color={BLACK} />
      <Block p={[0.7, 1.4, 0.7]} s={[0.04, 0.12, 0.1]} color={BLACK} />
      <Block p={[0.7, 1.4, -0.7]} s={[0.04, 0.12, 0.1]} color={BLACK} />
      <Block p={[-1.5, 0.95, 0.4]} s={[0.04, 0.08, 0.2]} color="#ff2a1a" emissive="#ff2a1a" />
      <Block p={[-1.5, 0.95, -0.4]} s={[0.04, 0.08, 0.2]} color="#ff2a1a" emissive="#ff2a1a" />
      <Driver p={[0.28, 0.72, 0]} shirt="#a89a6a" />
      <Headlamps x={1.32} y={0.78} zs={[0]} reach={22} />
    </group>
  );
}
