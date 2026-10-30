// Bus-against-person collision, in the bus's own frame so heading is handled
// once: the bus is a 10 x 2.6 m rectangle and a person is a small circle.
export const MIN_HIT_SPEED = 1.5; // m/s; slower than this the bus only nudges people
const HALF_LENGTH = 5;
const HALF_WIDTH = 1.3;
const PERSON_RADIUS = 0.35;

export type Pose = { x: number; z: number; heading: number; speed: number };

// Returns which side of the bus (+1 right, -1 left) the person is on when they
// are struck, so they can be thrown clear of the road, or null for a miss.
export function busHitsPerson(
  bus: Pose,
  p: { x: number; z: number },
  radius = PERSON_RADIUS,
): { side: 1 | -1 } | null {
  if (Math.abs(bus.speed) < MIN_HIT_SPEED) return null;
  const dx = p.x - bus.x;
  const dz = p.z - bus.z;
  const c = Math.cos(bus.heading);
  const s = Math.sin(bus.heading);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  if (Math.abs(lx) > HALF_LENGTH + radius || Math.abs(lz) > HALF_WIDTH + radius) return null;
  return { side: lz >= 0 ? 1 : -1 };
}

// Which way someone struck by the bus is thrown (a unit vector on the ground):
// mostly out to the side they were on, and on in the direction the bus was going.
export function throwDirection(bus: Pose, side: 1 | -1): { dx: number; dz: number } {
  const fwd = Math.sign(bus.speed) || 1;
  const fx = Math.cos(bus.heading) * fwd * 0.5;
  const fz = Math.sin(bus.heading) * fwd * 0.5;
  const sx = -Math.sin(bus.heading) * side * 0.9;
  const sz = Math.cos(bus.heading) * side * 0.9;
  const len = Math.hypot(fx + sx, fz + sz) || 1;
  return { dx: (fx + sx) / len, dz: (fz + sz) / len };
}
