// What the driver of another vehicle shouts when the player hits them. Invented
// everyday Malayalam (with an English meaning for the voice fallback); please have a
// native speaker proofread it.
export type AgentKind = "car" | "auto" | "bike" | "bus";
export type Mood = "waiting" | "general";
type Line = { ml: string; en: string };

export const LINES: Record<AgentKind, Record<Mood, Line[]>> = {
  car: {
    waiting: [
      { ml: "ചുവപ്പ് ലൈറ്റ് കണ്ടില്ലേ?", en: "Didn't you see the red signal?" },
      { ml: "സിഗ്നൽ ചുവപ്പാണ്, കണ്ണ് കണ്ടില്ലേ!", en: "The signal is red, are you blind!" },
      { ml: "ലൈറ്റ് ചുവപ്പായിരുന്നല്ലോ, എന്തിനാ ഇടിച്ചത്?", en: "The signal was red, why did you hit me?" },
    ],
    general: [
      { ml: "എവിടെ നോക്കിയാ ഓടിക്കുന്നത്?", en: "Where are you looking while you drive?" },
      { ml: "ഹോ! എന്റെ വണ്ടി!", en: "Oh no! My car!" },
      { ml: "വണ്ടി ഓടിക്കാൻ അറിയില്ലേ?", en: "Don't you know how to drive?" },
    ],
  },
  auto: {
    waiting: [
      { ml: "സിഗ്നൽ ചുവപ്പായിരുന്നു, കണ്ടില്ലേ ചേട്ടാ?", en: "The signal was red, didn't you see, brother?" },
      { ml: "ചുവപ്പ് ലൈറ്റിൽ നിർത്തിയതാ, എന്നിട്ടും ഇടിച്ചോ!", en: "I stopped at the red signal and you still hit me!" },
      { ml: "അയ്യോ! ലൈറ്റ് ചുവപ്പല്ലേ!", en: "Oh my! Isn't the signal red!" },
    ],
    general: [
      { ml: "അയ്യോ! എന്റെ ഓട്ടോ!", en: "Oh my! My auto!" },
      { ml: "ചേട്ടാ, നോക്കി ഓടിക്ക്!", en: "Brother, drive carefully!" },
      { ml: "ഇതെന്താ ഇങ്ങനെ?", en: "What is this?" },
    ],
  },
  bike: {
    waiting: [
      { ml: "ചുവപ്പ് ലൈറ്റ് ആയിരുന്നു, നോക്കിയില്ലേ?", en: "It was a red signal, didn't you look?" },
      { ml: "സിഗ്നലിൽ നിൽക്കുമ്പോഴാ ഇടിച്ചത്!", en: "You hit me while I was waiting at the signal!" },
      { ml: "ചുവപ്പ് കണ്ടാൽ നിർത്തണ്ടേ?", en: "Shouldn't you stop at a red signal?" },
    ],
    general: [
      { ml: "അയ്യോ, എന്റെ ബൈക്ക്!", en: "Oh no, my bike!" },
      { ml: "മാറി ഓടിക്കെടാ!", en: "Move over, will you!" },
      { ml: "കണ്ണ് കാണില്ലേ?", en: "Can't you see?" },
    ],
  },
  bus: {
    waiting: [
      { ml: "സിഗ്നൽ ചുവപ്പായിരുന്നു, ഇത് ബസ്സാ!", en: "The signal was red, this is a bus!" },
      { ml: "ചുവപ്പ് ലൈറ്റിൽ ഇടിക്കുകയോ?", en: "You hit a bus at a red signal?" },
      { ml: "ലൈറ്റ് ചുവപ്പാ, വണ്ടി നിർത്തിയതല്ലേ!", en: "The light is red, I had stopped!" },
    ],
    general: [
      { ml: "ബസ്സിൽ ആളുകളുണ്ട്, സൂക്ഷിച്ച് ഓടിക്ക്!", en: "There are people on the bus, drive carefully!" },
      { ml: "എന്താടോ ഇത്, കണ്ടില്ലേ?", en: "What is this, didn't you see?" },
      { ml: "ഇറങ്ങി വാടോ!", en: "Come out here!" },
    ],
  },
};

// a small integer hash so the same seed always gives the same line and pitch
function mix(seed: number, salt: number): number {
  let h = Math.imul((seed | 0) ^ salt, 0x9e3779b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

export function lineFor(kind: AgentKind, mood: Mood, seed: number): Line {
  const list = LINES[kind][mood];
  return list[Math.floor(mix(seed, 0x51) * list.length)];
}

const BASE_PITCH: Record<AgentKind, number> = { bus: 0.9, auto: 1.0, car: 1.05, bike: 1.15 };

// A deeper voice for a bus driver, higher for a biker, with a little variation.
export function pitchFor(kind: AgentKind, seed: number): number {
  return Math.min(1.2, Math.max(0.85, BASE_PITCH[kind] + (mix(seed, 0x77) - 0.5) * 0.12));
}
