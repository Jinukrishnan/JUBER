"use client";

import { useEffect, type ReactNode } from "react";
import { useGame } from "@/game/state/store";
import { releaseTouch, touchInput, type TouchHeld } from "@/game/touchInput";
import { useFullscreen } from "@/game/useFullscreen";

type Hold = keyof TouchHeld;

// A button that counts as held while a finger (or the mouse) is on it. The pointer is
// captured, so sliding off does not leave it stuck, and cancel/lost-capture let go too.
function HoldButton({ hold, label, className, children }: { hold: Hold; label: string; className: string; children: ReactNode }) {
  const set = (on: boolean) => () => {
    touchInput[hold] = on;
  };
  return (
    <button
      type="button"
      aria-label={label}
      data-hold={hold}
      tabIndex={-1}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        touchInput[hold] = true;
      }}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onLostPointerCapture={set(false)}
      className={`pointer-events-auto flex touch-none select-none items-center justify-center rounded-full border-2 font-bold shadow-lg active:scale-95 active:brightness-90 ${className}`}
    >
      {children}
    </button>
  );
}

// Left/right on the left thumb, accelerate/brake on the right, with small horn, hand-brake and
// pause buttons. Shown below 1024 px (phones and tablets); the keyboard is untouched.
export function TouchControls() {
  const live = useGame((s) => s.phase === "running");
  const fullscreen = useFullscreen();

  useEffect(() => {
    const let_go = () => releaseTouch();
    window.addEventListener("blur", let_go);
    return () => {
      window.removeEventListener("blur", let_go);
      let_go();
    };
  }, []);

  useEffect(() => {
    if (!live) releaseTouch();
  }, [live]);

  return (
    <div data-testid="touch-controls" className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] flex items-end justify-between p-3 pb-4 lg:hidden"
      style={{ paddingLeft: "max(0.75rem, env(safe-area-inset-left))", paddingRight: "max(0.75rem, env(safe-area-inset-right))", paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-end gap-3">
        <HoldButton hold="left" label="Steer left" className="h-[72px] w-[72px] border-ink/40 bg-cream/85 text-3xl text-ink">
          ◀
        </HoldButton>
        <HoldButton hold="right" label="Steer right" className="h-[72px] w-[72px] border-ink/40 bg-cream/85 text-3xl text-ink">
          ▶
        </HoldButton>
      </div>

      <div className="mb-1 flex flex-col items-center gap-2">
        <div className="flex gap-2">
          <HoldButton hold="horn" label="Horn" className="h-11 w-11 border-ink/40 bg-cream/85 text-xs text-ink">
            Horn
          </HoldButton>
          <HoldButton hold="handbrake" label="Hand brake" className="h-11 w-11 border-ink/40 bg-cream/85 text-[10px] leading-tight text-ink">
            Hand
          </HoldButton>
          <button
            type="button"
            aria-label="Pause"
            tabIndex={-1}
            onClick={() => useGame.getState().pause()}
            className="pointer-events-auto flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border-2 border-ink/40 bg-cream/85 text-sm font-bold text-ink shadow-lg"
          >
            II
          </button>
          {fullscreen.supported && (
            <button
              type="button"
              aria-label={fullscreen.active ? "Leave full screen" : "Full screen"}
              tabIndex={-1}
              onClick={() => void fullscreen.toggle()}
              className="pointer-events-auto flex h-11 w-11 touch-none select-none items-center justify-center rounded-full border-2 border-ink/40 bg-cream/85 text-lg font-bold text-ink shadow-lg"
            >
              {fullscreen.active ? "✕" : "⛶"}
            </button>
          )}
        </div>
        <div className="flex items-end gap-3">
          <HoldButton hold="brake" label="Brake and reverse" className="h-[72px] w-[84px] border-red-800 bg-red-600/90 text-sm text-white">
            Brake
          </HoldButton>
          <HoldButton hold="accel" label="Accelerate" className="h-[96px] w-[96px] border-green-800 bg-green-600/90 text-sm text-white">
            Go
          </HoldButton>
        </div>
      </div>
    </div>
  );
}
