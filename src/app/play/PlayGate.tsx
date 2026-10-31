"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadProfile } from "@/lib/profile";
import { DaySummary } from "@/ui/DaySummary";
import { Hud } from "@/ui/Hud";
import { PauseMenu } from "@/ui/PauseMenu";
import GameCanvas from "@/game/GameCanvas";

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="max-w-md opacity-75">{body}</p>
      <Link href="/" className="rounded-lg bg-ink px-4 py-2 font-semibold text-cream">
        Back to the start
      </Link>
    </main>
  );
}

export default function PlayGate() {
  const router = useRouter();
  const [profile] = useState(() => loadProfile());
  const [webgl] = useState(hasWebGL);
  const [touchOnly] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => {
    if (!profile) router.replace("/login");
  }, [profile, router]);

  if (!profile) return null;
  if (touchOnly) {
    return <Message title="Best on desktop" body="Aanawadi needs a keyboard to drive. Open it on a computer to play." />;
  }
  if (!webgl) {
    return <Message title="3D isn't available" body="Your browser or device doesn't support WebGL, which the game needs. Try another browser." />;
  }

  return (
    <div className="fixed inset-0 touch-none overscroll-none bg-black">
      <GameCanvas vehicle={profile.vehicle} />
      <Hud />
      <PauseMenu />
      <DaySummary />
    </div>
  );
}
