import type { CSSProperties } from 'react';
import { parseEmbed } from '../../lib/media';

type Props = {
  value: string;
  autoplay?: boolean;
  style?: CSSProperties;
};

/* Renders a YouTube/Vimeo link, pasted <iframe> code, or a direct video file. */
export function VideoEmbed({ value, autoplay = false, style }: Props) {
  const embed = parseEmbed(value, { autoplay });
  if (!embed) {
    return (
      <div className="video-placeholder">
        <div className="play-btn">⚠</div>
        <span className="play-label">Unsupported video link — use a YouTube, Vimeo, iframe, or direct video URL</span>
      </div>
    );
  }
  if (embed.kind === 'video') {
    return <video src={embed.src} controls playsInline preload="metadata" autoPlay={autoplay} style={style} />;
  }
  return (
    <iframe
      src={embed.src}
      title={embed.title}
      loading="lazy"
      allow={embed.allow}
      referrerPolicy="strict-origin-when-cross-origin"
      allowFullScreen
      style={style}
    />
  );
}
