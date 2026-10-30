"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useGame } from "@/game/state/store";
import { useKeyPress } from "@/game/useKeys";

const CONTROLS: [string, string][] = [
  ["W / S", "Throttle · brake / reverse"],
  ["A / D", "Steer"],
  ["Space", "Hand brake"],
  ["H", "Horn"],
  ["L", "Headlights"],
  ["E", "Open / close door (in a stop zone, stopped)"],
  ["C", "Camera: chase · high · driver seat"],
  ["R", "Monsoon rain"],
  ["M", "Mute"],
  ["P / Esc", "Pause & this menu"],
];

export function PauseMenu() {
  const phase = useGame((s) => s.phase);
  const muted = useGame((s) => s.muted);

  useKeyPress(["KeyP", "Escape"], () => {
    const g = useGame.getState();
    if (g.phase === "running") g.pause();
    else if (g.phase === "paused") g.resume();
  });
  useKeyPress(["KeyM"], () => useGame.getState().toggleMute());

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) useGame.getState().pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  if (phase !== "paused") return null;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="w-[min(520px,100%)] rounded-2xl border border-line bg-cream p-6 shadow-xl">
        <h2 className="text-2xl font-bold">Paused</h2>
        <ul className="mt-4 space-y-1 text-sm">
          {CONTROLS.map(([k, d]) => (
            <li key={k} className="flex gap-3">
              <kbd className="w-20 shrink-0 rounded border border-line bg-paper-sunk px-2 py-0.5 text-center font-mono text-xs">
                {k}
              </kbd>
              <span>{d}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-wrap gap-2">
          <button className="rounded-lg bg-accent px-4 py-2 font-semibold text-white" onClick={() => useGame.getState().resume()}>
            Resume
          </button>
          <button className="rounded-lg border border-line px-4 py-2" onClick={() => useGame.getState().toggleMute()}>
            {muted ? "Unmute" : "Mute"}
          </button>
          <button className="rounded-lg border border-line px-4 py-2" onClick={() => useGame.getState().startDay()}>
            Restart day
          </button>
          <Link className="rounded-lg border border-line px-4 py-2" href="/">
            Quit
          </Link>
        </div>
      </div>
    </div>
  );
}
