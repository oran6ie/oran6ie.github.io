// Paints the generated window, curtains and rod out of room.png, leaving plain wall:
// roomScene draws them in code now (scenes/curtains.ts + outside.js createWindow), so they can move.
// Safe to run again: the wall is rebuilt from wall pixels outside the patch.
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = `${ROOT}/public/media/game/room.png`;
const { data, info } = await sharp(FILE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, at = (x, y) => (y * W + x) * 4;

// the wall's own colours (and how often each appears), from a clear patch left of the window
const counts = new Map();
for (let y = 80; y < 200; y++) for (let x = 142; x < 156; x++) {
  const i = at(x, y), k = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  counts.set(k, (counts.get(k) || 0) + 1);
}
const wall = [...counts].sort((a, b) => b[1] - a[1]).slice(0, 12).flatMap(([k, n]) => Array(n).fill(k));
const hash = (x, y) => { const r = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return r - Math.floor(r); };

// x 141..303 from the ceiling line down to below the hems. By the desk (y >= 150) the wall right of
// the old curtain is lit by the laptop, so x 292..297 fade from plain wall into that glow (x 298).
const glow = new Map();
for (let y = 150; y <= 216; y++) glow.set(y, [0, 1, 2].map((c) => data[at(298, y) + c]));
for (let y = 62; y <= 216; y++) {
  const x1 = y >= 150 ? 297 : 303;
  for (let x = 141; x <= x1; x++) {
    const i = at(x, y), k = wall[Math.floor(hash(x, y) * wall.length)];
    const c = [k >> 16, (k >> 8) & 255, k & 255], f = y >= 150 && x > 291 ? ((x - 291) / 7) ** 2 : 0;
    for (let j = 0; j < 3; j++) data[i + j] = Math.round(c[j] + (glow.get(y)?.[j] - c[j] || 0) * f);
    data[i + 3] = 255;
  }
}
await sharp(data, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(FILE + '.tmp');
const fs = await import('node:fs');
fs.renameSync(FILE + '.tmp', FILE);
console.log('window painted out of room.png');
