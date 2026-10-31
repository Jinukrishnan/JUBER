"use client";

import { useGame } from "@/game/state/store";
import { REQUEST_TTL_S } from "@/game/logic/requests";
import { useKeyPress } from "@/game/useKeys";

export function passengers(n: number): string {
  return n === 1 ? "1 passenger" : `${n} passengers`;
}

const ACCEPT_KEYS = ["Digit1", "Digit2", "Digit3", "Numpad1", "Numpad2", "Numpad3"];

// The ride requests waiting for an answer: who, from where to where, how big a
// group, the fare, and how long the request will stay open.
export function RequestBoard() {
  const online = useGame((s) => s.ride.phase === "online" && s.phase === "running");
  const requests = useGame((s) => s.openRequests);

  useKeyPress(ACCEPT_KEYS, (code) => {
    const g = useGame.getState();
    const r = g.openRequests[Number(code.slice(-1)) - 1];
    if (r) g.accept(r.id);
  });
  useKeyPress(["KeyX"], () => {
    const g = useGame.getState();
    if (g.openRequests[0]) g.skip(g.openRequests[0].id);
  });

  if (!online) return null;

  return (
    <div className="pointer-events-auto absolute inset-x-0 top-2 mx-auto flex w-[min(560px,calc(100vw-20rem))] lg:top-4 lg:w-[min(560px,calc(100vw-30rem))] flex-col gap-2">
      {requests.length === 0 ? (
        <div className="rounded-xl border border-line bg-cream/90 px-4 py-3 text-center text-sm shadow">Waiting for a request...</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {requests.map((r, i) => (
            <li key={r.id} className="rounded-xl border border-line bg-cream/95 p-3 shadow">
              <div className="flex items-baseline justify-between gap-2 text-xs opacity-70">
                <span>
                  {i + 1} · {r.customer}
                </span>
                <span>{passengers(r.group)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm font-semibold">
                <span className="truncate">{r.pickup.name}</span>
                <span aria-hidden="true">→</span>
                <span className="truncate">{r.drop.name}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="opacity-70">{r.distance} m</span>
                <span className="text-base font-bold tabular-nums">Rs. {r.fare}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-sunk">
                <div className="h-full bg-accent" style={{ width: `${Math.max(0, Math.min(100, (r.expiresIn / REQUEST_TTL_S) * 100))}%` }} />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => useGame.getState().accept(r.id)}
                  className="flex-1 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-cream"
                >
                  Accept <span className="opacity-60">{i + 1}</span>
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => useGame.getState().skip(r.id)}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm"
                >
                  Skip{i === 0 ? " X" : ""}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
