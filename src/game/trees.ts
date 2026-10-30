import type { Item } from "./Instances";
import type { TreePlacement } from "./logic/layout";

// The pieces that make up each Kerala tree, as instance data. Four part kinds
// so each can be one instanced mesh: trunks (cylinders), crowns (spheres),
// fronds and leaves (flat boxes) and blossom or fruit (small spheres).
// "lite" is the cheaper version drawn from far away.
export type TreeParts = { trunk: Item[]; crown: Item[]; frond: Item[]; blossom: Item[] };
export type Detail = "full" | "lite";

function mulberry(seed: number) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sphere = (x: number, y: number, z: number, rx: number, ry: number, rz: number, color: string): Item => ({
  x, y, z, sx: rx, sy: ry, sz: rz, color,
});

// A leaf or frond: a long flat box drooping outward from a point.
function frond(cx: number, cy: number, cz: number, angle: number, tilt: number, len: number, wide: number, color: string): Item {
  return {
    x: cx + Math.cos(angle) * (len / 2) * Math.cos(tilt),
    y: cy - (len / 2) * Math.sin(tilt),
    z: cz + Math.sin(angle) * (len / 2) * Math.cos(tilt),
    sx: len, sy: 0.05, sz: wide, ry: -angle, rz: -tilt, color,
  };
}

export function treeParts(p: TreePlacement, detail: Detail): TreeParts {
  const r = mulberry(p.seed);
  const s = p.scale;
  const full = detail === "full";
  const out: TreeParts = { trunk: [], crown: [], frond: [], blossom: [] };

  switch (p.kind) {
    case "coconut": {
      const h = (8.5 + r() * 3.5) * s;
      const segs = 3;
      const len = h / segs;
      let x = p.x;
      let y = 0;
      for (let i = 0; i < segs; i++) {
        // each segment leans a little more than the last, so the trunk curves
        const th = p.lean * (1 + i * 0.6);
        const w = (0.46 - 0.08 * i) * s;
        out.trunk.push({ x: x - Math.sin(th) * (len / 2), y: y + Math.cos(th) * (len / 2), z: p.z, sx: w, sy: len, sz: w, rz: th, color: "#7a5a38" });
        x -= Math.sin(th) * len;
        y += Math.cos(th) * len;
      }
      const n = full ? 11 : 6;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.4;
        out.frond.push(frond(x, y + 0.2, p.z, a, 0.45 + r() * 0.25, (3.4 + r() * 0.8) * s, 0.75, k % 2 ? "#2f7d32" : "#3b8f3a"));
      }
      for (let k = 0; k < (full ? 4 : 2); k++) {
        out.crown.push(sphere(x + (r() - 0.5) * 0.8, y - 0.35, p.z + (r() - 0.5) * 0.8, 0.22 * s, 0.22 * s, 0.22 * s, "#6b4a2b"));
      }
      break;
    }
    case "mango": {
      const h = 2.8 * s;
      out.trunk.push({ x: p.x, y: h / 2, z: p.z, sx: 0.9 * s, sy: h, sz: 0.9 * s, color: "#5a4129" });
      const n = full ? 7 : 3;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const d = k === 0 ? 0 : (0.4 + r() * 0.3) * s;
        const rad = (k === 0 ? 2.4 : 1.5 + r() * 0.5) * s;
        out.crown.push(sphere(p.x + Math.cos(a) * d, h + 1.8 * s + (r() - 0.3) * 0.8, p.z + Math.sin(a) * d, rad, rad * 0.9, rad, k % 2 ? "#3f7f35" : "#2f6b2f"));
      }
      break;
    }
    case "gulmohar": {
      const h = 3.6 * s;
      out.trunk.push({ x: p.x, y: h / 2, z: p.z, sx: 0.7 * s, sy: h, sz: 0.7 * s, color: "#6b5238" });
      const n = full ? 6 : 3;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const d = (k === 0 ? 0 : 0.3 + r() * 0.5) * s;
        const rad = (2.2 + r() * 0.4) * s;
        out.crown.push(sphere(p.x + Math.cos(a) * d, 4.4 * s + k * 0.2, p.z + Math.sin(a) * d, rad, 1.2 * s, rad, k % 2 ? "#58994a" : "#4c8f3a"));
      }
      const m = full ? 18 : 6;
      for (let k = 0; k < m; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * 2.6 * s;
        out.blossom.push(sphere(p.x + Math.cos(a) * d, 5.0 * s + r() * 0.5, p.z + Math.sin(a) * d, 0.4 * s, 0.4 * s, 0.4 * s, ["#e8452c", "#f06a2a", "#ef5b2a"][k % 3]));
      }
      break;
    }
    case "banana": {
      const h = 2.6 * s;
      out.trunk.push({ x: p.x, y: h / 2, z: p.z, sx: 0.5 * s, sy: h, sz: 0.5 * s, color: "#9bbf5b" });
      out.trunk.push({ x: p.x + 0.35 * s, y: h * 0.35, z: p.z + 0.2 * s, sx: 0.32 * s, sy: h * 0.7, sz: 0.32 * s, color: "#8fb352" });
      const n = full ? 8 : 5;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + r() * 0.5;
        out.frond.push(frond(p.x, h + 0.1, p.z, a, 0.5 + r() * 0.4, (1.6 + r() * 0.3) * s, 0.95, k % 2 ? "#6fae3b" : "#7bbd44"));
      }
      break;
    }
    case "jackfruit": {
      const h = 2.4 * s;
      out.trunk.push({ x: p.x, y: h / 2, z: p.z, sx: 0.8 * s, sy: h, sz: 0.8 * s, color: "#5a4a35" });
      const n = full ? 5 : 3;
      for (let k = 0; k < n; k++) {
        const a = r() * Math.PI * 2;
        const d = (k === 0 ? 0 : 0.3 + r() * 0.3) * s;
        const rad = (1.2 + r() * 0.2) * s;
        out.crown.push(sphere(p.x + Math.cos(a) * d, h + 1.3 * s + r() * 0.5, p.z + Math.sin(a) * d, rad, rad * 0.9, rad, "#2b5a2a"));
      }
      for (let k = 0; k < (full ? 4 : 2); k++) {
        const a = r() * Math.PI * 2;
        out.blossom.push(sphere(p.x + Math.cos(a) * 0.7 * s, 2.0 * s + r() * 1.2, p.z + Math.sin(a) * 0.7 * s, 0.32 * s, 0.4 * s, 0.32 * s, "#a3a83a"));
      }
      break;
    }
  }
  return out;
}
