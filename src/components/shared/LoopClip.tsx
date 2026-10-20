import { useEffect, useRef } from 'react';
import { asset, isVideoFile } from '../../lib/media';

type Props = {
  src: string;
  poster?: string;
  alt: string;
  className?: string;
};

/*
  GIF replacement: a muted, looping, inline video that only plays while on
  screen. Falls back to a plain <img> when `src` is an image or GIF.
*/
export function LoopClip({ src, poster, alt, className }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const video = isVideoFile(src);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void el.play().catch(() => {});
      else el.pause();
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, [src]);

  if (!video) return <img className={className} src={asset(src)} alt={alt} loading="lazy" />;

  return (
    <video
      ref={ref}
      className={['loop-clip', className].filter(Boolean).join(' ')}
      src={asset(src)}
      poster={poster ? asset(poster) : undefined}
      aria-label={alt}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
    />
  );
}
