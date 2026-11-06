/*
  The rate card (#shop). Clicking the vending machine opens it right below the room and scrolls the
  page down to it; "Back to the room" (or Esc, or the browser's Back) scrolls back up and folds it
  away. The quest bag adds up starting prices and copies a quote request. Prices: content/rates.ts.
*/
import { useEffect, useRef, useState } from 'react';
import '../styles/ratecard.css';
import { cats } from '../content/cats';
import { CAREER_START } from '../content/game';
import { extras, hourlyRate, rateCard, rateSections, rateTerms, type RateSection, type Service } from '../content/rates';
import { EMAIL, LINKS } from '../content/site';
import { asset } from '../lib/media';
import { sfx } from '../lib/sfx';
import { MANIFEST } from './images';
import { yearsActive } from './panels';
import { cheer } from './scenes/cats';
import { copyText, CopyEmailButton, toast } from './ui';

type Cur = 'usd' | 'inr';
type Quote = { items: [string, number][]; rush: boolean; files: boolean };

const money = (n: number, c: Cur) => (c === 'usd' ? `$${Math.round(n).toLocaleString('en-US')}` : `₹${Math.round(n).toLocaleString('en-IN')}`);
const SERVICES = new Map(rateSections.flatMap((s) => s.items).map((s) => [s.name, s]));
const load = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; } };
const save = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ } };
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const SPRITES = MANIFEST.sprites as Record<string, { w: number; h: number }>;
const since = CAREER_START.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });

/* Scroll the page to y (smoothly unless reduced motion), then call done once it's there.
   'instant', not 'auto': base.css makes the whole page scroll smoothly. */
function scrollToY(y: number, done?: () => void) {
  const smooth = !reduced();
  window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });
  if (!done) return;
  if (!smooth || Math.abs(window.scrollY - y) < 2) { done(); return; }
  let finished = false;
  const timer = window.setTimeout(() => finish(), 1200); // browsers without scrollend
  function finish() {
    if (finished) return;
    finished = true;
    window.removeEventListener('scrollend', finish);
    clearTimeout(timer);
    done!();
  }
  window.addEventListener('scrollend', finish);
}

export function RateCard({ open, onClose, portrait }: { open: boolean; onClose: () => void; portrait: string }) {
  // stays on the page while it scrolls back up after closing, then folds away
  const [shown, setShown] = useState(open);
  if (open && !shown) setShown(true);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (open && shown && ref.current) {
      const el = ref.current;
      requestAnimationFrame(() => scrollToY(el.getBoundingClientRect().top + window.scrollY));
    }
    // reopened while still scrolling up: don't fold it away when that scroll ends
    let live = true;
    if (!open && shown) scrollToY(0, () => { if (live) setShown(false); });
    return () => { live = false; };
  }, [open, shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { sfx.back(); onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!shown) return null;
  return (
    <section className="rc" ref={ref} aria-label="Rate card">
      <div className="rc-wrap">
        <button className="rc-back rc-label" onClick={() => { sfx.back(); onClose(); }}>▲ Back to the room</button>
        <Shop portrait={portrait} open={open} />
      </div>
    </section>
  );
}

function Shop({ portrait, open }: { portrait: string; open: boolean }) {
  const [cur, setCur] = useState<Cur>(() => (load<string>('rc-cur', 'usd') === 'inr' ? 'inr' : 'usd'));
  const [quote, setQuote] = useState<Quote>(() => {
    const q = load<Quote>('rc-quote', { items: [], rush: false, files: false });
    return { ...q, items: q.items.filter(([name, n]) => SERVICES.has(name) && n > 0) };
  });
  useEffect(() => save('rc-cur', cur), [cur]);
  useEffect(() => save('rc-quote', quote), [quote]);

  const qty = (name: string) => quote.items.find(([n]) => n === name)?.[1] ?? 0;
  const setQty = (name: string, n: number) => setQuote((q) => {
    const items = q.items.filter(([k]) => k !== name);
    if (n > 0) { const at = q.items.findIndex(([k]) => k === name); items.splice(at < 0 ? items.length : at, 0, [name, n]); }
    return { ...q, items };
  });
  const count = quote.items.reduce((s, [, n]) => s + n, 0);
  const base = quote.items.reduce((s, [name, n]) => s + SERVICES.get(name)![cur] * n, 0);
  const total = base * (1 + (quote.rush ? extras.rush.pct : 0) / 100 + (quote.files ? extras.files.pct : 0) / 100);
  const items = `${count} ${count === 1 ? 'ITEM' : 'ITEMS'}`;

  const copyQuote = async () => {
    const lines = ['Hi Alankrit,', '', "I'd like a quote for:"];
    for (const [name, n] of quote.items) {
      const s = SERVICES.get(name)!;
      lines.push(`- ${n} × ${name} (from ${money(s[cur], cur)}${s.unit ? ` ${s.unit}` : ''})`);
    }
    const opts = [quote.rush && extras.rush.label, quote.files && extras.files.label].filter(Boolean);
    if (opts.length) lines.push('', `Extras: ${opts.join(', ')}`);
    lines.push('', `Estimate from your rate card: ${money(total, cur)}`, '', 'About my project:', '', 'Deadline:', '');
    await copyText(lines.join('\n'));
    sfx.coin();
    toast(`✓ Quote request copied · paste it into an email to ${EMAIL}`);
  };

  // the bar at the bottom of small screens, only while the price list is on screen
  const listRef = useRef<HTMLDivElement>(null);
  const [listInView, setListInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setListInView(e.isIntersecting));
    io.observe(listRef.current!);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <header className="rc-px rc-head">
        <img className="rc-portrait" src={portrait} alt="Pixel portrait of Alankrit" />
        <div className="rc-intro">
          <div className="rc-label rc-kicker">{rateCard.label}</div>
          <h2 className="rc-name">ALANKRIT <span>THAPA</span></h2>
          <p className="rc-tagline">{rateCard.tagline}</p>
        </div>
        <div className="rc-toggle">
          <span className="rc-label">Show prices in</span>
          <div className="rc-seg" role="group" aria-label="Currency">
            {(['usd', 'inr'] as Cur[]).map((c) => (
              <button key={c} aria-pressed={cur === c} onClick={() => { sfx.select(); setCur(c); }}>{c === 'usd' ? 'USD $' : 'INR ₹'}</button>
            ))}
          </div>
          {cur === 'inr' && <small className="rc-inr-note">{rateCard.inrNote}</small>}
        </div>
      </header>

      <div className="rc-stats">
        <div className="rc-stat rc-px"><b>{yearsActive()}+ yrs</b><span>Editing and design since {since}</span></div>
        {rateCard.stats.map(([b, s]) => <div key={b} className="rc-stat rc-px"><b>{b}</b><span>{s}</span></div>)}
      </div>

      <div className="rc-shop">
        <div className="rc-list" ref={listRef}>
          {rateSections.map((s) => (
            <Section key={s.title} section={s} cur={cur} qty={qty}
              add={(name) => { sfx.warm(); sfx.coin(); setQty(name, qty(name) + 1); }} />
          ))}
        </div>

        <aside className="rc-bag rc-px" id="rc-quote" aria-live="polite">
          <div className="rc-bag-head"><h3>Quest bag</h3><span className="rc-count">{items}</span></div>
          {count === 0 ? (
            <p className="rc-empty"><img src={asset('media/game/cats/topi-rub.png')} alt="" />Your bag is empty. Press + ADD on any service to build a starting estimate.</p>
          ) : (
            <div className="rc-lines">
              {quote.items.map(([name, n]) => {
                const s = SERVICES.get(name)!;
                return (
                  <div key={name} className="rc-line">
                    <div className="rc-line-name">{name}</div>
                    <div className="rc-line-price">{money(s[cur] * n, cur)}</div>
                    <div className="rc-qty">
                      <button aria-label={`One less ${name}`} onClick={() => setQty(name, n - 1)}>-</button>
                      <span>{n}</span>
                      <button aria-label={`One more ${name}`} onClick={() => setQty(name, n + 1)}>+</button>
                      {s.unit && <small>{s.unit}</small>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="rc-opts">
            {(['rush', 'files'] as const).map((k) => (
              <label key={k} className="rc-opt">
                <input type="checkbox" checked={quote[k]} onChange={(e) => setQuote((q) => ({ ...q, [k]: e.target.checked }))} />
                {extras[k].label} <em>+{extras[k].pct}%</em>
              </label>
            ))}
          </div>
          <div className="rc-total"><span>ESTIMATE FROM</span><strong>{money(total, cur)}</strong></div>
          <p className="rc-bag-note">Starting prices. You get a fixed quote after I see your brief.</p>
          <div className="rc-bag-actions">
            <button className="rc-btn rc-go" disabled={!count} onClick={copyQuote}>COPY QUOTE REQUEST</button>
            <button className="rc-btn rc-ghost" disabled={!count} onClick={() => { sfx.back(); setQuote({ items: [], rush: false, files: false }); }}>CLEAR</button>
          </div>
        </aside>
      </div>

      <div className="rc-terms rc-px">
        <h3>How it works</h3>
        <ul>
          {rateTerms.map((t) => <li key={t}>{t.replace('{hourly}', money(hourlyRate[cur], cur))}</li>)}
        </ul>
      </div>

      <footer className="rc-foot rc-px">
        <div>
          <span className="rc-label">Start a project</span>
          <div className="rc-mail"><code>{EMAIL}</code><CopyEmailButton className="rc-copy">COPY</CopyEmailButton></div>
        </div>
        <div className="rc-links">
          <a href={LINKS.behance} target="_blank" rel="noopener noreferrer">Behance</a>
          <a href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
          <a href={LINKS.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
        </div>
      </footer>
      <p className="rc-note">{rateCard.languages}</p>

      {open && count > 0 && listInView && (
        <button className="rc-bagbar" onClick={() => document.getElementById('rc-quote')?.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth' })}>
          <span>{items}</span><strong>{money(total, cur)}</strong><b>VIEW BAG</b>
        </button>
      )}
    </>
  );
}

function Section({ section: s, cur, qty, add }: { section: RateSection; cur: Cur; qty: (name: string) => number; add: (name: string) => void }) {
  return (
    <section className={`rc-px rc-sec rc-${s.color}${s.perch ? ' rc-perched' : ''}`}>
      {s.perch && <Perch {...s.perch} />}
      <div className="rc-sec-head"><h3>{s.title}</h3><p>{s.note}</p></div>
      <ul>
        {s.items.map((item) => <Item key={item.name} item={item} cur={cur} n={qty(item.name)} add={() => add(item.name)} />)}
      </ul>
    </section>
  );
}

function Item({ item, cur, n, add }: { item: Service; cur: Cur; n: number; add: () => void }) {
  return (
    <li className={n ? 'rc-in-bag' : undefined}>
      <div className="rc-item">
        <h4>{item.name}</h4>
        <p>{item.desc}</p>
        {item.eta && <span className="rc-eta">{item.eta.toUpperCase()}</span>}
      </div>
      <div className="rc-price">
        <small>{item.rate ? 'RATE' : 'FROM'}</small>
        <strong>{money(item[cur], cur)}</strong>
        {item.unit && <em>{item.unit}</em>}
        <button className="rc-add" aria-label={`Add ${item.name} to quest bag`} onClick={add}>{n ? `ADDED ×${n}` : '+ ADD'}</button>
      </div>
    </li>
  );
}

/* A cat napping on top of a section: click for hearts and a line */
function Perch({ cat, pose, line }: { cat: (typeof cats)[number]['id']; pose: string; line: string }) {
  const info = cats.find((c) => c.id === cat)!;
  const [pet, setPet] = useState(0);
  useEffect(() => {
    if (!pet) return;
    const id = window.setTimeout(() => setPet(0), 2700);
    return () => clearTimeout(id);
  }, [pet]);
  return (
    <button className="rc-perch" aria-label={`Pet ${info.name}`}
      onClick={() => { sfx.warm(); sfx.meow(cat); cheer(cat, 12); setPet(Date.now()); }}>
      <img src={asset(`media/game/cats/${cat}-${pose}.png`)} alt="" style={{ width: (SPRITES[`cats/${cat}-${pose}`]?.w ?? 40) * 2 }} />
      {pet > 0 && (
        <span key={pet} className="rc-pop" aria-hidden="true">
          <span className="rc-heart">♥</span><span className="rc-heart rc-heart2">♥</span>
          <span className="rc-bubble"><b>{info.name.toUpperCase()} · {info.title.toUpperCase()}</b>{line}</span>
        </span>
      )}
    </button>
  );
}
