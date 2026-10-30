"use client";

import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/game/GameCanvas"), { ssr: false });

export default function PlayClient() {
  return (
    <div className="fixed inset-0 bg-black">
      <GameCanvas />
    </div>
  );
}
