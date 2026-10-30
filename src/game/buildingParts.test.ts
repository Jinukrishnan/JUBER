import { describe, expect, it } from "vitest";
import type { Item } from "./Instances";
import type { BuildingPlacement, GatePlacement, WallPlacement } from "./logic/layout";
import { gateParts, houseParts, shopParts, wallParts } from "./buildingParts";

const base = { x: 300, z: 25, heading: 0.1, width: 10, depth: 7, seed: 4242, compound: 0 };
const house = (side: 1 | -1 = 1): BuildingPlacement => ({ ...base, kind: "house", side, floors: 1 });
const shop = (floors: number, side: 1 | -1 = 1): BuildingPlacement => ({ ...base, kind: "shop", side, floors });

// an item's position in the building's own frame: along the road (u) and across it (v, toward +z)
function local(b: BuildingPlacement, it: Item) {
  const c = Math.cos(b.heading);
  const s = Math.sin(b.heading);
  const dx = it.x - b.x;
  const dz = it.z - b.z;
  return { u: dx * c + dz * s, v: -dx * s + dz * c, y: it.y };
}
const frontSign = (b: BuildingPlacement) => -b.side; // the front faces the road

describe("houseParts", () => {
  it("has a pitched clay-tile roof overhanging the walls on every side", () => {
    const h = house();
    const roofs = houseParts(h).boxes.filter((i) => i.color.toLowerCase() === "#a8432b");
    expect(roofs).toHaveLength(2);
    for (const r of roofs) expect(r.sx).toBeGreaterThanOrEqual(h.width + 1.0);
    // one slab tilts one way, the other the other way
    expect(Math.sign(roofs[0].rx ?? 0) * Math.sign(roofs[1].rx ?? 0)).toBe(-1);
    // each slab sits on its own side of the ridge
    expect(Math.sign(local(h, roofs[0]).v) * Math.sign(local(h, roofs[1]).v)).toBe(-1);
  });

  it("has exactly four veranda pillars along the road-facing side", () => {
    for (const side of [1, -1] as const) {
      const h = house(side);
      const pillars = houseParts(h).boxes.filter((i) => i.sx === 0.25 && i.sy > 2.4 && i.sy < 2.8);
      expect(pillars).toHaveLength(4);
      for (const p of pillars) expect(Math.sign(local(h, p).v)).toBe(frontSign(h));
    }
  });

  it("has a framed door and two windows on the front", () => {
    const h = house();
    const front = houseParts(h).boxes.filter((i) => Math.sign(local(h, i).v) === frontSign(h) && Math.abs(local(h, i).v) > h.depth / 2);
    expect(front.some((i) => i.color.toLowerCase() === "#5a3a22")).toBe(true);
    expect(front.filter((i) => i.color.toLowerCase() === "#28425a")).toHaveLength(2);
  });

  it("has no signboard", () => {
    expect(houseParts(house()).sign).toBeNull();
  });
});

describe("shopParts", () => {
  it("stacks one floor box per floor", () => {
    for (const floors of [2, 3, 4]) {
      const floorBoxes = shopParts(shop(floors)).boxes.filter((i) => i.sy === 3.2);
      expect(floorBoxes).toHaveLength(floors);
    }
  });

  it("has a balcony slab and railing on each upper floor", () => {
    const parts = shopParts(shop(3)).boxes;
    expect(parts.filter((i) => i.sy === 0.15 && i.sz === 1.3)).toHaveLength(2);
    expect(parts.filter((i) => i.color.toLowerCase() === "#444444")).toHaveLength(2);
  });

  it("has shutters, a rooftop water tank and a signboard on the front", () => {
    const b = shop(3);
    const p = shopParts(b);
    expect(p.boxes.some((i) => i.sy === 2.4)).toBe(true); // shutter strip
    expect(p.boxes.some((i) => i.color.toLowerCase() === "#3b6fb5")).toBe(true); // tank
    expect(p.sign).not.toBeNull();
    expect(Math.sign(local(b, p.sign!).v)).toBe(frontSign(b));
  });
});

describe("every building part", () => {
  it("turns with the building's heading", () => {
    for (const b of [house(), shop(3)]) {
      const p = b.kind === "house" ? houseParts(b) : shopParts(b);
      for (const i of [...p.boxes, ...(p.sign ? [p.sign] : [])]) expect(i.ry).toBeCloseTo(-b.heading, 9);
    }
  });

  it("stays within 1.5 m of the building's own footprint", () => {
    for (const b of [house(), house(-1), shop(2), shop(4, -1)]) {
      const p = b.kind === "house" ? houseParts(b) : shopParts(b);
      for (const i of [...p.boxes, ...(p.sign ? [p.sign] : [])]) {
        const l = local(b, i);
        expect(Math.abs(l.u)).toBeLessThanOrEqual(b.width / 2 + 1.5);
        expect(Math.abs(l.v)).toBeLessThanOrEqual(b.depth / 2 + 1.5);
        expect(i.y).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("compound wall and gate", () => {
  const wall: WallPlacement = { kind: "wall", side: 1, x: 100, z: 20, heading: 0.2, length: 5.5, compound: 0 };
  const gate: GatePlacement = { kind: "gate", side: 1, x: 100, z: 20, heading: 0.2, compound: 0 };

  it("wall is a low run with coping, as long as its placement", () => {
    const w = wallParts(wall);
    expect(w[0].sx).toBe(5.5);
    expect(w.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...w.map((i) => i.y + i.sy / 2))).toBeLessThanOrEqual(1.4);
  });

  it("gate has two pillars and a leaf between them", () => {
    const g = gateParts(gate);
    expect(g.filter((i) => i.sy > 1.4 && i.sx < 0.6)).toHaveLength(2);
    expect(g.length).toBeGreaterThanOrEqual(3);
    for (const i of [...wallParts(wall), ...g]) expect(i.ry).toBeCloseTo(-0.2, 9);
  });
});
