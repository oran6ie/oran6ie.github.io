/*
  Inventory icons: pixel takes on the real app tiles so tools are recognisable
  at a glance. Drawn once to small canvases and returned as data URLs.
*/
import { pixelText, rect } from '../../lib/pixel';

export type ToolIcon = 'pr' | 'ae' | 'ps' | 'ai' | 'motion' | 'higgsfield' | 'claude' | 'youtube';

const S = 20;

function tile(ctx: CanvasRenderingContext2D, bg: string, edge: string) {
  // rounded square: 1px corners cut
  rect(ctx, 1, 0, S - 2, S, edge);
  rect(ctx, 0, 1, S, S - 2, edge);
  rect(ctx, 2, 1, S - 4, S - 2, bg);
  rect(ctx, 1, 2, S - 2, S - 4, bg);
}

function letters(ctx: CanvasRenderingContext2D, text: string, color: string) {
  // two 3×5 glyphs at 2× → 14px wide, 10px tall, centred
  pixelText(ctx, text, 3, 5, color, 2);
}

const DRAW: Record<ToolIcon, (ctx: CanvasRenderingContext2D) => void> = {
  youtube: (c) => {
    // red rounded play tile
    rect(c, 2, 4, 16, 12, '#ff0033'); rect(c, 1, 5, 18, 10, '#ff0033');
    rect(c, 2, 14, 16, 1, '#c00026');
    for (let i = 0; i < 4; i++) rect(c, 8 + i, 7 + i * 0.5, 1, 6 - i, '#ffffff');
  },
  pr: (c) => { tile(c, '#00005b', '#9999ff'); letters(c, 'Pr', '#9999ff'); },
  ae: (c) => { tile(c, '#1f0040', '#d291ff'); letters(c, 'Ae', '#d291ff'); },
  ps: (c) => { tile(c, '#001e36', '#31a8ff'); letters(c, 'Ps', '#31a8ff'); },
  ai: (c) => { tile(c, '#330000', '#ff9a00'); letters(c, 'Ai', '#ff9a00'); },
  motion: (c) => {
    tile(c, '#141331', '#3be8ff');
    // an easing curve with two keyframe diamonds
    const pts = [[3, 15], [5, 15], [7, 14], [9, 12], [10, 10], [11, 8], [13, 6], [15, 5], [17, 5]];
    for (const [x, y] of pts) rect(c, x, y, 1, 1, '#ff4fd8');
    for (const [x, y] of [[4, 15], [16, 5]]) {
      rect(c, x - 1, y, 3, 1, '#ffe066'); rect(c, x, y - 1, 1, 3, '#ffe066');
    }
  },
  higgsfield: (c) => {
    tile(c, '#0b0b0b', '#c6ff3a');
    // camera lens: concentric rings with a glint
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - 9.5, y - 9.5);
      if (d < 7 && d >= 5.6) rect(c, x, y, 1, 1, '#c6ff3a');
      else if (d < 4.4 && d >= 3.2) rect(c, x, y, 1, 1, '#5a7a1a');
      else if (d < 2.2) rect(c, x, y, 1, 1, '#c6ff3a');
    }
    rect(c, 7, 6, 2, 1, '#ffffff');
  },
  claude: (c) => {
    tile(c, '#f4ead9', '#d97757');
    // the orange starburst
    const cx = 9.5, cy = 9.5;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2, len = k % 2 ? 5.5 : 7;
      for (let r = 1.2; r < len; r += 0.5) rect(c, Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1, '#d97757');
    }
    rect(c, 9, 9, 2, 2, '#d97757');
  },
};

const cache = new Map<ToolIcon, string>();
export function toolIconURL(icon: ToolIcon): string {
  const hit = cache.get(icon);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S;
  DRAW[icon](cv.getContext('2d')!);
  const url = cv.toDataURL();
  cache.set(icon, url);
  return url;
}
