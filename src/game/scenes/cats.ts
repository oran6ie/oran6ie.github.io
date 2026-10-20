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
  | { kind: 'rest'; pose: string; dur: number; zz?: boolean; say?: string; face?: 1 | -1; spot?: string; dark?: boolean; eat?: boolean }
  | { kind: 'chase' }; // following the laser dot

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
const POSE_SET: Record<CatId, Record<string, true>> = {
  miko: { walk: true, sit: true, curl: true, sprawl: true },
  lebu: { walk: true, sit: true, pounce: true, curl: true },
  bibi: { walk: true, sit: true, loaf: true, curl: true },
  topi: { walk: true, meow: true, rub: true, curl: true },
};
const SPEED: Record<CatId, number> = { miko: 16, lebu: 30, bibi: 15, topi: 24 };
const WEIGHT: Record<CatId, number> = { miko: 0.8, lebu: 0.7, bibi: 1.3, topi: 0.75 };
const UNDER_BED = { x0: 92, x1: 150, y: 302 }; // between the bed legs, behind the side rail

/* What's going on in the world, set by the room each frame */
export const env = { night: false, storm: false };

/* Mood 0..100 per cat: petting and feeding raise it, it slowly drifts down; remembered between visits */
const MOOD_KEY = 'at_cat_mood';
export const mood: Record<CatId, number> = (() => {
  const base = { miko: 60, lebu: 60, bibi: 60, topi: 60 };
  try { return { ...base, ...JSON.parse(localStorage.getItem(MOOD_KEY) ?? '{}') }; } catch { return base; }
})();
export function cheer(id: CatId, amount: number) {
  mood[id] = Math.max(0, Math.min(100, mood[id] + amount));
  saveMood();
}
function saveMood() { try { localStorage.setItem(MOOD_KEY, JSON.stringify(mood)); } catch { /* ignore */ } }

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
  dark?: boolean;        // hiding under the bed
  say: string;
  spot: string;
  w: number; h: number; // last drawn size, for hit testing
  away?: number;         // how long the laser dot has been on another level
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

/* Where a cat would stand to reach the laser dot: on the bed, desk or sill when the dot is up there */
function laserSpot(p: { x: number; y: number }): { level: Level; x: number; y: number } {
  if (p.x >= 206 && p.x <= 258 && p.y >= 178 && p.y <= 206) return { level: 'sill', ...onSurface('sill', p.x, p.y) };
  if (p.x >= 66 && p.x <= 290 && p.y >= 205 && p.y <= 292) return { level: 'bed', ...onSurface('bed', p.x, p.y) };
  if (p.x >= 292 && p.x <= 400 && p.y >= 190 && p.y <= 240) return { level: 'desk', ...onSurface('desk', p.x, p.y) };
  return { level: 'floor', ...onSurface('floor', p.x, p.y) };
}
/* The nearest point to (x, y) on a surface */
function onSurface(level: Level, x: number, y: number) {
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  if (level === 'bed') return { x: clamp(x, BED.x0, BED.x1), y: BED.y };
  if (level === 'desk') return { x: clamp(x, 322, 395), y: DESK.y };
  if (level === 'sill') return { x: clamp(x, SILL.x - 8, SILL.x + 8), y: SILL.y };
  return { x: clamp(x, FLOOR.x0, FLOOR.x1), y: clamp(y, FLOOR.y0, FLOOR.y1) };
}

function choose(c: CatState, all: CatState[]): Step[] {
  const cat = c.cat, poses = POSES[cat.id];
  const taken = new Set(all.filter((o) => o !== c).map((o) => o.spot));
  // thunderstorm: everyone but fearless Lebu hides under the bed (Bibi first, always)
  if (env.storm && cat.id !== 'lebu' && (cat.id === 'bibi' || Math.random() < 0.7)) {
    return [
      ...route(c, 'floor', rand(UNDER_BED.x0, UNDER_BED.x1), UNDER_BED.y),
      { kind: 'rest', pose: 'loaf' in POSE_SET[cat.id] ? 'loaf' : 'curl', dur: rand(15, 30), dark: true, spot: 'under-bed' },
    ];
  }
  const nightK = env.night ? 1.7 : 1, dayK = env.night ? 0.5 : 1;
  const options: [number, () => Step[] | null][] = [
    // feeling ignored: sit in the middle of the room and demand attention
    [mood[cat.id] < 25 ? 2 : 0, () => [
      ...route(c, 'floor', rand(300, 400), rand(336, 348)),
      { kind: 'rest', pose: poses.sit, dur: 5, say: 'MEOW!!', face: -1 },
      { kind: 'rest', pose: poses.sit, dur: 5, say: 'PET ME', face: 1 },
    ]],
    [cat.sleepy * nightK, () => {
      const spots = cat.id === 'miko' ? ['bed', 'sill', 'catbed'] : cat.id === 'bibi' ? ['catbed', 'floor'] : ['bed', 'floor', 'catbed'];
      const s = pick(spots.filter((x) => !taken.has(x)));
      const rest: Step = { kind: 'rest', pose: pick(poses.sleep), dur: rand(25, 70), zz: true, spot: s };
      if (s === 'bed') return [...route(c, 'bed', rand(BED.x0, BED.x1), BED.y), rest];
      if (s === 'sill') return [...route(c, 'sill', SILL.x, SILL.y), { ...rest, pose: 'curl' }];
      if (s === 'catbed') return [...route(c, 'floor', SPOTS.catbed.x, SPOTS.catbed.y), { ...rest, pose: 'curl' }];
      return [...route(c, 'floor', rand(FLOOR.x0, 300), rand(FLOOR.y0, FLOOR.y1)), rest];
    }],
    [cat.active * dayK, () => [
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

export type CatHooks = {
  meow?: (id: CatId) => void;
  land?: (id: CatId, weight: number) => void;
  nom?: (id: CatId) => void;
  laserCaught?: (id: CatId) => void;
};

export function createCats(hooks: CatHooks = {}) {
  const onMeow = hooks.meow ?? (() => {});
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
  let laser: { x: number; y: number } | null = null;
  const chasers = new Set<CatId>();      // who decided to join this laser session
  const feedQueue: { c: CatState; at: number; slot: number }[] = [];
  let clock = 0, moodTick = 0;
  const floorPt = (x: number, y: number) => ({ x: Math.max(FLOOR.x0, Math.min(FLOOR.x1, x)), y: Math.max(FLOOR.y0, Math.min(FLOOR.y1, y)) });
  const BOWL_SLOTS = [{ x: 122, y: 326, face: -1 }, { x: 74, y: 328, face: 1 }, { x: 116, y: 341, face: -1 }, { x: 80, y: 343, face: 1 }] as const;

  function update(dt: number) {
    clock += dt;
    // moods drift down slowly while the room is open
    if ((moodTick += dt) > 40) { moodTick = 0; for (const c of state) mood[c.cat.id] = Math.max(0, mood[c.cat.id] - 1); saveMood(); }
    // feeding: cats arrive in order of hunger
    for (let i = feedQueue.length - 1; i >= 0; i--) {
      const q = feedQueue[i];
      if (clock < q.at || q.c.step?.kind === 'jump') continue; // never cut a jump short: that made cats glide
      feedQueue.splice(i, 1);
      const slot = BOWL_SLOTS[q.slot];
      q.c.plan = [...route(q.c, 'floor', slot.x, slot.y), { kind: 'rest', pose: POSES[q.c.cat.id].sit, dur: rand(5, 7), face: slot.face, say: 'NOM', eat: true, spot: `bowl` + q.slot }];
      q.c.step = null;
    }
    for (const c of state) {
      // laser pointer: Lebu always chases, Topi sometimes, Bibi runs from it, Miko can't be bothered
      if (laser) {
        const id = c.cat.id, d = Math.hypot(laser.x - c.x, laser.y - c.y);
        const jumping = c.step?.kind === 'jump'; // never cut a jump short: that made cats glide
        if (chasers.has(id) && !jumping && c.step?.kind !== 'chase' && !c.plan.some((p) => p.kind === 'chase')) {
          c.plan = [{ kind: 'chase' }];
          c.step = null;
        } else if (id === 'bibi' && d < 50 && c.level === 'floor' && !jumping && c.step?.kind !== 'walk') {
          const away = floorPt(c.x + (c.x > laser.x ? 90 : -90), c.y);
          c.plan = [{ kind: 'rest', pose: 'sit', dur: 2, say: '!!' }];
          c.step = { kind: 'walk', x: away.x, y: away.y }; c.t = 0; c.from = { x: c.x, y: c.y };
        }
      }
      if (!c.step) {
        if (!c.plan.length) c.plan = choose(c, state);
        c.step = c.plan.shift()!;
        c.t = 0;
        c.from = { x: c.x, y: c.y };
        c.say = '';
        if (c.step.kind === 'rest' && c.step.eat) { hooks.nom?.(c.cat.id); cheer(c.cat.id, 20); }
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
      } else if (s.kind === 'chase') {
        if (!laser) { c.step = null; continue; }
        // the dot moved up onto the bed, desk or sill (or back down): climb there once it stays a moment
        const tg = laserSpot(laser);
        if (tg.level !== c.level) {
          c.away = (c.away ?? 0) + dt;
          if (c.away > 0.35) { c.away = 0; c.plan = [...route(c, tg.level, tg.x, tg.y), { kind: 'chase' }]; c.step = null; continue; }
        } else c.away = 0;
        const p = onSurface(c.level, laser.x, laser.y);
        const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy);
        const v = SPEED[c.cat.id] * 2.4 * dt;
        c.zz = false; c.spot = '';
        if (Math.abs(dx) > 0.5) c.dir = dx > 0 ? 1 : -1;
        if (d < 5 && tg.level === c.level) { c.pose = POSE_SET[c.cat.id].pounce ? 'pounce' : POSES[c.cat.id].sit; hooks.laserCaught?.(c.cat.id); }
        else if (d < 2) c.pose = POSES[c.cat.id].sit; // right below the dot, looking up at it
        else { c.pose = 'walk'; const k = Math.min(1, v / d); c.x += dx * k; c.y += dy * k; }
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
        if (k >= 1) { c.x = s.x; c.y = s.y; c.level = s.level; c.step = null; if (!up) hooks.land?.(c.cat.id, WEIGHT[c.cat.id]); }
      } else {
        c.pose = s.pose; c.zz = !!s.zz; c.say = s.say ?? ''; c.spot = s.spot ?? ''; c.dark = !!s.dark;
        if (s.face) c.dir = s.face;
        if (c.t >= s.dur) c.step = null;
      }
      const o = clicked.get(c);
      if (o) { if (o.until > performance.now()) c.say = o.text; else clicked.delete(c); }
    }
  }

  function draw(ctx: CanvasRenderingContext2D, c: CatState, t: number, animate: boolean, decor: Decor = {}) {
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
    if (c.dark) ctx.filter = 'brightness(0.45) saturate(0.6)'; // in the shadow under the bed
    if (face === -1) { ctx.translate(x + im.width, 0); ctx.scale(-1, 1); ctx.translate(-x, 0); }
    ctx.drawImage(im, x, y);
    if (lift) {
      const k = Math.round(im.height * 0.45);
      ctx.drawImage(im, 0, 0, im.width, k, x, y - lift, im.width, k);
    }
    ctx.restore();
    if (!c.dark) drawDecor(ctx, `${c.cat.id}-${c.pose}`, im, x, y - lift, face as 1 | -1, decor);

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

  /* Fill the bowl: the hungriest cat arrives first, Miko takes her time */
  function feed() {
    const order = [...state].sort((a, b) => b.cat.hungry - a.cat.hungry);
    order.forEach((c, i) => feedQueue.push({ c, at: clock + i * 0.7 + (c.cat.id === 'miko' ? 2 : 0), slot: i }));
  }

  /* Laser pointer position in room pixels, or null when it's off */
  function setLaser(p: { x: number; y: number } | null) {
    if (p && !laser) {
      chasers.clear();
      chasers.add('lebu');
      if (Math.random() < 0.6) chasers.add('topi');
    }
    if (!p) chasers.clear();
    laser = p;
  }

  return { state, update, draw, hit, say, feed, setLaser };
}

export type Decor = { sunglasses?: boolean; tika?: boolean; garland?: boolean; santa?: boolean; party?: boolean };

/*
  Where the head is in each sprite, in pixels of the sprite facing right:
  [eyes x, eyes y, hat x (between the ears), top of the head y, neck x, neck y, head tilt in degrees].
  Every cat and pose is different, so each sprite has its own. Tilt is clockwise
  for a cat facing right: curled-up cats rest their heads on their side.
*/
export const HEADS: Record<string, [number, number, number, number, number, number, number?]> = {
  'bibi-curl': [30, 12, 28, 6, 27, 19, 15], 'bibi-loaf': [30, 9, 30, 4, 29, 15], 'bibi-sit': [16, 9, 16, 2, 16, 16], 'bibi-walk': [43, 10, 41, 5, 38, 17],
  'lebu-curl': [31, 11, 28, 5, 27, 16, 25], 'lebu-pounce': [34, 26, 33, 18, 31, 31], 'lebu-sit': [18, 10, 17, 4, 17, 16], 'lebu-walk': [41, 14, 40, 8, 37, 19],
  'miko-curl': [25, 8, 26, 3, 20, 10], 'miko-sit': [27, 8, 25, 3, 24, 13], 'miko-sprawl': [53, 7, 51, 2, 45, 9], 'miko-walk': [45, 8, 43, 3, 39, 11],
  'topi-curl': [27, 9, 25, 4, 24, 15, 30], 'topi-meow': [17, 8, 16, 3, 16, 13], 'topi-rub': [23, 13, 22, 8, 20, 18, 10], 'topi-walk': [39, 14, 37, 9, 35, 19],
};

/* The topmost solid pixel in a sprite column, so a hat sits right on the skull */
const tops = new Map<HTMLImageElement, Uint8ClampedArray | null>();
function skullTop(im: HTMLImageElement, col: number, near: number) {
  if (!tops.has(im)) {
    try {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const g = c.getContext('2d')!; g.drawImage(im, 0, 0);
      tops.set(im, g.getImageData(0, 0, im.width, im.height).data);
    } catch { tops.set(im, null); }
  }
  const px = tops.get(im);
  if (!px) return near;
  for (let y = Math.max(0, near - 4); y < Math.min(im.height, near + 5); y++) if (px[(y * im.width + col) * 4 + 3] > 128) return y;
  return near;
}

/* Tiny accessory sprites, drawn once; anchored at (ax, ay) so they can turn with a tilted head */
type Acc = { c: HTMLCanvasElement; ax: number; ay: number };
const accs = new Map<string, Acc>();
function acc(name: string, w: number, h: number, ax: number, ay: number, paint: (g: CanvasRenderingContext2D) => void): Acc {
  let a = accs.get(name);
  if (!a) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d')!);
    a = { c, ax, ay }; accs.set(name, a);
  }
  return a;
}
// a cone hat whose brim sits on the skull (anchor: bottom centre)
const cone = (g: CanvasRenderingContext2D, col: string) => { rect(g, 0, 7, 7, 2, col); rect(g, 1, 5, 5, 2, col); rect(g, 2, 3, 3, 2, col); rect(g, 3, 2, 1, 1, col); };
const PARTY = () => acc('party', 7, 9, 3, 9, (g) => { cone(g, '#3be8ff'); rect(g, 3, 1, 1, 1, '#ffe066'); rect(g, 2, 7, 1, 1, '#ff4fd8'); rect(g, 4, 5, 1, 1, '#ffe066'); });
const SANTA = () => acc('santa', 8, 10, 3, 10, (g) => { cone(g, '#d62828'); rect(g, 0, 9, 7, 1, '#ffffff'); rect(g, 4, 1, 2, 2, '#ffffff'); rect(g, 4, 3, 1, 1, '#d62828'); });
const SHADES = () => acc('shades', 7, 2, 3, 1, (g) => { rect(g, 0, 0, 7, 1, '#07060f'); rect(g, 0, 1, 3, 1, '#07060f'); rect(g, 4, 1, 3, 1, '#07060f'); rect(g, 1, 0, 1, 1, '#ff4fd8'); rect(g, 5, 0, 1, 1, '#ff4fd8'); });
const TIKA = () => acc('tika', 1, 2, 0, 1, (g) => rect(g, 0, 0, 1, 2, '#e01e37'));

/* Draw an accessory at (px, py), turned with the head and mirrored for cats facing left */
function wear(ctx: CanvasRenderingContext2D, a: Acc, px: number, py: number, deg: number, face: 1 | -1) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(px, py);
  if (deg) ctx.rotate((deg * face * Math.PI) / 180);
  if (face === -1) ctx.scale(-1, 1);
  ctx.drawImage(a.c, -a.ax, -a.ay);
  ctx.restore();
}

export function drawDecor(ctx: CanvasRenderingContext2D, key: string, im: HTMLImageElement, x: number, y: number, face: 1 | -1, d: Decor) {
  if (!d.sunglasses && !d.tika && !d.garland && !d.santa && !d.party) return;
  const [ex, ey, tx, top, nx, ny, deg = 0] = HEADS[key] ?? [im.width * 0.8, im.height * 0.3, im.width * 0.78, im.height * 0.15, im.width * 0.75, im.height * 0.5].map(Math.round);
  const X = (px: number) => (face === 1 ? x + px : x + im.width - 1 - px);
  const hx = X(ex), hy = y + ey;
  // on a tilted head the skull scan would hit the side of the head, so trust the table there
  const cx = X(tx), ht = y + (deg ? top : skullTop(im, tx, top));
  if (d.garland) { // marigold garland around the neck
    const gx = X(nx), gy = y + ny;
    for (let i = -3; i <= 3; i++) rect(ctx, gx + i, gy + (Math.abs(i) < 2 ? 1 : 0), 1, 1, i % 2 ? '#ff9f1c' : '#ffd23f');
  }
  // the tika goes on the forehead: a few pixels "up" the head from the eyes, whichever way it's tilted
  if (d.tika) {
    const r = (deg * face * Math.PI) / 180;
    wear(ctx, TIKA(), Math.round(hx + Math.sin(r) * 3), Math.round(hy - Math.cos(r) * 3), deg, face);
  }
  if (d.sunglasses) wear(ctx, SHADES(), hx, hy, deg, face);
  if (d.santa) wear(ctx, SANTA(), cx, ht + 1, deg, face);
  if (d.party) wear(ctx, PARTY(), cx, ht + 1, deg, face);
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
