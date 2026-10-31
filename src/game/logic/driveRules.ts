import type { Network } from "../data/network-v1";
import { VEHICLE_HALF_LENGTH, redViolationAt, type Pose } from "./lights";
import { approachesOf, isWrongTurn, moveAt, type Approach } from "./turns";

const WATCH_RANGE = 60; // junctions further than this cannot matter this frame

// What the driver did at junctions between two frames: red lights run and turns
// made that the junction does not allow. Remembers, per junction, which way the
// vehicle came into the box, so a turn is judged once when it leaves.
export function createJunctionWatch(n: Network) {
  const inside = new Map<string, Approach | null>();
  return {
    reset() {
      inside.clear();
    },
    step(prev: Pose, next: Pose, t: number, half = VEHICLE_HALF_LENGTH): { redLights: number; wrongTurns: number } {
      let redLights = 0;
      let wrongTurns = 0;
      for (const j of n.junctions) {
        const state = inside.get(j.id) ?? null;
        if (!state && Math.hypot(next.x - j.at[0], next.z - j.at[1]) > WATCH_RANGE) continue;
        for (const a of approachesOf(n, j.id)) {
          if (redViolationAt(n, j.id, a.id, prev, next, t, half)) redLights++;
        }
        const r = moveAt(n, j.id, state, prev, next);
        inside.set(j.id, r.state);
        if (r.move && isWrongTurn(n, r.move.junction, r.move.approach.id, r.move.turn)) wrongTurns++;
      }
      return { redLights, wrongTurns };
    },
  };
}
