// Scenery is grouped in 100 m slices of the route so only the slices near the
// bus are drawn. Pure bookkeeping; the rendering lives in Scenery.tsx.
export const SLICE_LENGTH = 100;
export const DRAW_RANGE = 260; // metres either side of the bus
export const NEAR_RANGE = 120; // closer than this gets full detail

export function sliceOf(x: number): number {
  return Math.floor(x / SLICE_LENGTH);
}

// Every item is listed in each slice its reach touches, so something standing
// on a boundary is already there when either neighbouring slice comes into view.
export function slicesFor(items: { x: number }[], reach: (i: number) => number): Map<number, number[]> {
  const out = new Map<number, number[]>();
  items.forEach((it, i) => {
    const r = reach(i);
    for (let s = sliceOf(it.x - r); s <= sliceOf(it.x + r); s++) {
      const list = out.get(s);
      if (list) list.push(i);
      else out.set(s, [i]);
    }
  });
  return out;
}

export function visibleSlices(busX: number): number[] {
  const out: number[] = [];
  for (let s = sliceOf(busX - DRAW_RANGE); s <= sliceOf(busX + DRAW_RANGE); s++) out.push(s);
  return out;
}

export function isNear(slice: number, busX: number): boolean {
  const from = slice * SLICE_LENGTH;
  return from + SLICE_LENGTH > busX - NEAR_RANGE && from < busX + NEAR_RANGE;
}
