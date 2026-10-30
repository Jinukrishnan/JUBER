"use client";

import { CAPACITY, GOAL } from "@/game/constants";
import { ROUTE_V1 } from "@/game/data/route-v1";
import { formatClock } from "@/game/logic/clock";
import { nextStopIndex } from "@/game/logic/route";
import { useGame } from "@/game/state/store";

const FIRST = ROUTE_V1[0];
const LAST = ROUTE_V1[ROUTE_V1.length - 1];

export function Hud() {
  const net = useGame((s) => s.net);
  const hour = useGame((s) => s.hour);
  const onboard = useGame((s) => s.onboard.length);
  const direction = useGame((s) => s.direction);
  const busPosition = useGame((s) => s.busPosition);
  const doorOpen = useGame((s) => s.doorOpen);

  const forward = direction === "forward";
  const from = forward ? FIRST : LAST;
  const to = forward ? LAST : FIRST;
  const next = nextStopIndex(ROUTE_V1, busPosition, direction);
  const nextName = next === null ? to.name : ROUTE_V1[next].name;

  const span = LAST.position - FIRST.position;
  const travelled = forward ? busPosition - FIRST.position : LAST.position - busPosition;
  const progress = Math.min(1, Math.max(0, travelled / span));

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-ink">
      <div className="absolute left-4 top-4 flex flex-col gap-2">
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">Today&apos;s net</div>
          <div className="text-2xl font-bold tabular-nums">Rs. {net}</div>
          <div className="text-xs opacity-70">Goal Rs. {GOAL}</div>
        </div>
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-2 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">Seats</div>
          <div className="text-lg font-semibold tabular-nums">{onboard} / {CAPACITY}</div>
        </div>
      </div>

      <div className="absolute right-4 top-4 rounded-xl border border-line bg-cream/90 px-4 py-3 text-right shadow">
        <div className="text-2xl font-bold tabular-nums">{formatClock(hour)}</div>
        <div className="text-xs opacity-70">{doorOpen ? "Door open" : "Door closed"}</div>
      </div>

      <div className="absolute inset-x-0 bottom-4 mx-auto w-[min(640px,92vw)] rounded-xl border border-line bg-cream/90 px-4 py-3 shadow">
        <div className="flex items-baseline justify-between text-sm">
          <span className="opacity-70">Next stop</span>
          <span className="font-semibold">{nextName}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunk">
          <div className="h-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-1 text-center text-xs opacity-70">
          {from.name} → {to.name}
        </div>
      </div>
    </div>
  );
}
