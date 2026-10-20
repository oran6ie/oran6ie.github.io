/*
  Start-screen backdrop: night over the Himalayan foothills (a nod to Kalimpong).
  Static layers are painted once; stars, clouds and snow animate each frame,
  and the layers drift with the mouse for parallax.
*/
import { rect, seeded } from '../../lib/pixel';

export const W = 320;
export const H = 180;
const PAD = 24; // extra width on each side so layers can slide

const SKY = ['#07061a', '#0b0922', '#100d2c', '#161236', '#1e1642', '#291a4f', '#371d5b', '#4a2166', '#62266f', '#7e2d75', '#9c3678', '#bb4479'];

function layer(draw: (ctx: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas');
  c.width = W + PAD * 2;
  c.height = H;
  const ctx = c.getContext('2d')!;
  draw(ctx);
  return c;
}

function paintSky(ctx: CanvasRenderingContext2D) {
  const bandH = 10;
  SKY.forEach((col, i) => {
    rect(ctx, 0, i * bandH, W + PAD * 2, bandH, col);
    // dithered seam into the next band
    const next = SKY[i + 1];
    if (!next) return;
    ctx.fillStyle = next;
    for (let x = i % 2; x < W + PAD * 2; x += 2) ctx.fillRect(x, i * bandH + bandH - 1, 1, 1);
  });
  rect(ctx, 0, SKY.length * bandH, W + PAD * 2, H, SKY[SKY.length - 1]);
}

function paintMoon(ctx: CanvasRenderingContext2D) {
  const cx = 262 + PAD, cy = 34, r = 13;
  for (let y = -r - 4; y <= r + 4; y++) {
    for (let x = -r - 4; x <= r + 4; x++) {
      const d = Math.hypot(x, y);
      if (d <= r) ctx.fillStyle = (x + y > 6) ? '#e8d79a' : '#fff3c4';
      else if (d <= r + 3 && (x + y) % 2 === 0) ctx.fillStyle = 'rgba(255,243,196,0.18)';
      else continue;
      ctx.fillRect(cx + x, cy + y, 1, 1);
    }
  }
  // craters
  for (const [x, y, s] of [[-4, -3, 3], [3, 2, 2], [-1, 6, 2], [5, -6, 1]]) rect(ctx, cx + x, cy + y, s, s, '#e0cc8a');
}

/* Kanchenjunga-style range with snow caps */
function paintMountains(ctx: CanvasRenderingContext2D) {
  const peaks = [[10, 40], [52, 52], [104, 62], [150, 74], [196, 56], [238, 68], [290, 50], [340, 46]];
  const rnd = seeded(7);
  const base = 126;
  for (let x = 0; x < W + PAD * 2; x++) {
    let top = base, nearest = peaks[0];
    for (const p of peaks) {
      const t = base - (p[1] - Math.abs(x - p[0]) * 1.15);
      if (t < top) { top = t; nearest = p; }
    }
    top = Math.round(top + rnd() * 1.6);
    const shade = x > nearest[0];
    for (let y = top; y < base + 4; y++) {
      const depth = y - top;
      let col = shade ? '#211a52' : '#2d2468';
      if (depth < 8 + ((x * 7) % 4)) col = shade ? '#7d72bd' : '#b9b0ec';
      else if (depth < 11 && (x + y) % 2 === 0) col = shade ? '#3b3278' : '#5f55a6';
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

/* Rolling foothills dotted with a lit hill town */
function paintHills(ctx: CanvasRenderingContext2D) {
  const rnd = seeded(21);
  const tops: number[] = [];
  for (let x = 0; x < W + PAD * 2; x++) {
    const top = Math.round(134 + 7 * Math.sin(x / 26) + 4 * Math.sin(x / 9 + 1));
    tops.push(top);
    rect(ctx, x, top, 1, H - top, '#191340');
    if ((x + top) % 3 === 0) rect(ctx, x, top, 1, 1, '#2a2160');
  }
  // houses: little blocks with warm windows
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(rnd() * (W + PAD * 2 - 8));
    const w = 3 + Math.floor(rnd() * 4), h = 2 + Math.floor(rnd() * 3);
    const y = tops[x] + 2 + Math.floor(rnd() * 14);
    rect(ctx, x, y, w, h, '#120d30');
    if (rnd() > 0.25) rect(ctx, x + 1, y + 1, 1, 1, rnd() > 0.5 ? '#ffd166' : '#ff9f43');
    if (w > 4 && rnd() > 0.4) rect(ctx, x + w - 2, y + 1, 1, 1, '#ffe066');
  }
}

/* Pine forest silhouette in the foreground */
function paintTrees(ctx: CanvasRenderingContext2D) {
  const rnd = seeded(5);
  rect(ctx, 0, 166, W + PAD * 2, H - 166, '#07061a');
  for (let i = 0; i < 34; i++) {
    const cx = Math.floor(rnd() * (W + PAD * 2));
    const h = 16 + Math.floor(rnd() * 22);
    const baseY = 170 + Math.floor(rnd() * 6);
    for (let j = 0; j < h; j++) {
      const half = Math.floor((j / h) * (h / 3.2)) + ((j % 4 === 3) ? -1 : 0);
      rect(ctx, cx - half, baseY - h + j, half * 2 + 1, 1, '#07061a');
      if (j % 4 === 2 && half > 1) rect(ctx, cx - half, baseY - h + j, 1, 1, '#1a1440');
    }
  }
}

type Flake = { x: number; y: number; s: number; v: number; ph: number };
type Cloud = { x: number; y: number; w: number; v: number };

export function createTitleScene() {
  const sky = layer((c) => { paintSky(c); paintMoon(c); });
  const mountains = layer(paintMountains);
  const hills = layer(paintHills);
  const trees = layer(paintTrees);

  const rnd = seeded(99);
  const stars = Array.from({ length: 90 }, () => ({ x: rnd() * W, y: rnd() * 100, b: rnd(), r: rnd() }));
  const flakes: Flake[] = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, s: rnd() > 0.85 ? 2 : 1, v: 6 + rnd() * 10, ph: rnd() * 6 }));
  const clouds: Cloud[] = [
    { x: 30, y: 62, w: 46, v: 1.2 }, { x: 180, y: 48, w: 60, v: 0.8 }, { x: 290, y: 76, w: 38, v: 1.5 },
  ];
  let shooting: { x: number; y: number; life: number } | null = null;

  return function draw(ctx: CanvasRenderingContext2D, t: number, dt: number, mx: number, my: number, animate: boolean) {
    const off = (depth: number) => -PAD + Math.round(mx * depth);
    ctx.drawImage(sky, off(2), Math.round(my * 1));

    // stars twinkle
    for (const s of stars) {
      const on = animate ? Math.sin(t * (1 + s.r * 2) + s.b * 10) > -0.3 : true;
      if (!on) continue;
      ctx.fillStyle = s.b > 0.9 ? '#ffffff' : s.b > 0.6 ? '#c9c4ff' : '#6e66b8';
      ctx.fillRect(Math.round(s.x + mx * 2), Math.round(s.y + my), 1, 1);
    }

    // occasional shooting star
    if (animate) {
      if (!shooting && Math.random() < dt * 0.08) shooting = { x: 40 + Math.random() * 200, y: 8 + Math.random() * 30, life: 1 };
      if (shooting) {
        shooting.x += dt * 120; shooting.y += dt * 40; shooting.life -= dt * 1.4;
        for (let i = 0; i < 8; i++) {
          ctx.fillStyle = `rgba(255,255,255,${(shooting.life * (1 - i / 8)).toFixed(2)})`;
          ctx.fillRect(Math.round(shooting.x - i * 3), Math.round(shooting.y - i), 2, 1);
        }
        if (shooting.life <= 0) shooting = null;
      }
    }

    // clouds drift behind the peaks
    for (const c of clouds) {
      if (animate) c.x -= c.v * dt * 4;
      if (c.x < -c.w - 10) c.x = W + 10;
      const x = Math.round(c.x + mx * 3);
      rect(ctx, x, c.y, c.w, 3, 'rgba(58,44,110,0.75)');
      rect(ctx, x + 6, c.y - 2, c.w - 14, 2, 'rgba(58,44,110,0.75)');
      rect(ctx, x + 4, c.y + 3, c.w - 6, 1, 'rgba(36,28,80,0.8)');
    }

    ctx.drawImage(mountains, off(4), Math.round(my * 2));
    ctx.drawImage(hills, off(7), Math.round(my * 3));
    ctx.drawImage(trees, off(11), Math.round(my * 4));

    // snow
    for (const f of flakes) {
      if (animate) {
        f.y += f.v * dt;
        f.x += Math.sin(t + f.ph) * dt * 4;
        if (f.y > H) { f.y = -2; f.x = Math.random() * W; }
      }
      ctx.fillStyle = f.s > 1 ? '#ffffff' : '#c9c4ff';
      ctx.fillRect(Math.round(f.x + mx * (f.s * 6)), Math.round(f.y), f.s, f.s);
    }
  };
}
