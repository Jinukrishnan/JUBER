"use client";

import { useEffect, useState } from "react";
import { busPose } from "@/game/busPose";
import { arrowFor, describeStep } from "@/game/logic/navtext";
import { nextStep } from "@/game/logic/roadgraph";
import { spotOf } from "@/game/rideWorld";
import { useGame } from "@/game/state/store";

// A line at the top of the screen about the ride in progress: who to pick up or
// where to drop them, and how far it is.
export function RideStrip() {
  const ride = useGame((s) => s.ride);
  const [metres, setMetres] = useState(0);
  const [nav, setNav] = useState<{ text: string; arrow: string } | null>(null);

  const request = ride.request;
  const target = request ? (ride.phase === "toPickup" ? request.pickup : request.drop) : null;

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => {
      const s = spotOf(target);
      setMetres(Math.round(Math.hypot(s.x - busPose.x, s.z - busPose.z)));
      const g = useGame.getState();
      const next = g.route && (g.ride.phase === "toPickup" || g.ride.phase === "riding") ? nextStep(g.route, busPose, busPose.heading) : null;
      setNav(next ? { text: describeStep(next.step, next.distance, target.name), arrow: arrowFor(next.step.turn) } : null);
    }, 200);
    return () => clearInterval(id);
  }, [target]);

  if (!request) return null;

  let text: string;
  switch (ride.phase) {
    case "toPickup":
      text = `Pickup: ${request.customer}, ${request.pickup.name} · ${metres} m`;
      break;
    case "atPickup":
      text = `${request.customer} is waiting for you`;
      break;
    case "boarding":
      text = `${request.customer} is getting in`;
      break;
    case "riding":
      text = `Drop: ${request.drop.name} · ${metres} m`;
      break;
    case "alighting":
      text = `${request.customer} is getting out at ${request.drop.name}`;
      break;
    default:
      return null;
  }

  return (
    <div className="absolute inset-x-0 top-4 mx-auto flex w-fit max-w-[min(560px,calc(100vw-30rem))] flex-col items-center gap-1">
      <div data-testid="ride-strip" className="rounded-full border border-line bg-cream/95 px-5 py-2 text-center text-sm font-semibold shadow">
        {text}
      </div>
      {nav && (ride.phase === "toPickup" || ride.phase === "riding") && (
        <div data-testid="ride-directions" className="flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-sm font-semibold text-cream shadow">
          <span aria-hidden="true" className="text-lg leading-none">
            {nav.arrow}
          </span>
          {nav.text}
        </div>
      )}
    </div>
  );
}
