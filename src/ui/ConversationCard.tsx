"use client";

import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";
import { passengers } from "./RequestBoard";

// The customer at the pickup says where they want to go; the driver accepts.
export function ConversationCard() {
  const ride = useGame((s) => s.ride);

  useKeyPress(["Enter", "NumpadEnter"], () => {
    useGame.getState().confirmRide();
  });

  const request = ride.request;
  if (ride.phase !== "atPickup" || !request) return null;

  return (
    <div
      role="dialog"
      aria-label={`${request.customer} wants a ride`}
      className="pointer-events-auto absolute inset-x-0 bottom-6 mx-auto w-[min(520px,92vw)] rounded-2xl border-2 border-ink/30 bg-cream p-4 shadow-xl"
    >
      <div className="flex items-baseline justify-between text-xs opacity-70">
        <span className="font-semibold">{request.customer}</span>
        <span>{passengers(request.group)}</span>
      </div>
      <p className="mt-2 text-sm opacity-80">Going to</p>
      <p className="text-2xl font-bold">{request.drop.ml}</p>
      <p className="text-sm">{request.drop.name}</p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-lg font-bold tabular-nums">Rs. {request.fare}</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => useGame.getState().confirmRide()}
          className="rounded-lg bg-accent px-5 py-2 font-semibold text-white"
        >
          Accept ride <span className="opacity-70">Enter</span>
        </button>
      </div>
    </div>
  );
}
