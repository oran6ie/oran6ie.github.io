// Transplant a panicked face (rows above the chin) from a donor sprite onto a calm one.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('../../public/media/game/player/', import.meta.url));
const [mode, target, donor, outFile] = process.argv.slice(2);
const load = async (f) => { const { data, info } = await sharp(D + f + '.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { d: data, w: info.width, h: info.height }; };
const skin = (d, i) => d[i + 3] && d[i] > 150 && d[i + 1] > 90 && d[i] > d[i + 1] + 20 && d[i + 2] < 160;
// face centre = mean x of skin pixels in the cheek rows
const centre = (im) => { let s = 0, n = 0; for (let y = 28; y < 42; y++) for (let x = 0; x < im.w; x++) if (skin(im.d, (y * im.w + x) * 4)) { s += x; n++; } return s / n; };
// chin = last row (from 36 down) that still has a run of face skin near the centre
const chin = (im, cx) => { let last = 36; for (let y = 36; y < 56; y++) { let n = 0; for (let x = Math.round(cx - 8); x <= Math.round(cx + 8); x++) if (skin(im.d, (y * im.w + x) * 4)) n++; if (n >= 3) last = y; } return last; };
const T = await load(target), S = await load(donor);
const tc = centre(T), sc = centre(S), dx = Math.round(tc - sc);
const cutT = Number(process.env.CUT ?? 46), cutS = cutT, dy = 0;
const out = Buffer.from(T.d);
// clear the target's head rows, then paste the donor's head rows (shifted), keep everything below the chin
const overlay = mode === 'overlay';
if (!overlay) for (let y = 0; y < cutT; y++) for (let x = 0; x < T.w; x++) out[(y * T.w + x) * 4 + 3] = 0;
// chair upholstery: dark, slightly blue, unsaturated (hair is near-black and neutral)
const chair = (d, i) => { const r = d[i], g = d[i + 1], b = d[i + 2]; return Math.max(r, g, b) < 95 && b - r >= 6 && Math.max(r, g, b) > 30; };
for (let y = 0; y < cutS; y++) for (let x = 0; x < S.w; x++) {
  const X = x + dx, Y = y + dy; if (X < 0 || X >= T.w || Y < 0 || Y >= cutT) continue;
  const si = (y * S.w + x) * 4, ti = (Y * T.w + X) * 4;
  if (S.d[si + 3] && !(overlay && chair(S.d, si))) S.d.copy(out, ti, si, si + 4);
}
await sharp(out, { raw: { width: T.w, height: T.h, channels: 4 } }).png().toFile(outFile);
console.log(target, '<-', donor, 'dx', dx, 'dy', dy, 'cut', cutT);
