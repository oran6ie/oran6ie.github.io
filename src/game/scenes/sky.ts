/*
  How lit the outside world over Algarah is, for tinting the room (see world.ts).
  The view through the window itself is outside.js.
*/
import type { World } from '../world';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* How lit the outside world is, for tinting the room */
export function ambient(w: World) {
  const overcast = w.weather === 'clear' ? w.cloud * 0.3 : w.weather === 'cloudy' ? 0.35 : 0.6;
  const day = clamp01((w.sunAlt + 6) / 14) * (1 - overcast * 0.6);
  const golden = clamp01(1 - Math.abs(w.sunAlt - 1) / 7) * (1 - overcast);
  return { day, golden, overcast };
}
