import { CAPACITY } from "../constants";

// Where each passenger sits or stands inside the bus, in bus-local metres
// (+x forward, +z right). Seats are two pairs either side of an aisle; the
// last places are standing room down the aisle. Ordered from the front door
// backwards, sitting before standing, so people settle in as they board.
export type Seat = { x: number; z: number; standing: boolean };

const DOOR_X = 3.55;
const ROWS = Array.from({ length: 8 }, (_, r) => -3.6 + r * 0.95);
const SEAT_Z = [-0.95, -0.5, 0.5, 0.95];

const seated: Seat[] = ROWS.flatMap((x) => SEAT_Z.map((z) => ({ x, z, standing: false })));
seated.sort((a, b) => Math.abs(a.x - DOOR_X) - Math.abs(b.x - DOOR_X) || a.z - b.z);

const standing: Seat[] = ROWS.map((x) => ({ x, z: 0, standing: true })).sort(
  (a, b) => Math.abs(a.x - DOOR_X) - Math.abs(b.x - DOOR_X),
);

export const SEATS: Seat[] = [...seated, ...standing].slice(0, CAPACITY);

// The first free place, counting from the front door. Passengers keep their
// place for the whole ride, so a seat freed by someone getting off is reused
// by the next person to board.
export function firstFreeSeat(taken: Iterable<number>): number | null {
  const used = new Set(taken);
  for (let i = 0; i < SEATS.length; i++) if (!used.has(i)) return i;
  return null;
}
