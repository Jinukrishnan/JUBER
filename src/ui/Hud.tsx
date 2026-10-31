"use client";

import { useEffect, useState } from "react";
import { VEHICLES } from "@/game/data/vehicles";
import { busPose } from "@/game/busPose";
import { formatClock } from "@/game/logic/clock";
import { nextSignalAhead, type SignalAhead } from "@/game/logic/lights";
import { useGame } from "@/game/state/store";
import { NETWORK } from "@/game/world";
import { ConversationCard } from "./ConversationCard";
import { Minimap } from "./Minimap";
import { NextSignal } from "./NextSignal";
import { RequestBoard } from "./RequestBoard";
import { RideStrip } from "./RideStrip";
import { ReviewCard } from "./ReviewCard";
import { TouchControls } from "./TouchControls";

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
      className="absolute left-1/2 top-[42%] -translate-x-1/2 rounded-xl border-2 border-red-700 bg-red-600 px-5 py-3 text-center font-bold text-white shadow-xl"
    >
      {notice.text}
    </div>
  );
}

// The next signal, refreshed a few times a second from the live pose, in the
// road the vehicle is driving along.
function useNextSignal(): SignalAhead | null {
  const [signal, setSignal] = useState<SignalAhead | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      const g = useGame.getState();
      if (g.phase !== "running") return setSignal(null);
      setSignal(nextSignalAhead(NETWORK, { x: busPose.x, z: busPose.z, heading: busPose.heading }, g.signalTime, busPose.length / 2));
    }, 150);
    return () => clearInterval(id);
  }, []);
  return signal;
}

export function Hud() {
  const signal = useNextSignal();
  const net = useGame((s) => s.net);
  const hour = useGame((s) => s.hour);
  const vehicle = VEHICLES[useGame((s) => s.vehicle)];
  const aboard = useGame((s) => (s.ride.request && (s.ride.phase === "riding" || s.ride.phase === "alighting") ? s.ride.request.group : 0));
  const muted = useGame((s) => s.muted);
  const headlights = useGame((s) => s.headlights);

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans text-ink">
      <div data-side="left" className="absolute left-2 top-2 flex w-36 flex-col gap-2 lg:left-4 lg:top-4 lg:w-44">
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">Today&apos;s net</div>
          <div className="text-2xl font-bold tabular-nums">Rs. {net}</div>
          <div className="text-xs opacity-70">Goal Rs. {vehicle.goal}</div>
        </div>
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-2 shadow">
          <div className="text-xs uppercase tracking-wide opacity-60">{vehicle.name}</div>
          <div className="text-lg font-semibold tabular-nums">{aboard} / {vehicle.capacity}</div>
        </div>
        <NextSignal signal={signal} />
        <Toggle label="Headlights" hint="L" on={headlights} onClick={() => useGame.getState().toggleHeadlights()} />
      </div>

      <div data-side="right" className="absolute right-2 top-2 flex w-40 flex-col gap-2 lg:right-4 lg:top-4 lg:w-48">
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 text-right shadow">
          <div className="text-2xl font-bold tabular-nums">{formatClock(hour)}</div>
        </div>
        <div className="max-lg:hidden">
          <Toggle label="Sound" hint="M" on={!muted} onClick={() => useGame.getState().toggleMute()} />
        </div>
        <div className="max-lg:[zoom:0.75]">
          <Minimap />
        </div>
      </div>

      <TouchControls />
      <AccidentBanner />
      <RequestBoard />
      <RideStrip />
      <ConversationCard />
      <ReviewCard />
    </div>
  );
}
