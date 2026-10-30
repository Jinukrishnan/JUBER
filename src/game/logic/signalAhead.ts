import { stopLineDistance, type ResolvedJunction } from "./junction";
import type { Direction } from "./route";
import { signalAt, untilChange, type Light } from "./signals";

export const SIGNAL_SIGHT = 250; // metres at which the HUD starts showing a signal

export type SignalAhead = { id: string; distance: number; light: Light; seconds: number };

// The nearest signal still ahead on the main road, for the HUD.
export function nextSignalAhead(list: ResolvedJunction[], x: number, dir: Direction, t: number): SignalAhead | null {
  let best: SignalAhead | null = null;
  for (const j of list) {
    if (!j.plan) continue;
    const line = dir === "forward" ? j.x - stopLineDistance(j) : j.x + stopLineDistance(j);
    const distance = dir === "forward" ? line - x : x - line;
    if (distance < 0 || distance > SIGNAL_SIGHT) continue;
    if (best && distance >= best.distance) continue;
    best = { id: j.id, distance, light: signalAt(j.plan, t).main, seconds: untilChange(j.plan, t, "main") };
  }
  return best;
}
