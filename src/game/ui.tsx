import { useEffect, useRef, useState, type ReactNode } from 'react';
import { EMAIL } from '../content/site';
import { useEscape, useScrollLock } from '../lib/hooks';
import { spriteSize, spriteURL, type Sprite } from '../lib/pixel';
import { sfx } from '../lib/sfx';

/* A sprite as a crisp, scaled-up <img>. */
export function PixelSprite({ sprite, scale = 3, className, alt = '' }: { sprite: Sprite; scale?: number; className?: string; alt?: string }) {
  const { w, h } = spriteSize(sprite);
  return (
    <img
      className={['pixel-sprite', className].filter(Boolean).join(' ')}
      src={spriteURL(sprite)}
      width={w * scale}
      height={h * scale}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
    />
  );
}

/* RPG-style window that every room object opens into. */
export function GamePanel({ title, icon, onClose, children, wide = false }: {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => { sfx.back(); onClose(); };
  useEscape(close);
  useScrollLock(true);
  useEffect(() => { closeRef.current?.focus({ preventScroll: true }); }, []);

  return (
    <div className="panel-backdrop" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <section className={wide ? 'px-window panel wide' : 'px-window panel'} role="dialog" aria-modal="true" aria-label={title}>
        <header className="panel-head">
          {icon}
          <h2 className="px-window-title">{title}</h2>
          <button ref={closeRef} className="px-btn small panel-close" onClick={close} aria-label="Close">X</button>
        </header>
        <div className="panel-body">{children}</div>
        <footer className="panel-foot">Esc · close</footer>
      </section>
    </div>
  );
}

/* Typewriter-style dialogue line, like an NPC talking. */
export function Dialogue({ who, portrait, text, voice = 1 }: { who: string; portrait: Sprite | string; text: string; voice?: number }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.body.classList.contains('reduce-motion')) { el.textContent = text; return; }
    let i = 0;
    el.textContent = '';
    const id = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      // talking blips on every other letter, so it babbles rather than buzzes
      if (i % 2 === 0) sfx.blip(text[i - 1], voice);
      if (i >= text.length) clearInterval(id);
    }, 26);
    return () => clearInterval(id);
  }, [text, voice]);

  return (
    <div className="dialogue">
      <div className="dialogue-portrait">
        {typeof portrait === 'string'
          ? <img className="pixel-sprite portrait-img" src={portrait} alt="" draggable={false} />
          : <PixelSprite sprite={portrait} scale={3} />}
      </div>
      <div className="dialogue-box">
        <div className="dialogue-who">{who}</div>
        <p ref={ref} className="dialogue-text" aria-label={text} />
      </div>
    </div>
  );
}

/* ── Toasts: small pixel notifications, e.g. "Email copied" ── */
const TOAST_EVENT = 'px-toast';
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    let timer = 0;
    const on = (e: Event) => {
      setMsg({ text: (e as CustomEvent<string>).detail, id: Date.now() });
      clearTimeout(timer);
      timer = window.setTimeout(() => setMsg(null), 2600);
    };
    window.addEventListener(TOAST_EVENT, on);
    return () => { window.removeEventListener(TOAST_EVENT, on); clearTimeout(timer); };
  }, []);
  return msg ? <div key={msg.id} className="px-toast" role="status">{msg.text}</div> : null;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
  }
}

/* "Email me" buttons copy the address instead of opening a mail app. */
export function CopyEmailButton({ children, className = 'px-btn', note }: { children: ReactNode; className?: string; note?: string }) {
  return (
    <button
      className={`${className} copy-email`}
      data-tip="Click to copy my email"
      onClick={async () => {
        await copyText(EMAIL);
        sfx.coin();
        toast(`✓ Email copied: ${EMAIL}${note ? ` · ${note}` : ''}`);
      }}
    >
      {children}
    </button>
  );
}
