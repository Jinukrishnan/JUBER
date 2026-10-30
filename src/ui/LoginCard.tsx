"use client";

import { useState } from "react";
import { clearProfile, type Profile } from "@/lib/profile";
import type { VehicleKind } from "@/game/data/vehicles";
import { AVATARS } from "./stickers";
import { VehiclePicker } from "./VehiclePicker";

type Props = {
  existing?: Profile | null;
  onSubmit: (profile: Profile) => void;
  onLogout?: () => void;
};

export function LoginCard({ existing = null, onSubmit, onLogout }: Props) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string>(AVATARS[0].id);
  const [vehicle, setVehicle] = useState<VehicleKind>(existing?.vehicle ?? "auto");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your driver name to start.");
      return;
    }
    setError(null);
    onSubmit({ name: trimmed, avatar, bestNet: 0, totalEarnings: 0, daysPlayed: 0, vehicle });
  };

  return (
    <div className="w-[min(440px,100%)] rounded-2xl border-2 border-dashed border-ink/40 bg-cream p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between text-xs uppercase tracking-widest opacity-60">
        <span>Driver ticket</span>
        <span className="font-mono">No. 001</span>
      </div>

      {existing && (
        <div className="mb-5 rounded-xl bg-paper-sunk p-4">
          <p className="text-sm opacity-70">Welcome back</p>
          <p className="text-xl font-bold">{existing.name}</p>
          <p className="mt-1 text-xs opacity-70">
            Best day Rs. {existing.bestNet} · {existing.daysPlayed} days driven
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-accent px-4 py-2 font-semibold text-white"
              onClick={() => onSubmit({ ...existing, vehicle })}
            >
              Continue as {existing.name}
            </button>
            <button
              type="button"
              className="rounded-lg border border-line px-4 py-2 text-sm"
              onClick={() => {
                clearProfile();
                onLogout?.();
              }}
            >
              Log out
            </button>
          </div>
        </div>
      )}

      <p className="text-sm font-semibold">Choose your vehicle</p>
      <VehiclePicker value={vehicle} onChange={setVehicle} />

      <form onSubmit={submit} noValidate>
        <label htmlFor="driver-name" className="block text-sm font-semibold">
          Driver name
        </label>
        <input
          id="driver-name"
          value={name}
          maxLength={24}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent"
          placeholder={existing ? "Or start as someone new" : "e.g. Ravi"}
          autoComplete="off"
        />

        <div role="radiogroup" aria-label="Avatar" className="mt-4 grid grid-cols-4 gap-2">
          {AVATARS.map(({ id, label, Component }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={avatar === id}
              aria-label={label}
              onClick={() => setAvatar(id)}
              className={`rounded-lg border p-1 ${avatar === id ? "border-accent bg-white ring-2 ring-accent" : "border-line"}`}
            >
              <Component className="h-12 w-full" />
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-accent">
            {error}
          </p>
        )}

        <button type="submit" className="mt-5 w-full rounded-lg bg-ink px-4 py-3 font-semibold text-cream">
          Start the day
        </button>
      </form>
    </div>
  );
}
