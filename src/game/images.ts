import { asset } from '../lib/media';
import manifest from './art/manifest.json';

/* Game art lives in public/media/game/ (see manifest.json for sizes and regions). */
export const MANIFEST = manifest;
export type Region = { x: number; y: number; w: number; h: number };

const cache = new Map<string, { el: HTMLImageElement; at: number; tries: number }>();

function request(name: string, tries: number) {
  const el = new Image();
  el.decoding = 'async';
  // a failed load (flaky network, file being rewritten) is retried instead of cached forever
  el.onerror = () => setTimeout(() => cache.delete(name), 1500);
  el.src = asset(`media/game/${name}.png`) + (tries ? `?r=${tries}` : '');
  const entry = { el, at: performance.now(), tries };
  cache.set(name, entry);
  return entry;
}

/* Returns the image once it has loaded, or null while it's still on its way. */
export function img(name: string): HTMLImageElement | null {
  let entry = cache.get(name);
  if (!entry) entry = request(name, 0);
  const { el } = entry;
  if (el.complete && el.naturalWidth) return el;
  // a request that stalls (busy connection) is re-sent instead of waited on forever
  if (performance.now() - entry.at > 6000 && entry.tries < 3) request(name, entry.tries + 1);
  return null;
}

export function preload(names: string[]) {
  names.forEach((n) => img(n));
}

/* Draw `image` covering the region (like CSS object-fit: cover), cropped around a focus point. */
export function drawCover(ctx: CanvasRenderingContext2D, image: CanvasImageSource, r: Region, iw?: number, ih?: number, fx = 0.5, fy = 0.5) {
  const w = iw ?? (image as HTMLImageElement).width, h = ih ?? (image as HTMLImageElement).height;
  const s = Math.max(r.w / w, r.h / h);
  const sw = r.w / s, sh = r.h / s;
  // crop window centred on the focus point, kept inside the image
  const sx = Math.max(0, Math.min(w - sw, fx * w - sw / 2)), sy = Math.max(0, Math.min(h - sh, fy * h - sh / 2));
  ctx.drawImage(image, sx, sy, sw, sh, r.x, r.y, r.w, r.h);
}
