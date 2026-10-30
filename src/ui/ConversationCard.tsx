"use client";

import { useEffect } from "react";
import { dialogueFor } from "@/game/logic/dialogue";
import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";
import { cancelSpeech, speakLine } from "@/game/voice";
import { passengers } from "./RequestBoard";

// The customer at the pickup says where they want to go, out loud in Malayalam
// and on the card; the driver accepts the ride.
export function ConversationCard() {
  const ride = useGame((s) => s.ride);
  const paused = useGame((s) => s.phase === "paused");
  const request = ride.request;
  const talking = ride.phase === "atPickup" && request !== null;
  const id = request?.id;

  useKeyPress(["Enter", "NumpadEnter"], () => {
    useGame.getState().confirmRide();
  });

  // speak once as they start talking; stop when the ride is accepted or the game pauses
  useEffect(() => {
    const r = useGame.getState().ride.request;
    if (!talking || paused || !r) return;
    const d = dialogueFor(r);
    speakLine({ ml: d.ml, en: d.en }, 1 + (id ? id.length % 3 : 0) * 0.1);
    return cancelSpeech;
  }, [talking, paused, id]);

  if (!talking || !request) return null;
  const d = dialogueFor(request);

  return (
    <div
      role="dialog"
      aria-label={`${request.customer} wants a ride`}
      className="pointer-events-auto absolute inset-x-0 bottom-6 mx-auto w-[min(540px,92vw)] rounded-2xl border-2 border-ink/30 bg-cream p-4 shadow-xl"
    >
      <div className="flex items-baseline justify-between text-xs opacity-70">
        <span className="font-semibold">{d.name}</span>
        <span>{passengers(request.group)}</span>
      </div>
      <p className="mt-2 text-xl font-bold leading-snug">{d.ml}</p>
      <p className="mt-1 text-sm opacity-80">{d.en}</p>
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
