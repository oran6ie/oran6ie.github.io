/*
  All game sound, synthesised with Web Audio — nothing is downloaded except the
  lofi radio stream (see radio.ts). Browsers only allow audio after a user
  gesture, so call sfx.warm() from the first click or key press.
*/

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

function init() {
  if (ctx) return;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  // brown noise: soft, room-tone friendly
  const len = ctx.sampleRate * 4;
  noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
}

const ready = () => ctx !== null && master !== null && ctx.state === 'running' && !muted;

/* A short burst of band-passed noise (static, crunches, swishes) */
function noise(vol: number, dur: number, freq: number) {
  if (!ready() || !noiseBuf) return;
  const c = ctx!, now = c.currentTime;
  const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bp).connect(g).connect(master!);
  src.start(now); src.stop(now + dur + 0.02);
}

/* Short phone buzz on taps, where supported */
export const haptic = (ms = 12) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

/* Play a run of notes: [frequency Hz, length s] pairs, back to back. */
function notes(seq: [number, number][], type: OscillatorType = 'square', vol = 0.07) {
  if (!ready()) return;
  let t = ctx!.currentTime;
  for (const [freq, len] of seq) {
    const o = ctx!.createOscillator();
    const g = ctx!.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g).connect(master!);
    o.start(t);
    o.stop(t + len + 0.02);
    t += len * 0.85;
  }
}

/*
  A voice-like sweep: sawtooth through two formant filters, with a pitch contour.
  Used for meows and the Pikachu squeak.
*/
function voice(contour: [number, number][], { vol = 0.05, formants = [900, 2400], q = 6, breath = 0 } = {}) {
  if (!ready()) return;
  const c = ctx!, now = c.currentTime;
  const end = contour[contour.length - 1][0];
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(contour[0][1], now);
  for (const [at, f] of contour.slice(1)) o.frequency.exponentialRampToValueAtTime(f, now + at);
  const vib = c.createOscillator(), vibG = c.createGain();
  vib.frequency.value = 6; vibG.gain.value = 8;
  vib.connect(vibG).connect(o.frequency);
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(vol, now + 0.04);
  out.gain.setValueAtTime(vol, now + end * 0.7);
  out.gain.exponentialRampToValueAtTime(0.0001, now + end);
  for (const f of formants) {
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    o.connect(bp).connect(out);
  }
  if (breath && noiseBuf) {
    const n = c.createBufferSource(), ng = c.createGain(), hp = c.createBiquadFilter();
    n.buffer = noiseBuf; hp.type = 'highpass'; hp.frequency.value = 3000;
    ng.gain.setValueAtTime(breath, now); ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    n.connect(hp).connect(ng).connect(out);
    n.start(now); n.stop(now + 0.1);
  }
  out.connect(master!);
  o.start(now); vib.start(now);
  o.stop(now + end + 0.05); vib.stop(now + end + 0.05);
}

/* ── Ambience: soft room tone, plus rain when it's raining in Algarah ── */
let amb: { tone: GainNode; rain: GainNode } | null = null;
function ensureAmbience() {
  if (amb || !ctx || !master || !noiseBuf) return amb;
  const mk = (type: BiquadFilterType, freq: number) => {
    const src = ctx!.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx!.createGain(); g.gain.value = 0;
    src.connect(f).connect(g).connect(master!); src.start();
    return g;
  };
  amb = { tone: mk('lowpass', 260), rain: mk('bandpass', 1400) };
  return amb;
}

let ambWanted: [number, number] = [0, 0];

/* Purring: a slow amplitude-modulated rumble, faded in and out */
let purrNode: { g: GainNode; stop: () => void } | null = null;

export type CatVoice = 'miko' | 'lebu' | 'bibi' | 'topi';
const MEOWS: Record<CatVoice, { base: number; len: number; vol: number }> = {
  miko: { base: 520, len: 0.55, vol: 0.03 },  // soft
  lebu: { base: 640, len: 0.5, vol: 0.045 },  // loud and clear
  bibi: { base: 420, len: 0.7, vol: 0.04 },   // deep, only for food
  topi: { base: 760, len: 0.35, vol: 0.04 },  // chirpy
};

/* Piano: a soft electric-piano tone */
function pianoNote(freq: number, vol = 0.09) {
  if (!ready()) return;
  const c = ctx!, now = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
  g.gain.exponentialRampToValueAtTime(vol * 0.35, now + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  g.connect(lp).connect(master!);
  for (const [mult, type, v] of [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]] as const) {
    const o = c.createOscillator(), og = c.createGain();
    o.type = type; o.frequency.value = freq * mult; og.gain.value = v;
    o.connect(og).connect(g);
    o.start(now); o.stop(now + 1.7);
  }
}

export const sfx = {
  warm() {
    init();
    if (ctx && ctx.state !== 'running') void ctx.resume().then(() => sfx.ambience(ambWanted[0], ambWanted[1]));
    else sfx.ambience(ambWanted[0], ambWanted[1]);
  },
  move() { notes([[880, 0.045]], 'square', 0.04); },
  select() { notes([[660, 0.06], [990, 0.09]]); },
  back() { notes([[520, 0.06], [330, 0.09]]); },
  open() { notes([[392, 0.05], [523, 0.05], [784, 0.1]], 'triangle', 0.12); },
  start() { notes([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.22]]); },
  locked() { notes([[180, 0.08], [150, 0.14]], 'square', 0.05); },
  coin() { notes([[988, 0.06], [1319, 0.18]]); },

  meow(cat: CatVoice) {
    const m = MEOWS[cat];
    const j = 0.92 + Math.random() * 0.16; // no two meows alike
    voice([[0, m.base * 0.85 * j], [m.len * 0.35, m.base * 1.35 * j], [m.len, m.base * 0.75 * j]], { vol: m.vol, formants: [950, 2600], q: 5 });
  },
  purr(on: boolean) {
    if (!on) { purrNode?.stop(); purrNode = null; return; }
    if (purrNode || !ready() || !noiseBuf) return;
    const c = ctx!, now = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const g = c.createGain(); g.gain.value = 0;
    const lfo = c.createOscillator(), lfoG = c.createGain();
    lfo.frequency.value = 26; lfoG.gain.value = 0.35;
    const out = c.createGain();
    out.gain.setValueAtTime(0.0001, now); out.gain.exponentialRampToValueAtTime(0.5, now + 0.4);
    lfo.connect(lfoG).connect(g.gain);
    src.connect(lp).connect(g).connect(out).connect(master!);
    src.start(); lfo.start();
    purrNode = {
      g: out,
      stop: () => {
        const t = c.currentTime;
        out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        src.stop(t + 0.45); lfo.stop(t + 0.45);
      },
    };
  },

  /* An affectionate synthesised squeak: "pi — ka — chuuu!" */
  pikachu() {
    if (!ready()) return;
    const say = (delay: number, contour: [number, number][], breath = 0) =>
      setTimeout(() => voice(contour, { vol: 0.06, formants: [1300, 3000], q: 4, breath }), delay);
    say(0, [[0, 980], [0.09, 1150]]);
    say(130, [[0, 900], [0.1, 1050]], 0.05);
    say(280, [[0, 1100], [0.18, 1250], [0.42, 820]], 0.08);
  },

  piano(freq: number) { pianoNote(freq); },

  /* Purr gets louder the closer the pointer is to a sleeping cat (0..1) */
  purrLevel(level: number) {
    if (level <= 0.02) { sfx.purr(false); return; }
    sfx.purr(true);
    if (purrNode && ctx) purrNode.g.gain.setTargetAtTime(0.06 + 0.5 * level, ctx.currentTime, 0.15);
  },

  /* Achievement unlocked */
  fanfare() { notes([[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.12], [784, 0.08], [1047, 0.3]], 'square', 0.06); },

  /* A cat landing: a soft thud, heavier for bigger cats */
  land(weight = 1) {
    if (!ready() || !noiseBuf) return;
    const c = ctx!, now = c.currentTime;
    const src = c.createBufferSource(); src.buffer = noiseBuf;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140 + 60 / weight;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.35 * weight, now + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    src.connect(lp).connect(g).connect(master!);
    src.start(now); src.stop(now + 0.15);
  },

  /* Katana: a bright metallic "shing" */
  shing() {
    if (!ready()) return;
    const c = ctx!, now = c.currentTime;
    for (const [f, v] of [[2400, 0.03], [3600, 0.02], [5100, 0.012]] as const) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(f, now); o.frequency.exponentialRampToValueAtTime(f * 1.04, now + 0.4);
      g.gain.setValueAtTime(v, now); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      o.connect(g).connect(master!); o.start(now); o.stop(now + 0.55);
    }
    noise(0.04, 0.06, 6000);
  },

  /* TV static burst for channel flips */
  static(dur = 0.25) { noise(0.05, dur, 3000); },

  /* Kibble crunch */
  nom() { noise(0.08, 0.05, 2200); setTimeout(() => noise(0.06, 0.05, 1900), 90); },

  /* Laser pointer click */
  click() { notes([[1800, 0.02]], 'square', 0.03); },

  /* Animal Crossing-style talking: a tiny pitched blip per letter (voice: base pitch) */
  blip(ch: string, voice = 1) {
    if (!ready() || !/[a-z0-9]/i.test(ch)) return;
    const c = ctx!, now = c.currentTime;
    const code = ch.toLowerCase().charCodeAt(0);
    const vowel = 'aeiou'.includes(ch.toLowerCase());
    const freq = (vowel ? 300 : 360) * voice * (1 + ((code * 7) % 9) / 14) * (0.96 + Math.random() * 0.08);
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'square';
    o.frequency.setValueAtTime(freq, now);
    o.frequency.exponentialRampToValueAtTime(freq * (vowel ? 0.9 : 1.08), now + 0.05);
    lp.type = 'lowpass'; lp.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.035, now + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    o.connect(lp).connect(g).connect(master!);
    o.start(now); o.stop(now + 0.07);
  },

  /* level 0..1 for each layer; call whenever weather or settings change */
  ambience(tone: number, rain: number) {
    ambWanted = [tone, rain];
    if (!ctx || ctx.state !== 'running') return;
    const a = ensureAmbience();
    if (!a || !ctx) return;
    const t = ctx.currentTime;
    a.tone.gain.setTargetAtTime(muted ? 0 : tone * 0.035, t, 0.8);
    a.rain.gain.setTargetAtTime(muted ? 0 : rain * 0.05, t, 0.8);
  },

  setMuted(m: boolean) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.5;
    if (m) sfx.purr(false);
    sfx.ambience(ambWanted[0], ambWanted[1]);
  },
};
