/*
  Pixel sky over Algarah, driven by the real sun, moon and weather (see world.ts).
  Used for the room window; draws into any rectangle.
*/
import { rect, seeded } from '../../lib/pixel';
import type { Region } from '../images';
import type { World } from '../world';

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => Math.round(v + (b[i] - v) * t)) as RGB;
const css = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* Sky colours (top, horizon) keyed by sun altitude in degrees */
const KEYS: [number, RGB, RGB][] = [
  [-18, hex('#05041a'), hex('#120e33')],
  [-10, hex('#0b0a2c'), hex('#33205c')],
  [-4, hex('#1c1a52'), hex('#c25c7a')],
  [2, hex('#384a98'), hex('#ffad66')],
  [10, hex('#3f7fd6'), hex('#a8d8f2')],
  [40, hex('#3486e6'), hex('#c4e8ff')],
];
function skyColours(alt: number): [RGB, RGB] {
  if (alt <= KEYS[0][0]) return [KEYS[0][1], KEYS[0][2]];
  for (let i = 1; i < KEYS.length; i++) {
    if (alt <= KEYS[i][0]) {
      const [a0, t0, h0] = KEYS[i - 1], [a1, t1, h1] = KEYS[i];
      const t = (alt - a0) / (a1 - a0);
      return [mix(t0, t1, t), mix(h0, h1, t)];
    }
  }
  return [KEYS[KEYS.length - 1][1], KEYS[KEYS.length - 1][2]];
}

/* How lit the outside world is, for tinting the room */
export function ambient(w: World) {
  const overcast = w.weather === 'clear' ? w.cloud * 0.3 : w.weather === 'cloudy' ? 0.35 : 0.6;
  const day = clamp01((w.sunAlt + 6) / 14) * (1 - overcast * 0.6);
  const golden = clamp01(1 - Math.abs(w.sunAlt - 1) / 7) * (1 - overcast);
  return { day, golden, overcast };
}

type Drop = { x: number; y: number; v: number };
type Cloud = { x: number; y: number; w: number; v: number };

export function createSky(r: Region) {
  const rnd = seeded(42);
  const stars = Array.from({ length: Math.round(r.w * r.h / 40) }, () => ({ x: rnd() * r.w, y: rnd() * r.h * 0.6, p: rnd() * 6, b: rnd() }));
  const drops: Drop[] = Array.from({ length: 60 }, () => ({ x: rnd() * r.w, y: rnd() * r.h, v: 0.6 + rnd() * 0.6 }));
  const glass: Drop[] = Array.from({ length: 7 }, () => ({ x: rnd() * r.w, y: rnd() * r.h, v: 0.05 + rnd() * 0.15 }));
  const clouds: Cloud[] = Array.from({ length: 6 }, (_, i) => ({ x: rnd() * (r.w + 30) - 15, y: 4 + i * (r.h * 0.07), w: 12 + rnd() * 16, v: 1 + rnd() * 2 }));
  const lights = Array.from({ length: 18 }, () => ({ x: rnd() * r.w, y: r.h * (0.86 + rnd() * 0.12), c: rnd() > 0.5 ? '#ffd166' : '#ff9f43' }));
  let flash = 0, nextFlash = 4;

  // peaks of the range across the window (fractions of width, height)
  const peaks = [[0.0, 0.18], [0.22, 0.28], [0.48, 0.36], [0.7, 0.24], [0.95, 0.3]];
  const ridge = (fx: number) => {
    let top = 0;
    for (const [px, ph] of peaks) top = Math.max(top, ph - Math.abs(fx - px) * 0.9);
    return top;
  };

  return function draw(ctx: CanvasRenderingContext2D, w: World, t: number, dt: number, animate: boolean) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(r.x, r.y, r.w, r.h);
    ctx.clip();

    const { overcast } = ambient(w);
    let [top, bottom] = skyColours(w.sunAlt);
    const grey: RGB = w.sunAlt > 0 ? hex('#8a93a6') : hex('#2a2a3c');
    top = mix(top, grey, overcast * 0.8);
    bottom = mix(bottom, grey, overcast * 0.7);
    if (w.weather === 'storm') { top = mix(top, hex('#141420'), 0.5); bottom = mix(bottom, hex('#202030'), 0.5); }

    // banded gradient with dithered seams
    const bands = 8, bh = Math.ceil(r.h / bands);
    for (let i = 0; i < bands; i++) {
      const c = mix(top, bottom, i / (bands - 1));
      rect(ctx, r.x, r.y + i * bh, r.w, bh, css(c));
      if (i < bands - 1) {
        ctx.fillStyle = css(mix(top, bottom, (i + 1) / (bands - 1)));
        for (let x = i % 2; x < r.w; x += 2) ctx.fillRect(r.x + x, r.y + i * bh + bh - 1, 1, 1);
      }
    }

    // stars fade in after dusk
    const starA = clamp01((-w.sunAlt - 6) / 10) * (1 - overcast);
    if (starA > 0) for (const s of stars) {
      if (animate && Math.sin(t * (1 + s.b) + s.p * 3) < -0.5) continue;
      rect(ctx, r.x + Math.round(s.x), r.y + Math.round(s.y), 1, 1, `rgba(220,215,255,${(starA * (0.5 + s.b / 2)).toFixed(2)})`);
    }

    // sun and moon placed by their real azimuth/altitude (window looks roughly south)
    const place = (az: number, alt: number) => ({
      x: r.x + r.w * ((az - 90) / 180),
      y: r.y + r.h * 0.78 - (alt / 70) * r.h * 0.75,
    });
    if (w.sunAlt > -3 && overcast < 0.8) {
      const p = place(w.sunAz, w.sunAlt);
      const warm = w.sunAlt < 6;
      for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
        const d = Math.hypot(x, y);
        if (d <= 3) rect(ctx, Math.round(p.x + x), Math.round(p.y + y), 1, 1, warm ? '#ffd27a' : '#fff6c9');
        else if (d <= 5) rect(ctx, Math.round(p.x + x), Math.round(p.y + y), 1, 1, 'rgba(255,240,180,0.25)');
      }
    }
    if (w.moonAlt > -2 && overcast < 0.85) {
      const p = place(w.moonAz, w.moonAlt);
      const R = 3;
      // terminator: k = -1 (new) … 1 (full); lit on the right while waxing, left while waning
      const k = 2 * w.moonFraction - 1;
      for (let y = -R; y <= R; y++) {
        const hw = Math.sqrt(Math.max(0, R * R - y * y));
        for (let x = -R; x <= R; x++) {
          if (Math.hypot(x, y) > R + 0.2) continue;
          const lit = w.moonWaxing ? x >= -k * hw : x <= k * hw;
          rect(ctx, Math.round(p.x + x), Math.round(p.y + y), 1, 1, lit ? '#fff3c4' : 'rgba(40,40,70,0.6)');
        }
      }
    }

    // clouds (more as cover rises), lit by the time of day
    const n = Math.round(w.cloud * clouds.length + (w.weather !== 'clear' ? 2 : 0));
    const cloudCol = w.sunAlt > 2 ? (overcast > 0.5 ? '#b8bccb' : '#f2f4ff') : w.sunAlt > -6 ? '#e59aa8' : '#2e2a55';
    for (let i = 0; i < Math.min(n, clouds.length); i++) {
      const c = clouds[i];
      if (animate) c.x += c.v * dt;
      if (c.x > r.w + 20) c.x = -c.w - 10;
      const x = Math.round(r.x + c.x), y = Math.round(r.y + c.y);
      rect(ctx, x, y + 2, Math.round(c.w), 3, cloudCol);
      rect(ctx, x + 3, y, Math.round(c.w) - 7, 2, cloudCol);
    }

    // the Kanchenjunga range, with alpenglow at golden hour
    const { golden, day } = ambient(w);
    const rock = css(mix(mix(hex('#211a52'), hex('#5a6a8a'), day), grey, overcast * 0.4));
    const snow = css(mix(mix(hex('#6e66b0'), hex('#f4f6ff'), day), hex('#ff9fb0'), golden * 0.7));
    for (let x = 0; x < r.w; x++) {
      const h = Math.round(ridge(x / r.w) * r.h);
      const y0 = r.y + Math.round(r.h * 0.82) - h;
      rect(ctx, r.x + x, y0, 1, h + 2, rock);
      rect(ctx, r.x + x, y0, 1, Math.min(3, h), snow);
    }
    // near hills + Algarah's lights after dark
    const hill = css(mix(hex('#120e30'), hex('#2f5a3a'), day * 0.8));
    for (let x = 0; x < r.w; x++) {
      const y0 = r.y + Math.round(r.h * (0.84 + 0.04 * Math.sin(x / 7)));
      rect(ctx, r.x + x, y0, 1, r.h, hill);
    }
    if (day < 0.4) for (const l of lights) rect(ctx, r.x + Math.round(l.x), r.y + Math.round(l.y), 1, 1, l.c);

    // weather
    if (w.weather === 'fog') {
      rect(ctx, r.x, r.y + r.h * 0.45, r.w, r.h * 0.55, 'rgba(200,205,220,0.45)');
      rect(ctx, r.x, r.y, r.w, r.h, 'rgba(190,195,210,0.25)');
    }
    const raining = w.weather === 'rain' || w.weather === 'drizzle' || w.weather === 'storm';
    if (raining || w.weather === 'snow') {
      const count = w.weather === 'drizzle' ? 20 : w.weather === 'snow' ? 30 : drops.length;
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        if (animate) {
          d.y += (w.weather === 'snow' ? 8 : 90) * d.v * dt;
          if (w.weather === 'snow') d.x += Math.sin(t + i) * dt * 4;
          if (d.y > r.h) { d.y = -3; d.x = Math.random() * r.w; }
        }
        if (w.weather === 'snow') rect(ctx, r.x + Math.round(d.x), r.y + Math.round(d.y), 1, 1, '#ffffff');
        else rect(ctx, r.x + Math.round(d.x), r.y + Math.round(d.y), 1, 3, 'rgba(170,200,255,0.55)');
      }
      // droplets sliding down the glass
      if (raining) for (const g of glass) {
        if (animate) { g.y += g.v * dt * 10; if (g.y > r.h) { g.y = 0; g.x = Math.random() * r.w; } }
        rect(ctx, r.x + Math.round(g.x), r.y + Math.round(g.y), 1, 2, 'rgba(230,240,255,0.7)');
      }
    }
    if (w.weather === 'storm' && animate) {
      nextFlash -= dt;
      if (nextFlash <= 0) { flash = 0.25; nextFlash = 5 + Math.random() * 9; }
      if (flash > 0) { flash -= dt; rect(ctx, r.x, r.y, r.w, r.h, 'rgba(255,255,255,0.65)'); }
    }

    ctx.restore();
    return flash > 0;
  };
}
