// Walking along a polyline: where someone is, and which way they face, after
// they have covered a given distance. Lets people follow footpaths and
// crossings instead of cutting straight across.
export type P = { x: number; z: number };

export function pathLength(points: P[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].z - points[i - 1].z);
  }
  return total;
}

// heading is a rotation.y for a person who faces +z at rest.
export function pointAlong(points: P[], dist: number): { x: number; z: number; heading: number; done: boolean } {
  let left = Math.max(0, dist);
  let heading = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len === 0) continue;
    heading = Math.atan2(b.x - a.x, b.z - a.z);
    if (left <= len) {
      const u = left / len;
      return { x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u, heading, done: false };
    }
    left -= len;
  }
  const end = points[points.length - 1];
  return { x: end.x, z: end.z, heading, done: true };
}
