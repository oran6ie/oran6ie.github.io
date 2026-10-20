import { useEffect, useRef } from 'react';

const TRAIL_DOTS = 6;

type Props = {
  /* Elements that make the cursor grow on hover. */
  hoverSelector?: string;
  trail?: boolean;
};

/* Dot + lagging ring (+ optional fading trail) that replaces the system cursor. */
export function Cursor({ hoverSelector = 'a,button', trail = false }: Props) {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;
    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const dots = trailRefs.current.filter((d): d is HTMLDivElement => d !== null);

    let mx = 0, my = 0, rx = 0, ry = 0, shown = false, raf = 0;
    const pts = dots.map(() => ({ x: 0, y: 0 }));

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dot.style.left = mx + 'px';
      dot.style.top = my + 'px';
      if (!shown) {
        shown = true;
        document.body.style.cursor = 'none';
        for (const el of [dot, ring, ...dots]) el.style.display = 'block';
      }
    };

    const tick = () => {
      rx += (mx - rx) * 0.13;
      ry += (my - ry) * 0.13;
      ring.style.left = Math.round(rx * 10) / 10 + 'px';
      ring.style.top = Math.round(ry * 10) / 10 + 'px';
      if (pts.length) {
        pts[0].x += (mx - pts[0].x) * 0.28;
        pts[0].y += (my - pts[0].y) * 0.28;
        for (let i = 1; i < pts.length; i++) {
          pts[i].x += (pts[i - 1].x - pts[i].x) * 0.5;
          pts[i].y += (pts[i - 1].y - pts[i].y) * 0.5;
        }
        pts.forEach((p, i) => {
          dots[i].style.left = Math.round(p.x) + 'px';
          dots[i].style.top = Math.round(p.y) + 'px';
        });
      }
      raf = requestAnimationFrame(tick);
    };

    const setBig = (on: boolean) => {
      dot.classList.toggle('big', on);
      ring.classList.toggle('big', on);
    };
    const hits = (t: EventTarget | null) => t instanceof Element && t.closest(hoverSelector) !== null;
    const onOver = (e: MouseEvent) => { if (hits(e.target)) setBig(true); };
    const onOut = (e: MouseEvent) => { if (hits(e.target) && !hits(e.relatedTarget)) setBig(false); };
    const onDown = () => dot.classList.add('tap');
    const onUp = () => dot.classList.remove('tap');

    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('mouseup', onUp);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
    };
  }, [hoverSelector]);

  return (
    <>
      <div id="cursor" ref={dotRef} />
      <div id="cursor-ring" ref={ringRef} />
      {trail &&
        Array.from({ length: TRAIL_DOTS }, (_, i) => (
          <div
            key={i}
            className="cur-trail"
            ref={(el) => { trailRefs.current[i] = el; }}
            style={{ display: 'none', opacity: Math.round(((TRAIL_DOTS - i) / (TRAIL_DOTS * 2)) * 100) / 100 }}
          />
        ))}
    </>
  );
}
