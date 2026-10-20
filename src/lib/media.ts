// Content files list media as "media/work/x.mp4" (a file in public/) or a full URL.
export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path;
  return import.meta.env.BASE_URL + path.replace(/^\//, '');
}

export const isVideoFile = (path: string) => /\.(mp4|webm|mov|ogg)(\?.*)?$/i.test(path.trim());

/* ── YouTube / Vimeo / iframe / file → something we can render ── */

export type Embed =
  | { kind: 'iframe'; src: string; title: string; allow: string }
  | { kind: 'video'; src: string };

function iframeSrc(v: string) {
  return v.match(/src=["']([^"']+)["']/i)?.[1] ?? '';
}

function youTubeId(raw: string) {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);
    if (host === 'youtu.be') return parts[0] ?? '';
    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      if (u.searchParams.get('v')) return u.searchParams.get('v')!;
      if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] ?? '';
    }
  } catch { /* not a URL */ }
  return raw.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i)?.[1] ?? '';
}

function vimeoId(raw: string) {
  try {
    const u = new URL(raw);
    if (u.hostname.includes('vimeo.com')) {
      return u.pathname.split('/').filter(Boolean).find((p) => /^\d+$/.test(p)) ?? '';
    }
  } catch { /* not a URL */ }
  return raw.match(/vimeo\.com\/(?:video\/)?(\d+)/i)?.[1] ?? '';
}

export function parseEmbed(value: string | undefined, { autoplay = false } = {}): Embed | null {
  if (!value?.trim()) return null;
  let raw = value.trim();
  if (raw.startsWith('<iframe')) raw = iframeSrc(raw) || raw;

  const yt = youTubeId(raw);
  if (yt) {
    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${yt}?rel=0&modestbranding=1${autoplay ? '&autoplay=1' : ''}`,
      title: 'YouTube video player',
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    };
  }
  const vi = vimeoId(raw);
  if (vi) {
    return {
      kind: 'iframe',
      src: `https://player.vimeo.com/video/${vi}${autoplay ? '?autoplay=1' : ''}`,
      title: 'Vimeo video player',
      allow: 'autoplay; fullscreen; picture-in-picture',
    };
  }
  if (/^https?:\/\//.test(raw) && value.trim().startsWith('<iframe')) {
    return { kind: 'iframe', src: raw, title: 'Embedded video player', allow: 'autoplay; fullscreen; picture-in-picture; encrypted-media' };
  }
  if (isVideoFile(raw)) return { kind: 'video', src: asset(raw) };
  return null;
}

/* Restart a one-shot CSS animation class (nav flash, intro flash). */
export function replayClass(el: HTMLElement | null, cls: string) {
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

/* Set when leaving /ai/ for the main page so the intro screen is skipped once. */
export const SKIP_INTRO_KEY = 'skipIntroOnce';
export function markSkipIntro() {
  try { sessionStorage.setItem(SKIP_INTRO_KEY, '1'); } catch { /* storage blocked */ }
}
