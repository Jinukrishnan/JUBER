"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { GOAL } from "@/game/constants";
import { computeRating } from "@/game/logic/rating";
import { useGame } from "@/game/state/store";
import { loadProfile, recordDay, saveProfile } from "@/lib/profile";

export function DaySummary() {
  const phase = useGame((s) => s.phase);
  const dayId = useGame((s) => s.dayId);
  const net = useGame((s) => s.net);
  const carried = useGame((s) => s.carried);
  const missedStops = useGame((s) => s.missedStops);
  const expiredPassengers = useGame((s) => s.expiredPassengers);
  const harshEvents = useGame((s) => s.harshEvents);
  const saved = useRef<number | null>(null);

  const rating = computeRating({ missedStops, expiredPassengers, harshEvents, carried });

  // record the finished day exactly once per day
  useEffect(() => {
    if (phase !== "ended" || saved.current === dayId) return;
    saved.current = dayId;
    const p = loadProfile();
    if (p) saveProfile(recordDay(p, net));
  }, [phase, dayId, net]);

  if (phase !== "ended") return null;

  // before the effect saves, the stored best is the old one; max() gives the same answer after
  const best = Math.max(loadProfile()?.bestNet ?? 0, net);

  const hit = net >= GOAL;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-4">
      <div className="w-[min(480px,100%)] rounded-2xl border border-line bg-cream p-6 shadow-xl">
        <h2 className="text-2xl font-bold">{hit ? "Goal reached!" : "Day over"}</h2>
        <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="opacity-70">Net earnings</dt>
          <dd className="text-right font-semibold tabular-nums">Rs. {net}</dd>
          <dt className="opacity-70">Goal</dt>
          <dd className="text-right tabular-nums">Rs. {GOAL}</dd>
          <dt className="opacity-70">Passengers carried</dt>
          <dd className="text-right tabular-nums">{carried}</dd>
          <dt className="opacity-70">Rating</dt>
          <dd className="text-right tabular-nums">{rating.toFixed(1)} / 5</dd>
          <dt className="opacity-70">Best day</dt>
          <dd className="text-right tabular-nums">Rs. {best}</dd>
        </dl>
        <div className="mt-6 flex gap-2">
          <button className="rounded-lg bg-accent px-4 py-2 font-semibold text-white" onClick={() => useGame.getState().startDay()}>
            Another day
          </button>
          <Link className="rounded-lg border border-line px-4 py-2" href="/">
            Quit
          </Link>
        </div>
      </div>
    </div>
  );
}
