import { useEffect, useRef } from 'react';

export type FrameFn = (ctx: CanvasRenderingContext2D, t: number, dt: number) => void;

type Props = {
  width: number;
  height: number;
  frame: FrameFn;
  className?: string;
};

// ?trailer: no real-time loop; a recording script steps frames itself with window.__pixelTick(dt)
const MANUAL = typeof location !== 'undefined' && new URLSearchParams(location.search).has('trailer');

/* Low-res canvas scaled up with crisp pixels; runs `frame` at ~30fps while visible. */
export function PixelCanvas({ width, height, frame, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(frame);
  frameRef.current = frame;

  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    if (MANUAL) {
      let t = 0;
      const w = window as unknown as { __pixelTick?: (dt: number) => void };
      const tick = (dt: number) => { t += dt; frameRef.current(ctx, t, dt); };
      w.__pixelTick = tick;
      frameRef.current(ctx, 0, 0);
      return () => { if (w.__pixelTick === tick) delete w.__pixelTick; };
    }
    let raf = 0, last = performance.now(), acc = 0;
    const start = last;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      if (acc < 1 / 30) return;
      frameRef.current(ctx, (now - start) / 1000, acc);
      acc = 0;
    };
    frameRef.current(ctx, 0, 0);
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={ref} width={width} height={height} className={['pixel-canvas', className].filter(Boolean).join(' ')} />;
}
