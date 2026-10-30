"use client";

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { gateParts, houseParts, shopParts, wallParts } from "./buildingParts";
import { malayalamFont, useCanvasTexture, type Draw } from "./canvasTex";
import { SHOP_NAMES, shopNameFor } from "./data/shopnames";
import { Instances, type Item } from "./Instances";
import type { BuildingPlacement, Placement } from "./logic/layout";

// All shop signboards share one canvas atlas: two columns by five rows, one
// cell per shop name. Each name gets its own plane geometry whose UVs point at
// its cell, and signs of the same name are drawn together as one instanced mesh.
const COLS = 2;
const ROWS = Math.ceil(SHOP_NAMES.length / COLS);
const CELL_W = 512;
const CELL_H = 128;

const drawAtlas: Draw = (g, w, h) => {
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, w, h);
  SHOP_NAMES.forEach((n, i) => {
    const x = (i % COLS) * CELL_W;
    const y = Math.floor(i / COLS) * CELL_H;
    g.fillStyle = "#14532d";
    g.fillRect(x + 4, y + 4, CELL_W - 8, CELL_H - 8);
    g.fillStyle = "#fffaf0";
    g.fillRect(x + 10, y + 10, CELL_W - 20, CELL_H - 20);
    g.fillStyle = "#14532d";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = malayalamFont(800, 46);
    g.fillText(n.ml, x + CELL_W / 2, y + 48);
    g.font = "bold 28px Arial, sans-serif";
    g.fillText(n.en.toUpperCase(), x + CELL_W / 2, y + 96);
  });
};

function signGeometry(index: number): PlaneGeometry {
  const g = new PlaneGeometry(1, 1);
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (col + uv.getX(i)) / COLS, 1 - (row + 1 - uv.getY(i)) / ROWS);
  }
  return g;
}

const isBuilding = (p: Placement): p is BuildingPlacement => p.kind === "house" || p.kind === "shop";

// Houses, shops, compound walls and gates as one instanced box mesh, plus the
// shop signboards.
export function Buildings({ placements }: { placements: Placement[] }) {
  const atlas = useCanvasTexture(COLS * CELL_W, ROWS * CELL_H, drawAtlas, SHOP_NAMES.map((n) => n.ml).join(" "));
  const geos = useMemo(() => SHOP_NAMES.map((_, i) => signGeometry(i)), []);

  const parts = useMemo(() => {
    const boxes: Item[] = [];
    const signs = new Map<number, Item[]>();
    for (const p of placements) {
      if (p.kind === "wall") boxes.push(...wallParts(p));
      else if (p.kind === "gate") boxes.push(...gateParts(p));
      else if (isBuilding(p)) {
        const b = p.kind === "house" ? houseParts(p) : shopParts(p);
        boxes.push(...b.boxes);
        if (b.sign) {
          boxes.push(b.sign);
          // the lettered face sits just in front of the board, turned to face the road
          const f = -p.side;
          const nx = f * -Math.sin(p.heading);
          const nz = f * Math.cos(p.heading);
          const idx = SHOP_NAMES.indexOf(shopNameFor(p.seed));
          const list = signs.get(idx) ?? [];
          list.push({
            x: b.sign.x + nx * 0.05,
            y: b.sign.y,
            z: b.sign.z + nz * 0.05,
            sx: b.sign.sx,
            sy: b.sign.sy,
            sz: 1,
            ry: -p.heading + (f < 0 ? Math.PI : 0),
            color: "#ffffff",
          });
          signs.set(idx, list);
        }
      }
    }
    return { boxes, signs };
  }, [placements]);

  return (
    <group>
      <Instances items={parts.boxes} shadows>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial />
      </Instances>
      {[...parts.signs.entries()].map(([idx, items]) => (
        <Instances key={idx} items={items}>
          <primitive object={geos[idx]} attach="geometry" />
          <meshBasicMaterial map={atlas} />
        </Instances>
      ))}
    </group>
  );
}
