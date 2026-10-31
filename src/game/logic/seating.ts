// A standing figure is about this tall (head top, at scale 1), metres.
export const PERSON_HEIGHT = 1.78;
const MIN_SQUASH = 0.6;

// How much to squash a person vertically so that, with their feet at `feetY`, their head stays
// under a roof (or any limit) at `headRoom`. They are sitting, so shortening is believable.
export function squashFor(feetY: number, personScale: number, headRoom: number): number {
  const tall = PERSON_HEIGHT * personScale;
  if (feetY + tall <= headRoom) return 1;
  return Math.max(MIN_SQUASH, (headRoom - feetY) / tall);
}
