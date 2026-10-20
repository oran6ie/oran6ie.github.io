import { useEffect, useRef, useState } from 'react';

/* Nav slides up while scrolling down, comes back on scroll up. */
export function useNavHidden() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > last && y > 80);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return hidden;
}

export function useScrolledPast(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > px);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [px]);
  return past;
}

/*
  Adds `doneClass` to elements matching `selector` the first time they scroll
  into view. Call once per page; it picks up everything rendered on mount.
*/
export function useScrollReveal(
  selector = '.reveal,.reveal-left,.reveal-right',
  doneClass = 'in',
  options: IntersectionObserverInit = { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
) {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(selector);
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add(doneClass));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add(doneClass);
          io.unobserve(e.target);
        }
      }
    }, options);
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [selector, doneClass]);
}

/*
  Per-element version of useScrollReveal for elements whose className React
  re-renders (a class added from outside would be wiped on the next render).
*/
export function useInView<T extends Element>(options: IntersectionObserverInit = { threshold: 0.06 }) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || inView) return;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, options);
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return [ref, inView] as const;
}

export function useEscape(onEscape: () => void, active = true) {
  const cb = useRef(onEscape);
  cb.current = onEscape;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cb.current(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);
}

/* Lock page scroll while a popup is open. */
export function useScrollLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [on]);
}
