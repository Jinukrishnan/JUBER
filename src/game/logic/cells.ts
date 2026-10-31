// The world is cut into square cells so only the scenery near the vehicle is
// drawn. Pure bookkeeping; the drawing lives in Scenery.tsx.
export const CELL = 200; // metres
export const DRAW_RANGE = 260; // metres from the vehicle
export const NEAR_RANGE = 120; // closer than this gets full detail

export type Cell = { cx: number; cz: number };

export const cellKey = (cx: number, cz: number): string => `${cx},${cz}`;

export function cellOf(x: number, z: number): Cell {
  return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) };
}

// Every item lives in the cell it stands in.
export function groupByCell<T extends { x: number; z: number }>(items: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const it of items) {
    const { cx, cz } = cellOf(it.x, it.z);
    const key = cellKey(cx, cz);
    const list = out.get(key);
    if (list) list.push(it);
    else out.set(key, [it]);
  }
  return out;
}

// The cells whose square comes within `range` metres of the point.
export function cellsAround(x: number, z: number, range: number = DRAW_RANGE): Cell[] {
  const out: Cell[] = [];
  for (let cx = Math.floor((x - range) / CELL); cx <= Math.floor((x + range) / CELL); cx++) {
    for (let cz = Math.floor((z - range) / CELL); cz <= Math.floor((z + range) / CELL); cz++) {
      const nx = Math.max(cx * CELL, Math.min((cx + 1) * CELL, x));
      const nz = Math.max(cz * CELL, Math.min((cz + 1) * CELL, z));
      if (Math.hypot(nx - x, nz - z) <= range) out.push({ cx, cz });
    }
  }
  return out;
}

// Is any part of this cell within `range` of the point?
export function isNearCell(c: Cell, x: number, z: number, range: number = NEAR_RANGE): boolean {
  const nx = Math.max(c.cx * CELL, Math.min((c.cx + 1) * CELL, x));
  const nz = Math.max(c.cz * CELL, Math.min((c.cz + 1) * CELL, z));
  return Math.hypot(nx - x, nz - z) < range;
}
