"use client";

import dynamic from "next/dynamic";

// Profile, WebGL and pointer checks all need the browser.
const PlayGate = dynamic(() => import("./PlayGate"), { ssr: false });

export default function PlayClient() {
  return <PlayGate />;
}
