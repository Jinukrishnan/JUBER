export type VehicleState = { x: number; z: number; heading: number; speed: number };
export type Inputs = { throttle: number; steer: number; handbrake: boolean };

export const MAX_FORWARD_SPEED = 16; // m/s, about 58 km/h
export const MAX_REVERSE_SPEED = 4;

const ACCEL = 5;
const BRAKE = 10;
const COAST = 2;
const HANDBRAKE = 14;
const STEER_RATE = 0.9; // rad/s at full lock
const STEER_FULL_SPEED = 4; // m/s at which steering reaches full authority
const EDGE_SCRUB = 0.5;

// x runs along the route; heading 0 faces +x; positive heading turns toward +z.
export function stepVehicle(
  s: VehicleState,
  i: Inputs,
  dt: number,
  roadHalfWidth: number,
  centerZ = 0,
): { state: VehicleState; hitEdge: boolean } {
  let speed = s.speed;

  if (i.handbrake) {
    speed = approachZero(speed, HANDBRAKE * dt);
  } else if (i.throttle > 0) {
    speed += (speed < 0 ? BRAKE : ACCEL) * i.throttle * dt;
  } else if (i.throttle < 0) {
    speed -= (speed > 0 ? BRAKE : ACCEL) * -i.throttle * dt;
  } else {
    speed = approachZero(speed, COAST * dt);
  }
  speed = Math.min(MAX_FORWARD_SPEED, Math.max(-MAX_REVERSE_SPEED, speed));

  const authority = Math.min(1, Math.abs(speed) / STEER_FULL_SPEED);
  const direction = speed < 0 ? -1 : 1;
  const heading = s.heading + i.steer * STEER_RATE * authority * direction * dt;

  const x = s.x + Math.cos(heading) * speed * dt;
  let z = s.z + Math.sin(heading) * speed * dt;

  let hitEdge = false;
  const offset = z - centerZ;
  if (Math.abs(offset) > roadHalfWidth) {
    hitEdge = true;
    z = centerZ + Math.sign(offset) * roadHalfWidth;
    speed *= EDGE_SCRUB;
  }

  return { state: { x, z, heading, speed }, hitEdge };
}

function approachZero(v: number, amount: number): number {
  if (Math.abs(v) <= amount) return 0;
  return v - Math.sign(v) * amount;
}
