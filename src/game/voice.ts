"use client";

import type { Line } from "./logic/speech";
import { useGame } from "./state/store";

// Spoken cries, using the browser's built-in speech. A person who is hit shouts
// their line out loud in Malayalam when the device has a Malayalam voice. If it
// has voices but none in Malayalam, they shout the English line instead rather
// than mumble Malayalam text in the wrong accent. Muted by the sound button.

// The first voice for a language, accepting both "ml-IN" and "ml_IN" forms.
export function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  return voices.find((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang)) ?? null;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return "speechSynthesis" in window && window.speechSynthesis ? window.speechSynthesis : null;
}

export function speakLine(line: Line, pitch = 1): void {
  const s = synth();
  if (!s || useGame.getState().muted) return;
  try {
    const voices = s.getVoices();
    const ml = pickVoice(voices, "ml");
    // while voices are still loading (empty list) ask for Malayalam anyway and let the browser choose
    const malayalam = ml !== null || voices.length === 0;
    const u = new window.SpeechSynthesisUtterance(malayalam ? line.ml : line.en);
    u.lang = malayalam ? "ml-IN" : "en-IN";
    u.voice = malayalam ? ml : pickVoice(voices, "en");
    u.pitch = pitch;
    u.rate = 1;
    u.volume = 1;
    s.cancel(); // a new shout cuts off the last one instead of queueing behind it
    s.speak(u);
  } catch {
    // speech is a bonus; never let it break the game
  }
}

export function cancelSpeech(): void {
  try {
    synth()?.cancel();
  } catch {
    // ignore
  }
}
