// Real photos of Shadow and Sanbi → pixel-filtered memorial portraits.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../REFRENCES/deceased cats/', import.meta.url));
const OUT = fileURLToPath(new URL('../../public/media/game/', import.meta.url));
const jobs = [
  // crop boxes trim the phone gallery UI and frame each cat in 3:4
  ['memorial-shadow', 'shadow passed before and found sanbi as a kitten after.jpeg', { left: 58, top: 398, width: 604, height: 805 }, 1.05],
  ['memorial-sanbi', 'sanbi gave birth two times she passed away last year.jpeg', { left: 40, top: 520, width: 640, height: 813 }, 1.45],
];
for (const [name, file, box, bright] of jobs) {
  // downscale with averaging, then quantise to a small palette with dithering, then blow up with hard pixels
  const small = await sharp(R + file).extract(box).modulate({ brightness: bright, saturation: 1.15 }).resize(72, 96, { kernel: 'lanczos3' })
    .png({ palette: true, colours: 24, dither: 0.6 }).toBuffer();
  await sharp(small).resize(240, 320, { kernel: 'nearest' }).png().toFile(OUT + name + '.png');
  console.log('ok', name);
}
