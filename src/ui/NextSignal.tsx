import type { SignalAhead } from "@/game/logic/lights";

const LAMP = { red: "bg-red-500", yellow: "bg-yellow-400", green: "bg-green-500" } as const;
const ARROW = { left: "↰", straight: "↑", right: "↱" } as const;
const LABEL = { left: "Left turn allowed", straight: "Straight on allowed", right: "Right turn allowed" } as const;
const ORDER = ["left", "straight", "right"] as const;

// The next signal on the road being driven: the lamp, how far, when it changes,
// and an arrow for each turn the junction allows from here.
export function NextSignal({ signal }: { signal: SignalAhead | null }) {
  if (!signal) return null;
  return (
    <div className="rounded-xl border border-line bg-cream/90 px-4 py-2 shadow">
      <div className="text-xs uppercase tracking-wide opacity-60">Next signal</div>
      <div className="flex items-center gap-2">
        <span aria-label={`Signal is ${signal.light}`} className={`inline-block h-4 w-4 rounded-full border border-black/40 ${LAMP[signal.light]}`} />
        <span className="text-lg font-semibold tabular-nums">{Math.round(signal.distance)} m</span>
      </div>
      <div className="text-xs opacity-70">changes in {Math.ceil(signal.seconds)} s</div>
      <div className="mt-1 flex gap-1 text-lg leading-none">
        {ORDER.filter((t) => signal.turns.includes(t)).map((t) => (
          <span key={t} aria-label={LABEL[t]} className="rounded bg-ink/10 px-1.5 py-0.5">
            {ARROW[t]}
          </span>
        ))}
      </div>
    </div>
  );
}
