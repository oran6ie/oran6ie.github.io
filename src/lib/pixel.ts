/*
  Tiny pixel-art toolkit. Sprites are drawn as text grids: each character is one
  pixel, looked up in the sprite's palette ('.' or any unmapped char = transparent).
*/

export type Sprite = { rows: string[]; pal: Record<string, string> };

export const spriteSize = (s: Sprite) => ({
  w: Math.max(...s.rows.map((r) => r.length)),
  h: s.rows.length,
});

export function drawSprite(ctx: CanvasRenderingContext2D, s: Sprite, x: number, y: number, flip = false) {
  const { w } = spriteSize(s);
  s.rows.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const c = s.pal[row[i]];
      if (!c) continue;
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x) + (flip ? w - 1 - i : i), Math.round(y) + j, 1, 1);
    }
  });
}

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string) {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
}

/* 1px border box: fill + outline */
export function box(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, edge: string) {
  rect(ctx, x, y, w, h, edge);
  rect(ctx, x + 1, y + 1, w - 2, h - 2, fill);
}

/* Bresenham line, one pixel wide */
export function line(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, c: string) {
  ctx.fillStyle = c;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}

/* Checkerboard dither between two colours — the classic 16-bit gradient step */
export function dither(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: string, b: string) {
  rect(ctx, x, y, w, h, a);
  ctx.fillStyle = b;
  for (let j = 0; j < h; j++) for (let i = (j % 2); i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1);
}

/* Deterministic random so scenes look the same on every load */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* 3×5 bitmap letters for the little signs drawn inside scenes */
const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'],
  O: ['###', '#.#', '#.#', '#.#', '###'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  N: ['#.#', '###', '###', '###', '#.#'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  W: ['#.#', '#.#', '###', '###', '#.#'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '!': ['#', '#', '#', '.', '#'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  // lowercase (x-height 4) for app-icon style labels like "Pr", "Ae"
  r: ['...', '#.#', '##.', '#..', '#..'],
  e: ['...', '.#.', '###', '#..', '.##'],
  s: ['...', '.##', '##.', '..#', '##.'],
  i: ['#', '.', '#', '#', '#'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '.': ['.', '.', '.', '.', '#'],
};

export function pixelText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, c: string, scale = 1) {
  ctx.fillStyle = c;
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) { cx += 3 * scale; continue; }
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(cx + i * scale, y + j * scale, scale, scale);
    });
    cx += (g[0].length + 1) * scale;
  }
}

/* Renders a sprite once to a data URL so React components (and CSS cursors) can use it */
const urlCache = new Map<string, string>();
const spriteIds = new WeakMap<Sprite, number>();
let nextId = 0;
export function spriteURL(s: Sprite, scale = 1): string {
  if (!spriteIds.has(s)) spriteIds.set(s, nextId++);
  const key = `${spriteIds.get(s)}@${scale}`;
  const hit = urlCache.get(key);
  if (hit) return hit;
  const { w, h } = spriteSize(s);
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d')!;
  ctx.scale(scale, scale);
  drawSprite(ctx, s, 0, 0);
  const url = c.toDataURL();
  urlCache.set(key, url);
  return url;
}
