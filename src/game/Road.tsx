"use client";

import { useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute } from "three";
import { useNoiseTexture } from "./canvasTex";
import { Instances } from "./Instances";
import { junctionParts } from "./junctionParts";
import { roadParts, type P, type Strip, type Wall } from "./roadParts";
import { NETWORK } from "./world";

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

const quad = (idx: number[], i: number) => {
  const a = (i - 1) * 2;
  idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
};

// A flat ribbon between two paired polylines; u runs along the road.
function stripGeometry(s: Strip, uScale: number): BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  let u = 0;
  s.a.forEach((p, i) => {
    if (i > 0) u += Math.hypot(p.x - s.a[i - 1].x, p.z - s.a[i - 1].z);
    pos.push(p.x, s.y, p.z, s.b[i].x, s.y, s.b[i].z);
    uv.push(u * uScale, 0, u * uScale, 1);
    if (i > 0) quad(idx, i);
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// The vertical face of a kerb along a polyline.
function wallGeometry(w: Wall): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  w.pts.forEach((p: P, i) => {
    pos.push(p.x, w.y0, p.z, p.x, w.y1, p.z);
    if (i > 0) quad(idx, i);
  });
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// Where roads cross, the later road's asphalt is pulled a little toward the camera so
// the two never flicker against each other.
const ROAD_ORDER = NETWORK.roads.map((r) => r.id);

// The whole loop: carriageways, footpaths with kerbs, verges, painted lines, and at
// every junction the crossings, stop lines and turn arrows.
export function Road() {
  const dirt = useNoiseTexture(DIRT);
  const asphalt = useNoiseTexture(ASPHALT);
  const paving = useNoiseTexture(PAVING);

  const geo = useMemo(() => {
    const p = roadParts(NETWORK);
    return {
      asphalt: p.asphalt.map((s) => ({ road: s.road, g: stripGeometry(s, 0.1) })),
      footpaths: p.footpaths.map((s) => stripGeometry(s, 0.25)),
      verges: p.verges.map((s) => stripGeometry(s, 0.3)),
      edges: p.edgeLines.map((s) => stripGeometry(s, 0.1)),
      kerbs: p.kerbs.map(wallGeometry),
      dashes: p.dashes,
      mouths: p.mouths,
    };
  }, []);

  const paint = useMemo(() => {
    const zebra = [];
    const stopLines = [];
    const arrows = [];
    for (const j of NETWORK.junctions) {
      const jp = junctionParts(NETWORK, j.id);
      zebra.push(...jp.zebra);
      stopLines.push(...jp.stopLines);
      arrows.push(...jp.turnArrows);
    }
    return { zebra, stopLines, arrows };
  }, []);

  return (
    <group>
      {geo.verges.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial map={dirt} side={DoubleSide} />
        </mesh>
      ))}

      {/* carriageways */}
      {geo.asphalt.map(({ road, g }) => {
        const order = ROAD_ORDER.indexOf(road);
        return (
          <mesh key={road} geometry={g} receiveShadow>
            <meshStandardMaterial map={asphalt} side={DoubleSide} roughness={0.95} polygonOffset polygonOffsetFactor={-order} polygonOffsetUnits={-order} />
          </mesh>
        );
      })}
      <Instances items={geo.mouths}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.95} />
      </Instances>

      {/* footpaths with kerbs */}
      {geo.footpaths.map((g, i) => (
        <mesh key={i} geometry={g} receiveShadow>
          <meshStandardMaterial map={paving} side={DoubleSide} />
        </mesh>
      ))}
      {geo.kerbs.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#b9b4a8" side={DoubleSide} />
        </mesh>
      ))}

      {/* painted lines */}
      {geo.edges.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshBasicMaterial color="#f4f1e6" side={DoubleSide} />
        </mesh>
      ))}
      <Instances items={geo.dashes}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
      <Instances items={paint.zebra}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
      <Instances items={paint.stopLines}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
      <Instances items={paint.arrows}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial />
      </Instances>
    </group>
  );
}
