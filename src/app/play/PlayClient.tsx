"use client";

import dynamic from "next/dynamic";
import { DaySummary } from "@/ui/DaySummary";
import { Hud } from "@/ui/Hud";
import { PauseMenu } from "@/ui/PauseMenu";

const GameCanvas = dynamic(() => import("@/game/GameCanvas"), { ssr: false });

export default function PlayClient() {
  return (
    <div className="fixed inset-0 bg-black">
      <GameCanvas />
      <Hud />
      <PauseMenu />
      <DaySummary />
    </div>
  );
}
