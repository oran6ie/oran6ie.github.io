import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { aiProjects } from '../content/aiProjects';
import { cats, type CatId } from '../content/cats';
import { CAREER_START, locations, player, type LocationKey } from '../content/game';
import { projects } from '../content/projects';
import youtube from '../content/youtube.json';
import type { Sprite } from '../lib/pixel';
import { asset } from '../lib/media';
import { radio, useRadioStatus, type RadioStatus } from '../lib/radio';
import { addPet, online, useOnlineStats } from '../lib/online';
import { haptic, sfx } from '../lib/sfx';
import { ACHIEVEMENTS, track, unlock, useAchievements } from './achievements';
import { ArcadePanel } from './arcade';
import { badges, catPortrait, items, star, trophy } from './art/sprites';
import { toolIconURL } from './art/toolIcons';
import { recordRoom, type Recording } from './director';
import { birthdayAge, FESTIVAL_INFO, festivalsToday } from './festivals';
import { img, MANIFEST, preload } from './images';
import {
  AchievementsPanel, BulbPanel, ChannelPanel, ContactPanel, InventoryPanel, JourneyPanel, MemorialPanel, PaintingPanel, PartyPanel,
  GuestbookPanel, PianoPanel, PlayerPanel, QuestPanel, ShopPanel, WindowPanel, yearsActive,
} from './panels';
import { PixelCanvas } from './PixelCanvas';
import { go } from './route';
import { cheer } from './scenes/cats';
import { createRoomScene, H, HOTSPOTS, W, type Look, type Toy } from './scenes/roomScene';
import { getSettings, setSetting, useSettings } from './settings';
import { GamePanel, PixelSprite, toast } from './ui';
import { homeHour, useWorld } from './world';

/* Left-to-right order for arrow keys; the first ten are on the hotbar (keys 1–9, 0) */
const ORDER: LocationKey[] = ['contact', 'channel', 'painting', 'window', 'bulb', 'ai', 'journey', ...(online ? ['guestbook' as const] : []), 'work', 'player', 'achievements', 'inventory', 'memorial', 'piano', 'shop', 'party'];
const HOTBAR: LocationKey[] = ['work', 'channel', 'ai', 'player', 'journey', 'achievements', 'inventory', 'party', 'memorial', 'shop', 'arcade', ...(online ? ['guestbook' as const] : []), 'contact'];
// every object in the room counts towards the Explorer badge
const EXPLORE: LocationKey[] = ORDER.filter((k) => k !== 'party');
const TOYS: Toy[] = ['pikachu', 'curtainL', 'curtainR', 'katana', 'wardrobe', 'bowl', 'laserPen', 'webcam'];
// small props that a cat often sits beside: they always win the click
const TOYS_OVER_CATS: Toy[] = ['bowl', 'laserPen', 'webcam'];
const toyLabel = (t: Toy, s: { curtains: boolean; laser: boolean; nightShift: boolean }): [string, string] => {
  switch (t) {
    case 'pikachu': return ['Pikachu', 'Pika pika!'];
    case 'katana': return ['Katana', s.nightShift ? 'The night is young' : 'Sharp. Very sharp.'];
    case 'wardrobe': return ['Wardrobe', 'Change my outfit'];
    case 'bowl': return ['Food bowl', 'Feed the cats'];
    case 'laserPen': return ['Laser pointer', s.laser ? 'Click to switch off' : 'Click, then move around'];
    case 'webcam': return ['Webcam', 'Record a GIF of the room'];
    default: return ['Curtains', s.curtains ? 'Click to open' : 'Click to close'];
  }
};

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
  arcade: { sprite: badges.play, scale: 3 },
  guestbook: { sprite: badges.scroll, scale: 3 },
};

function Icon({ k, look, size = 36 }: { k: LocationKey; look: Look; size?: number }): ReactNode {
  if (k === 'player') return <img className="pixel-sprite icon-portrait" src={portraitSrc(look)} alt="" style={{ height: size + 6 }} draggable={false} />;
  if (k === 'channel') return <img className="pixel-sprite" src={toolIconURL('youtube')} width={size} height={size} alt="" draggable={false} />;
  if (k === 'inventory') return <img className="pixel-sprite" src={toolIconURL('pr')} width={size} height={size} alt="" draggable={false} />;
  const ic = ICONS[k];
  return <PixelSprite sprite={ic.sprite} scale={ic.scale} />;
}

const WIDE: LocationKey[] = ['work', 'ai', 'party', 'memorial', 'channel', 'arcade', 'guestbook'];

/* Which cat to highlight when the Party panel opens from clicking a cat, and which Trophies tab to show */
let partyFocus: CatId | null = null;
let trophiesTab: 'mine' | 'yours' = 'mine';

function panelFor(key: LocationKey, look: Look) {
  switch (key) {
    case 'player': return <PlayerPanel hair={look.hair} />;
    case 'work': return <QuestPanel />;
    case 'ai': return <QuestPanel initialTab="ai" />;
    case 'journey': return <JourneyPanel />;
    case 'achievements': return <AchievementsPanel initialTab={trophiesTab} />;
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
    case 'arcade': return <ArcadePanel />;
    case 'guestbook': return <GuestbookPanel />;
  }
}

const isTouch = () => typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
const query = (k: string) => new URLSearchParams(location.search).get(k);

// the hoodie is in the wardrobe too, and comes out by itself on cold nights
const OUTFITS = ['jersey', 'tee', 'tank', 'knit', 'polo', 'hoodie'];
function randomLook(): Look {
  return { outfit: OUTFITS[Math.floor(Math.random() * (OUTFITS.length - 1))], hair: Math.random() < 0.5 ? 'long' : 'short' };
}
const playerImages = (l: Look) => [`player/${l.outfit}-${l.hair}-back`, `player/${l.outfit}-${l.hair}-front`];

/* A muted clip that swaps every few seconds; the editor on the monitor and the laptop both play one. */
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
const LAPTOP_CLIPS = [
  ...aiProjects.flatMap((p) => p.motionClips).map((m) => (typeof m === 'string' ? m : m.src)),
  ...WORK_CLIPS.slice(0, 3),
];

/* The ON AIR light comes on for a week after a new upload (or with ?onair) */
const latestUpload = Math.max(...youtube.videos.map((v) => Date.parse(v.published)));
const ON_AIR = query('onair') !== null || Date.now() - latestUpload < 7 * 864e5;

function Hud({ onOpen, look, radioStatus }: { onOpen: (k: LocationKey) => void; look: Look; radioStatus: RadioStatus }) {
  const settings = useSettings();
  const got = useAchievements();
  const { here } = useOnlineStats();
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
        {here > 1 && <span className="hud-online" title="Visitors in the room right now"><i aria-hidden="true" /> {here} here now</span>}
        <button className="px-btn small hud-stars" title="Badges you have earned in the room" onClick={() => { trophiesTab = 'yours'; onOpen('achievements'); }}>
          Badges {got.size}/{ACHIEVEMENTS.length}
        </button>
        <button className="px-btn small" onClick={() => { sfx.select(); go('quick'); }}>Quick view</button>
        <a className="px-btn small" href={`${import.meta.env.BASE_URL}cv/`}>CV</a>
        <button className="px-btn small" aria-pressed={settings.radio} title={radioStatus.title ? `Now playing: ${radioStatus.title}` : '24/7 lofi radio'}
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
        {settings.radio && radioStatus.playing && (
          <div className="hud-radio" aria-live="polite">
            <span className="hud-radio-eq" aria-hidden="true"><i /><i /><i /></span>
            <span className="hud-radio-text">{radioStatus.title || 'Lofi radio'}</span>
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
  useEffect(() => { if (query('debug') !== null) (window as unknown as { __cats: unknown }).__cats = scene.cats; }, [scene]);
  const [look, setLook] = useState(randomLook);
  // the work clip on the monitor only loads once someone first catches me; the laptop starts a little after the room
  const [wantClip, setWantClip] = useState(false);
  const clip = useCyclingVideo(WORK_CLIPS, 6, wantClip);
  const [wantLaptop, setWantLaptop] = useState(false);
  useEffect(() => { const id = setTimeout(() => setWantLaptop(true), 4000); return () => clearTimeout(id); }, []);
  const laptopClip = useCyclingVideo(LAPTOP_CLIPS, 7, wantLaptop && settings.motion);
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
  const radioStatus = useRadioStatus();

  // room toys and moments
  const food = useRef(0);
  const poofAt = useRef<number | null>(null);
  const match = useRef<{ kind: 'ace' | 'defeat'; at: number } | null>(null);
  const [laserOn, setLaserOn] = useState(false);
  const laser = useRef<{ x: number; y: number } | null>(null);
  const [nightShift, setNightShift] = useState(false);
  const katanaHits = useRef<number[]>([]);
  const [rec, setRec] = useState<number | null>(null); // recording progress 0..1
  const [gif, setGif] = useState<Recording | null>(null);
  // after Start Game the camera starts close on the desk and pulls back to the whole room
  const [intro, setIntro] = useState(() => {
    try { const on = sessionStorage.getItem('at_intro') === '1'; sessionStorage.removeItem('at_intro'); return on; } catch { return false; }
  });
  useEffect(() => { if (intro) { const id = setTimeout(() => setIntro(false), 2600); return () => clearTimeout(id); } }, [intro]);
  const festivals = useMemo(() => festivalsToday(), []);

  useEffect(() => {
    // the room and the player first, then everything else
    preload(['room', ...playerImages(look),
      'screen-game', 'screen-editor', 'screen-music', 'memorial-shadow', 'memorial-sanbi', 'memorial-kittens', 'room-curtains',
      ...Object.keys(MANIFEST.sprites).filter((k) => k.startsWith('cats/'))]);
  }, [look]);

  const open = (k: LocationKey) => { sfx.warm(); sfx.open(); go(k); };
  useEffect(() => { if (panel && EXPLORE.includes(panel)) track('panel', panel, EXPLORE.length); }, [panel]);

  // room tone always; rain on the window when it's raining in Algarah (quieter with curtains closed)
  const world = useWorld();
  useEffect(() => {
    const rain = { rain: 1, storm: 1, drizzle: 0.5 }[world.weather as string] ?? 0;
    sfx.ambience(1, rain * (settings.curtains ? 0.6 : 1));
  }, [world.weather, settings.curtains]);
  useEffect(() => () => { sfx.ambience(0, 0); sfx.purr(false); radio.setMode('lofi'); }, []);

  // time of day and weather in Algarah
  const hour = homeHour();
  const night = world.sunAlt < -10;
  const tired = query('tired') !== null || (hour >= 0 && hour < 5);
  const cold = query('cold') !== null || (world.tempC !== null && (world.tempC < 6 || (night && world.tempC < 10)));
  const leak = world.weather === 'rain' || world.weather === 'storm' || world.weather === 'drizzle';

  // one-off greetings: night owls and festivals
  useEffect(() => {
    if (hour < 4.5) unlock('night-owl');
    if (!festivals.length) return;
    const f = festivals[festivals.length - 1];
    const id = setTimeout(() => {
      toast(f === 'birthday' ? `It's my ${birthdayAge()}th birthday today! There's cake on the desk.` : FESTIVAL_INFO[f].line);
      unlock('festive');
    }, 1800);
    return () => clearTimeout(id);
  }, []);

  // sunrise opens the curtains, once a day
  useEffect(() => {
    const check = () => {
      const today = new Date().toDateString();
      let last = '';
      try { last = localStorage.getItem('at_morning') ?? ''; } catch { /* ignore */ }
      const h = homeHour();
      if (!getSettings().curtains || last === today || h < 5 || h > 10 || world.sunAlt < 0) return;
      try { localStorage.setItem('at_morning', today); } catch { /* ignore */ }
      setSetting('curtains', false);
      toast('Good morning! The sun is up over Algarah.');
    };
    check();
  }, [world.sunAlt]);

  // a Lofi Enjoyer keeps the radio playing for five minutes
  useEffect(() => {
    if (!radioStatus.playing) return;
    const id = setTimeout(() => unlock('lofi'), 5 * 60e3);
    return () => clearTimeout(id);
  }, [radioStatus.playing]);

  // every so often a Valorant round ends: an ACE or a DEFEAT
  useEffect(() => {
    if (!settings.motion) return;
    let id = 0;
    const schedule = (first = false) => {
      id = window.setTimeout(() => {
        if (!document.hidden) {
          const kind = Math.random() < 0.55 ? 'ace' : 'defeat';
          match.current = { kind, at: clock.current };
          setTimeout(() => (kind === 'ace' ? sfx.coin() : sfx.locked()), 200);
        }
        schedule();
      }, (first ? 20 : 35 + Math.random() * 35) * 1000);
    };
    schedule(true);
    return () => clearTimeout(id);
  }, [settings.motion]);

  // the laser: Lebu catching the dot earns a badge; Esc puts the pointer away
  useEffect(() => {
    scene.events.laserCaught = (id) => { haptic(15); if (id === 'lebu') unlock('laser'); };
  }, [scene]);
  useEffect(() => {
    if (!laserOn) { laser.current = null; return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLaserOn(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [laserOn]);

  // Night Shift plays synthwave on the radio
  useEffect(() => { radio.setMode(nightShift ? 'synthwave' : 'lofi'); }, [nightShift]);

  // Being "caught": hovering the player alt-tabs him to Premiere; he turns back a moment after you leave
  const setCaughtSoon = (on: boolean) => {
    clearTimeout(caughtTimer.current);
    if (on) { if (!caught) { sfx.warm(); sfx.locked(); unlock('caught'); } setCaught(true); setWantClip(true); }
    else caughtTimer.current = window.setTimeout(() => setCaught(false), 1400);
  };

  // opening the curtains on a napping cat wakes it with a sleepy meow
  const toggleCurtains = () => {
    sfx.warm();
    sfx.select();
    const hidden = settings.curtains ? scene.hiddenCat() : null;
    setSetting('curtains', !settings.curtains);
    if (hidden) { setTimeout(() => sfx.meow(hidden.cat.id), 450); unlock('peekaboo'); }
  };

  // the wardrobe: put on the next outfit once its sprites have loaded, with a puff of smoke
  const changing = useRef(false);
  const dressedByVisitor = useRef(false);
  const changeOutfit = (outfit = OUTFITS[(OUTFITS.indexOf(look.outfit) + 1) % OUTFITS.length]) => {
    if (changing.current || outfit === look.outfit) return;
    changing.current = true;
    const next: Look = { ...look, outfit };
    const names = playerImages(next);
    preload(names);
    sfx.static(0.18);
    haptic(10);
    const started = performance.now();
    const wait = () => {
      if (names.every((n) => img(n)) || performance.now() - started > 4000) {
        changing.current = false;
        if (!names.every((n) => img(n))) return; // still not here: keep the current outfit
        poofAt.current = clock.current;
        sfx.select();
        setLook(next);
        return;
      }
      setTimeout(wait, 80);
    };
    wait();
  };

  useEffect(() => { if (cold && !dressedByVisitor.current) changeOutfit('hoodie'); }, [cold]);

  const feedCats = () => {
    if (food.current > 0.35) { toast('The bowl is still full.'); return; }
    food.current = 1;
    sfx.static(0.3);
    setTimeout(() => sfx.nom(), 250);
    haptic(12);
    scene.feed();
    unlock('feeder');
  };

  // click the katana five times quickly to start (or end) the Night Shift
  const swingKatana = () => {
    sfx.shing();
    haptic(15);
    const now = performance.now();
    katanaHits.current = [...katanaHits.current.filter((t) => now - t < 3000), now];
    const n = katanaHits.current.length;
    if (n === 3 && !nightShift) toast('The katana hums...');
    if (n < 5) return;
    katanaHits.current = [];
    const on = !nightShift;
    setNightShift(on);
    if (on) { sfx.fanfare(); unlock('night-shift'); toast('NIGHT SHIFT. Click the katana 5× again to clock out.'); }
    else toast('Night shift over. Back to lofi.');
  };

  const startRecording = () => {
    if (rec !== null) return;
    const canvas = roomRef.current?.querySelector('canvas');
    if (!canvas) return;
    sfx.select();
    setRec(0);
    recordRoom(canvas, setRec)
      .then((r) => { setGif(r); unlock('director'); })
      .catch(() => toast('Recording failed. Try again?'))
      .finally(() => setRec(null));
  };
  const closeGif = () => { if (gif) URL.revokeObjectURL(gif.url); setGif(null); };

  const playToy = (name: Toy) => {
    sfx.warm();
    switch (name) {
      case 'pikachu': toy.current = { name, at: clock.current }; sfx.pikachu(); return;
      case 'katana': swingKatana(); return;
      case 'wardrobe': dressedByVisitor.current = true; changeOutfit(); return;
      case 'bowl': feedCats(); return;
      case 'laserPen':
        sfx.click();
        if (!laserOn) toast(isTouch() ? 'Laser on: drag around the room. Tap the pen again to stop.' : 'Laser on: move your mouse around. Esc to stop.');
        setLaserOn(!laserOn);
        return;
      case 'webcam': startRecording(); return;
      default: toggleCurtains();
    }
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
    if (panel || gif) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      const n = e.key === '0' ? 10 : Number(e.key);
      if (n >= 1 && n <= Math.min(10, HOTBAR.length)) { open(HOTBAR[n - 1]); return; }
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

  // pointer position → room pixels, for hovering the (moving) cats and aiming the laser
  const toRoom = (e: { clientX: number; clientY: number }) => {
    const r = roomRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H, r };
  };
  const onRoomMove = (e: PointerEvent) => {
    const { x, y } = toRoom(e);
    if (laserOn) { laser.current = { x, y }; return; }
    const c = scene.hitCat(x, y);
    if (c?.cat.id !== catHover?.id && c) sfx.move();
    // the closer you get to a sleeping cat, the louder it purrs
    let near = 0;
    for (const s of scene.cats) {
      if (!s.zz) continue;
      const d = Math.hypot(s.x - x, s.y - s.h / 2 - y);
      near = Math.max(near, 1 - d / 40);
    }
    sfx.purrLevel(near);
    setCatHover(c ? { id: c.cat.id, x: (c.x / W) * 100, y: ((c.y - c.h) / H) * 100 } : null);
  };
  const onRoomClick = (e: MouseEvent) => { if (!laserOn) catClick(e); };
  // returns true if a cat was under the pointer (cats sit above the clickable objects)
  const catClick = (e: MouseEvent) => {
    if (laserOn) return false;
    const { x, y } = toRoom(e);
    const c = scene.hitCat(x, y);
    if (!c) return false;
    {
      // clicking a cat says hi: a meow in its own voice and a speech bubble; petting cheers them up
      sfx.warm();
      sfx.meow(c.cat.id);
      haptic(10);
      cheer(c.cat.id, 12);
      addPet();
      track('cat', c.cat.id, cats.length);
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
  const toyState = { curtains: settings.curtains, laser: laserOn, nightShift };
  const roomClass = ['room', catHover && 'on-cat', laserOn && 'laser-mode', intro && settings.motion && 'intro', nightShift && 'night-shift'].filter(Boolean).join(' ');

  return (
    <div className="hub">
      <Hud onOpen={open} look={look} radioStatus={radioStatus} />

      <div className="hub-stage" ref={stageRef}>
        <div
          className={roomClass}
          ref={roomRef}
          style={{ width: W * scale, height: H * scale }}
          onPointerMove={onRoomMove}
          onPointerDown={(e) => { if (laserOn) laser.current = toRoom(e); }}
          onPointerLeave={() => { setCatHover(null); sfx.purr(false); laser.current = null; }}
          onClick={onRoomClick}
        >
          <PixelCanvas
            width={W}
            height={H}
            className="room-canvas"
            frame={(ctx, t, dt) => {
              clock.current = t;
              if (settings.motion) food.current = Math.max(0, food.current - dt / 14);
              scene.draw(ctx, {
                t, dt, animate: settings.motion, caught, look, clip, toy: toy.current, curtains: settings.curtains, bulb: settings.bulb,
                laser: laserOn ? laser.current : null, food: food.current, nightShift, festivals, onAir: ON_AIR,
                laptopClip: wantLaptop ? laptopClip : null, poofAt: poofAt.current, match: match.current, tired, cold, leak,
              });
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
            const r = HOTSPOTS[name];
            const { key, ...style } = spot(name, r);
            const [label, hint] = toyLabel(name, toyState);
            return (
              <button key={key} className={`hotspot toy toy-${name}`} style={style} aria-label={`${label} — ${hint}`}
                onClick={(e) => { e.stopPropagation(); if (TOYS_OVER_CATS.includes(name) || !catClick(e)) playToy(name); }}>
                <span className={r.y < 70 ? 'hotspot-label below' : 'hotspot-label'}><b>{label}</b> {hint}</span>
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
          {rec !== null && <div className="rec-badge" aria-live="polite">● REC {Math.round(rec * 100)}%</div>}
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
            onClick={() => { if (k === 'achievements') trophiesTab = 'mine'; open(k); }}
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
          onClose={() => { partyFocus = null; trophiesTab = 'mine'; go('hub'); }}
        >
          {panelFor(panel, look)}
        </GamePanel>
      )}
      {gif && (
        <GamePanel title="Director Mode" onClose={closeGif}>
          <div className="director">
            <img className="director-gif" src={gif.url} alt="A short GIF recorded from the room" />
            <p className="body-text small">That's a wrap: a 4-second GIF of the room ({Math.round(gif.bytes / 1024)} KB). Share it anywhere.</p>
            <div className="btn-row">
              <a className="px-btn" href={gif.url} download="oran6ie-room.gif" onClick={() => sfx.coin()}>Download GIF</a>
              <button className="px-btn ghost" onClick={() => { closeGif(); startRecording(); }}>Record again</button>
            </div>
          </div>
        </GamePanel>
      )}
    </div>
  );
}
