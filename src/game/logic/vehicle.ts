export type VehicleState = {
  x: number;
  z: number;
  heading: number;
  speed: number;
  // front wheel angle in radians; positive turns right (towards +z)
  steerAngle: number;
};
export type Inputs = { throttle: number; steer: number; handbrake: boolean };

export const MAX_FORWARD_SPEED = 16; // m/s, about 58 km/h
export const MAX_REVERSE_SPEED = 4;

const ACCEL = 5;
const BRAKE = 10;
const COAST = 2;
const HANDBRAKE = 14;
const EDGE_SCRUB = 0.5;

// Steering follows a bicycle model so the bus turns about a real turning
// circle instead of pivoting: yaw rate = speed / wheelbase * tan(wheel angle).
const WHEELBASE = 5.5; // m
const MAX_STEER = 0.6; // rad, full lock at walking pace (turning radius ~8 m)
const STEER_RATE = 0.55; // rad/s the wheel can move, so turns come in slowly
const MAX_LATERAL_ACCEL = 3; // m/s^2, what the bus may pull sideways

// Lock available at this speed: full at a crawl, shrinking so the sideways
// acceleration (v^2 / radius) never exceeds MAX_LATERAL_ACCEL.
export function maxSteerAt(speed: number): number {
  const v = Math.abs(speed);
  if (v < 0.5) return MAX_STEER;
  return Math.min(MAX_STEER, Math.atan((WHEELBASE * MAX_LATERAL_ACCEL) / (v * v)));
}

// x runs along the route; heading 0 faces +x; positive heading turns toward +z.
export function stepVehicle(
  s: VehicleState,
  i: Inputs,
  dt: number,
  roadHalfWidth: number,
  centerZ = 0,
  bounds?: (x: number, z: number) => { x: number; z: number; clamped: boolean },
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

  const wanted = i.steer * maxSteerAt(speed);
  const maxMove = STEER_RATE * dt;
  const steerAngle = s.steerAngle + Math.max(-maxMove, Math.min(maxMove, wanted - s.steerAngle));

  const heading = s.heading + (speed / WHEELBASE) * Math.tan(steerAngle) * dt;

  let x = s.x + Math.cos(heading) * speed * dt;
  let z = s.z + Math.sin(heading) * speed * dt;

  let hitEdge = false;
  const offset = z - centerZ;
  if (bounds) {
    // the caller knows the paved area (main road plus side roads)
    const b = bounds(x, z);
    if (b.clamped) {
      hitEdge = true;
      x = b.x;
      z = b.z;
      speed *= EDGE_SCRUB;
    }
  } else if (Math.abs(offset) > roadHalfWidth) {
    hitEdge = true;
    z = centerZ + Math.sign(offset) * roadHalfWidth;
    speed *= EDGE_SCRUB;
  }

  return { state: { x, z, heading, speed, steerAngle }, hitEdge };
}

function approachZero(v: number, amount: number): number {
  if (Math.abs(v) <= amount) return 0;
  return v - Math.sign(v) * amount;
}
