import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { cats, type CatId } from '../content/cats';
import { CAREER_START, locations, player, type LocationKey } from '../content/game';
import { projects } from '../content/projects';
import type { Sprite } from '../lib/pixel';
import { asset } from '../lib/media';
import { useRadioStatus } from '../lib/radio';
import { sfx } from '../lib/sfx';
import { badges, catPortrait, items, star, trophy } from './art/sprites';
import { toolIconURL } from './art/toolIcons';
import { MANIFEST, preload } from './images';
import {
  AchievementsPanel, BulbPanel, ChannelPanel, ContactPanel, InventoryPanel, JourneyPanel, MemorialPanel, PaintingPanel, PartyPanel,
  PianoPanel, PlayerPanel, QuestPanel, ShopPanel, WindowPanel, yearsActive,
} from './panels';
import { PixelCanvas } from './PixelCanvas';
import { go } from './route';
import { createRoomScene, H, HOTSPOTS, W, type Look, type Toy } from './scenes/roomScene';
import { setSetting, useSettings } from './settings';
import { GamePanel, PixelSprite } from './ui';
import { useWorld } from './world';

/* Left-to-right order for arrow keys; the first ten are on the hotbar (keys 1–9, 0) */
const ORDER: LocationKey[] = ['contact', 'channel', 'painting', 'window', 'bulb', 'ai', 'journey', 'work', 'player', 'achievements', 'inventory', 'memorial', 'piano', 'shop', 'party'];
const HOTBAR: LocationKey[] = ['work', 'channel', 'ai', 'player', 'journey', 'achievements', 'inventory', 'party', 'memorial', 'shop', 'contact'];
const TOYS: Toy[] = ['pikachu', 'curtainL', 'curtainR'];
const toyLabel = (t: Toy, curtainsClosed: boolean): [string, string] =>
  t === 'pikachu' ? ['Pikachu', 'Pika pika!'] : ['Curtains', curtainsClosed ? 'Click to open' : 'Click to close'];

const portraitSrc = (look: Look) => asset(`media/game/portrait-${look.hair}.png`);

const ICONS: Record<Exclude<LocationKey, 'player' | 'inventory' | 'channel'>, { sprite: Sprite; scale: number }> = {
  work: { sprite: items.razor, scale: 3 },
  ai: { sprite: badges.spark, scale: 3 },
  journey: { sprite: badges.up, scale: 3 },
  achievements: { sprite: trophy, scale: 3 },
  shop: { sprite: catPortrait, scale: 1.5 },
  contact: { sprite: badges.chat, scale: 3 },
  party: { sprite: badges.eye, scale: 3 },
  memorial: { sprite: star, scale: 3 },
  painting: { sprite: items.brush, scale: 3 },
  window: { sprite: badges.clock, scale: 3 },
  piano: { sprite: badges.spark, scale: 3 },
  bulb: { sprite: badges.bulb, scale: 3 },
};

function Icon({ k, look, size = 36 }: { k: LocationKey; look: Look; size?: number }): ReactNode {
  if (k === 'player') return <img className="pixel-sprite icon-portrait" src={portraitSrc(look)} alt="" style={{ height: size + 6 }} draggable={false} />;
  if (k === 'channel') return <img className="pixel-sprite" src={toolIconURL('youtube')} width={size} height={size} alt="" draggable={false} />;
  if (k === 'inventory') return <img className="pixel-sprite" src={toolIconURL('pr')} width={size} height={size} alt="" draggable={false} />;
  const ic = ICONS[k];
  return <PixelSprite sprite={ic.sprite} scale={ic.scale} />;
}

const WIDE: LocationKey[] = ['work', 'ai', 'party', 'memorial', 'channel'];

/* Which cat to highlight when the Party panel opens from clicking a cat */
let partyFocus: CatId | null = null;

function panelFor(key: LocationKey, look: Look) {
  switch (key) {
    case 'player': return <PlayerPanel hair={look.hair} />;
    case 'work': return <QuestPanel />;
    case 'ai': return <QuestPanel initialTab="ai" />;
    case 'journey': return <JourneyPanel />;
    case 'achievements': return <AchievementsPanel />;
    case 'inventory': return <InventoryPanel />;
    case 'shop': return <ShopPanel />;
    case 'contact': return <ContactPanel />;
    case 'party': return <PartyPanel focus={partyFocus} />;
    case 'memorial': return <MemorialPanel />;
    case 'painting': return <PaintingPanel />;
    case 'window': return <WindowPanel />;
    case 'piano': return <PianoPanel />;
    case 'channel': return <ChannelPanel />;
    case 'bulb': return <BulbPanel />;
  }
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;

const OUTFITS = ['jersey', 'tee', 'tank', 'knit', 'polo'];
function randomLook(): Look {
  return { outfit: OUTFITS[Math.floor(Math.random() * OUTFITS.length)], hair: Math.random() < 0.5 ? 'long' : 'short' };
}

/* A muted work clip that swaps every few seconds; it plays inside the editor on the monitor. */
function useCyclingVideo(srcs: string[], seconds: number, active: boolean) {
  const [video] = useState(() => {
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    return v;
  });
  useEffect(() => {
    if (!active) return;
    let i = 0;
    const next = () => { video.src = asset(srcs[i++ % srcs.length]); void video.play().catch(() => {}); };
    next();
    const id = setInterval(next, seconds * 1000);
    return () => { clearInterval(id); video.pause(); video.removeAttribute('src'); video.load(); };
  }, [video, srcs, seconds, active]);
  return video;
}
const WORK_CLIPS = projects.map((p) => p.preview);

function Hud({ onOpen, look }: { onOpen: (k: LocationKey) => void; look: Look }) {
  const settings = useSettings();
  const radio = useRadioStatus();
  const lv = yearsActive();
  // XP bar = progress through the current year of experience
  const xp = Math.round((((Date.now() - CAREER_START.getTime()) / (365.25 * 864e5)) % 1) * 100);
  return (
    <header className="hud">
      <button className="hud-player" onClick={() => onOpen('player')}>
        <img className="pixel-sprite hud-portrait" src={portraitSrc(look)} alt="" draggable={false} />
        <span className="hud-who">
          <span className="hud-name">{player.name} <span className="hud-lv">LV {lv}</span></span>
          <span className="hud-class">{player.className}</span>
          <span className="hud-xp" aria-hidden="true"><span style={{ width: `${xp}%` }} /></span>
        </span>
      </button>
      <nav className="hud-actions">
        <button className="px-btn small" onClick={() => { sfx.select(); go('quick'); }}>Quick view</button>
        <a className="px-btn small" href={`${import.meta.env.BASE_URL}cv/`}>CV</a>
        <button className="px-btn small" aria-pressed={settings.radio} title={radio.title ? `Now playing: ${radio.title}` : '24/7 lofi radio'}
          onClick={() => { setSetting('radio', !settings.radio); sfx.warm(); sfx.select(); }}>
          {settings.radio ? 'Radio on' : 'Radio off'}
        </button>
        <button className="px-btn small" aria-pressed={settings.sound} onClick={() => { setSetting('sound', !settings.sound); sfx.warm(); sfx.select(); }}>
          {settings.sound ? 'Sound on' : 'Sound off'}
        </button>
        {settings.radio && (
          <label className="hud-volume" title="Music volume">
            <span aria-hidden="true">♪</span>
            <input type="range" min="0" max="1" step="0.05" value={settings.radioVolume} aria-label="Music volume"
              onChange={(e) => setSetting('radioVolume', Number(e.target.value))} />
          </label>
        )}
        {settings.radio && radio.playing && (
          <div className="hud-radio" aria-live="polite">
            <span className="hud-radio-eq" aria-hidden="true"><i /><i /><i /></span>
            <span className="hud-radio-text">{radio.title || 'Lofi radio'}</span>
          </div>
        )}
        <button className="px-btn small ghost" onClick={() => { sfx.back(); go(''); }}>Menu</button>
      </nav>
    </header>
  );
}

export function Hub({ panel }: { panel: LocationKey | null }) {
  const settings = useSettings();
  const scene = useMemo(createRoomScene, []);
  // ?debug exposes the live cats for testing
  useEffect(() => { if (new URLSearchParams(location.search).has('debug')) (window as unknown as { __cats: unknown }).__cats = scene.cats; }, [scene]);
  const [look] = useState(randomLook);
  // the work clip on the monitor only loads once someone first catches me
  const [wantClip, setWantClip] = useState(false);
  const clip = useCyclingVideo(WORK_CLIPS, 6, wantClip);
  const [focus, setFocus] = useState<LocationKey | null>(null);
  const [kbd, setKbd] = useState(false); // outline objects only when navigating by keyboard
  const [caught, setCaught] = useState(false);
  const caughtTimer = useRef(0);
  const touchTurnBack = useRef(0);
  const toy = useRef<{ name: Toy; at: number } | null>(null);
  const clock = useRef(0);
  const [catHover, setCatHover] = useState<{ id: CatId; x: number; y: number } | null>(null);
  const [talking, setTalking] = useState<CatId | null>(null); // hide the hover card while its speech bubble shows
  const talkTimer = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const roomRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);

  useEffect(() => {
    // the room and the player first, then everything else
    preload(['room', `player/${look.outfit}-${look.hair}-back`, `player/${look.outfit}-${look.hair}-front`,
      'screen-game', 'screen-editor', 'screen-music', 'memorial-shadow', 'memorial-sanbi', 'memorial-kittens', 'room-curtains',
      ...Object.keys(MANIFEST.sprites).filter((k) => k.startsWith('cats/'))]);
  }, [look]);

  const open = (k: LocationKey) => { sfx.warm(); sfx.open(); go(k); };

  // room tone always; rain on the window when it's raining in Algarah (quieter with curtains closed)
  const world = useWorld();
  useEffect(() => {
    const rain = { rain: 1, storm: 1, drizzle: 0.5 }[world.weather as string] ?? 0;
    sfx.ambience(1, rain * (settings.curtains ? 0.6 : 1));
  }, [world.weather, settings.curtains]);
  useEffect(() => () => { sfx.ambience(0, 0); sfx.purr(false); }, []);

  // Being "caught": hovering the player alt-tabs him to Premiere; he turns back a moment after you leave
  const setCaughtSoon = (on: boolean) => {
    clearTimeout(caughtTimer.current);
    if (on) { if (!caught) { sfx.warm(); sfx.locked(); } setCaught(true); setWantClip(true); }
    else caughtTimer.current = window.setTimeout(() => setCaught(false), 1400);
  };

  // opening the curtains on a napping cat wakes it with a sleepy meow
  const toggleCurtains = () => {
    sfx.warm();
    sfx.select();
    const hidden = settings.curtains ? scene.hiddenCat() : null;
    setSetting('curtains', !settings.curtains);
    if (hidden) setTimeout(() => sfx.meow(hidden.cat.id), 450);
  };

  const playToy = (name: Toy) => {
    sfx.warm();
    if (name !== 'pikachu') { toggleCurtains(); return; }
    toy.current = { name, at: clock.current };
    sfx.pikachu();
  };

  // Largest zoom that fits; whole numbers keep pixels perfectly square
  useEffect(() => {
    const el = stageRef.current!;
    let centred = false;
    const ro = new ResizeObserver(([e]) => {
      if (window.innerWidth <= 640) {
        // phones: zoom in so the room fills most of the height; drag sideways to look around
        const s = Math.max((e.contentRect.width - 20) / W, Math.min(window.innerHeight * 0.58, 460) / H);
        setScale(s);
        if (!centred) {
          centred = true;
          // start on the desk
          requestAnimationFrame(() => { el.scrollLeft = 440 * s - el.clientWidth / 2; });
        }
        return;
      }
      const FRAME = 30; // the room's bezel drawn around the canvas
      const fit = Math.min((e.contentRect.width - FRAME) / W, (e.contentRect.height - FRAME) / H);
      setScale(fit >= 2 ? Math.floor(fit) : Math.max(0.5, fit));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ←/→ walk between objects, Enter opens, 1–9 and 0 jump straight to the hotbar slots
  useEffect(() => {
    if (panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = e.key === '0' ? 10 : Number(e.key);
      if (n >= 1 && n <= HOTBAR.length) { open(HOTBAR[n - 1]); return; }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'd'].includes(e.key)) {
        e.preventDefault();
        sfx.warm();
        sfx.move();
        const dir = e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' ? -1 : 1;
        setKbd(true);
        setFocus((f) => ORDER[(ORDER.indexOf(f ?? ORDER[0]) + (f ? dir : 0) + ORDER.length) % ORDER.length]);
      }
      if ((e.key === 'Enter' || e.key === ' ') && focus && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        open(focus);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  useEffect(() => { setCaughtSoon(focus === 'player'); }, [focus]);

  // pointer position → room pixels, for hovering the (moving) cats
  const toRoom = (e: MouseEvent) => {
    const r = roomRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, r };
  };
  const onRoomMove = (e: MouseEvent) => {
    const { x, y } = toRoom(e);
    const c = scene.hitCat(x, y);
    if (c?.cat.id !== catHover?.id && c) sfx.move();
    sfx.purr(!!c?.zz);
    setCatHover(c ? { id: c.cat.id, x: (c.x / W) * 100, y: ((c.y - c.h) / H) * 100 } : null);
  };
  const onRoomClick = (e: MouseEvent) => { catClick(e); };
  // returns true if a cat was under the pointer (cats sit above the clickable objects)
  const catClick = (e: MouseEvent) => {
    const { x, y } = toRoom(e);
    const c = scene.hitCat(x, y);
    if (!c) return false;
    {
      // clicking a cat says hi: a meow in its own voice and a speech bubble
      sfx.warm();
      sfx.meow(c.cat.id);
      const lines: Record<CatId, string[]> = {
        miko: ['MEW', 'MRRR...'], lebu: ['MEOW!', '...', 'MEOW?'], bibi: ['FOOD?', 'MEOW?'], topi: ['MRRP!', 'PRRR', 'MEOW!'],
      };
      const pool = lines[c.cat.id];
      scene.say(c, pool[Math.floor(Math.random() * pool.length)]);
      setTalking(c.cat.id);
      clearTimeout(talkTimer.current);
      talkTimer.current = window.setTimeout(() => setTalking(null), 1500);
    }
    return true;
  };
  const hovered = catHover && cats.find((c) => c.id === catHover.id)!;

  const spot = (key: string, r: { x: number; y: number; w: number; h: number }) => ({
    left: `${(r.x / W) * 100}%`, top: `${(r.y / H) * 100}%`, width: `${(r.w / W) * 100}%`, height: `${(r.h / H) * 100}%`, key,
  });

  return (
    <div className="hub">
      <Hud onOpen={open} look={look} />

      <div className="hub-stage" ref={stageRef}>
        <div
          className={catHover ? 'room on-cat' : 'room'}
          ref={roomRef}
          style={{ width: W * scale, height: H * scale }}
          onPointerMove={onRoomMove}
          onPointerLeave={() => { setCatHover(null); sfx.purr(false); }}
          onClick={onRoomClick}
        >
          <PixelCanvas
            width={W}
            height={H}
            className="room-canvas"
            frame={(ctx, t, dt) => {
              clock.current = t;
              scene.draw(ctx, { t, dt, animate: settings.motion, caught, look, clip, toy: toy.current, curtains: settings.curtains, bulb: settings.bulb });
            }}
          />
          {ORDER.filter((k) => k !== 'party').map((k) => {
            const r = HOTSPOTS[k];
            const { key, ...style } = spot(k, r);
            return (
              <button
                key={key}
                className={focus === k ? (kbd ? 'hotspot focus kbd' : 'hotspot focus') : 'hotspot'}
                style={style}
                aria-label={`${locations[k].label} — ${locations[k].hint}`}
                onMouseEnter={() => { setKbd(false); if (focus !== k) { sfx.move(); setFocus(k); } }}
                onMouseLeave={() => setFocus((f) => (f === k ? null : f))}
                onFocus={() => setFocus(k)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (catClick(e)) return;
                  if (k === 'window' && settings.curtains) { toggleCurtains(); return; }
                  // touch screens can't hover: the first tap catches me, a second tap opens the card
                  if (k === 'player' && isTouch() && !caught) {
                    setFocus('player');
                    clearTimeout(touchTurnBack.current);
                    touchTurnBack.current = window.setTimeout(() => setFocus((f) => (f === 'player' ? null : f)), 4500);
                    return;
                  }
                  open(k);
                }}
              >
                {/* the player's label sits to the side so it never covers his speech bubble */}
                <span className={k === 'player' ? 'hotspot-label side' : r.y < 70 ? 'hotspot-label below' : 'hotspot-label'}>
                  <b>{locations[k].label}</b> {k === 'player' && isTouch() ? 'Tap again to open' : locations[k].hint}
                </span>
              </button>
            );
          })}
          {TOYS.map((name) => {
            const { key, ...style } = spot(name, HOTSPOTS[name]);
            return (
              <button key={key} className="hotspot toy" style={style} aria-label={toyLabel(name, settings.curtains).join(' — ')}
                onClick={(e) => { e.stopPropagation(); if (!catClick(e)) playToy(name); }}>
                <span className="hotspot-label"><b>{toyLabel(name, settings.curtains)[0]}</b> {toyLabel(name, settings.curtains)[1]}</span>
              </button>
            );
          })}
          {hovered && catHover && talking !== catHover.id && (
            <div className="cat-tag" style={{ left: `${catHover.x}%`, top: `${catHover.y}%` }}>
              <b>{hovered.name} {hovered.gender === 'Female' ? '♀' : '♂'}</b>
              <span>{hovered.title} · {hovered.traits[0]}</span>
              <i>Click to say hi</i>
            </div>
          )}
        </div>
      </div>

      <p className="hub-drag-hint" aria-hidden="true">← drag to look around →</p>

      <nav className="hotbar" aria-label="Rooms">
        {HOTBAR.map((k, i) => (
          <button
            key={k}
            className={focus === k ? 'hotbar-slot focus' : 'hotbar-slot'}
            onMouseEnter={() => setFocus(k)}
            onMouseLeave={() => setFocus((f) => (f === k ? null : f))}
            onClick={() => open(k)}
          >
            {i < 10 && <span className="hotbar-key">{(i + 1) % 10}</span>}
            <Icon k={k} look={look} />
            <span className="hotbar-label">{locations[k].label}</span>
          </button>
        ))}
      </nav>
      <p className="hub-hint">Hover me or the cats · click objects · arrow keys + Enter · keys 1-0 jump</p>

      {panel && (
        <GamePanel
          key={panel}
          title={locations[panel].label}
          icon={<Icon k={panel} look={look} />}
          wide={WIDE.includes(panel)}
          onClose={() => { partyFocus = null; go('hub'); }}
        >
          {panelFor(panel, look)}
        </GamePanel>
      )}
    </div>
  );
}
