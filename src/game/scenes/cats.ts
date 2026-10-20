/*
  Room cats: a tiny behaviour system. Each cat picks something to do based on
  its personality (content/cats.ts), walks the floor, hops between the floor,
  bed, desk and windowsill, and naps. Coordinates are room pixels (640×360);
  y is where the cat's feet touch.
*/
import { cats as CATS, type Cat, type CatId } from '../../content/cats';
import { pixelText, rect } from '../../lib/pixel';
import { img } from '../images';

type Level = 'floor' | 'bed' | 'desk' | 'sill';
type Step =
  | { kind: 'walk'; x: number; y: number }
  | { kind: 'jump'; x: number; y: number; level: Level; near?: boolean } // near: land beside the take-off point
  | { kind: 'rest'; pose: string; dur: number; zz?: boolean; say?: string; face?: 1 | -1; spot?: string };

const FLOOR = { x0: 62, x1: 584, y0: 322, y1: 352 };
const BED = { x0: 150, x1: 262, y: 256 };
const DESK = { x: 382, y: 229 };
const SILL = { x: 232, y: 201 };
const SPOTS = {
  catbed: { x: 184, y: 316 },
  bowl: { x: 122, y: 323 },
  chair: { x: 404, y: 350 },
};

const POSES: Record<CatId, { sit: string; sleep: string[]; extra?: string }> = {
  miko: { sit: 'sit', sleep: ['curl', 'sprawl'] },
  lebu: { sit: 'sit', sleep: ['curl'], extra: 'pounce' },
  bibi: { sit: 'sit', sleep: ['curl', 'loaf'] },
  topi: { sit: 'meow', sleep: ['curl'], extra: 'rub' },
};
const SPEED: Record<CatId, number> = { miko: 16, lebu: 30, bibi: 15, topi: 24 };

export type CatState = {
  cat: Cat;
  x: number; y: number;
  level: Level;
  dir: 1 | -1;
  pose: string;
  plan: Step[];
  step: Step | null;
  t: number;            // time spent in current step
  from: { x: number; y: number };
  zz: boolean;
  say: string;
  spot: string;
  w: number; h: number; // last drawn size, for hit testing
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/* Route from the cat's current level to a target point on another level */
function route(c: CatState, level: Level, x: number, y: number): Step[] {
  const steps: Step[] = [];
  let cur = c.level;
  // climb down first
  if (cur === 'sill') { steps.push({ kind: 'jump', x: SILL.x - 4, y: BED.y, level: 'bed' }); cur = 'bed'; }
  if (cur !== level && cur === 'bed') { steps.push({ kind: 'jump', x: 0, y: FLOOR.y0 + 6, level: 'floor', near: true }); cur = 'floor'; }
  if (cur !== level && cur === 'desk') { steps.push({ kind: 'jump', x: DESK.x - 18, y: FLOOR.y0 + 6, level: 'floor' }); cur = 'floor'; }
  // then up
  if (level === 'floor') steps.push({ kind: 'walk', x, y });
  if (level === 'bed' || level === 'sill') {
    const bx = level === 'sill' ? SILL.x - 4 : Math.max(BED.x0, Math.min(BED.x1, x));
    if (cur === 'floor') { steps.push({ kind: 'walk', x: bx, y: FLOOR.y0 + 4 }); steps.push({ kind: 'jump', x: bx, y: BED.y, level: 'bed' }); }
    else steps.push({ kind: 'walk', x: bx, y: BED.y });
    if (level === 'sill') steps.push({ kind: 'jump', x: SILL.x, y: SILL.y, level: 'sill' });
  }
  if (level === 'desk') {
    steps.push({ kind: 'walk', x: DESK.x - 6, y: FLOOR.y0 + 6 });
    steps.push({ kind: 'jump', x: DESK.x, y: DESK.y, level: 'desk' });
  }
  return steps;
}

function choose(c: CatState, all: CatState[]): Step[] {
  const cat = c.cat, poses = POSES[cat.id];
  const taken = new Set(all.filter((o) => o !== c).map((o) => o.spot));
  const options: [number, () => Step[] | null][] = [
    [cat.sleepy, () => {
      const spots = cat.id === 'miko' ? ['bed', 'sill', 'catbed'] : cat.id === 'bibi' ? ['catbed', 'floor'] : ['bed', 'floor', 'catbed'];
      const s = pick(spots.filter((x) => !taken.has(x)));
      const rest: Step = { kind: 'rest', pose: pick(poses.sleep), dur: rand(25, 70), zz: true, spot: s };
      if (s === 'bed') return [...route(c, 'bed', rand(BED.x0, BED.x1), BED.y), rest];
      if (s === 'sill') return [...route(c, 'sill', SILL.x, SILL.y), { ...rest, pose: 'curl' }];
      if (s === 'catbed') return [...route(c, 'floor', SPOTS.catbed.x, SPOTS.catbed.y), { ...rest, pose: 'curl' }];
      return [...route(c, 'floor', rand(FLOOR.x0, 300), rand(FLOOR.y0, FLOOR.y1)), rest];
    }],
    [cat.active, () => [
      ...route(c, 'floor', rand(FLOOR.x0, FLOOR.x1), rand(FLOOR.y0, FLOOR.y1)),
      { kind: 'rest', pose: poses.sit, dur: rand(3, 9), say: cat.id === 'topi' && Math.random() < 0.45 ? 'MRRP!' : cat.id === 'lebu' && Math.random() < 0.2 ? 'MEOW' : '' },
    ]],
    [cat.hungry * 0.7, () => taken.has('bowl') ? null : [
      ...route(c, 'floor', SPOTS.bowl.x, SPOTS.bowl.y),
      { kind: 'rest', pose: poses.sit, dur: rand(6, 12), face: -1, say: cat.id === 'bibi' ? 'MEOW?' : '', spot: 'bowl' },
    ]],
    [cat.climbsDesk * 0.6, () => taken.has('desk') ? null : [
      ...route(c, 'desk', DESK.x, DESK.y),
      { kind: 'rest', pose: 'curl', dur: rand(20, 50), zz: true, spot: 'desk' },
    ]],
    [poses.extra ? 0.25 : 0, () => cat.id === 'topi'
      ? [...route(c, 'floor', SPOTS.chair.x, SPOTS.chair.y), { kind: 'rest', pose: 'rub', dur: 4, say: 'PRRR', face: 1 }]
      : [{ kind: 'rest', pose: poses.extra!, dur: 1.6 }, ...route(c, 'floor', rand(FLOOR.x0, FLOOR.x1), rand(FLOOR.y0, FLOOR.y1))]],
  ];
  const total = options.reduce((s, [w]) => s + w, 0);
  for (let tries = 0; tries < 5; tries++) {
    let r = Math.random() * total;
    for (const [w, make] of options) {
      if ((r -= w) <= 0) { const plan = make(); if (plan) return plan; break; }
    }
  }
  return [{ kind: 'rest', pose: poses.sit, dur: 4 }];
}

export function createCats(onMeow: (id: CatId) => void = () => {}) {
  // start positions spread around the room
  const starts: Record<CatId, [number, number, Level, string]> = {
    // ?sill previews Miko napping on the windowsill
    miko: new URLSearchParams(location.search).has('sill') ? [SILL.x, SILL.y, 'sill', 'curl'] : [200, BED.y, 'bed', 'sprawl'],
    lebu: [DESK.x, DESK.y, 'desk', 'curl'],
    bibi: [SPOTS.bowl.x, SPOTS.bowl.y, 'floor', 'sit'],
    topi: [300, 340, 'floor', 'meow'],
  };
  const state: CatState[] = CATS.map((cat) => {
    const [x, y, level, pose] = starts[cat.id];
    return {
      cat, x, y, level, pose, dir: 1, plan: [], step: { kind: 'rest', pose, dur: rand(4, 14), zz: pose !== 'sit' && pose !== 'meow', spot: level === 'desk' ? 'desk' : level === 'floor' ? 'bowl' : level === 'sill' ? 'sill' : 'bed' },
      t: 0, from: { x, y }, zz: false, say: '', spot: '', w: 40, h: 30,
    };
  });

  const clicked = new Map<CatState, { text: string; until: number }>();

  function update(dt: number) {
    for (const c of state) {
      if (!c.step) {
        if (!c.plan.length) c.plan = choose(c, state);
        c.step = c.plan.shift()!;
        c.t = 0;
        c.from = { x: c.x, y: c.y };
        c.say = '';
        if (c.step.kind === 'rest' && c.step.say) onMeow(c.cat.id);
        // now and then a sleepy cat mumbles in its sleep
        else if (c.step.kind === 'rest' && c.step.zz && Math.random() < 0.08) onMeow(c.cat.id);
      }
      const s = c.step;
      c.t += dt;
      if (s.kind === 'walk') {
        const dx = s.x - c.x, dy = s.y - c.y, d = Math.hypot(dx, dy);
        const v = SPEED[c.cat.id] * dt;
        c.pose = 'walk'; c.zz = false; c.spot = '';
        if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
        if (d <= v) { c.x = s.x; c.y = s.y; c.step = null; }
        else { c.x += (dx / d) * v; c.y += (dy / d) * v; }
      } else if (s.kind === 'jump') {
        c.zz = false; c.spot = '';
        if (s.near && c.t === dt) {
          // hop down beside the take-off point, towards the middle of the room
          s.x = c.from.x + (c.from.x < 320 ? 14 : -14);
        }
        const dy = s.y - c.from.y, up = dy < 0;
        const crouch = up ? 0.14 : 0.06; // crouch before leaping up; just a beat before dropping
        const dur = up ? 0.22 + Math.sqrt(-dy) * 0.028 : 0.14 + Math.sqrt(dy) * 0.02;
        c.dir = s.x >= c.from.x ? 1 : -1;
        if (c.t < crouch) { c.pose = POSES[c.cat.id].sit; continue; }
        const k = Math.min(1, (c.t - crouch) / dur);
        c.pose = c.cat.id === 'lebu' ? 'pounce' : 'walk';
        // up: a leap that decelerates onto the ledge; down: a drop that starts moving at once and speeds up
        const h = up ? 8 + Math.abs(dy) * 0.25 : 0;
        const kv = up ? 1 - (1 - k) * (1 - k) : 0.45 * k + 0.55 * k * k;
        c.x = c.from.x + (s.x - c.from.x) * k;
        c.y = c.from.y + dy * kv - 4 * h * k * (1 - k);
        if (k >= 1) { c.x = s.x; c.y = s.y; c.level = s.level; c.step = null; }
      } else {
        c.pose = s.pose; c.zz = !!s.zz; c.say = s.say ?? ''; c.spot = s.spot ?? '';
        if (s.face) c.dir = s.face;
        if (c.t >= s.dur) c.step = null;
      }
      const o = clicked.get(c);
      if (o) { if (o.until > performance.now()) c.say = o.text; else clicked.delete(c); }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, c: CatState, t: number, animate: boolean) {
    const im = img(`cats/${c.cat.id}-${c.pose}`);
    if (!im) return;
    c.w = im.width; c.h = im.height;
    const bob = animate && c.pose === 'walk' && Math.floor(t * 8) % 2 ? -1 : 0;
    const breathe = 0; // breathing is drawn as a 1px stretch below
    const x = Math.round(c.x - im.width / 2), y = Math.round(c.y - im.height + bob + breathe);
    // idle: a slow breath (head and back rise a pixel); awake cats also glance around now and then
    const resting = c.pose !== 'walk' && c.pose !== 'pounce';
    const period = c.zz ? 2.4 : 1.6;
    const phase = (t + c.cat.id.length * 0.37) / period;
    const lift = animate && resting && Math.sin(phase * Math.PI * 2) > 0.2 ? 1 : 0;
    const glance = animate && resting && !c.zz && Math.sin(t * 0.7 + c.cat.id.charCodeAt(0)) > 0.93;
    const face = glance ? -c.dir : c.dir;
    ctx.save();
    if (face === -1) { ctx.translate(x + im.width, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(im, x, y);
    if (lift) {
      const k = Math.round(im.height * 0.45);
      ctx.drawImage(im, 0, 0, im.width, k, x, y - lift, im.width, k);
    }
    ctx.restore();

    if (c.zz && animate) {
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i / 3) % 1;
        pixelText(ctx, 'Z', x + im.width - 4 + Math.round(k * 6), y - 2 - Math.round(k * 12), `rgba(220,220,255,${(1 - k).toFixed(2)})`);
      }
    }
    if (c.say) bubble(ctx, c.say, Math.round(c.x), y - 4);
  }

  /* Topmost cat under a room-pixel point */
  function hit(px: number, py: number) {
    return [...state].sort((a, b) => b.y - a.y).find((c) =>
      px >= c.x - c.w / 2 && px <= c.x + c.w / 2 && py >= c.y - c.h && py <= c.y,
    ) ?? null;
  }

  /* Make a cat speak right now (e.g. when clicked) */
  function say(c: CatState, text: string) {
    clicked.set(c, { text, until: performance.now() + 1400 });
  }

  return { state, update, draw, hit, say };
}

export function bubble(ctx: CanvasRenderingContext2D, text: string, cx: number, bottom: number) {
  const w = text.length * 4 + 5, h = 9;
  const x = Math.round(cx - w / 2), y = bottom - h - 3;
  rect(ctx, x, y, w, h, '#07060f');
  rect(ctx, x + 1, y + 1, w - 2, h - 2, '#f4f1ff');
  rect(ctx, cx - 1, y + h - 1, 3, 2, '#07060f');
  rect(ctx, cx, y + h - 1, 1, 2, '#f4f1ff');
  pixelText(ctx, text, x + 3, y + 2, '#2a2860');
}
