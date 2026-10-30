"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { useNoiseTexture } from "./canvasTex";
import { ROUTE_V1 } from "./data/route-v1";
import { Instances, type Item } from "./Instances";
import { FOOTPATH_WIDTH, roadAngle, roadCenterZ, roadHalfWidthAt } from "./logic/road";
import { isSolidAt, roadFeatures, ZEBRA_LENGTH } from "./logic/roadside";
import { Scenery } from "./Scenery";

export const X_MIN = -80;
export const X_MAX = ROUTE_V1[ROUTE_V1.length - 1].position + 100;

const KERB = 0.15;
const FIRST = ROUTE_V1[0].position;
const LAST = ROUTE_V1[ROUTE_V1.length - 1].position;
const FEATURES = roadFeatures(ROUTE_V1);

const DIRT = { size: 128, base: [138, 110, 78] as [number, number, number], spread: 40, dots: 700, seed: 9, repeat: [1, 1] as [number, number] };
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

const range = (a: number, b: number, step: number) => {
  const out: number[] = [];
  for (let x = a; x < b; x += step) out.push(x);
  out.push(b);
  return out;
};

// A flat ribbon along the road between two lateral offsets from the centreline.
function ribbon(
  xs: number[],
  offA: (x: number) => number,
  offB: (x: number) => number,
  y: number,
  uScale: number,
): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  xs.forEach((x, i) => {
    const cz = roadCenterZ(x);
    pos.push(x, y, cz + offA(x), x, y, cz + offB(x));
    uv.push(x * uScale, 0, x * uScale, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A vertical face (the kerb) along the road at one lateral offset.
function wall(xs: number[], off: (x: number) => number, y0: number, y1: number): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  xs.forEach((x, i) => {
    const z = roadCenterZ(x) + off(x);
    pos.push(x, y0, z, x, y1, z);
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function Road() {
  const dirt = useNoiseTexture(DIRT);
  const asphalt = useNoiseTexture(ASPHALT);
  const paving = useNoiseTexture(PAVING);

  const geo = useMemo(() => {
    const xs = range(X_MIN, X_MAX, 5);
    const half = roadHalfWidthAt;
    const asphaltGeo = ribbon(xs, (x) => -half(x), (x) => half(x), 0.01, 0.1);
    const footL = ribbon(xs, (x) => -half(x) - FOOTPATH_WIDTH, (x) => -half(x), KERB, 0.25);
    const footR = ribbon(xs, (x) => half(x), (x) => half(x) + FOOTPATH_WIDTH, KERB, 0.25);
    const kerbL = wall(xs, (x) => -half(x), 0, KERB);
    const kerbR = wall(xs, (x) => half(x), 0, KERB);
    const vergeL = ribbon(xs, (x) => -half(x) - FOOTPATH_WIDTH - 1.8, (x) => -half(x) - FOOTPATH_WIDTH, 0.005, 0.3);
    const vergeR = ribbon(xs, (x) => half(x) + FOOTPATH_WIDTH, (x) => half(x) + FOOTPATH_WIDTH + 1.8, 0.005, 0.3);
    // solid white edge lines, following the road as it widens at the ends
    const edgeL = ribbon(xs, (x) => -half(x) + 0.22, (x) => -half(x) + 0.37, 0.03, 0.1);
    const edgeR = ribbon(xs, (x) => half(x) - 0.37, (x) => half(x) - 0.22, 0.03, 0.1);
    // double yellow centre line wherever overtaking is not allowed
    const yellow = FEATURES.solidRanges.flatMap(([a, b]) => {
      const run = range(Math.max(a, FIRST - 10), Math.min(b, LAST + 10), 2);
      return [ribbon(run, () => -0.24, () => -0.1, 0.03, 0.1), ribbon(run, () => 0.1, () => 0.24, 0.03, 0.1)];
    });
    return { asphaltGeo, footL, footR, kerbL, kerbR, vergeL, vergeR, edgeL, edgeR, yellow };
  }, []);

  const marks = useMemo(() => {
    const dashes: Item[] = [];
    for (let x = FIRST - 8; x < LAST + 8; x += 9) {
      if (isSolidAt(FEATURES, x) || isSolidAt(FEATURES, x + 3)) continue;
      const mid = x + 1.5;
      dashes.push({ x: mid, y: 0.03, z: roadCenterZ(mid), sx: 3, sy: 0.02, sz: 0.15, color: "#f4f1e6", ry: -roadAngle(mid) });
    }
    const zebra: Item[] = [];
    const stopLines: Item[] = [];
    for (const x0 of FEATURES.zebras) {
      const cz = roadCenterZ(x0);
      const half = roadHalfWidthAt(x0);
      const ang = -roadAngle(x0);
      for (let z = -(half - 0.9); z <= half - 0.9; z += 1.0) {
        zebra.push({ x: x0, y: 0.035, z: cz + z, sx: ZEBRA_LENGTH, sy: 0.02, sz: 0.5, color: "#f7f5ec", ry: ang });
      }
      // each direction halts before the stripes, in its own lane
      stopLines.push({ x: x0 - ZEBRA_LENGTH / 2 - 1.6, y: 0.035, z: cz - (half - 0.5) / 2 - 0.2, sx: 0.4, sy: 0.02, sz: half - 0.7, color: "#f7f5ec", ry: ang });
      stopLines.push({ x: x0 + ZEBRA_LENGTH / 2 + 1.6, y: 0.035, z: cz + (half - 0.5) / 2 + 0.2, sx: 0.4, sy: 0.02, sz: half - 0.7, color: "#f7f5ec", ry: ang });
    }
    return { dashes, zebra, stopLines };
  }, []);

  return (
    <group>
      {[geo.vergeL, geo.vergeR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial map={dirt} side={DoubleSide} />
        </mesh>
      ))}

      {/* carriageway */}
      <mesh geometry={geo.asphaltGeo} receiveShadow>
        <meshStandardMaterial map={asphalt} side={DoubleSide} roughness={0.95} />
      </mesh>

      {/* footpaths with kerbs */}
      {[geo.footL, geo.footR].map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial map={paving} side={DoubleSide} />
        </mesh>
      ))}
      {[geo.kerbL, geo.kerbR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#b9b4a8" side={DoubleSide} />
        </mesh>
      ))}

      {/* painted lines */}
      {[geo.edgeL, geo.edgeR].map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#f4f1e6" side={DoubleSide} />
        </mesh>
      ))}
      {geo.yellow.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#f2c200" side={DoubleSide} />
        </mesh>
      ))}
      <Instances items={marks.dashes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
      <Instances items={marks.zebra}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
      <Instances items={marks.stopLines}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>

      <Scenery />
    </group>
  );
}
