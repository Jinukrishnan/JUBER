"use client";

import { useEffect, useRef, useState } from "react";
import { useFullscreen } from "@/game/useFullscreen";
import { needsLandscape } from "@/game/logic/orientation";
import { useGame } from "@/game/state/store";

const read = () => ({ width: window.innerWidth, height: window.innerHeight, touch: window.matchMedia("(pointer: coarse)").matches });

// Held upright, a touch device cannot play: this card covers the game, asks for landscape (with a full
// screen button where the browser has one) and pauses the game until the phone is turned. A game the
// player paused themselves stays paused.
export function RotatePrompt() {
  const [view, setView] = useState(read);
  const { supported, toggle } = useFullscreen();
  const show = needsLandscape(view);
  const phase = useGame((s) => s.phase);
  const weHeldIt = useRef(false);

  useEffect(() => {
    const on = () => setView(read());
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);

  useEffect(() => {
    const g = useGame.getState();
    if (show && phase === "running") {
      weHeldIt.current = true;
      g.pause();
    } else if (!show && weHeldIt.current) {
      weHeldIt.current = false;
      g.resume();
    }
  }, [show, phase]);

  if (!show) return null;
  return (
    <div role="alertdialog" aria-label="Rotate your phone" className="fixed inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-ink px-8 text-center text-cream">
      <svg viewBox="0 0 64 64" aria-hidden="true" className="h-24 w-24 animate-pulse">
        <rect x="22" y="6" width="20" height="40" rx="4" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M14 52a22 22 0 0 0 36 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M52 44l-2 8-8-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="text-2xl font-bold">Rotate your phone to landscape</h1>
      <p className="text-lg font-semibold">കളിക്കാൻ ഫോൺ വശത്തേക്ക് തിരിക്കൂ</p>
      <p className="max-w-xs text-sm opacity-70">The game pauses until you turn it.</p>
      {supported ? (
        <button type="button" onClick={() => void toggle()} className="rounded-xl bg-accent px-6 py-3 text-base font-bold text-white">
          Full screen and play
        </button>
      ) : (
        <p className="max-w-xs rounded-lg border border-cream/30 px-4 py-2 text-xs opacity-80">
          For a full-screen game on this browser: Share, then Add to Home Screen.
        </p>
      )}
    </div>
  );
}
