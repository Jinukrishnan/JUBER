"use client";

import { playCrash, playYelp } from "./audio";
import { busPose } from "./busPose";
import { throwDirection } from "./logic/collision";
import { useGame } from "./state/store";

// One place that turns "the bus hit this person" into everything that follows:
// the fine, the thump and the cry, the bus losing speed, and a casualty who
// falls where they are thrown. Pedestrians, strollers, people queueing at a
// shelter and people boarding or alighting all report through here.
export function hashKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h;
}

export function reportHit(
  personKey: string,
  at: { x: number; z: number; y: number },
  side: 1 | -1,
  queued?: { stop: number; passengerId: string },
) {
  const d = throwDirection(busPose, side);
  const h = hashKey(personKey);
  const casualty = { personKey, x: at.x, z: at.z, y: at.y, dx: d.dx, dz: d.dz, line: h };
  busPose.bump = true;
  playCrash();
  playYelp(0.8 + (h % 7) / 10);
  if (queued) useGame.getState().hitWaiting(queued.stop, queued.passengerId, casualty);
  else useGame.getState().injure(casualty);
}
