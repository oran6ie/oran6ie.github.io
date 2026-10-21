import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { aiProjects, type AiProject, type Media } from '../content/aiProjects';
import { cats, memorial, type CatId } from '../content/cats';
import { achievements, CAREER_START, inventory, player, rarity, shop } from '../content/game';
import { projects, type WorkProject } from '../content/projects';
import { about, arsenal, education, EMAIL, experience, languages, LINKS } from '../content/site';
import { asset } from '../lib/media';
import { radio } from '../lib/radio';
import { sfx } from '../lib/sfx';
import { LoopClip } from '../components/shared/LoopClip';
import { VideoEmbed } from '../components/shared/VideoEmbed';
import { badges, catPortrait, items } from './art/sprites';
import { toolIconURL } from './art/toolIcons';
import youtube from '../content/youtube.json';
import { BULB_PRESETS } from './bulb';
import { go } from './route';
import { setSetting, useSettings } from './settings';
import { ACHIEVEMENTS, unlock, useAchievements } from './achievements';
import { CopyEmailButton, Dialogue, PixelSprite, TrailerVideo } from './ui';
import { getNotes, online, postNote, useOnlineStats, type Note } from '../lib/online';
import { mood } from './scenes/cats';
import { HOME, homeTime, moonPhaseName, getMoonPhase, timeOfDay, useWorld } from './world';

const BASE = import.meta.env.BASE_URL;

export function yearsActive(now = new Date()) {
  return Math.floor((now.getTime() - CAREER_START.getTime()) / (365.25 * 24 * 3600 * 1000));
}

/* ── Player card (about) ── */
export function PlayerPanel({ hair }: { hair: 'long' | 'short' }) {
  const lv = yearsActive();
  const stats: [string, string][] = [
    ['Class', player.className],
    ['Level', `LV ${lv} · ${lv}+ years`],
    ['Title', player.title],
    ['Home', player.home],
    ['Base', player.base],
    ['Languages', languages.map((l) => l.name).join(' · ')],
  ];
  return (
    <>
      <Dialogue who={player.name} portrait={asset(`media/game/portrait-${hair}.png`)} text={player.greeting} />
      <div className="player-grid">
        <dl className="stat-list">
          {stats.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          <div><dt>Status</dt><dd className="status-ok">● {player.status}</dd></div>
        </dl>
        <div>
          <h3 className="px-h3">Bio</h3>
          <p className="body-text">{about.text}</p>
          <div className="tag-row">{about.tags.map((t) => <span key={t} className="px-tag">{t}</span>)}</div>
          <div className="btn-row">
            <a className="px-btn" href={`${BASE}cv/`} onClick={() => sfx.select()}>Open CV</a>
            <button className="px-btn ghost" onClick={() => { sfx.select(); go('quick'); }}>Quick view</button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Quest log (work + AI projects) ── */
type Quest = { kind: 'work'; p: WorkProject } | { kind: 'ai'; p: AiProject };
const quests: Quest[] = [
  ...projects.map((p) => ({ kind: 'work', p }) as const),
  ...aiProjects.map((p) => ({ kind: 'ai', p }) as const),
];
const questTitle = (q: Quest) => (q.kind === 'work' ? q.p.title : `${q.p.title} ${q.p.titleItalic}`);
const mediaSrc = (m: Media | undefined) => (m === undefined ? null : typeof m === 'string' ? { src: m } : m);

function questPreview(q: Quest) {
  if (q.kind === 'work') return { src: q.p.preview, poster: q.p.poster };
  return mediaSrc(q.p.motionClips[0] ?? q.p.genImages[0] ?? q.p.refImages[0]);
}

type Tab = 'all' | 'main' | 'ai';

export function QuestPanel({ initialTab = 'all' }: { initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [open, setOpen] = useState<Quest | null>(null);
  const shown = quests.filter((q) => tab === 'all' || (tab === 'main' ? q.kind === 'work' : q.kind === 'ai'));

  if (open) return <QuestDetail q={open} onBack={() => { sfx.back(); setOpen(null); }} />;

  return (
    <>
      <div className="px-tabs" role="tablist">
        {([['all', 'All quests'], ['main', 'Main · Video & Motion'], ['ai', 'Side · AI Lab']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'px-tab active' : 'px-tab'} onClick={() => { sfx.move(); setTab(k); }}>
            {label}
          </button>
        ))}
      </div>
      <div className="quest-grid">
        {shown.map((q) => {
          const prev = questPreview(q);
          return (
            <button
              key={questTitle(q)}
              className="quest-card"
              style={q.kind === 'work' ? ({ '--accent': q.p.accent } as CSSProperties) : undefined}
              onClick={() => { sfx.open(); setOpen(q); unlock('curator'); }}
            >
              <div className="quest-media">
                {prev && <LoopClip src={prev.src} poster={prev.poster} alt={questTitle(q)} />}
                <span className={q.kind === 'ai' ? 'quest-chip ai' : 'quest-chip'}>{q.kind === 'ai' ? 'AI' : q.p.category}</span>
              </div>
              <div className="quest-info">
                <div className="quest-title">{questTitle(q)}</div>
                <div className="quest-type">{q.kind === 'work' ? q.p.type : 'Reference → Generate → Motion → Final'}</div>
                {q.kind === 'work' && q.p.reward && <div className="quest-reward">★ {q.p.reward}</div>}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function QuestDetail({ q, onBack }: { q: Quest; onBack: () => void }) {
  return (
    <div className="quest-detail">
      <button className="px-btn small ghost" onClick={onBack}>&lt; Back to quests</button>
      {q.kind === 'work' ? (
        <>
          <div className="detail-media">
            {q.p.videoEmbed
              ? <VideoEmbed value={q.p.videoEmbed} autoplay />
              : <LoopClip src={q.p.preview} poster={q.p.poster} alt={q.p.title} />}
          </div>
          <div className="detail-copy">
            <span className="quest-chip static">{q.p.category}</span>
            <h3 className="detail-title">{q.p.title}</h3>
            <p className="detail-type">{q.p.type}</p>
            {q.p.reward && <p className="quest-reward big">★ Reward: {q.p.reward}</p>}
            {q.p.url && <a className="px-btn" href={q.p.url} target="_blank" rel="noopener noreferrer">View on Behance</a>}
          </div>
        </>
      ) : (
        <Recipe p={q.p} />
      )}
    </div>
  );
}

/* AI project shown as a crafting recipe: ingredients → generate → motion → final */
function Recipe({ p }: { p: AiProject }) {
  const stages: { label: string; media: Media[]; note?: string; cls: string }[] = [
    { label: 'Ingredients · Reference', media: p.refImages, note: p.refNote, cls: 's1' },
    { label: 'Craft · AI Generate', media: p.genImages, note: p.genNote, cls: 's2' },
    { label: 'Enchant · Motion', media: p.motionClips, note: p.motionNote, cls: 's3' },
  ];
  return (
    <>
      <h3 className="detail-title">{p.title} <em>{p.titleItalic}</em></h3>
      <p className="body-text">{p.desc}</p>
      <div className="tag-row">
        {p.tags.map((t, i) => {
          const label = typeof t === 'string' ? t : t.label;
          return <span key={i} className={typeof t === 'string' ? 'px-tag' : `px-tag ${t.color}`}>{label}</span>;
        })}
      </div>
      <ol className="recipe">
        {stages.map((s) => (
          <li key={s.label} className={`recipe-step ${s.cls}`}>
            <div className="recipe-label">{s.label}</div>
            <div className="recipe-media">
              {s.media.map((m, i) => {
                const it = mediaSrc(m)!;
                return <div key={i} className="recipe-slot"><LoopClip src={it.src} poster={it.poster} alt={`${s.label} ${i + 1}`} /></div>;
              })}
            </div>
            {s.note && <p className="recipe-note">{s.note}</p>}
          </li>
        ))}
        <li className="recipe-step s4">
          <div className="recipe-label">Result · Final Cut</div>
          <div className="detail-media">
            {p.finalVideo ? <VideoEmbed value={p.finalVideo} /> : <div className="empty-slot">Final video coming soon</div>}
          </div>
          {p.finalNote && <p className="recipe-note">{p.finalNote}</p>}
        </li>
      </ol>
      <a className="px-btn ghost" href={`${BASE}ai/`}>Full breakdown on AI Works page</a>
    </>
  );
}

/* ── World map (experience + education) ── */
export function JourneyPanel() {
  const levels = [...experience].reverse();
  return (
    <ol className="journey">
      <li className="journey-node tutorial">
        <span className="journey-lv">0-0</span>
        <div>
          <div className="journey-meta">Tutorial · {education.from} — {education.to}</div>
          <div className="journey-role">{education.degree} {education.field}</div>
          <div className="journey-where">{education.school} · {education.location}</div>
        </div>
      </li>
      {levels.map((x, i) => (
        <li key={x.role + x.from} className={x.current ? 'journey-node current' : 'journey-node'}>
          <span className="journey-lv">1-{i + 1}</span>
          <div>
            <div className="journey-meta">{x.from} — {x.to}{x.current && <span className="blink"> · You are here</span>}</div>
            <div className="journey-role">{x.role}</div>
            <div className="journey-where">{x.company.split(' · ')[0]} · {x.location}</div>
            <p className="body-text small">{x.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ── Trophies: my highlights, plus the badges visitors earn exploring the room ── */
export function AchievementsPanel({ initialTab = 'mine' }: { initialTab?: 'mine' | 'yours' }) {
  const yrs = yearsActive();
  const [tab, setTab] = useState(initialTab);
  const got = useAchievements();
  return (
    <div className="trophies">
      <div className="px-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'mine'} className={tab === 'mine' ? 'px-tab active' : 'px-tab'} onClick={() => { sfx.move(); setTab('mine'); }}>My highlights</button>
        <button role="tab" aria-selected={tab === 'yours'} className={tab === 'yours' ? 'px-tab active' : 'px-tab'} onClick={() => { sfx.move(); setTab('yours'); }}>
          Your badges {got.size}/{ACHIEVEMENTS.length}
        </button>
      </div>
      {tab === 'mine' ? (
        <div className="badge-grid">
          {achievements.map((a) => (
            <button
              key={a.name}
              className={a.locked ? 'badge locked' : 'badge'}
              onClick={() => { if (a.locked) { sfx.locked(); go('contact'); } else sfx.coin(); }}
            >
              <PixelSprite sprite={badges[a.badge]} scale={4} />
              <span className="badge-name">{a.name === 'Veteran' ? `Veteran · ${yrs}+ yrs` : a.name}</span>
              <span className="badge-desc">{a.desc}</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="body-text small">Badges you earn by poking around the room. They are saved in this browser.</p>
          <div className="badge-grid visitor">
            {ACHIEVEMENTS.map((a) => {
              const on = got.has(a.id);
              const hidden = !on && 'secret' in a;
              return (
                <div key={a.id} className={on ? 'badge' : 'badge locked'}>
                  <PixelSprite sprite={on ? badges.spark : badges.lock} scale={3} />
                  <span className="badge-name">{hidden ? '???' : a.name}</span>
                  <span className="badge-desc">{hidden ? 'A secret. Something in the room reacts to persistence.' : a.desc}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Inventory (tools) ── */
export function InventoryPanel() {
  const [sel, setSel] = useState(0);
  const tool = arsenal[sel];
  const inv = inventory[tool.name];
  const r = rarity(tool.pct);
  return (
    <div className="inventory">
      <div className="inv-grid" role="listbox" aria-label="Tools">
        {arsenal.map((a, i) => {
          const it = inventory[a.name];
          return (
            <button
              key={a.name}
              role="option"
              aria-selected={i === sel}
              className={`inv-slot ${rarity(a.pct).cls}${i === sel ? ' selected' : ''}`}
              onMouseEnter={() => { if (i !== sel) { sfx.move(); setSel(i); } }}
              onFocus={() => setSel(i)}
              onClick={() => { sfx.select(); setSel(i); }}
            >
              <img className="pixel-sprite tool-icon" src={toolIconURL(it.icon)} width={60} height={60} alt={a.name} draggable={false} />
            </button>
          );
        })}
        {Array.from({ length: 9 - arsenal.length }, (_, i) => <div key={i} className="inv-slot empty" />)}
      </div>
      <div className={`inv-detail ${r.cls}`}>
        <img className="pixel-sprite tool-icon" src={toolIconURL(inv.icon)} width={100} height={100} alt="" draggable={false} />
        <div className="inv-rarity">{r.label}</div>
        <h3 className="inv-name">{tool.name}</h3>
        <div className="inv-tool">{inv.role}</div>
        <div className="inv-bar" aria-label={`Mastery ${tool.pct} of 100`}>
          <span style={{ width: `${tool.pct}%` }} />
        </div>
        <div className="inv-power">Mastery {tool.pct}/100</div>
        <p className="body-text small">{inv.desc}</p>
      </div>
    </div>
  );
}

/* ── Shop (portfolio sites for hire) ── */
export function ShopPanel() {
  const wareIcons = [items.orb, items.brush, items.staff];
  return (
    <>
      <Dialogue who={shop.keeper} portrait={catPortrait} text={shop.greeting} voice={1.5} />
      <div className="wares">
        {shop.wares.map((w, i) => (
          <div key={w.name} className="ware">
            <PixelSprite sprite={wareIcons[i % wareIcons.length]} scale={3} />
            <div>
              <div className="ware-name">{w.name} <span className="px-tag">{w.tag}</span></div>
              <p className="body-text small">{w.desc}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="shop-price">{shop.price}</p>
      <CopyEmailButton note="mention your portfolio quest!">{shop.cta}</CopyEmailButton>
    </>
  );
}

/* ── Mailbox (contact) ── */
export function ContactPanel() {
  return (
    <div className="mailbox">
      <p className="body-text">Got a quest — a full-time role, a collab or a site like this one? Drop a letter in the box.</p>
      <div className="mail-card">
        <span className="mail-label">Email</span>
        <span className="mail-address">{EMAIL}</span>
        <div className="btn-row">
          <CopyEmailButton>Copy my email</CopyEmailButton>
          <a className="px-btn ghost" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">Message on LinkedIn</a>
        </div>
      </div>
      <div className="link-row">
        <a className="px-link" href={LINKS.behance} target="_blank" rel="noopener noreferrer">Behance</a>
        <a className="px-link" href={LINKS.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <a className="px-link" href={LINKS.youtube} target="_blank" rel="noopener noreferrer">YouTube</a>
      </div>
      <p className="status-ok">● {player.status}</p>
    </div>
  );
}


/* ── Party (the cats) ── */
const catImg = (id: CatId, pose: string) => asset(`media/game/cats/${id}-${pose}.png`);
const SIT_POSE: Record<CatId, string> = { miko: 'sit', lebu: 'sit', bibi: 'sit', topi: 'meow' };

export function PartyPanel({ focus }: { focus: CatId | null }) {
  return (
    <>
      <p className="body-text">My four party members. They live in this room, wander around, and climb onto my desk whenever I'm busy. Pet them (click) and feed them (the bowl) to keep their hearts full.</p>
      {online && <PetsCounter />}
      <div className="party">
        {cats.map((c) => (
          <article key={c.id} className={c.id === focus ? 'cat-card focus' : 'cat-card'}>
            <div className="cat-card-art"><img className="pixel-sprite" src={catImg(c.id, SIT_POSE[c.id])} alt={c.name} /></div>
            <div>
              <h3 className="cat-name">{c.name} <span className="cat-sex">{c.gender === 'Female' ? '♀' : '♂'}</span></h3>
              <div className="cat-meta">{c.title} · {c.gender} · {c.age}</div>
              <div className="cat-mood" title={`Mood ${Math.round(mood[c.id])}%`}>{[0, 1, 2, 3, 4].map((i) => <span key={i} className={mood[c.id] > i * 20 + 10 ? 'heart on' : 'heart'}>♥</span>)}</div>
              <div className="tag-row">{c.traits.map((t) => <span key={t} className="px-tag">{t}</span>)}</div>
              <p className="body-text small">{c.bio}</p>
              {c.echo && <p className="cat-echo">{c.echo}</p>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function PetsCounter() {
  const { pets } = useOnlineStats();
  return pets > 0 ? <p className="pets-counter">♥ Visitors have petted these cats <b>{pets.toLocaleString()}</b> times.</p> : null;
}

/* ── Guestbook: notes pinned on the corkboard (approved before they show) ── */
const NOTE_COLORS = ['#ffe066', '#ff9fd8', '#8ff0ff', '#a8f0b8', '#ffc08a'];
export function GuestbookPanel() {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [form, setForm] = useState({ name: '', msg: '', color: 0, website: '' });
  const [state, setState] = useState<'' | 'sending' | 'sent'>('');
  const [error, setError] = useState('');
  useEffect(() => { getNotes().then(setNotes).catch(() => setNotes([])); }, []);
  const send = async (e: FormEvent) => {
    e.preventDefault();
    setState('sending'); setError('');
    try { await postNote(form); setState('sent'); sfx.coin(); unlock('guest'); }
    catch (err) { setState(''); setError((err as Error).message); sfx.locked(); }
  };
  return (
    <div className="guestbook">
      {state === 'sent' ? (
        <p className="guestbook-thanks">📌 Thanks, {form.name}! Your note is pinned and will show up once I've read it.</p>
      ) : (
        <form className="guestbook-form" onSubmit={send}>
          <input className="px-input" placeholder="Your name" maxLength={24} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Your name" />
          <textarea className="px-input" placeholder="Say hi, leave a tip for the cats..." maxLength={140} required rows={3} value={form.msg} onChange={(e) => setForm({ ...form, msg: e.target.value })} aria-label="Message" />
          <input className="hp" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} aria-hidden="true" />
          <div className="guestbook-row">
            <div className="note-colors" role="radiogroup" aria-label="Note colour">
              {NOTE_COLORS.map((c, i) => (
                <button key={c} type="button" role="radio" aria-checked={form.color === i} className={form.color === i ? 'note-color on' : 'note-color'} style={{ background: c }} onClick={() => setForm({ ...form, color: i })} aria-label={`Colour ${i + 1}`} />
              ))}
            </div>
            <span className="guestbook-count">{form.msg.length}/140</span>
            <button className="px-btn" disabled={state === 'sending'}>{state === 'sending' ? 'Pinning...' : 'Pin it'}</button>
          </div>
          {error && <p className="guestbook-error">{error}</p>}
        </form>
      )}
      <div className="notes">
        {notes === null && <p className="body-text small">Loading notes...</p>}
        {notes?.length === 0 && <p className="body-text small">No notes yet. Be the first!</p>}
        {notes?.map((n, i) => (
          <figure key={n.id} className="note" style={{ background: NOTE_COLORS[n.color] ?? NOTE_COLORS[0], rotate: `${((i * 37) % 7) - 3}deg` } as CSSProperties}>
            <blockquote>{n.msg}</blockquote>
            <figcaption>— {n.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

/* ── In loving memory (the frames on the wall) ── */
export function MemorialPanel() {
  return (
    <div className="memorial">
      <p className="memorial-intro">The three frames on the wall. Cats we loved and still miss.</p>
      {memorial.map((m) => (
        <article key={m.frame} className="memorial-entry">
          <img className="memorial-photo" src={asset(m.image)} alt={`Pixel portrait of ${m.title}`} />
          <div>
            <h3 className="memorial-name">{m.title}</h3>
            <p className="body-text">{m.text}</p>
            {m.cats.length > 0 && (
              <ul className="memorial-list">
                {m.cats.map((c) => <li key={c.name}><b>{c.name}</b> {c.note}</li>)}
              </ul>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/* ── The painting above the bed ── */
export function PaintingPanel() {
  return (
    <div className="painting">
      <img className="painting-img" src={asset('media/game/painting.png')} alt="Pixel version of an abstract ink painting with red, blue and yellow lines" />
      <p className="body-text">A painting I made: dense black ink linework with red, blue and yellow, full of faces, eyes and little worlds. It hangs above my bed in Kolkata, so it hangs above my bed here too.</p>
    </div>
  );
}

/* ── The window: live Algarah sky ── */
export function WindowPanel() {
  const w = useWorld();
  const { curtains } = useSettings();
  const fmt = (d: Date | null) => (d ? homeTime(d) : '—');
  const weather = { clear: 'Clear sky', cloudy: 'Cloudy', fog: 'Foggy', drizzle: 'Drizzle', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm' }[w.weather];
  return (
    <div className="window-panel">
      <p className="body-text">This window looks out over {HOME.name}, my hometown in Kalimpong. The sky, the sun, the moon and the weather in it are real and live.</p>
      <dl className="stat-list window-stats">
        <div><dt>Local time</dt><dd>{homeTime()} · {timeOfDay(w.sunAlt)}</dd></div>
        <div><dt>Weather</dt><dd>{weather}{w.tempC !== null ? ` · ${Math.round(w.tempC)}°C` : ''}{w.live ? '' : ' (offline)'}</dd></div>
        <div><dt>Sunrise · Sunset</dt><dd>{fmt(w.sunrise)} · {fmt(w.sunset)}</dd></div>
        <div><dt>Moon</dt><dd>{moonPhaseName(getMoonPhase())} · {Math.round(w.moonFraction * 100)}% lit</dd></div>
      </dl>
      <div className="btn-row">
        <button className="px-btn" onClick={() => { sfx.select(); setSetting('curtains', !curtains); }}>
          {curtains ? 'Open the curtains' : 'Close the curtains'}
        </button>
      </div>
    </div>
  );
}

/* ── The piano: playable with mouse, touch or the computer keyboard ── */
const WHITE = [['C4', 'a'], ['D4', 's'], ['E4', 'd'], ['F4', 'f'], ['G4', 'g'], ['A4', 'h'], ['B4', 'j'], ['C5', 'k'], ['D5', 'l'], ['E5', ';']] as const;
const BLACK = [['C#4', 'w', 0], ['D#4', 'e', 1], ['F#4', 't', 3], ['G#4', 'y', 4], ['A#4', 'u', 5], ['C#5', 'o', 7], ['D#5', 'p', 8]] as const;
const SEMI: Record<string, number> = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
const freqOf = (note: string) => {
  const name = note.slice(0, -1), oct = Number(note.slice(-1));
  return 440 * 2 ** ((SEMI[name] + (oct - 4) * 12 - 9) / 12);
};
// a little original lullaby
const TUNE: [string, number][] = [['E4', 1], ['G4', 1], ['A4', 2], ['G4', 1], ['E4', 1], ['D4', 2], ['E4', 1], ['G4', 1], ['C5', 2], ['B4', 1], ['A4', 1], ['G4', 3],
  ['A4', 1], ['C5', 1], ['D5', 2], ['C5', 1], ['A4', 1], ['G4', 2], ['E4', 1], ['D4', 1], ['C4', 4]];

let notesPlayed = 0;
export function PianoPanel() {
  // the radio steps back while you play
  useEffect(() => { radio.duck(true); return () => radio.duck(false); }, []);
  const [down, setDown] = useState<Set<string>>(new Set());
  const press = (note: string) => {
    sfx.warm();
    sfx.piano(freqOf(note));
    if (++notesPlayed === 12) unlock('pianist');
    setDown((d) => new Set(d).add(note));
    setTimeout(() => setDown((d) => { const n = new Set(d); n.delete(note); return n; }), 180);
  };
  useEffect(() => {
    const map = new Map<string, string>([...WHITE.map(([n, k]) => [k, n] as const), ...BLACK.map(([n, k]) => [k, n] as const)]);
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey) return;
      const note = map.get(e.key.toLowerCase());
      if (note) { e.preventDefault(); press(note); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  const [playing, setPlaying] = useState(false);
  const playTune = () => {
    if (playing) return;
    setPlaying(true);
    let at = 0;
    for (const [n, beats] of TUNE) { setTimeout(() => press(n), at); at += beats * 260; }
    setTimeout(() => setPlaying(false), at);
  };
  return (
    <div className="piano-panel">
      <div className="piano" role="group" aria-label="Piano keys">
        {WHITE.map(([n, k]) => (
          <button key={n} className={down.has(n) ? 'pkey white down' : 'pkey white'} onPointerDown={() => press(n)} aria-label={n}>
            <span>{k.toUpperCase()}</span>
          </button>
        ))}
        {BLACK.map(([n, k, after]) => (
          <button key={n} className={down.has(n) ? 'pkey black down' : 'pkey black'} style={{ left: `calc(${(after + 1) * 10}% - 3.2%)` }}
            onPointerDown={() => press(n)} aria-label={n}>
            <span>{k.toUpperCase()}</span>
          </button>
        ))}
      </div>
      <div className="btn-row">
        <button className="px-btn" onClick={playTune} disabled={playing}>{playing ? 'Playing...' : 'Play a tune'}</button>
      </div>
      <p className="body-text small">Use your mouse, or your keyboard: A S D F G H J K L ; for white keys, W E T Y U O P for black keys.</p>
    </div>
  );
}

/* ── YouTube channel ── */
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
const cleanTitle = (t: string) => t.replace(/\s*#\S+/g, '').trim();

export function ChannelPanel() {
  useEffect(() => unlock('subscriber'), []);
  const [playing, setPlaying] = useState<string | null>(null);
  const top = [...youtube.videos].sort((a, b) => b.views - a.views).slice(0, 6);
  const totalTop = top.reduce((s, v) => s + v.views, 0);
  return (
    <div className="channel">
      <header className="channel-head">
        <img className="pixel-sprite" src={toolIconURL('youtube')} width={64} height={64} alt="" />
        <div>
          <h3 className="channel-name">oran6ie</h3>
          <div className="channel-stats">
            <span><b>{youtube.subscribers}</b> subscribers</span>
            <span><b>{youtube.videoCount}</b> videos</span>
            <span><b>{compact(totalTop)}+</b> views on top uploads</span>
          </div>
          <div className="channel-badge">★ Monetized · YouTube Partner Program</div>
        </div>
        <a className="px-btn channel-sub" href={`${youtube.url}?sub_confirmation=1`} target="_blank" rel="noopener noreferrer">Subscribe</a>
      </header>
      <p className="body-text small">Lyric videos, music edits and AMVs. My Radio by Bershy lyric videos took off and grew the channel past 10K subscribers.</p>
      <div className="channel-trailer">
        <h4 className="px-h3">▶ The room's trailer</h4>
        <TrailerVideo />
      </div>
      {playing && (
        <div className="detail-media channel-player">
          <VideoEmbed value={`https://youtu.be/${playing}`} autoplay />
        </div>
      )}
      <div className="quest-grid channel-grid">
        {top.map((v) => (
          <button key={v.id} className={playing === v.id ? 'quest-card on' : 'quest-card'} onClick={() => { sfx.open(); setPlaying(v.id); }}>
            <div className="quest-media">
              <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy" />
              <span className="quest-chip yt">▶ {compact(v.views)} views</span>
            </div>
            <div className="quest-info"><div className="quest-type">{cleanTitle(v.title)}</div></div>
          </button>
        ))}
      </div>
      <a className="px-btn ghost" href={youtube.url} target="_blank" rel="noopener noreferrer">Visit the channel</a>
      <p className="channel-updated">Stats updated {youtube.updated}</p>
    </div>
  );
}

/* ── Smart bulb ── */
export function BulbPanel() {
  const { bulb } = useSettings();
  return (
    <div className="bulb-panel">
      <p className="body-text">The smart bulb in my room changes colour. Pick a mood:</p>
      <div className="bulb-swatches" role="radiogroup" aria-label="Bulb colour">
        {BULB_PRESETS.map((p) => (
          <button key={p.id} role="radio" aria-checked={bulb === p.id} className={bulb === p.id ? 'bulb-swatch on' : 'bulb-swatch'}
            onClick={() => { sfx.select(); setSetting('bulb', p.id); }}>
            <span className={p.id === 'party' ? 'bulb-dot party' : 'bulb-dot'} style={p.id === 'party' ? undefined : { background: p.color }} />
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
