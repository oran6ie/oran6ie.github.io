/*
  Director mode: records a few seconds of the room canvas into a looping GIF
  that visitors can download and share.
*/
import { applyPalette, GIFEncoder, quantize } from 'gifenc';
import { pixelText, rect } from '../lib/pixel';

const SECONDS = 4, FPS = 10, SCALE = 0.5;

export type Recording = { url: string; bytes: number };

export function recordRoom(canvas: HTMLCanvasElement, onProgress: (k: number) => void): Promise<Recording> {
  const w = Math.round(canvas.width * SCALE), h = Math.round(canvas.height * SCALE);
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const g = off.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingEnabled = false;
  const frames: Uint8ClampedArray[] = [];
  return new Promise((resolve) => {
    const total = SECONDS * FPS;
    const id = setInterval(() => {
      g.drawImage(canvas, 0, 0, w, h);
      // little "made at" tag in the corner
      rect(g, 2, h - 9, 84, 8, 'rgba(7,6,15,0.75)');
      pixelText(g, 'ORAN6IE.GITHUB.IO', 4, h - 8, '#ffe066');
      frames.push(g.getImageData(0, 0, w, h).data);
      onProgress(frames.length / total);
      if (frames.length < total) return;
      clearInterval(id);
      // encode off the main beat so the room keeps animating
      setTimeout(() => {
        const gif = GIFEncoder();
        const palette = quantize(frames[Math.floor(total / 2)], 128);
        for (const f of frames) gif.writeFrame(applyPalette(f, palette), w, h, { palette, delay: 1000 / FPS });
        gif.finish();
        const bytes = gif.bytes();
        resolve({ url: URL.createObjectURL(new Blob([bytes], { type: 'image/gif' })), bytes: bytes.length });
      }, 30);
    }, 1000 / FPS);
  });
}
