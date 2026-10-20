import { useEffect, useMemo, useRef, useState } from 'react';
import { player, title } from '../content/game';
import { sfx } from '../lib/sfx';
import { PixelCanvas } from './PixelCanvas';
import { createTitleScene, H, W } from './scenes/titleScene';
import { setSetting, useSettings } from './settings';

type Props = { onStart: () => void; onQuick: () => void };
type Sub = null | 'options' | 'credits';

export function StartScreen({ onStart, onQuick }: Props) {
  const settings = useSettings();
  const [sel, setSel] = useState(0);
  const [sub, setSub] = useState<Sub>(null);
  const [optSel, setOptSel] = useState(0);
  const mouse = useRef({ x: 0, y: 0 });
  const draw = useMemo(createTitleScene, []);

  const options = [
    { label: 'Sound', value: settings.sound ? 'ON' : 'OFF', toggle: () => setSetting('sound', !settings.sound) },
    { label: 'Lofi radio', value: settings.radio ? 'ON' : 'OFF', toggle: () => setSetting('radio', !settings.radio) },
    { label: 'CRT effect', value: settings.crt ? 'ON' : 'OFF', toggle: () => setSetting('crt', !settings.crt) },
    { label: 'Animation', value: settings.motion ? 'FULL' : 'REDUCED', toggle: () => setSetting('motion', !settings.motion) },
    { label: 'Back', value: '', toggle: () => setSub(null) },
  ];

  const choose = (i: number) => {
    sfx.warm();
    const item = title.menu[i];
    if (item === 'Start Game') { sfx.start(); onStart(); }
    else if (item === 'Quick View') { sfx.select(); onQuick(); }
    else if (item === 'Options') { sfx.select(); setSub('options'); setOptSel(0); }
    else { sfx.select(); setSub('credits'); }
  };

  // Arrow keys / WASD + Enter, like a real title screen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      sfx.warm();
      const up = e.key === 'ArrowUp' || e.key === 'w';
      const down = e.key === 'ArrowDown' || e.key === 's';
      const ok = e.key === 'Enter' || e.key === ' ';
      if (up || down || ok) e.preventDefault();
      if (sub === 'credits') {
        if (ok || e.key === 'Escape') { sfx.back(); setSub(null); }
        return;
      }
      if (sub === 'options') {
        const n = options.length;
        if (up) { sfx.move(); setOptSel((v) => (v + n - 1) % n); }
        if (down) { sfx.move(); setOptSel((v) => (v + 1) % n); }
        if (ok || e.key === 'ArrowLeft' || e.key === 'ArrowRight') { sfx.select(); options[optSel].toggle(); }
        if (e.key === 'Escape') { sfx.back(); setSub(null); }
        return;
      }
      const n = title.menu.length;
      if (up) { sfx.move(); setSel((v) => (v + n - 1) % n); }
      if (down) { sfx.move(); setSel((v) => (v + 1) % n); }
      if (ok) choose(sel);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="title-screen"
      onPointerMove={(e) => {
        mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
      }}
      onPointerDown={() => sfx.warm()}
    >
      <PixelCanvas
        width={W}
        height={H}
        className="title-bg"
        frame={(ctx, t, dt) => draw(ctx, t, dt, -mouse.current.x * 2, -mouse.current.y, settings.motion)}
      />

      <div className="title-ui">
        <div className="title-logo">
          <div className="title-kicker">★ Player 1 ★</div>
          <h1 className="title-name">{player.name}</h1>
          <div className="title-surname">{player.surname}</div>
          <div className="title-tagline">{title.tagline}</div>
        </div>

        {sub === null && (
          <ul className="title-menu" role="menu">
            {title.menu.map((m, i) => (
              <li key={m}>
                <button
                  role="menuitem"
                  className={i === sel ? 'title-item selected' : 'title-item'}
                  onMouseEnter={() => { if (i !== sel) { sfx.move(); setSel(i); } }}
                  onClick={() => choose(i)}
                >
                  <span className="title-arrow" aria-hidden="true" />
                  {m}
                </button>
              </li>
            ))}
          </ul>
        )}

        {sub === 'options' && (
          <div className="px-window title-sub">
            <div className="px-window-title">Options</div>
            <ul className="title-menu" role="menu">
              {options.map((o, i) => (
                <li key={o.label}>
                  <button
                    role="menuitem"
                    className={i === optSel ? 'title-item selected' : 'title-item'}
                    onMouseEnter={() => setOptSel(i)}
                    onClick={() => { sfx.select(); o.toggle(); }}
                  >
                    <span className="title-arrow" aria-hidden="true" />
                    {o.label}
                    {o.value && <span className="title-value">{o.value}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sub === 'credits' && (
          <div className="px-window title-sub">
            <div className="px-window-title">Credits</div>
            <dl className="credits">
              {title.credits.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
            <button className="px-btn" onClick={() => { sfx.back(); setSub(null); }}>Back</button>
          </div>
        )}

        <div className="title-foot">
          <span className="blink">Press Enter</span>
          <span>Arrow keys select · Enter confirm</span>
          <span>© {new Date().getFullYear()} Alankrit Thapa</span>
        </div>
      </div>
    </div>
  );
}
