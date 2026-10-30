"use client";

import dynamic from "next/dynamic";

// The saved profile lives in localStorage, so this renders on the client only.
const LoginClient = dynamic(() => import("./LoginClient"), { ssr: false });

export default function LoginLoader() {
  return <LoginClient />;
}
