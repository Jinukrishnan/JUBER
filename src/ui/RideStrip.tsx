"use client";

import { useEffect, useState } from "react";
import { busPose } from "@/game/busPose";
import { spotOf } from "@/game/rideWorld";
import { useGame } from "@/game/state/store";

// A line at the top of the screen about the ride in progress: who to pick up or
// where to drop them, and how far it is.
export function RideStrip() {
  const ride = useGame((s) => s.ride);
  const [metres, setMetres] = useState(0);

  const request = ride.request;
  const target = request ? (ride.phase === "toPickup" ? request.pickup : request.drop) : null;

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => {
      const s = spotOf(target);
      setMetres(Math.round(Math.hypot(s.x - busPose.x, s.z - busPose.z)));
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
    <div
      data-testid="ride-strip"
      className="absolute inset-x-0 top-4 mx-auto w-fit max-w-[min(560px,calc(100vw-30rem))] rounded-full border border-line bg-cream/95 px-5 py-2 text-center text-sm font-semibold shadow"
    >
      {text}
    </div>
  );
}
