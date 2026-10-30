"use client";

import { useEffect, useState } from "react";
import { CAPACITY, GOAL } from "@/game/constants";
import { ROUTE_V1 } from "@/game/data/route-v1";
import { busPose } from "@/game/busPose";
import { formatClock } from "@/game/logic/clock";
import { stopGuidance } from "@/game/logic/guidance";
import { nextStopIndex } from "@/game/logic/route";
import { useGame } from "@/game/state/store";

const FIRST = ROUTE_V1[0];
const LAST = ROUTE_V1[ROUTE_V1.length - 1];
const NOTICE_MS = 4000;

// A round-cornered switch. Mouse-down does not take focus, so the driving keys
// (Space is the handbrake) never end up pressing a button by accident.
function Toggle({ label, hint, on, onClick }: { label: string; hint: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`pointer-events-auto flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm shadow transition ${
        on ? "border-amber-500 bg-amber-100 text-ink" : "border-line bg-cream/90 text-ink/70"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${on ? "bg-amber-500" : "bg-ink/30"}`} />
      <span className="font-semibold">{label}</span>
      <span className="ml-auto font-mono text-xs opacity-60">{hint}</span>
    </button>
  );
}

function AccidentBanner() {
  const notice = useGame((s) => s.notice);
  const [hidden, setHidden] = useState<number | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = notice.id;
    const t = setTimeout(() => setHidden(id), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  if (!notice || notice.id === hidden) return null;
  return (
    <div
      role="alert"
      className="absolute left-1/2 top-20 -translate-x-1/2 rounded-xl border-2 border-red-700 bg-red-600 px-5 py-3 text-center font-bold text-white shadow-xl"
    >
      {notice.text}
    </div>
  );
}

// What to do next at a stop, refreshed a few times a second from the live bus pose.
function useStopHint(): string | null {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const g = useGame.getState();
      setHint(
        g.phase !== "running"
          ? null
          : stopGuidance({ stops: ROUTE_V1, direction: g.direction, doorOpen: g.doorOpen, speed: Math.abs(busPose.speed), x: busPose.x, z: busPose.z, heading: busPose.heading }),
      );
    }, 150);
    return () => clearInterval(id);
  }, []);
  return hint;
}

export function Hud() {
  const stopHint = useStopHint();
  const net = useGame((s) => s.net);
  const hour = useGame((s) => s.hour);
  const onboard = useGame((s) => s.onboard.length);
  const direction = useGame((s) => s.direction);
  const busPosition = useGame((s) => s.busPosition);
  const doorOpen = useGame((s) => s.doorOpen);
  const muted = useGame((s) => s.muted);
  const headlights = useGame((s) => s.headlights);

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
      <div data-side="left" className="absolute left-4 top-4 flex w-44 flex-col gap-2">
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">Today&apos;s net</div>
          <div className="text-2xl font-bold tabular-nums">Rs. {net}</div>
          <div className="text-xs opacity-70">Goal Rs. {GOAL}</div>
        </div>
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-2 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">Seats</div>
          <div className="text-lg font-semibold tabular-nums">{onboard} / {CAPACITY}</div>
        </div>
        <Toggle label="Headlights" hint="L" on={headlights} onClick={() => useGame.getState().toggleHeadlights()} />
      </div>

      <div data-side="right" className="absolute right-4 top-4 flex w-40 flex-col gap-2">
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 text-right shadow">
          <div className="text-2xl font-bold tabular-nums">{formatClock(hour)}</div>
          <div className="text-xs opacity-70">{doorOpen ? "Door open" : "Door closed"}</div>
        </div>
        <Toggle label="Sound" hint="M" on={!muted} onClick={() => useGame.getState().toggleMute()} />
      </div>

      <AccidentBanner />

      {stopHint && (
        <div className="absolute inset-x-0 bottom-28 mx-auto w-fit max-w-[92vw] rounded-full border border-line bg-cream/95 px-5 py-2 text-center text-sm font-semibold shadow">
          {stopHint}
        </div>
      )}

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
