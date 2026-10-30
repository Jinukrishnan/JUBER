"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { loadProfile, saveProfile, type Profile } from "@/lib/profile";
import { LoginCard } from "@/ui/LoginCard";

export default function LoginClient() {
  const router = useRouter();
  const [existing, setExisting] = useState<Profile | null>(() => loadProfile());

  return (
    <LoginCard
      existing={existing}
      onLogout={() => setExisting(null)}
      onSubmit={(p) => {
        saveProfile(p);
        router.push("/play");
      }}
    />
  );
}
