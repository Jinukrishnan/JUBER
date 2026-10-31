"use client";

import { VEHICLES, VEHICLE_KINDS, type VehicleKind } from "@/game/data/vehicles";
import { VehicleArt } from "./VehicleArt";

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
            <VehicleArt kind={kind} className="h-16 w-full" />
            <div className="mt-1 text-sm font-bold">{v.name}</div>
            <div className="text-xs">{passengers(v.capacity)}</div>
            <div className="text-xs opacity-70">Goal Rs. {v.goal}</div>
          </button>
        );
      })}
    </div>
  );
}
