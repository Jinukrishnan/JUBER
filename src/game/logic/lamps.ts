// Which rear lamps are lit: the red brake light while the brake or reverse key is
// held (or the handbrake is on), and the white reverse lamp while rolling backwards.
export const REVERSE_SPEED = -0.3; // m/s

export function lampState(throttle: number, handbrake: boolean, speed: number): { braking: boolean; reversing: boolean } {
  return { braking: throttle < 0 || handbrake, reversing: speed < REVERSE_SPEED };
}
