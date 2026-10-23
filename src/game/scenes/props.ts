/*
  Small code-drawn props and effects layered onto the room: kibble, the laser
  pen and dot, the ON AIR sign, the guestbook notes on the wall, festival decorations, the roof leak, the heater,
  a cup of chai, a birthday cake, Night Shift lighting and match-result flashes.
  Coordinates are room pixels (640×360).
*/
import { pixelText, rect, seeded } from '../../lib/pixel';
import type { Region } from '../images';

export const LASER_PEN = { x: 321, y: 231 };
export const BOWL = { x: 86, y: 311 }; // the food bowl, left of the water bowl

export function drawKibble(ctx: CanvasRenderingContext2D, fill: number) {
  if (fill <= 0) return;
  const rnd = seeded(4);
  const n = Math.round(14 * fill);
  for (let i = 0; i < n; i++) {
    const x = BOWL.x + 2 + Math.floor(rnd() * 16), y = BOWL.y - 1 - Math.floor(rnd() * 3);
    rect(ctx, x, y, 2, 1, i % 3 ? '#a0632f' : '#c98a4b');
  }
}

export function drawLaserPen(ctx: CanvasRenderingContext2D, on: boolean, t: number) {
  const { x, y } = LASER_PEN;
  rect(ctx, x - 1, y - 1, 13, 4, '#07060f');
  rect(ctx, x, y, 11, 2, '#c9c6e8');
  rect(ctx, x, y + 1, 11, 1, '#8b88c9');
  rect(ctx, x + 4, y, 2, 1, '#3b3a52'); // button
  rect(ctx, x + 10, y, 1, 2, on ? '#ff2a2a' : '#a0243a');
  if (!on && Math.floor(t * 1.2) % 3 === 0) rect(ctx, x + 11, y, 1, 1, 'rgba(255,60,60,0.8)'); // tempting blink
}

export function drawLaserDot(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, t: number) {
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
  g.addColorStop(0, 'rgba(255,40,40,0.75)'); g.addColorStop(1, 'rgba(255,40,40,0)');
  ctx.fillStyle = g; ctx.fillRect(p.x - 6, p.y - 6, 12, 12);
  rect(ctx, Math.round(p.x), Math.round(p.y), 1, 1, '#ffffff');
  if (Math.floor(t * 10) % 2) rect(ctx, Math.round(p.x) - 1, Math.round(p.y), 3, 1, '#ff3a3a');
}

/* ON AIR light beside the subscriber counter; lit when there's a new upload */
export function drawOnAir(ctx: CanvasRenderingContext2D, on: boolean, t: number) {
  const x = 128, y = 50, w = 26, h = 11;
  const lit = on && Math.floor(t * 1.2) % 4 !== 0;
  if (lit) {
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 1, x + w / 2, y + h / 2, 26);
    g.addColorStop(0, 'rgba(255,40,40,0.35)'); g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 16, y - 16, w + 32, h + 32);
  }
  rect(ctx, x, y, w, h, '#07060f');
  rect(ctx, x + 1, y + 1, w - 2, h - 2, lit ? '#d0142c' : '#3a1218');
  pixelText(ctx, 'ON AIR', x + 2, y + 3, lit ? '#ffe4e4' : '#6e2a32');
}

/*
  The guestbook on the wall right of the corkboard: one little note per visitor
  note (in its colour), and a blank "+" note in the next free spot that bobs to
  say "pin one too". `invite` makes it glow until this visitor has pinned one.
*/
export const GUEST_NOTE_COLORS = ['#ffe066', '#ff9fd8', '#8ff0ff', '#a8f0b8', '#ffc08a'];
export function drawGuestWall(ctx: CanvasRenderingContext2D, notes: number[], t: number, animate: boolean, invite: boolean) {
  const x0 = 474, y0 = 66;
  // a little see-through so the paper takes on the room's dim light, like the corkboard's own notes
  ctx.globalAlpha = 0.84;
  // the paper banner
  rect(ctx, x0 + 1, y0 + 1, 40, 9, 'rgba(7,6,15,0.45)');
  rect(ctx, x0, y0, 40, 9, '#f4ead0');
  rect(ctx, x0, y0 + 8, 40, 1, '#c9b48e');
  pixelText(ctx, 'GUESTBOOK', x0 + 2, y0 + 2, '#5a3a2a');
  rect(ctx, x0 + 19, y0 - 1, 2, 2, '#e0303a');
  const rnd = seeded(7);
  const slot = (i: number) => ({ x: x0 + 1 + (i % 3) * 13 + Math.round(rnd() * 2 - 1), y: y0 + 13 + Math.floor(i / 3) * 14 + Math.round(rnd() * 2 - 1) });
  const shown = notes.slice(0, 8);
  shown.forEach((c, i) => {
    const { x, y } = slot(i);
    rect(ctx, x + 1, y + 1, 11, 11, 'rgba(7,6,15,0.45)');
    rect(ctx, x, y, 11, 11, GUEST_NOTE_COLORS[c] ?? GUEST_NOTE_COLORS[0]);
    rect(ctx, x + 2, y + 4, 7, 1, 'rgba(40,20,30,0.35)');
    rect(ctx, x + 2, y + 6, 5, 1, 'rgba(40,20,30,0.35)');
    rect(ctx, x + 2, y + 8, 6, 1, 'rgba(40,20,30,0.35)');
    rect(ctx, x + 5, y, 2, 2, '#e0303a');
  });
  // the blank one, waiting for you
  const { x, y: sy } = slot(shown.length);
  const y = sy - (animate && Math.floor(t * 1.6) % 2 === 0 ? 1 : 0);
  ctx.globalAlpha = 1;
  if (invite) {
    const a = animate ? 0.25 + 0.2 * Math.sin(t * 4) : 0.35;
    const g = ctx.createRadialGradient(x + 5.5, y + 5.5, 1, x + 5.5, y + 5.5, 14);
    g.addColorStop(0, `rgba(255,224,102,${a})`); g.addColorStop(1, 'rgba(255,224,102,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 10, y - 10, 31, 31);
  }
  ctx.globalAlpha = 0.84;
  rect(ctx, x + 1, y + 1, 11, 11, 'rgba(7,6,15,0.45)');
  rect(ctx, x, y, 11, 11, '#fbf6e8');
  for (let i = 0; i < 11; i += 2) { rect(ctx, x + i, y, 1, 1, '#c9b48e'); rect(ctx, x + i, y + 10, 1, 1, '#c9b48e'); rect(ctx, x, y + i, 1, 1, '#c9b48e'); rect(ctx, x + 10, y + i, 1, 1, '#c9b48e'); }
  pixelText(ctx, '+', x + 4, y + 3, '#d0142c');
  rect(ctx, x + 5, y - 1, 2, 2, '#4a8cff');
  ctx.globalAlpha = 1;
}

/* Lebu walked across the keyboard: "gggggggg" fills the editor timeline */
export function drawGggg(ctx: CanvasRenderingContext2D, mon: Region, k: number) {
  const n = Math.min(26, Math.floor(k * 14));
  const text = 'G'.repeat(n);
  rect(ctx, mon.x + 4, mon.y + mon.h - 12, Math.min(mon.w - 8, n * 4 + 4), 8, 'rgba(7,6,15,0.85)');
  pixelText(ctx, text.slice(0, Math.floor((mon.w - 10) / 4)), mon.x + 6, mon.y + mon.h - 11, '#4ee38a');
}

/* Game result flash on the monitor */
export function drawMatchFlash(ctx: CanvasRenderingContext2D, mon: Region, kind: 'ace' | 'defeat', k: number) {
  if (k > 1) return;
  const col = kind === 'ace' ? '255,224,102' : '255,58,78';
  ctx.fillStyle = `rgba(${col},${(0.35 * (1 - k)).toFixed(2)})`;
  ctx.fillRect(mon.x, mon.y, mon.w, mon.h);
  const word = kind === 'ace' ? 'ACE!' : 'DEFEAT';
  const scale = 2;
  const tw = word.length * 4 * scale;
  pixelText(ctx, word, Math.round(mon.x + (mon.w - tw) / 2), Math.round(mon.y + mon.h / 2 - 5), kind === 'ace' ? '#ffe066' : '#ff5468', scale);
}

/* Night Shift: neon pink/cyan lighting over the whole room */
export function drawNightShift(ctx: CanvasRenderingContext2D, W: number, H: number, t: number) {
  // sink the room into deep purple, then wash it in pink and cyan neon
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#7a5cc0'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(0, 0, W, 0);
  const s = (Math.sin(t * 0.6) + 1) / 2;
  g.addColorStop(0, `rgba(255,79,216,${(0.26 + 0.1 * s).toFixed(3)})`);
  g.addColorStop(0.5, 'rgba(155,107,255,0.08)');
  g.addColorStop(1, `rgba(59,232,255,${(0.26 + 0.1 * (1 - s)).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'rgba(155,107,255,0.08)';
  for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
}

/* ── Festivals ── */

/* Tihar: diyas on the windowsill and a marigold garland along the curtain rod */
export function drawTihar(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  for (let i = 0; i < 5; i++) {
    const x = 204 + i * 14, y = 197;
    rect(ctx, x, y + 2, 5, 2, '#a0522d'); rect(ctx, x + 1, y + 4, 3, 1, '#6b3420');
    const flick = animate ? Math.round(Math.sin(t * 9 + i * 1.7)) : 0;
    rect(ctx, x + 2, y - 1 + flick, 1, 2, '#ffd23f'); rect(ctx, x + 2, y + 1, 1, 1, '#ff7a1a');
    const g = ctx.createRadialGradient(x + 2, y, 0, x + 2, y, 9);
    g.addColorStop(0, 'rgba(255,190,80,0.35)'); g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 8, y - 9, 20, 18);
  }
  garland(ctx, 160, 70, 308, 8);   // curtain rod
  garland(ctx, 4, 64, 54, 6);      // over the door
}

function garland(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, sag: number) {
  for (let x = x0; x <= x1; x += 2) {
    const k = (x - x0) / (x1 - x0);
    const y = Math.round(y0 + Math.sin(k * Math.PI * 3) ** 2 * sag);
    rect(ctx, x, y, 2, 2, (x / 2) % 2 ? '#ff9f1c' : '#ffd23f');
  }
}

/* Christmas: a tiny tree by the piano */
export function drawTree(ctx: CanvasRenderingContext2D, t: number) {
  const x = 530, y = 318;
  for (let i = 0; i < 14; i++) rect(ctx, x - Math.floor(i / 2), y - 16 + i, Math.floor(i / 2) * 2 + 1, 1, i % 4 === 3 ? '#1f6b3a' : '#2f8f4e');
  rect(ctx, x - 1, y - 2, 3, 3, '#6b3a26');
  rect(ctx, x, y - 18, 1, 2, '#ffe066');
  const lights = [[-2, -10], [2, -8], [-4, -5], [3, -4], [0, -12]];
  lights.forEach(([dx, dy], i) => rect(ctx, x + dx, y + dy, 1, 1, Math.floor(t * 2 + i) % 2 ? '#ff4fd8' : '#3be8ff'));
}

/* Birthday: a cake with a flickering candle on the desk */
export const CAKE = { x: 321, y: 215 }; // on the desk, between the mic and the mouse mat
export function drawCake(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  const { x, y } = CAKE;
  // plate
  rect(ctx, x - 2, y + 10, 17, 2, '#07060f'); rect(ctx, x - 1, y + 10, 15, 1, '#c9c6e8');
  // outline, sponge, cream filling and pink icing with drips
  rect(ctx, x - 1, y + 2, 15, 9, '#07060f');
  rect(ctx, x, y + 3, 13, 7, '#f2c27a');
  rect(ctx, x, y + 6, 13, 1, '#fff6e8');
  rect(ctx, x, y + 3, 13, 2, '#ff7ac8');
  for (const dx of [1, 4, 8, 11]) rect(ctx, x + dx, y + 5, 1, 1, '#ff7ac8');
  rect(ctx, x + 6, y + 5, 1, 2, '#ff7ac8');
  for (const [dx, c] of [[2, '#3be8ff'], [5, '#ffe066'], [10, '#4ee38a']] as const) rect(ctx, x + dx, y + 3, 1, 1, c); // sprinkles
  // three candles with flickering flames and a soft glow
  [[3, '#3be8ff'], [6, '#ffe066'], [9, '#ff4fd8']].forEach(([dx, c], i) => {
    const cx = x + (dx as number);
    rect(ctx, cx, y - 1, 1, 3, c as string);
    const f = animate && Math.sin(t * 11 + i * 2.1) > 0.3 ? 1 : 0;
    rect(ctx, cx, y - 3 - f, 1, 2, '#ffd23f'); rect(ctx, cx, y - 2, 1, 1, '#ff7a1a');
  });
  const g = ctx.createRadialGradient(x + 6, y - 2, 0, x + 6, y - 2, 14);
  g.addColorStop(0, 'rgba(255,200,90,0.28)'); g.addColorStop(1, 'rgba(255,200,90,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 8, y - 16, 28, 28);
}

/* ── Weather & time ── */

/* Monsoon: the roof leaks into a bucket */
export function drawLeak(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  const x = 302, top = 34, bucketY = 316;
  rect(ctx, x - 7, bucketY, 15, 10, '#55528f'); rect(ctx, x - 6, bucketY + 1, 13, 1, '#8b88c9'); rect(ctx, x - 6, bucketY + 2, 13, 2, '#3a6db0');
  rect(ctx, x - 8, bucketY - 1, 17, 1, '#2c2a63');
  rect(ctx, x - 1, top - 2, 3, 2, 'rgba(120,150,210,0.6)'); // damp patch
  if (!animate) return;
  const k = (t % 1.1) / 1.1;
  const y = top + k * k * (bucketY - top);
  if (k < 0.97) rect(ctx, x, Math.round(y), 1, 2, '#8fc7ff');
  else { rect(ctx, x - 2, bucketY - 2, 1, 1, '#cfe6ff'); rect(ctx, x + 2, bucketY - 2, 1, 1, '#cfe6ff'); }
}

/* Cold night: a little heater glowing by the bed */
export function drawHeater(ctx: CanvasRenderingContext2D, t: number) {
  const x = 274, y = 292;
  const g = ctx.createRadialGradient(x + 8, y + 10, 2, x + 8, y + 10, 46);
  g.addColorStop(0, `rgba(255,120,40,${(0.28 + 0.04 * Math.sin(t * 3)).toFixed(3)})`); g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 40, y - 36, 96, 92);
  rect(ctx, x, y, 17, 24, '#07060f'); rect(ctx, x + 1, y + 1, 15, 22, '#3b3a52');
  for (let i = 0; i < 4; i++) rect(ctx, x + 3, y + 4 + i * 4, 11, 2, Math.floor(t * 2 + i) % 3 ? '#ff7a1a' : '#ffb347');
  rect(ctx, x + 2, y + 24, 3, 2, '#07060f'); rect(ctx, x + 12, y + 24, 3, 2, '#07060f');
}

/* Late night: a cup of chai with steam on the desk */
export function drawChai(ctx: CanvasRenderingContext2D, t: number, animate: boolean, besideCake = false) {
  // on the desk in front of the laptop; it moves over to the mouse mat when the birthday cake is there
  const x = besideCake ? 337 : 323, y = besideCake ? 222 : 220;
  rect(ctx, x - 1, y - 1, 9, 8, '#07060f');
  rect(ctx, x, y, 7, 6, '#f4f1ff'); rect(ctx, x + 1, y, 5, 1, '#c98a4b'); rect(ctx, x + 7, y + 1, 2, 3, '#f4f1ff'); rect(ctx, x + 8, y + 2, 1, 1, '#3b3a52');
  if (!animate) return;
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.6 + i / 3) % 1;
    rect(ctx, x + 2 + Math.round(Math.sin((k + i) * 5) * 1.5), y - 2 - Math.round(k * 9), 1, 1, `rgba(244,241,255,${(0.6 * (1 - k)).toFixed(2)})`);
  }
}

/* Outfit change: a puff of smoke at the chair */
export function drawPoof(ctx: CanvasRenderingContext2D, cx: number, cy: number, k: number) {
  if (k > 1) return;
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 6 + k * 34;
    const s = Math.max(1, Math.round(5 * (1 - k)));
    rect(ctx, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.8), s, s, `rgba(236,233,255,${(0.85 * (1 - k)).toFixed(2)})`);
  }
}
