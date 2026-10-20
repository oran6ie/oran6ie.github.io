// Art pipeline: raw Higgsfield generations in art-inbox/ -> game assets in public/media/game/.
// Run with: npm run art   (needs the local art-inbox/ and REFRENCES/ folders, which are not in git)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const IN = `${ROOT}/art-inbox`;
const OUT = `${ROOT}/public/media/game`;
const ROOM_W = 640, ROOM_H = 360;
fs.mkdirSync(OUT, { recursive: true });
const manifest = { room: { w: ROOM_W, h: ROOM_H }, regions: {}, sprites: {}, hands: {} };

async function raw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
const toPng = (img) => sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } }).png();

function key(img, test) {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) if (test(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
  return img;
}
const isMagenta = (r, g, b) => Math.min(r, b) - g > 90;
const isGreen = (r, g, b) => g > 190 && r < 110 && b < 110 && g - Math.max(r, b) > 100;

// nearest-neighbour resize of a raw RGBA image
function resize(img, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx = Math.min(img.w - 1, Math.floor((x + 0.5) * img.w / w));
    const sy = Math.min(img.h - 1, Math.floor((y + 0.5) * img.h / h));
    img.data.copy(out, (y * w + x) * 4, (sy * img.w + sx) * 4, (sy * img.w + sx) * 4 + 4);
  }
  return { data: out, w, h };
}
function crop(img, x, y, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let j = 0; j < h; j++) img.data.copy(out, j * w * 4, ((y + j) * img.w + x) * 4, ((y + j) * img.w + x + w) * 4);
  return { data: out, w, h };
}
function flip(img) {
  const out = Buffer.alloc(img.data.length);
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
    img.data.copy(out, (y * img.w + (img.w - 1 - x)) * 4, (y * img.w + x) * 4, (y * img.w + x) * 4 + 4);
  return { data: out, w: img.w, h: img.h };
}
const alphaAt = (img, x, y) => img.data[(y * img.w + x) * 4 + 3];

// edge pixels still tinted magenta (anti-aliased against the key colour) → transparent
function defringe(img) {
  const d = img.data, W = img.w, H = img.h, kill = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!d[i + 3]) continue;
    const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X < 0 || Y < 0 || X >= W || Y >= H || !d[(Y * W + X) * 4 + 3]; });
    if (edge && Math.min(d[i], d[i + 2]) - d[i + 1] > 45) kill.push(i);
  }
  for (const i of kill) d[i + 3] = 0;
  return img;
}
// bounding box of the hands (skin pixels at the left, upper half) in a gaming sprite
function hands(img) {
  let x0 = img.w, y0 = img.h, x1 = 0, y1 = 0;
  for (let y = Math.round(img.h * 0.18); y < img.h * 0.55; y++) for (let x = 0; x < img.w * 0.3; x++) {
    const i = (y * img.w + x) * 4, d = img.data;
    if (d[i + 3] && d[i] > 150 && d[i + 1] > 90 && d[i + 1] < 190 && d[i + 2] < 150 && d[i] > d[i + 1] + 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// split runs of non-empty rows/columns separated by >= gap empty lines
function runs(n, filled, gap) {
  const out = []; let start = -1, empty = 0;
  for (let i = 0; i < n; i++) {
    if (filled(i)) { if (start < 0) start = i; empty = 0; }
    else if (start >= 0 && ++empty >= gap) { out.push([start, i - empty]); start = -1; empty = 0; }
  }
  if (start >= 0) out.push([start, n - 1 - empty]);
  return out;
}
function poses(img, gap = 24) {
  const rowFilled = (y) => { for (let x = 0; x < img.w; x++) if (alphaAt(img, x, y) > 0) return true; return false; };
  const result = [];
  for (const [y0, y1] of runs(img.h, rowFilled, gap)) {
    if (y1 - y0 < 60) continue;
    const colFilled = (x) => { for (let y = y0; y <= y1; y++) if (alphaAt(img, x, y) > 0) return true; return false; };
    for (const [x0, x1] of runs(img.w, colFilled, gap)) {
      if (x1 - x0 < 60) continue;
      // tighten vertically for this column span
      let ty0 = y1, ty1 = y0;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (alphaAt(img, x, y) > 0) { if (y < ty0) ty0 = y; if (y > ty1) ty1 = y; break; }
      result.push(crop(img, x0, ty0, x1 - x0 + 1, ty1 - ty0 + 1));
    }
  }
  return result;
}
async function save(img, rel) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await toPng(img).toFile(file);
  manifest.sprites[rel.replace(/\.png$/, '')] = { w: img.w, h: img.h };
}
const scaleTo = (img, s) => resize(img, Math.max(1, Math.round(img.w * s)), Math.max(1, Math.round(img.h * s)));

// ── Room: green screens become transparent holes; record where they are ──
{
  const src = await raw(`${IN}/batch2/room-no-chair.png`);
  key(src, isGreen);
  // edge pixels blend green with the frame: key anything greenish near the screen areas too
  const near = [[897, 363, 1110, 820], [1504, 680, 1780, 823], [1322, 734, 1457, 838], [2455, 451, 2493, 581], [2542, 444, 2603, 593], [2666, 433, 2734, 605]];
  for (const [x0, y0, x1, y1] of near) {
    for (let y = y0 - 6; y <= y1 + 6; y++) for (let x = x0 - 6; x <= x1 + 6; x++) {
      const i = (y * src.w + x) * 4, d = src.data;
      if (d[i + 1] > 22 && d[i + 1] > d[i] * 1.35 && d[i + 1] > d[i + 2] * 1.35) d[i + 3] = 0;
    }
  }
  const room = resize(src, ROOM_W, ROOM_H);
  await save(room, 'room.png');
  const sx = ROOM_W / src.w, sy = ROOM_H / src.h;
  const box = (x0, y0, x1, y1) => ({ x: Math.floor(x0 * sx), y: Math.floor(y0 * sy), w: Math.ceil((x1 - x0 + 1) * sx), h: Math.ceil((y1 - y0 + 1) * sy) });
  manifest.regions = {
    window: box(897, 363, 1110, 820),
    monitor: box(1504, 680, 1780, 823),
    laptop: box(1322, 734, 1457, 838),
    frame1: box(2455, 451, 2493, 581),
    frame2: box(2542, 444, 2603, 593),
    frame3: box(2666, 433, 2734, 605),
  };
}

// ── Closed curtains: only the pixels that differ from the open room, in the window area ──
{
  const open = await raw(`${IN}/batch2/room-no-chair.png`);
  const closed = await raw(`${IN}/batch3/room-curtains-closed.png`);
  const X0 = 670, Y0 = 260, X1 = 1290, Y1 = 915;
  const d = closed.data, o = open.data;
  for (let y = 0; y < closed.h; y++) for (let x = 0; x < closed.w; x++) {
    const i = (y * closed.w + x) * 4;
    const inside = x >= X0 && x <= X1 && y >= Y0 && y <= Y1;
    const diff = Math.abs(d[i] - o[i]) + Math.abs(d[i + 1] - o[i + 1]) + Math.abs(d[i + 2] - o[i + 2]);
    const greenish = d[i + 1] > 22 && d[i + 1] > d[i] * 1.35 && d[i + 1] > d[i + 2] * 1.35;
    if (!inside || diff < 45 || greenish) d[i + 3] = 0;
  }
  await save(resize(closed, ROOM_W, ROOM_H), 'room-curtains.png');
}

// ── Player: 6 outfits × (long/short hair) × (back = gaming, front = caught) ──
const PLAYER_H = 190;
for (const [outfit, file, mirror] of [
  ['jersey', 'outfit-jersey', true], ['tee', 'outfit-tee-red', false], ['tank', 'outfit-tank', true],
  ['knit', 'outfit-knit-sweater', false], ['polo', 'outfit-polo-cargo', true],
  ['hoodie', '../batch4/outfit-hoodie', false], // cold nights
]) {
  let img = key(await raw(`${IN}/batch2/${file}.png`), isMagenta);
  if (mirror) img = flip(img);
  let found = poses(img);
  if (found.length !== 4) {
    // poses touching each other: cut at the emptiest column near each quarter line
    const fill = (x) => { let n = 0; for (let y = 0; y < img.h; y++) if (alphaAt(img, x, y) > 0) n++; return n; };
    const cuts = [0];
    for (const q of [0.25, 0.5, 0.75]) {
      let best = Math.round(img.w * q), bestN = Infinity;
      for (let x = Math.round(img.w * (q - 0.08)); x <= Math.round(img.w * (q + 0.08)); x++) { const n = fill(x); if (n < bestN) { bestN = n; best = x; } }
      cuts.push(best);
    }
    cuts.push(img.w);
    found = [0, 1, 2, 3].flatMap((i) => poses(crop(img, cuts[i], 0, cuts[i + 1] - cuts[i], img.h), 8).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 1));
  }
  if (mirror) found.reverse(); // flipping the sheet reverses the left→right pose order
  const names = ['long-back', 'long-front', 'short-back', 'short-front'];
  if (found.length !== 4) { console.log('WARN', outfit, 'poses:', found.length); }
  const s = PLAYER_H / Math.max(...found.map((p) => p.h));
  for (let i = 0; i < Math.min(4, found.length); i++) {
    const sp = defringe(scaleTo(found[i], s));
    await save(sp, `player/${outfit}-${names[i]}.png`);
    if (names[i].endsWith("back")) manifest.hands[`${outfit}-${names[i]}`] = hands(sp);
  }
}

// ── Cats: one sheet each, poses left→right / top→bottom; all face right ──
for (const [cat, file, names, len] of [
  ['miko', 'batch1/cat-miko', ['walk', 'sit', 'curl', 'sprawl'], 50],
  ['lebu', 'batch1/cat-lebu', ['walk', 'sit', 'pounce', 'curl'], 46],
  ['bibi', 'batch1/cat-bibi', ['walk', 'sit', 'loaf', 'curl'], 50],
  ['topi', 'batch2/cat-topi-fixed', ['walk', 'meow', 'rub', 'curl'], 44],
]) {
  const img = key(await raw(`${IN}/${file}.png`), isMagenta);
  const found = poses(img).slice(0, 4); // lebu's sheet has junk below the first row
  const s = len / found[0].w;
  for (let i = 0; i < found.length; i++) await save(defringe(scaleTo(found[i], s)), `cats/${cat}-${names[i]}.png`);
}

// ── Portraits (dialogue) ──
{
  const img = key(await raw(`${IN}/batch2/portraits.png`), isMagenta);
  const [long, short] = poses(img);
  const s = 112 / Math.max(long.h, short.h);
  await save(scaleTo(long, s), 'portrait-long.png');
  await save(scaleTo(short, s), 'portrait-short.png');
}

// ── Framed memorials, painting and screen contents (full-bleed images) ──
for (const [name, file, w, h] of [
  ['memorial-kittens', 'memorial-kittens', 240, 320], ['painting', 'painting', 320, 320],
  ['screen-game', 'screen-game', 256, 144], ['screen-editor', 'screen-editor', 256, 144], ['screen-music', 'screen-music', 256, 144],
]) {
  const img = await raw(`${IN}/batch2/${file}.png`);
  if (name === 'screen-editor') {
    // remember where the editor's green program monitor sits so the real clip can play there
    let x0 = img.w, y0 = img.h, x1 = 0, y1 = 0;
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      const i = (y * img.w + x) * 4;
      if (isGreen(img.data[i], img.data[i + 1], img.data[i + 2])) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    manifest.regions.editorProgram = { x: x0 / img.w, y: y0 / img.h, w: (x1 - x0 + 1) / img.w, h: (y1 - y0 + 1) / img.h };
  }
  await save(resize(img, w, h), `${name}.png`);
}

fs.writeFileSync(`${ROOT}/src/game/art/manifest.json`, JSON.stringify(manifest, null, 1));
console.log(JSON.stringify(manifest.regions, null, 1));
console.log(Object.entries(manifest.sprites).map(([k, v]) => `${k} ${v.w}x${v.h}`).join('\n'));

// ── Two "caught" poses came out calm: give them a panicked face from a sibling sprite ──
{
  const { execFileSync } = await import('node:child_process');
  const here = path.dirname(fileURLToPath(import.meta.url));
  const P = `${OUT}/player/`;
  execFileSync('node', [`${here}/headswap.mjs`, 'replace', 'jersey-short-front', 'tank-short-front', `${P}jersey-short-front.png`], { env: { ...process.env, CUT: '44' } });
  execFileSync('node', [`${here}/headswap.mjs`, 'overlay', 'tee-short-front', 'knit-short-front', `${P}tee-short-front.png`], { env: { ...process.env, CUT: '46' } });
}
