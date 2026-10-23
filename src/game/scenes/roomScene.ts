/*
  The hub room: the generated room art with live content behind its green-screen
  holes (window sky, monitor, laptop, memorial frames), lighting that follows the
  real time of day in Algarah, the player at the desk, and the cats.
  Coordinates are room pixels (640×360).
*/
import type { LocationKey } from '../../content/game';
import youtube from '../../content/youtube.json';
import { pixelText, rect } from '../../lib/pixel';
import { bulbColor, type BulbMode } from '../bulb';
import { sfx } from '../../lib/sfx';
import { drawCover, img, MANIFEST, type Region } from '../images';
import { getMoonPhase, getWorld, homeHour, type World } from '../world';
import type { CatId } from '../../content/cats';
import type { Festival } from '../festivals';
import { bubble, createCats, env, type Decor } from './cats';
import * as P from './props';
import { createOutside, createWindow } from './outside';
import { createCurtains } from './curtains';
import { ambient } from './sky';

export const W = MANIFEST.room.w;
export const H = MANIFEST.room.h;
const R = MANIFEST.regions as Record<string, Region>;

export type Toy = 'pikachu' | 'curtainL' | 'curtainR' | 'katana' | 'wardrobe' | 'bowl' | 'laserPen' | 'webcam';

/* Clickable areas, traced from the room art */
export const HOTSPOTS: Record<LocationKey | Toy, Region> = {
  contact: { x: 0, y: 62, w: 56, h: 264 },
  painting: { x: 66, y: 76, w: 72, h: 120 },
  window: { x: 198, y: 85, w: 72, h: 110 },
  curtainL: { x: 166, y: 64, w: 34, h: 148 },
  curtainR: { x: 268, y: 64, w: 32, h: 148 },
  channel: { x: 74, y: 44, w: 52, h: 24 },
  bulb: { x: 298, y: 0, w: 18, h: 50 },
  journey: { x: 322, y: 64, w: 70, h: 84 },
  guestbook: { x: 392, y: 64, w: 126, h: 62 }, // the right of the corkboard and the visitors' notes on the wall beside it
  inventory: { x: 420, y: 178, w: 28, h: 34 },  // the manga stack
  katana: { x: 368, y: 34, w: 142, h: 22 },
  wardrobe: { x: 480, y: 190, w: 72, h: 102 },
  bowl: { x: 78, y: 302, w: 34, h: 22 }, // the food bowl (the water bowl is just right of it)
  laserPen: { x: 316, y: 224, w: 20, h: 13 },
  webcam: { x: 374, y: 144, w: 20, h: 14 },
  pikachu: { x: 396, y: 128, w: 26, h: 32 },
  ai: { x: 302, y: 168, w: 44, h: 44 },
  work: { x: 346, y: 154, w: 72, h: 56 },
  player: { x: 398, y: 152, w: 98, h: 190 },
  achievements: { x: 482, y: 150, w: 66, h: 38 },
  memorial: { x: 564, y: 96, w: 76, h: 54 },
  piano: { x: 552, y: 190, w: 38, h: 118 },
  shop: { x: 588, y: 232, w: 52, h: 128 },
  party: { x: 0, y: 0, w: 0, h: 0 }, // the cats themselves are the hotspot
  arcade: { x: 0, y: 0, w: 0, h: 0 }, // hotbar only
};

/* Where the gaming sprite's hands should rest: the right end of the keyboard */
const HANDS_AT = { x: 410, y: 226 };
const HANDS = MANIFEST.hands as Record<string, Region>;
/*
  Wall frames are tall and thin. Each photo is scaled so `span` of its width
  (the cat's face) fills the frame, centred on the face at (fx, fy), over a dark matte.
*/
const FRAMES: { frame: string; name: string; fx: number; fy: number; span: number }[] = [
  { frame: 'frame1', name: 'memorial-shadow', fx: 0.56, fy: 0.48, span: 0.9 },
  { frame: 'frame2', name: 'memorial-sanbi', fx: 0.55, fy: 0.32, span: 0.55 },
  { frame: 'frame3', name: 'memorial-kittens', fx: 0.5, fy: 0.55, span: 0.44 },
];

export type Look = { outfit: string; hair: 'long' | 'short' };

export type RoomFrame = {
  t: number;
  dt: number;
  animate: boolean;
  caught: boolean;                 // player has alt-tabbed and turned around
  look: Look;
  clip: HTMLVideoElement | null;   // a real work clip for the editor's program monitor
  toy: { name: Toy; at: number } | null;
  curtains: boolean;               // closed?
  bulb: BulbMode;
  laser: { x: number; y: number } | null;
  food: number;                    // kibble left in the bowl, 0..1
  nightShift: boolean;
  festivals: Festival[];
  onAir: boolean;
  laptopClip: HTMLVideoElement | null;
  poofAt: number | null;           // time of the last outfit change
  match: { kind: 'ace' | 'defeat'; at: number } | null;
  tired: boolean;                  // the small hours: yawning, chai
  cold: boolean;
  leak: boolean;
  guestNotes: number[] | null;     // colours of the guestbook notes on the wall (null: offline, no wall)
  guestInvite: boolean;            // this visitor hasn't pinned one yet
};

/* 0/1 px chest rise every few seconds */
const breath = (t: number, period: number) => (Math.sin((t / period) * Math.PI * 2) > 0.3 ? 1 : 0);
function mouseFlick(t: number) {
  const k = Math.floor(t * 4);
  const r = Math.sin(k * 12.9898) * 43758.5453;
  const n = r - Math.floor(r);
  if (n > 0.55) return { x: n > 0.8 ? 1 : -1, y: n > 0.9 ? 1 : 0 };
  return { x: 0, y: 0 };
}

/* Just the skin pixels inside the hand box, so the hands can twitch without tearing the arm */
const handCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>();
function handLayer(im: HTMLImageElement, b: Region) {
  let c = handCache.get(im);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = b.w; c.height = b.h;
  const g = c.getContext('2d')!;
  g.drawImage(im, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
  const px = g.getImageData(0, 0, b.w, b.h), d = px.data;
  for (let i = 0; i < d.length; i += 4) {
    const skin = d[i] > 140 && d[i + 1] > 80 && d[i + 1] < 195 && d[i + 2] < 160 && d[i] > d[i + 1] + 15;
    if (!skin) d[i + 3] = 0;
  }
  g.putImageData(px, 0, 0);
  // fingertip of the lower hand = left-most skin pixel in the bottom 40% of the box
  let tip = { x: 0, y: b.h - 1 }, best = b.w;
  for (let yy = Math.floor(b.h * 0.6); yy < b.h; yy++) for (let xx = 0; xx < b.w; xx++) {
    if (d[(yy * b.w + xx) * 4 + 3] && xx < best) { best = xx; tip = { x: xx, y: yy }; }
  }
  tips.set(im, tip);
  handCache.set(im, c);
  return c;
}
const tips = new WeakMap<HTMLImageElement, { x: number; y: number }>();

/*
  Draws a sprite with idle motion that never cuts it apart:
  - breathing stretches the head and shoulders up by one pixel (the rows repeat, no seam)
  - while gaming, a gaming mouse peeks out from under the hand and the hand's
    skin pixels twitch a pixel as he moves it
*/
function drawBreathing(ctx: CanvasRenderingContext2D, im: HTMLImageElement, x: number, y: number, lift: number,
  hand: { box: Region; dx: number; dy: number } | null) {
  ctx.drawImage(im, x, y);
  if (lift) {
    const k = Math.round(im.height * 0.3);
    ctx.drawImage(im, 0, 0, im.width, k, x, y - lift, im.width, k);
  }
  if (!hand) return;
  const b = hand.box;
  const skin = handLayer(im, b);
  const tip = tips.get(im)!;
  // gaming mouse under the lower hand's fingers (drawn over the sleeve, under the skin)
  const mx = x + b.x + tip.x - 4 + hand.dx, my = y + b.y + tip.y - 2;
  rect(ctx, mx - 1, my + 5, 11, 1, 'rgba(255,58,78,0.5)'); // RGB underglow on the mat
  rect(ctx, mx, my, 9, 6, '#07060f');           // outline
  rect(ctx, mx + 1, my + 1, 7, 4, '#2b2838');   // body
  rect(ctx, mx + 1, my + 4, 7, 1, '#e0283c');   // red side stripe
  rect(ctx, mx + 2, my + 1, 3, 1, '#5a5672');   // highlight
  rect(ctx, mx + 1, my + 2, 1, 1, '#ff6070');   // scroll wheel
  // the hands on top, nudged a pixel as he moves the mouse
  ctx.drawImage(skin, x + b.x + hand.dx, y + b.y + hand.dy);
}

/* Wall-mounted YouTube subscriber counter, live from content/youtube.json */
const COUNTER = { x: 76, y: 46 };
function drawSubCounter(ctx: CanvasRenderingContext2D, t: number, animate: boolean) {
  const { x, y } = COUNTER, w = 48, h = 20;
  const glow = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, 40);
  glow.addColorStop(0, 'rgba(255,30,60,0.22)'); glow.addColorStop(1, 'rgba(255,30,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 20, y - 20, w + 40, h + 40);
  rect(ctx, x, y, w, h, '#07060f');
  rect(ctx, x + 1, y + 1, w - 2, h - 2, '#15131f');
  rect(ctx, x + 2, y + 2, w - 4, h - 4, '#0b0a12');
  // red play tile
  rect(ctx, x + 4, y + 5, 12, 10, '#ff0033'); rect(ctx, x + 3, y + 6, 14, 8, '#ff0033');
  for (let i = 0; i < 4; i++) rect(ctx, x + 8 + i, y + 7 + Math.floor(i / 2), 1, 6 - Math.floor(i / 2) * 2, '#ffffff');
  pixelText(ctx, String(youtube.subscribers), x + 20, y + 5, '#ffffff');
  pixelText(ctx, 'SUBS', x + 20, y + 12, '#ff6070');
  if (!animate || Math.floor(t * 1.5) % 2) rect(ctx, x + w - 4, y + 3, 1, 1, '#4ee38a'); // live LED
}

/* Hanging smart bulb (click it to change colour) */
const BULB = { x: 307, y: 34 };
function drawBulb(ctx: CanvasRenderingContext2D, c: [number, number, number] | null) {
  rect(ctx, BULB.x, 0, 1, BULB.y - 2, '#07060f');                 // cord
  rect(ctx, BULB.x - 2, BULB.y - 3, 5, 3, '#55528f');              // socket
  rect(ctx, BULB.x - 2, BULB.y - 3, 5, 1, '#8b88c9');
  const body = c ? `rgb(${c[0]},${c[1]},${c[2]})` : '#6e6b8f';
  rect(ctx, BULB.x - 3, BULB.y, 7, 6, body);
  rect(ctx, BULB.x - 2, BULB.y + 6, 5, 2, body);
  rect(ctx, BULB.x - 1, BULB.y + 8, 3, 1, body);
  rect(ctx, BULB.x - 2, BULB.y + 1, 1, 2, c ? 'rgba(255,255,255,0.85)' : '#9a96b8'); // highlight
}

/*
  The window is drawn in code (the room art has plain wall there): a two-sash slider in a blue frame,
  the sill under it. Opening it slides the left sash across behind the right one (outside.js
  createWindow draws the sashes, birds that visit the sill and rain blowing in). block: what fills
  the screen when the camera pushes in on it.
*/
const GLASS = { x: 198, y: 85, w: 72, h: 110 };
const RAIL = { x: 232, w: 5, travel: 33, cols: ['#000b0e', '#516d83', '#586782', '#526780', '#6abebf'] };
export const WINDOW = { glass: GLASS, block: { x: 166, y: 62, w: 136, h: 152 }, look: { x: 176, y: 100 } };
const OPEN_KEY = 'at_window_open';

/* The slice of the view from the terrace (outside.js) that the window shows, and the sky state it needs */
export const WINDOW_CROP = { x: 38, y: 64, w: GLASS.w, h: GLASS.h };
export const outsideState = (w: World) => ({ ...w, hour: homeHour(), moonPhase: getMoonPhase() });

/* The frame and sill, in the colours of the old generated window */
function drawFrame(ctx: CanvasRenderingContext2D) {
  const { x, y, w, h } = GLASS, x0 = x - 5, x1 = x + w + 4, y1 = y + h;
  rect(ctx, x0 - 3, y - 11, x1 - x0 + 7, 4, '#1a193c');                       // the reveal's shadow above
  rect(ctx, x0, y - 7, x1 - x0 + 1, y1 + 5 - (y - 7), '#000008');             // outline
  // head: light, dark line, two blues, a teal lip catching the outside's light
  rect(ctx, x0 + 1, y - 6, x1 - x0 - 1, 1, '#5b6483');
  rect(ctx, x0 + 1, y - 4, x1 - x0 - 1, 1, '#5b6482');
  rect(ctx, x0 + 1, y - 3, x1 - x0 - 1, 1, '#536382');
  rect(ctx, x0 + 1, y - 2, x1 - x0 - 1, 1, '#6296aa');
  // jambs: the left is lit from the glass, the right is in its own shade
  rect(ctx, x0 + 1, y - 1, 1, h + 2, '#5b6482'); rect(ctx, x0 + 2, y - 1, 1, h + 2, '#536382'); rect(ctx, x0 + 3, y - 1, 1, h + 2, '#6296aa');
  rect(ctx, x1 - 3, y - 1, 1, h + 2, '#4b5878'); rect(ctx, x1 - 2, y - 1, 1, h + 2, '#536382'); rect(ctx, x1 - 1, y - 1, 1, h + 2, '#5b6482');
  // bottom rail
  rect(ctx, x0 + 1, y1 + 1, x1 - x0 - 1, 1, '#6aa6b0');
  rect(ctx, x0 + 1, y1 + 2, x1 - x0 - 1, 1, '#647188');
  rect(ctx, x0 + 1, y1 + 3, x1 - x0 - 1, 1, '#637186');
  // the sill, a little wider than the frame: top, edge, front, then its shadow on the wall
  rect(ctx, x0 - 4, y1 + 5, x1 - x0 + 9, 5, '#0a0b1e');
  rect(ctx, x0 - 3, y1 + 5, x1 - x0 + 7, 1, '#6873a1');
  rect(ctx, x0 - 3, y1 + 6, x1 - x0 + 7, 1, '#4d588a');
  rect(ctx, x0 - 3, y1 + 8, x1 - x0 + 7, 1, '#3d4670');
  rect(ctx, x0 - 3, y1 + 10, x1 - x0 + 7, 1, 'rgba(0,0,0,0.25)');
}

/* The curtains: grommet panels on a rod, fern print (curtains.js) */
const CURTAIN_PAL = {
  cloth: ['#4e4048', '#5e4d53', '#725e66', '#8c797f', '#9e8b8d', '#ad9b9b'],
  print: ['#1e1620', '#2a1e2a', '#322e3a', '#3d3842', '#4a4450', '#564e5a'],
  rim: ['#a3b5a2', '#bfe1c4'], line: '#090819', shadow: '#000000',
  rod: ['#604659', '#554e5f', '#8a7084'], finial: ['#000004', '#48282e', '#60393e', '#7e4c50'],
};
const SUBS = { x: 76, y: 46, w: 48, h: 20 };
// more things that glow in the dark: the shop's neon sign and lit front, the heater on cold nights
const NEON = { x: 592, y: 238, w: 28, h: 24 };
const VENDING = { x: 594, y: 264, w: 30, h: 70 };
const HEATER = { x: 274, y: 292, w: 17, h: 24 };

// the bed's side, drawn again in front of cats underneath it (room pixels)
const BED_FRONT = { x: 66, y: 262, w: 206, h: 29 };
const FLOOR_FRONT = 318; // cats further back than this are under the bed

export function createRoomScene() {
  const bedFront = document.createElement('canvas');
  const sky = createOutside(WINDOW_CROP);
  const events = { laserCaught: (_id: CatId) => {} };
  const cats = createCats({
    meow: (id) => sfx.meow(id),
    land: (_id, w) => sfx.land(w),
    nom: () => sfx.nom(),
    laserCaught: (id) => events.laserCaught(id),
  });
  let caughtFor = 0;
  let curtainK = 0; // 0 open … 1 closed, as far as the curtains have actually got
  const curtains = createCurtains({
    top: 66, bottom: 209, rod: { x0: 163, x1: 304, y: 71, h: 2 }, folds: 5, pal: CURTAIN_PAL,
    panels: [{ outer: 167, open: 196, shut: 236 }, { outer: 300, open: 271, shut: 232 }],
  });
  let curtainsSet = false;
  let wasOpen = false;
  try { wasOpen = localStorage.getItem(OPEN_KEY) === '1'; } catch { /* storage blocked */ }
  const win = createWindow({
    style: 'slider', glass: GLASS, rail: RAIL, open: wasOpen,
    sill: { x0: 191, x1: 276, y: 200, front: 204 },
    busy: () => cats.state.some((c) => c.level === 'sill'),       // birds won't land next to a cat
  });
  let lastT = 0;

  // Where the outside shows through the glass, for the close-up: all of it, less what the curtains cover
  const maskCv = document.createElement('canvas');
  maskCv.width = GLASS.w; maskCv.height = GLASS.h;
  function mask() {
    const g = maskCv.getContext('2d')!;
    g.fillStyle = '#000'; g.fillRect(0, 0, GLASS.w, GLASS.h);
    for (const [a, b] of curtains.spans()) g.clearRect(Math.round(a) - GLASS.x, 0, Math.round(b - a) + 1, GLASS.h);
    return maskCv;
  }

  /*
    After dark with the bulb off the room goes dark in hard bands, lit only by what's there: the
    monitor, laptop and subscriber counter; through open curtains, the moon or (moonless) just the
    other houses' lights. Gentler than Som's room, so visitors can still find their way.
  */
  const DW = W / 2, DH = H / 2;
  const darkCv = document.createElement('canvas');
  darkCv.width = DW; darkCv.height = DH;
  const darkG = darkCv.getContext('2d')!;
  let darkKey = '', darkOn = false;
  function updateDark(world: World, bulbOn: boolean, cold: boolean) {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const night = clamp01((-world.sunAlt - 2) / 8);
    const overcast = world.weather === 'clear' ? world.cloud * 0.3 : world.weather === 'cloudy' ? 0.3 + world.cloud * 0.25 : 0.65;
    const moon = world.moonAlt > 0 ? clamp01(world.moonAlt / 10) * world.moonFraction * (1 - overcast * 0.9) : 0;
    const h = homeHour(), late = h > 0.5 && h < 5, open = 1 - curtainK;
    const base = bulbOn ? 0 : (0.1 + 0.2 * curtainK) + (0.72 - 0.1 - 0.2 * curtainK) * night;
    const winI = open * (1 + (Math.max(moon * 0.8, late ? 0.14 : 0.22) - 1) * night);
    const key = [base, winI, moon, curtainK, +cold].map((v) => v.toFixed(2)).join('|');
    if (key === darkKey) return;
    darkKey = key;
    darkOn = base > 0.01;
    if (!darkOn) return;
    const im = darkG.createImageData(DW, DH), d = im.data;
    const dist = (x: number, y: number, r: Region) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w - 1)), Math.max(r.y - y, 0, y - (r.y + r.h - 1)));
    const band = (dd: number, steps: number[][]) => { for (const [lim, v] of steps) if (dd <= lim) return v; return 0; };
    const SCR = [[0, 1], [6, 0.7], [18, 0.45], [36, 0.22], [56, 0.08]], WIN = [[6, 0.8], [20, 0.5], [40, 0.25], [70, 0.1]], LED = [[0, 1], [8, 0.4], [22, 0.15]];
    const GLOW = [[0, 1], [8, 0.6], [22, 0.38], [40, 0.2], [62, 0.08]];
    const spans = curtains.spans();
    // what comes through the glass lands on the bed and floor as a slanted patch, split by the meeting
    // stile and cut off where the curtains are drawn
    const patch = (x: number, y: number) => {
      if (y < 236 || y > 306) return 0;
      const gx = x - (y - 236) * 0.32;
      if (gx < GLASS.x || gx >= GLASS.x + GLASS.w || (gx >= RAIL.x && gx < RAIL.x + RAIL.w)) return 0;
      if (spans.some(([a, b]) => gx >= a && gx <= b)) return 0;
      return winI * (y < 244 || y > 298 ? 0.3 : 0.55);
    };
    for (let yy = 0; yy < DH; yy++) for (let xx = 0; xx < DW; xx++) {
      const x = xx * 2 + 1, y = yy * 2 + 1;
      const ls = Math.max(band(dist(x, y, R.monitor), SCR), band(dist(x, y, R.laptop), SCR), band(dist(x, y, SUBS), LED) * 0.7);
      const gd = dist(x, y, GLASS);
      const lw = Math.max(gd === 0 ? Math.max(1 - curtainK, winI) : winI * band(gd, WIN), patch(x, y));
      const ln = Math.max(band(dist(x, y, NEON), GLOW), band(dist(x, y, VENDING), GLOW) * 0.6);   // the shop's sign and its lit front
      const lh = cold ? band(dist(x, y, HEATER), GLOW) * 0.9 : 0;
      const lit = Math.max(ls, lw, ln, lh);
      const a = Math.round((base * (1 - lit)) / 0.12) * 0.12;
      // the shadow takes a little of its light's colour: blue by the screens, pink by the neon, orange by
      // the heater, warm (town) or cool (moon) by the window
      const tint = lit === ls ? [8, 30, 60] : lit === ln ? [60, 12, 42] : lit === lh ? [66, 26, 8] : moon < 0.2 && night > 0.5 ? [44, 26, 14] : [14, 18, 50];
      const tk = Math.min(1, lit * 1.2) * 0.6, i = (yy * DW + xx) * 4;
      d[i] = 10 + (tint[0] - 10) * tk; d[i + 1] = 8 + (tint[1] - 8) * tk; d[i + 2] = 26 + (tint[2] - 26) * tk;
      d[i + 3] = Math.round(Math.min(0.85, a) * 255);
    }
    darkG.putImageData(im, 0, 0);
  }
  const drawSillCats = (ctx: CanvasRenderingContext2D) => { for (const c of cats.state) if (c.level === 'sill') cats.draw(ctx, c, lastT, true); };

  function screen(ctx: CanvasRenderingContext2D, name: string, r: Region) {
    const im = img(name);
    if (im) drawCover(ctx, im, r); else rect(ctx, r.x, r.y, r.w, r.h, '#10203a');
  }

  function draw(ctx: CanvasRenderingContext2D, f: RoomFrame) {
    const { t, dt, animate } = f;
    const world = getWorld();
    env.night = world.sunAlt < -10;
    env.storm = world.weather === 'storm';
    cats.setLaser(f.laser);
    if (animate) cats.update(dt);
    caughtFor = f.caught ? caughtFor + dt : 0;
    curtains.set(f.curtains, !curtainsSet || !animate);
    curtainsSet = true;
    curtains.update(animate ? dt : 0);
    curtainK = curtains.k;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    // don't show a half-built room: wait for the room and the player
    if (!img('room') || !img(`player/${f.look.outfit}-${f.look.hair}-back`)) {
      rect(ctx, 0, 0, W, H, '#0b0a1a');
      const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
      pixelText(ctx, 'LOADING' + dots, W / 2 - 34, H / 2 - 5, '#ffe066', 2);
      return;
    }

    // ── behind the room: things seen through its green-screen holes ──
    const st = outsideState(world);
    lastT = t;
    const fest = new Set(f.festivals);

    const mon = R.monitor;
    if (f.caught && caughtFor > 0.12) {
      screen(ctx, 'screen-editor', mon);
      const p = MANIFEST.regions.editorProgram;
      const pr = { x: Math.floor(mon.x + p.x * mon.w), y: Math.floor(mon.y + p.y * mon.h), w: Math.ceil(p.w * mon.w), h: Math.ceil(p.h * mon.h) };
      // cover the green program-monitor area (and its fringe) even before the clip has loaded
      rect(ctx, pr.x - 1, pr.y - 1, pr.w + 2, pr.h + 2, '#0b0a12');
      if (f.clip && f.clip.readyState >= 2) {
        ctx.imageSmoothingEnabled = true;
        drawCover(ctx, f.clip, pr, f.clip.videoWidth, f.clip.videoHeight);
        ctx.imageSmoothingEnabled = false;
      }
      // Lebu walked across the keyboard
      const lebu = cats.state.find((c) => c.cat.id === 'lebu');
      if (lebu && lebu.level === 'desk') P.drawGggg(ctx, mon, caughtFor);
    } else {
      screen(ctx, 'screen-game', mon);
      // a little life on the game screen: muzzle flash + screen shake
      if (animate && Math.floor(t * 3) % 4 === 0) rect(ctx, mon.x + mon.w - 14, mon.y + mon.h - 12, 3, 2, '#ffe066');
      if (f.match) P.drawMatchFlash(ctx, mon, f.match.kind, (t - f.match.at) / 2.2);
    }
    if (f.caught && caughtFor <= 0.12) rect(ctx, mon.x, mon.y, mon.w, mon.h, '#e8f4ff'); // alt-tab blink
    // laptop flips channels: music app, then project clips, with a burst of static between
    const lap = R.laptop, slot = Math.floor(t / 7) % 4, into = t % 7;
    if (slot > 0 && f.laptopClip && f.laptopClip.readyState >= 2) {
      ctx.imageSmoothingEnabled = true;
      drawCover(ctx, f.laptopClip, lap, f.laptopClip.videoWidth, f.laptopClip.videoHeight);
      ctx.imageSmoothingEnabled = false;
    } else screen(ctx, 'screen-music', lap);
    if (animate && into < 0.3) {
      for (let y = lap.y; y < lap.y + lap.h; y++) for (let x = lap.x; x < lap.x + lap.w; x += 2) {
        if (Math.random() < 0.5) rect(ctx, x, y, 2, 1, Math.random() < 0.5 ? '#f4f1ff' : '#55528f');
      }
    }
    for (const { frame, name, fx, fy, span } of FRAMES) {
      const im = img(name), fr = R[frame];
      // one pixel bigger on every side so the frame art covers the edge
      const box = { x: fr.x - 1, y: fr.y - 1, w: fr.w + 2, h: fr.h + 2 };
      rect(ctx, box.x, box.y, box.w, box.h, '#1a1420');
      if (!im) continue;
      const k = box.w / (im.width * span); // the face width decides the scale; the matte fills any gap
      const dw = im.width * k, dh = im.height * k;
      const dx = box.x + box.w / 2 - fx * dw;
      const centred = box.y + box.h / 2 - fy * dh;
      const dy = dh >= box.h ? Math.min(box.y, Math.max(box.y + box.h - dh, centred)) : box.y + (box.h - dh) / 2;
      ctx.save();
      ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(im, dx, dy, dw, dh);
      ctx.imageSmoothingEnabled = false;
      ctx.restore();
    }

    // ── the room ──
    const room = img('room');
    if (room) ctx.drawImage(room, 0, 0);

    // the window: frame and sill, the view through the glass, then the sashes, birds and rain
    drawFrame(ctx);
    ctx.save();
    ctx.beginPath(); ctx.rect(GLASS.x, GLASS.y, GLASS.w, GLASS.h); ctx.clip();
    ctx.translate(GLASS.x, GLASS.y);
    const outside = sky(ctx, st, t, dt, animate);
    const lightning = outside.flash;
    ctx.restore();
    if (animate) win.update(st, dt);
    win.draw(ctx, st, t, 1);

    // a cat napping on the windowsill sleeps behind the curtains, revealed when they open
    for (const c of cats.state) if (c.level === 'sill') cats.draw(ctx, c, t, animate);
    // with the window open the curtains stir in the breeze (more in rain or a storm)
    curtains.breeze = win.k * (world.weather === 'storm' ? 1.6 : world.weather === 'rain' ? 1 : 0.55);
    curtains.draw(ctx);

    drawSubCounter(ctx, t, animate);
    P.drawOnAir(ctx, f.onAir, t);
    if (f.guestNotes) P.drawGuestWall(ctx, f.guestNotes, t, animate, f.guestInvite);
    if (fest.has('tihar')) P.drawTihar(ctx, t, animate);
    if (fest.has('christmas')) P.drawTree(ctx, t);
    if (fest.has('birthday')) P.drawCake(ctx, t, animate);
    if (f.tired) P.drawChai(ctx, t, animate, fest.has('birthday'));
    if (f.leak) P.drawLeak(ctx, t, animate);
    if (f.cold) P.drawHeater(ctx, t);
    P.drawKibble(ctx, f.food);
    P.drawLaserPen(ctx, !!f.laser, t);
    const bc = bulbColor(f.bulb, t);
    drawBulb(ctx, bc);

    // screen scanlines + glow
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    for (const r of [mon, R.laptop]) for (let y = r.y + 1; y < r.y + r.h; y += 2) ctx.fillRect(r.x, y, r.w, 1);

    // ── time of day: the room art is night-lit; brighten for day, warm for golden hour ──
    const amb = ambient(world);
    if (amb.day > 0.02 || amb.golden > 0.02) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(120,140,180,${(0.32 * amb.day).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = `rgba(255,140,70,${(0.16 * amb.golden).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      // light spilling in from the window
      const g = ctx.createRadialGradient(234, 150, 10, 234, 230, 200);
      g.addColorStop(0, `rgba(255,240,210,${((0.28 * amb.day + 0.2 * amb.golden) * (1 - 0.85 * curtainK)).toFixed(3)})`);
      g.addColorStop(1, 'rgba(255,240,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // and a slanted patch of daylight on the bed and floor, either side of the meeting stile
      const pa = (0.16 * amb.day + 0.12 * amb.golden) * (1 - curtainK);
      if (pa > 0.01) {
        ctx.fillStyle = `rgba(255,236,200,${pa.toFixed(3)})`;
        const [l, r] = curtains.spans();
        for (const [a, b] of [[Math.max(GLASS.x, l[1]), Math.min(RAIL.x, r[0])], [RAIL.x + RAIL.w, Math.min(GLASS.x + GLASS.w, r[0])]]) {
          if (b <= a) continue;
          ctx.beginPath();
          ctx.moveTo(a, 238); ctx.lineTo(b, 238); ctx.lineTo(b + 21, 304); ctx.lineTo(a + 21, 304);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    if (lightning) { ctx.fillStyle = 'rgba(220,230,255,0.18)'; ctx.fillRect(0, 0, W, H); }

    // keep a copy of the bed's side (mattress edge + rail) to draw back over cats hiding underneath
    // a cat mid-leap onto the bed is still 'floor' until it lands, so never count a jumping cat as hiding
    const underBed = (c: (typeof cats.state)[number]) => c.level === 'floor' && c.step?.kind !== 'jump' && c.y < FLOOR_FRONT && c.x > BED_FRONT.x && c.x < BED_FRONT.x + BED_FRONT.w;
    const hiding = cats.state.some(underBed);
    if (hiding) {
      bedFront.width = BED_FRONT.w; bedFront.height = BED_FRONT.h;
      bedFront.getContext('2d')!.drawImage(ctx.canvas, BED_FRONT.x, BED_FRONT.y, BED_FRONT.w, BED_FRONT.h, 0, 0, BED_FRONT.w, BED_FRONT.h);
    }

    // ── player + cats, back to front ──
    const pose = f.caught ? 'front' : 'back';
    const pkey = `${f.look.outfit}-${f.look.hair}-${pose}`;
    // fall back to the other pose if this one hasn't loaded yet, so he never vanishes
    const pim = img(`player/${pkey}`) ?? img(`player/${f.look.outfit}-${f.look.hair}-${pose === 'front' ? 'back' : 'front'}`);
    const hands = HANDS[`${f.look.outfit}-${f.look.hair}-back`];
    // both poses share the gaming pose's anchor so turning around doesn't jump
    const backH = (MANIFEST.sprites as Record<string, { w: number; h: number }>)[`player/${f.look.outfit}-${f.look.hair}-back`]?.h ?? 185;
    const left = Math.round(HANDS_AT.x - hands.x - hands.w / 2);
    const top = Math.round(HANDS_AT.y - hands.y - hands.h / 2);
    const floor = top + backH;
    const decor: Decor = {
      tika: fest.has('kukur'), garland: fest.has('kukur'), santa: fest.has('christmas'), party: fest.has('birthday'),
    };
    const actors: { y: number; draw: () => void }[] = cats.state.filter((c) => c.level !== 'sill').map((c) => ({
      // a cat in mid-leap is in front of the bed, never tucked under it
      y: c.step?.kind === 'jump' ? Math.max(c.y, FLOOR_FRONT + 4) : c.y, draw: () => {
        if (!underBed(c)) { cats.draw(ctx, c, t, animate, decor); return; }
        // under the bed: only what's below the rail shows (a raised tail used to poke up over the mattress)
        ctx.save();
        ctx.beginPath(); ctx.rect(0, BED_FRONT.y + BED_FRONT.h, W, H); ctx.clip();
        cats.draw(ctx, c, t, animate, decor, true);
        ctx.restore();
      } }));
    // drawn after every cat further back than the bed's front edge, so they all end up underneath
    if (hiding) actors.push({ y: FLOOR_FRONT - 0.5, draw: () => ctx.drawImage(bedFront, BED_FRONT.x, BED_FRONT.y) });
    if (pim) actors.push({
      y: floor,
      draw: () => {
        if (f.caught) {
          const cx = left + 52;
          const shake = animate && caughtFor < 0.6 ? Math.round(Math.sin(t * 60)) : 0;
          drawBreathing(ctx, pim, Math.round(cx - pim.width / 2) + shake, floor - pim.height, animate ? breath(t, 0.9) : 0, null);
          bubble(ctx, caughtFor < 1.2 ? '!?' : 'UH... RENDERING', cx - 10, floor - pim.height + 2);
        } else {
          // mouse flicks: the hands twitch a pixel now and then, the mouse moves with them
          const flick = animate ? mouseFlick(t) : { x: 0, y: 0 };
          const mk = f.match ? (t - f.match.at) : 99;
          const hop = f.match?.kind === 'ace' && mk < 0.6 && animate ? -Math.round(Math.sin((mk / 0.6) * Math.PI) * 3) : 0;
          const slump = f.match?.kind === 'defeat' && mk < 2 ? 2 : 0;
          drawBreathing(ctx, pim, left, top + hop + slump, animate ? breath(t, 2.2) : 0, { box: hands, dx: flick.x, dy: flick.y });
          if (mk < 2.2) bubble(ctx, f.match!.kind === 'ace' ? 'LETS GOOO!' : 'NOOOO', left + 60, top + 10);
          else if (f.tired && animate && Math.floor(t / 9) % 5 === 0 && t % 9 < 2) bubble(ctx, '*YAWN*', left + 60, top + 10);
        }
      },
    });
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());

    // ── the dark: bulb off at night ──
    updateDark(world, !!bc, f.cold);
    if (darkOn) ctx.drawImage(darkCv, 0, 0, W, H);

    // the smart bulb's coloured light washes over everything
    if (bc) {
      const [cr, cg, cb] = bc;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(${cr},${cg},${cb},0.07)`;
      ctx.fillRect(0, 0, W, H);
      const g = ctx.createRadialGradient(BULB.x, BULB.y + 6, 4, BULB.x, BULB.y + 40, 300);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},0.38)`);
      g.addColorStop(0.35, `rgba(${cr},${cg},${cb},0.14)`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
    }

    if (f.laser) P.drawLaserDot(ctx, f.laser, t);
    if (f.poofAt !== null) P.drawPoof(ctx, left + 52, floor - 70, (t - f.poofAt) / 0.7);
    if (f.nightShift) P.drawNightShift(ctx, W, H, t);

    // toys: a little reaction when clicked
    if (f.toy?.name === 'pikachu' && t - f.toy.at < 1.6) {
      const r = HOTSPOTS[f.toy.name];
      // Pikachu hops and squeaks
      const k = (t - f.toy.at) / 1.6;
      bubble(ctx, k < 0.4 ? 'PIKA' : 'PIKACHU!', r.x + r.w / 2, r.y - Math.round(Math.abs(Math.sin(k * Math.PI * 3)) * 3));
    }
    return outside;
  }

  // a cat hidden behind closed curtains can't be hovered
  const hitCat = (x: number, y: number) => {
    const c = cats.hit(x, y);
    return c && c.level === 'sill' && curtainK > 0.5 ? null : c;
  };
  const hiddenCat = () => (curtainK > 0.5 ? cats.state.find((c) => c.level === 'sill') ?? null : null);
  // what the window close-up (outside.js openView) needs
  const view = {
    win, outside: sky, mask, front: drawSillCats, dark: () => (darkOn ? darkCv : null),
    setOpen: (open: boolean) => { win.setOpen(open); try { localStorage.setItem(OPEN_KEY, open ? '1' : '0'); } catch { /* ignore */ } },
  };
  return { draw, hitCat, hiddenCat, cats: cats.state, say: cats.say, feed: cats.feed, events, window: view };
}
