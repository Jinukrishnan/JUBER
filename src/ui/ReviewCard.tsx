"use client";

import { useEffect } from "react";
import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";
import { cancelSpeech, speakLine } from "@/game/voice";
import type { Mood } from "@/game/logic/review";

const SHOW_MS = 7000;
const BORDER: Record<Mood, string> = {
  happy: "border-green-600",
  pleased: "border-green-500",
  annoyed: "border-amber-500",
  angry: "border-red-500",
  furious: "border-red-700",
};

// The customer's verdict as they get out: stars, what they say (Malayalam, then English),
// what went wrong, and a tip for a good ride. It speaks the line, and closes by itself.
export function ReviewCard() {
  const last = useGame((s) => s.lastReview);
  const id = last?.id;

  useKeyPress(["Enter", "NumpadEnter"], () => useGame.getState().dismissReview());

  useEffect(() => {
    const l = useGame.getState().lastReview;
    if (!l) return;
    speakLine({ ml: l.review.ml, en: l.review.en }, l.review.pitch);
    const timer = setTimeout(() => useGame.getState().dismissReview(), SHOW_MS);
    return () => {
      clearTimeout(timer);
      cancelSpeech();
    };
  }, [id]);

  if (!last) return null;
  const { review, name, group } = last;
  return (
    <div
      role="dialog"
      aria-label={`${name} rated the ride`}
      className={`pointer-events-auto absolute inset-x-0 bottom-6 mx-auto w-[min(540px,92vw)] rounded-2xl border-2 bg-cream p-4 shadow-xl ${BORDER[review.mood]}`}
    >
      <div className="flex items-baseline justify-between text-xs opacity-70">
        <span className="font-semibold">{name}</span>
        <span>{group === 1 ? "1 passenger" : `${group} passengers`}</span>
      </div>
      <div className="mt-1 flex items-center gap-3">
        <span aria-label={`${review.stars} ${review.stars === 1 ? "star" : "stars"} out of 5`} className="text-2xl tracking-wide text-amber-500">
          {"★".repeat(review.stars)}
          <span className="text-ink/20">{"★".repeat(5 - review.stars)}</span>
        </span>
        {review.tip > 0 && <span className="rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold text-white">Tip Rs. {review.tip}</span>}
      </div>
      <p className="mt-2 text-xl font-bold leading-snug">{review.ml}</p>
      <p className="mt-1 text-sm opacity-80">{review.en}</p>
      {review.chips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {review.chips.map((c) => (
            <span key={c} className="rounded-full border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => useGame.getState().dismissReview()}
          className="rounded-lg bg-accent px-5 py-1.5 text-sm font-semibold text-white"
        >
          Close <span className="opacity-70">Enter</span>
        </button>
      </div>
    </div>
  );
}
