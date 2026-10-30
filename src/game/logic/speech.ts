// What a pedestrian cries out when the bus hits them: the Malayalam shout with
// its English meaning, shown in a speech bubble over their head.
export type Line = { ml: string; en: string };

export const ACCIDENT_LINES: Line[] = [
  { ml: "അയ്യോ!", en: "Oh my God!" },
  { ml: "എന്റമ്മേ!", en: "Help me!" },
  { ml: "രക്ഷിക്കണേ!", en: "Please help!" },
  { ml: "എന്റെ ദൈവമേ!", en: "My God!" },
  { ml: "അയ്യോ, എന്നെ രക്ഷിക്കൂ!", en: "Oh God, help me!" },
];

// Deterministic per person, so a given pedestrian always shouts the same thing.
export function accidentLine(personId: number): Line {
  return ACCIDENT_LINES[Math.abs(personId) % ACCIDENT_LINES.length];
}
