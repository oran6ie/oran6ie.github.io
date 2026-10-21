/*
  The arcade: two tiny pixel mini-games with high scores saved in the browser.
  - Cat Dash: Topi runs; jump over yarn balls (Space / click / tap)
  - Beat Cut: hit the cut markers as the playhead crosses them, like editing to the beat
*/
import { useEffect, useRef, useState } from 'react';
import { pixelText, rect } from '../lib/pixel';
import { haptic, sfx } from '../lib/sfx';
import { unlock } from './achievements';
import { img } from './images';

const GW = 320, GH = 120;

const best = (key: string) => { try { return Number(localStorage.getItem(key) ?? 0); } catch { return 0; } };
const saveBest = (key: string, v: number) => { try { localStorage.setItem(key, String(v)); } catch { /* ignore */ } };

/* Shared game loop on a crisp low-res canvas; `press` fires on Space, click or tap */
function useGame(step: (g: CanvasRenderingContext2D, dt: number) => void, press: () => void) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stepRef = useRef(step); stepRef.current = step;
  const pressRef = useRef(press); pressRef.current = press;
  useEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      stepRef.current(g, dt);
    };
    raf = requestAnimationFrame(loop);
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.key === 'ArrowUp') { e.preventDefault(); pressRef.current(); } };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); };
  }, []);
  return <canvas ref={ref} width={GW} height={GH} className="pixel-canvas arcade-canvas" onPointerDown={(e) => { e.preventDefault(); pressRef.current(); }} />;
}

/* ── Cat Dash ── */
function CatDash() {
  const s = useRef({ mode: 'ready' as 'ready' | 'run' | 'over', y: 0, vy: 0, t: 0, speed: 90, score: 0, obstacles: [] as { x: number; r: number; passed: boolean }[], next: 1.2 });
  const [hi, setHi] = useState(() => best('at_hi_dash'));
  const GROUND = 100;
  const press = () => {
    const g = s.current;
    sfx.warm();
    if (g.mode !== 'run') { Object.assign(g, { mode: 'run', y: 0, vy: 0, t: 0, speed: 90, score: 0, obstacles: [], next: 1.2 }); sfx.start(); return; }
    if (g.y === 0) { g.vy = 205; sfx.move(); haptic(8); }
  };
  const canvas = useGame((ctx, dt) => {
    const g = s.current;
    // scene
    rect(ctx, 0, 0, GW, GH, '#141331');
    for (let i = 0; i < 30; i++) rect(ctx, (i * 53 - g.t * 8) % GW < 0 ? ((i * 53 - g.t * 8) % GW) + GW : (i * 53 - g.t * 8) % GW, (i * 17) % 60, 1, 1, '#55528f');
    rect(ctx, 0, GROUND, GW, GH - GROUND, '#2a1a2e');
    for (let x = 0; x < GW; x += 12) rect(ctx, (x - (g.t * g.speed) % 12 + 12) % GW, GROUND + 2, 6, 1, '#4a2c44');
    if (g.mode === 'run') {
      g.t += dt;
      g.speed = 90 + g.t * 4;
      g.vy -= 620 * dt; g.y = Math.max(0, g.y + g.vy * dt); if (g.y === 0) g.vy = 0;
      if ((g.next -= dt) <= 0) { g.obstacles.push({ x: GW + 10, r: 5 + Math.floor(Math.random() * 3), passed: false }); g.next = 0.9 + Math.random() * 1.1 - Math.min(0.4, g.t * 0.01); }
      for (const o of g.obstacles) {
        o.x -= g.speed * dt;
        if (!o.passed && o.x < 40) { o.passed = true; g.score++; if (g.score % 5 === 0) sfx.coin(); }
        // hit test against Topi (x 30..52)
        if (o.x + o.r > 32 && o.x - o.r < 50 && g.y < o.r * 2 - 2) {
          g.mode = 'over'; sfx.locked(); haptic(40);
          if (g.score > hi) { setHi(g.score); saveBest('at_hi_dash', g.score); }
          if (g.score >= 20) unlock('gamer');
        }
      }
      g.obstacles = g.obstacles.filter((o) => o.x > -20);
    }
    for (const o of g.obstacles) { // yarn balls
      ctx.fillStyle = '#ff4fd8';
      ctx.beginPath(); ctx.arc(Math.round(o.x), GROUND - o.r, o.r, 0, Math.PI * 2); ctx.fill();
      rect(ctx, Math.round(o.x) - o.r + 2, GROUND - o.r - 1, o.r * 2 - 4, 1, '#ffb3ef');
      rect(ctx, Math.round(o.x) + o.r - 1, GROUND - 1, 6, 1, '#ff4fd8');
    }
    const topi = img(g.y > 0 ? 'cats/topi-rub' : 'cats/topi-walk');
    if (topi) {
      const h = 26, w = Math.round(topi.width * (h / topi.height));
      ctx.drawImage(topi, 28, GROUND - h - Math.round(g.y) + (g.mode === 'run' && g.y === 0 && Math.floor(g.t * 10) % 2 ? -1 : 0), w, h);
    }
    pixelText(ctx, `SCORE ${g.score}`, 6, 6, '#ffe066');
    pixelText(ctx, `BEST ${Math.max(hi, g.score)}`, GW - 50, 6, '#9a96d6');
    if (g.mode === 'ready') pixelText(ctx, 'PRESS SPACE OR TAP', GW / 2 - 36, 46, '#f4f1ff');
    if (g.mode === 'over') { pixelText(ctx, 'OUCH! TAP TO RETRY', GW / 2 - 36, 46, '#ff5468'); }
  }, press);
  return <div className="arcade-game">{canvas}<p className="body-text small">Help Topi dodge the yarn. Score 20 for a trophy.</p></div>;
}

/* ── Beat Cut ── */
function BeatCut() {
  const BPM = 100, BEAT = 60 / BPM, CUTS = 20;
  const s = useRef({ mode: 'ready' as 'ready' | 'run' | 'done', t: 0, cuts: [] as { at: number; hit: '' | 'perfect' | 'good' | 'miss' }[], flash: { text: '', at: -9 }, beatN: -1 });
  const [hi, setHi] = useState(() => best('at_hi_beat'));
  const press = () => {
    const g = s.current;
    sfx.warm();
    if (g.mode !== 'run') {
      const cuts: { at: number; hit: '' }[] = [];
      let beat = 4;
      while (cuts.length < CUTS) { beat += Math.random() < 0.7 ? 1 : 2; cuts.push({ at: beat * BEAT, hit: '' }); }
      Object.assign(g, { mode: 'run', t: 0, cuts, flash: { text: '', at: -9 }, beatN: -1 }); sfx.start(); return;
    }
    const c = g.cuts.find((x) => !x.hit && Math.abs(x.at - g.t) < 0.2);
    if (!c) { g.flash = { text: 'EARLY', at: g.t }; return; }
    const err = Math.abs(c.at - g.t);
    c.hit = err < 0.07 ? 'perfect' : 'good';
    g.flash = { text: c.hit === 'perfect' ? 'PERFECT!' : 'GOOD', at: g.t };
    sfx.click(); haptic(10);
  };
  const canvas = useGame((ctx, dt) => {
    const g = s.current;
    rect(ctx, 0, 0, GW, GH, '#0b0a12');
    const PX = 60; // playhead x
    const pxPerSec = 70;
    if (g.mode === 'run') {
      g.t += dt;
      const n = Math.floor(g.t / BEAT);
      if (n !== g.beatN) { g.beatN = n; sfx.blip(n % 4 === 0 ? 'a' : 't', n % 4 === 0 ? 0.6 : 0.9); }
      for (const c of g.cuts) if (!c.hit && g.t - c.at > 0.2) { c.hit = 'miss'; g.flash = { text: 'MISS', at: g.t }; }
      if (g.cuts.every((c) => c.hit)) {
        g.mode = 'done';
        const score = Math.round((g.cuts.reduce((a, c) => a + (c.hit === 'perfect' ? 1 : c.hit === 'good' ? 0.6 : 0), 0) / CUTS) * 100);
        if (score > hi) { setHi(score); saveBest('at_hi_beat', score); }
        if (score >= 80) unlock('gamer');
        sfx.fanfare();
      }
    }
    // tracks
    for (let i = 0; i < 3; i++) rect(ctx, 0, 34 + i * 20, GW, 14, '#1d1b2e');
    const clips = ['#9b6bff', '#3be8ff', '#ff7a3d'];
    for (let i = 0; i < 3; i++) for (let k = 0; k < 12; k++) {
      const x = Math.round(PX + (k * 1.7 + i * 0.6) * pxPerSec - g.t * pxPerSec);
      if (x > -120 && x < GW) rect(ctx, x, 36 + i * 20, Math.round(pxPerSec * 1.4), 10, clips[i]);
    }
    for (const c of g.cuts) {
      const x = Math.round(PX + (c.at - g.t) * pxPerSec);
      if (x < -4 || x > GW) continue;
      const col = c.hit === 'perfect' ? '#4ee38a' : c.hit === 'good' ? '#ffe066' : c.hit === 'miss' ? '#55528f' : '#f4f1ff';
      rect(ctx, x, 30, 2, 66, col);
      rect(ctx, x - 2, 28, 6, 3, col);
    }
    rect(ctx, PX, 24, 1, 76, '#ff3a4e');
    rect(ctx, PX - 2, 22, 5, 3, '#ff3a4e');
    const done = g.cuts.filter((c) => c.hit).length;
    const pts = Math.round((g.cuts.reduce((a, c) => a + (c.hit === 'perfect' ? 1 : c.hit === 'good' ? 0.6 : 0), 0) / CUTS) * 100);
    pixelText(ctx, `CUTS ${done}/${CUTS}`, 6, 6, '#ffe066');
    pixelText(ctx, `BEST ${hi}%`, GW - 50, 6, '#9a96d6');
    if (g.t - g.flash.at < 0.5) pixelText(ctx, g.flash.text, PX + 10, 106, g.flash.text === 'MISS' || g.flash.text === 'EARLY' ? '#ff5468' : '#4ee38a');
    if (g.mode === 'ready') pixelText(ctx, 'TAP WHEN A CUT HITS THE RED LINE', GW / 2 - 64, 106, '#f4f1ff');
    if (g.mode === 'done') pixelText(ctx, `FINAL CUT ${pts}%  TAP TO REPLAY`, GW / 2 - 60, 106, '#4ee38a');
  }, press);
  return <div className="arcade-game">{canvas}<p className="body-text small">Edit to the beat: press Space or tap as each cut reaches the red playhead. 80% for a trophy.</p></div>;
}

export type ArcadeGame = 'dash' | 'beat';
export function ArcadePanel({ initialGame = 'dash' }: { initialGame?: ArcadeGame }) {
  const [game, setGame] = useState<ArcadeGame>(initialGame);
  return (
    <div className="arcade">
      <div className="px-tabs" role="tablist">
        <button role="tab" aria-selected={game === 'dash'} className={game === 'dash' ? 'px-tab active' : 'px-tab'} onClick={() => { sfx.move(); setGame('dash'); }}>Cat Dash</button>
        <button role="tab" aria-selected={game === 'beat'} className={game === 'beat' ? 'px-tab active' : 'px-tab'} onClick={() => { sfx.move(); setGame('beat'); }}>Beat Cut</button>
      </div>
      {game === 'dash' ? <CatDash key="dash" /> : <BeatCut key="beat" />}
    </div>
  );
}
