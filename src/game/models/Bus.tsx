"use client";

import { Block, TailLamps, Wheel, type ModelProps } from "./parts";

const RED = "#c0392b";
const CREAM = "#f3ead2";
const GLASS = "#27323d";

// A town bus in the same cartoon style: red body with a cream roof and belt line, a
// band of tinted windows, a big windscreen with a route board, two axles. 10 m long,
// 2.6 m wide, facing +x with its wheels on the ground.
export function Bus({ paint = RED, lamps }: ModelProps) {
  return (
    <group>
      {[3.3, -3.1].flatMap((x) => [1.15, -1.15].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} r={0.5} w={0.3} />))}
      {/* lower body and the cream belt */}
      <Block p={[0, 1.15, 0]} s={[10, 1.1, 2.6]} color={paint} glow={0.4} />
      <Block p={[0, 1.78, 0]} s={[10.02, 0.16, 2.62]} color={CREAM} glow={0.4} />
      {/* window band and the pillars between the windows */}
      <Block p={[-0.2, 2.45, 0]} s={[9.4, 1.0, 2.5]} color={GLASS} opacity={0.6} shadow={false} />
      {[-4, -2.7, -1.4, -0.1, 1.2, 2.5, 3.8].map((x) => (
        <Block key={x} p={[x, 2.45, 0]} s={[0.12, 1.02, 2.62]} color={paint} glow={0.4} />
      ))}
      {/* cream roof */}
      <Block p={[0, 3.05, 0]} s={[10, 0.22, 2.6]} color={CREAM} glow={0.4} />
      {/* big windscreen, route board and a bumper at the front */}
      <Block p={[5.01, 2.3, 0]} s={[0.06, 1.3, 2.3]} color="#9fc3d6" opacity={0.6} shadow={false} />
      <Block p={[5.02, 3.0, 0]} s={[0.06, 0.3, 1.6]} color="#f6c445" emissive="#f6c445" />
      <Block p={[5.05, 0.7, 0]} s={[0.12, 0.25, 2.5]} color="#2a2c2f" />
      {[0.9, -0.9].map((z) => (
        <Block key={z} p={[5.02, 1.2, z]} s={[0.06, 0.22, 0.3]} color="#fff3c4" emissive="#fff3c4" />
      ))}
      {/* the back */}
      <Block p={[-5.05, 0.7, 0]} s={[0.12, 0.25, 2.5]} color="#2a2c2f" />
      <Block p={[-5.01, 2.3, 0]} s={[0.06, 1.0, 2.0]} color={GLASS} opacity={0.6} shadow={false} />
      <TailLamps x={-5.02} y={1.2} zs={[1.0, -1.0]} size={[0.05, 0.24, 0.4]} source={lamps} />
    </group>
  );
}
