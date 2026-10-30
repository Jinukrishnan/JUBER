"use client";

import { VEHICLES, VEHICLE_KINDS, type VehicleKind } from "@/game/data/vehicles";

// Small flat pictures of the three vehicles, in their usual Indian colours.
function Picture({ kind }: { kind: VehicleKind }) {
  if (kind === "bike") {
    return (
      <svg viewBox="0 0 120 64" className="h-14 w-full" aria-hidden="true">
        <circle cx="24" cy="48" r="11" fill="#222" />
        <circle cx="96" cy="48" r="11" fill="#222" />
        <circle cx="24" cy="48" r="5" fill="#bbb" />
        <circle cx="96" cy="48" r="5" fill="#bbb" />
        <path d="M30 44 L52 20 L84 20 L100 36 L92 44 Z" fill="#d7263d" />
        <path d="M52 20 L66 12 L80 20 Z" fill="#1d1d1f" />
        <path d="M40 36 L60 34 L72 44 L36 46 Z" fill="#1d1d1f" />
        <rect x="84" y="24" width="14" height="6" rx="3" fill="#ffd23f" />
      </svg>
    );
  }
  if (kind === "auto") {
    return (
      <svg viewBox="0 0 120 64" className="h-14 w-full" aria-hidden="true">
        <circle cx="26" cy="50" r="9" fill="#222" />
        <circle cx="52" cy="50" r="9" fill="#222" />
        <circle cx="98" cy="50" r="8" fill="#222" />
        <path d="M14 22 Q60 8 80 20 L80 26 L14 26 Z" fill="#f2c200" />
        <path d="M14 26 L80 26 L106 38 L106 48 L14 48 Z" fill="#1f7a3a" />
        <rect x="22" y="28" width="42" height="12" fill="#10281a" opacity="0.75" />
        <path d="M80 20 L104 36 L84 34 Z" fill="#1d1d1f" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 64" className="h-14 w-full" aria-hidden="true">
      <circle cx="30" cy="48" r="10" fill="#222" />
      <circle cx="92" cy="48" r="10" fill="#222" />
      <path d="M8 44 L14 32 L38 30 L52 16 L82 16 L98 30 L112 34 L112 44 Z" fill="#f4f4f2" stroke="#bbb" strokeWidth="1.5" />
      <path d="M44 30 L56 19 L80 19 L92 30 Z" fill="#2b3a4a" />
      <rect x="104" y="35" width="8" height="5" rx="2" fill="#ffd23f" />
    </svg>
  );
}

function passengers(n: number): string {
  return n === 1 ? "1 passenger" : `${n} passengers`;
}

type Props = { value: VehicleKind; onChange: (kind: VehicleKind) => void };

// Three big cards: pick the vehicle to drive today. Mouse-down does not take
// focus, so the driving keys never press a card by accident.
export function VehiclePicker({ value, onChange }: Props) {
  return (
    <div role="radiogroup" aria-label="Vehicle" className="mt-4 grid grid-cols-3 gap-2">
      {VEHICLE_KINDS.map((kind) => {
        const v = VEHICLES[kind];
        const on = value === kind;
        return (
          <button
            key={kind}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={v.name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange(kind)}
            className={`rounded-xl border-2 px-2 py-2 text-center ${on ? "border-accent bg-white ring-2 ring-accent" : "border-line bg-cream"}`}
          >
            <Picture kind={kind} />
            <div className="mt-1 text-sm font-bold">{v.name}</div>
            <div className="text-xs">{passengers(v.capacity)}</div>
            <div className="text-xs opacity-70">Goal Rs. {v.goal}</div>
          </button>
        );
      })}
    </div>
  );
}
