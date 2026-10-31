"use client";

import { Block, Driver, Headlamps, TailLamps, Wheel } from "./parts";

const BODY = "#f97316"; // orange
const RED = "#dc2626";
const YELLOW = "#facc15";
const GLASS = "#27323d";

// A Maruti Swift Dzire style compact sedan in cartoon orange: sloping bonnet, tinted
// glass you can see seats through, a red spoiler on the boot, a yellow lightning
// bolt on each side, mirrors. Length 4.4 m.
export function Car() {
  return (
    <group>
      {[1.35, -1.25].flatMap((x) => [0.86, -0.86].map((z) => <Wheel key={`${x}${z}`} x={x} z={z} r={0.31} w={0.22} />))}
      {/* lower body */}
      <Block p={[0, 0.62, 0]} s={[4.2, 0.52, 1.72]} color={BODY} />
      <Block p={[1.55, 0.9, 0]} s={[1.0, 0.14, 1.66]} color={BODY} rot={[0, 0, -0.08]} />
      <Block p={[-1.85, 0.92, 0]} s={[0.7, 0.3, 1.66]} color={BODY} />
      {/* glasshouse: tinted glass with seats visible, white roof and pillars */}
      <Block p={[-0.1, 1.2, 0]} s={[2.2, 0.55, 1.56]} color={GLASS} opacity={0.5} shadow={false} />
      <Block p={[-0.1, 1.5, 0]} s={[2.1, 0.07, 1.54]} color={BODY} />
      {[0.78, -0.78].flatMap((z) =>
        [0.95, -1.15].map((x) => <Block key={`${x}${z}`} p={[x, 1.2, z]} s={[0.08, 0.58, 0.06]} color={BODY} />),
      )}
      {/* seats and the driver, on the right for left-hand traffic */}
      <Block p={[0.1, 0.9, 0.42]} s={[0.5, 0.14, 0.5]} color="#3b3d42" />
      <Block p={[-0.1, 1.15, 0.42]} s={[0.1, 0.5, 0.5]} color="#3b3d42" />
      <Block p={[0.1, 0.9, -0.42]} s={[0.5, 0.14, 0.5]} color="#3b3d42" />
      <Block p={[-0.1, 1.15, -0.42]} s={[0.1, 0.5, 0.5]} color="#3b3d42" />
      <Block p={[-0.75, 0.9, 0]} s={[0.55, 0.14, 1.4]} color="#4a4c52" />
      <Block p={[-0.98, 1.15, 0]} s={[0.1, 0.5, 1.4]} color="#4a4c52" />
      <Block p={[0.62, 1.15, 0.42]} s={[0.04, 0.42, 0.42]} color="#1b1d1f" rot={[0, 0, -0.35]} />
      <Driver p={[0.0, 0.95, 0.42]} shirt="#e8e2d0" />
      {/* grille, bumpers, mirrors, tail lamps, plate */}
      <Block p={[2.1, 0.62, 0]} s={[0.05, 0.2, 0.9]} color="#1b1d1f" />
      <Block p={[2.12, 0.42, 0]} s={[0.12, 0.14, 1.6]} color="#2a2c2f" />
      <Block p={[-2.15, 0.42, 0]} s={[0.12, 0.14, 1.6]} color="#2a2c2f" />
      <Block p={[0.8, 1.0, 0.95]} s={[0.12, 0.1, 0.12]} color={BODY} />
      <Block p={[0.8, 1.0, -0.95]} s={[0.12, 0.1, 0.12]} color={BODY} />
      <TailLamps x={-2.2} y={0.95} zs={[0.6, -0.6]} size={[0.04, 0.16, 0.35]} />
      <Block p={[-2.2, 0.7, 0]} s={[0.03, 0.14, 0.4]} color="#f2f0e0" />
      {/* red spoiler on two posts, and a yellow lightning stripe down each side */}
      <Block p={[-2.0, 1.2, 0]} s={[0.4, 0.07, 1.5]} color={RED} rot={[0, 0, 0.08]} />
      {[0.6, -0.6].map((z) => (
        <Block key={`sp${z}`} p={[-1.95, 1.08, z]} s={[0.06, 0.2, 0.06]} color="#1b1d1f" />
      ))}
      {[0.875, -0.875].map((z) => (
        <group key={`bolt${z}`}>
          <Block p={[0.1, 0.66, z]} s={[1.1, 0.1, 0.02]} color={YELLOW} />
          <Block p={[-0.2, 0.6, z]} s={[0.4, 0.12, 0.02]} color={YELLOW} rot={[0, 0, 0.5]} />
          <Block p={[0.55, 0.72, z]} s={[0.4, 0.12, 0.02]} color={YELLOW} rot={[0, 0, -0.5]} />
        </group>
      ))}
      <Headlamps x={2.1} y={0.78} zs={[0.6, -0.6]} reach={26} />
    </group>
  );
}
