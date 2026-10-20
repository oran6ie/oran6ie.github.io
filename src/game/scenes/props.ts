/*
  Small code-drawn props and effects layered onto the room: kibble, the laser
  pen and dot, the ON AIR sign, festival decorations, the roof leak, the heater,
  a cup of chai, a birthday cake, Night Shift lighting and match-result flashes.
  Coordinates are room pixels (640×360).
*/
import { pixelText, rect, seeded } from '../../lib/pixel';
import type { Region } from '../images';

export const LASER_PEN = { x: 321, y: 231 };
export const BOWL = { x: 112, y: 318 };

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

/* Kites over Algarah during Dashain (drawn inside the window, behind the frame) */
export function drawKites(ctx: CanvasRenderingContext2D, win: Region, t: number) {
  const kites = [
    { fx: 0.25, fy: 0.25, c: '#ff4fd8', ph: 0 }, { fx: 0.62, fy: 0.18, c: '#ffe066', ph: 2 }, { fx: 0.8, fy: 0.4, c: '#3be8ff', ph: 4 },
  ];
  for (const k of kites) {
    const x = Math.round(win.x + k.fx * win.w + Math.sin(t * 0.8 + k.ph) * 3), y = Math.round(win.y + k.fy * win.h + Math.cos(t * 0.6 + k.ph) * 2);
    rect(ctx, x, y - 2, 1, 1, k.c); rect(ctx, x - 1, y - 1, 3, 1, k.c); rect(ctx, x - 2, y, 5, 1, k.c); rect(ctx, x - 1, y + 1, 3, 1, k.c); rect(ctx, x, y + 2, 1, 1, k.c);
    for (let i = 1; i < 14; i++) rect(ctx, x + Math.round(Math.sin(i * 0.5 + t) * 1.2) - Math.floor(i / 3), y + 2 + i, 1, 1, 'rgba(240,240,255,0.45)');
  }
}

/* Tihar: diyas on the windowsill and a marigold garland along the curtain rod */
export function drawTihar(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  for (let i = 0; i < 5; i++) {
    const x = 212 + i * 10, y = 199;
    rect(ctx, x, y + 2, 5, 2, '#a0522d'); rect(ctx, x + 1, y + 4, 3, 1, '#6b3420');
    const flick = animate ? Math.round(Math.sin(t * 9 + i * 1.7)) : 0;
    rect(ctx, x + 2, y - 1 + flick, 1, 2, '#ffd23f'); rect(ctx, x + 2, y + 1, 1, 1, '#ff7a1a');
    const g = ctx.createRadialGradient(x + 2, y, 0, x + 2, y, 9);
    g.addColorStop(0, 'rgba(255,190,80,0.35)'); g.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 8, y - 9, 20, 18);
  }
  garland(ctx, 148, 70, 302, 8);   // curtain rod
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
export function drawCake(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  const x = 228, y = 194; // on the windowsill
  rect(ctx, x, y, 12, 6, '#f4f1ff'); rect(ctx, x, y, 12, 2, '#ff4fd8'); rect(ctx, x, y + 4, 12, 1, '#ffe066');
  rect(ctx, x - 1, y + 6, 14, 1, '#8b88c9');
  rect(ctx, x + 5, y - 4, 1, 4, '#3be8ff');
  const f = animate ? Math.round(Math.sin(t * 11)) : 0;
  rect(ctx, x + 5, y - 6 + f, 1, 2, '#ffd23f');
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
export function drawChai(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  const x = 295, y = 221; // left end of the desk
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
