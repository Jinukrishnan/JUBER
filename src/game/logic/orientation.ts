const PORTRAIT_MAX_WIDTH = 1024; // wider than this is a big screen with room to spare

export type Viewport = { width: number; height: number; touch: boolean };

// The game is played sideways: a touch device held upright (taller than wide, up to a tablet's
// width) is asked to turn. A desktop window, however narrow, is never asked.
export function needsLandscape(v: Viewport): boolean {
  return v.touch && v.height > v.width && v.width <= PORTRAIT_MAX_WIDTH;
}
