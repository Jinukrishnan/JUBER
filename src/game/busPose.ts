// Per-frame bus pose shared between Bus (writer) and CameraRig/Stops (readers).
// Kept outside the store so 60fps updates do not trigger React re-renders.
export const busPose = { x: 0, z: 0, heading: 0, speed: 0 };

export function resetBusPose() {
  busPose.x = 0;
  busPose.z = 0;
  busPose.heading = 0;
  busPose.speed = 0;
}
