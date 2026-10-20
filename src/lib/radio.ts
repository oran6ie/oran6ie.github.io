/*
  24/7 lofi background radio. Streams from public internet radio stations, in
  order, falling back if one is down. laut.fm also tells us what's playing.
*/
import { useEffect, useState } from 'react';

const STATIONS = [
  { name: 'laut.fm/lofi', url: 'https://stream.laut.fm/lofi', nowPlaying: 'https://api.laut.fm/station/lofi/current_song' },
  { name: 'Zeno lofi', url: 'https://stream.zeno.fm/0r0xa792kwzuv' },
  { name: 'Lofi Radio', url: 'https://play.streamafrica.net/lofiradio' },
];
let volume = 0.28;  // set by the slider (0..1 of a gentle max)
let duck = 1;       // drops while the piano is being played
const level = () => volume * duck;

let audio: HTMLAudioElement | null = null;
let station = 0;
let wanted = false;
let fadeTimer = 0;
const listeners = new Set<() => void>();
let status: { playing: boolean; title: string; station: string } = { playing: false, title: '', station: STATIONS[0].name };
const set = (s: Partial<typeof status>) => { status = { ...status, ...s }; listeners.forEach((l) => l()); };

function element() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'none';
  audio.volume = 0;
  audio.addEventListener('playing', () => set({ playing: true, station: STATIONS[station].name }));
  audio.addEventListener('pause', () => set({ playing: false }));
  audio.addEventListener('error', () => {
    // try the next station
    if (!wanted) return;
    station = (station + 1) % STATIONS.length;
    setTimeout(() => { if (wanted) start(); }, 1200);
  });
  return audio;
}

function fadeTo(target: number, then?: () => void) {
  const a = element();
  clearInterval(fadeTimer);
  fadeTimer = window.setInterval(() => {
    const v = a.volume + (target > a.volume ? 0.02 : -0.03);
    if ((target > a.volume && v >= target) || (target <= a.volume && v <= target)) {
      a.volume = Math.max(0, Math.min(1, target));
      clearInterval(fadeTimer);
      then?.();
    } else a.volume = Math.max(0, Math.min(1, v));
  }, 60);
}

function start() {
  const a = element();
  // reconnect to the live edge rather than resuming a stale buffer
  a.src = STATIONS[station].url;
  a.play().then(() => fadeTo(level())).catch(() => {
    // autoplay blocked until the visitor interacts; retry on the first click/key
    const retry = () => { if (wanted) start(); };
    document.addEventListener('pointerdown', retry, { once: true });
    document.addEventListener('keydown', retry, { once: true });
  });
}

export const radio = {
  setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v)) * 0.6;
    if (audio && wanted) { clearInterval(fadeTimer); audio.volume = level(); }
  },
  /* lower the music while something else (the piano) is playing */
  duck(on: boolean) {
    duck = on ? 0.25 : 1;
    if (audio && wanted) fadeTo(level());
  },
  setOn(on: boolean) {
    if (on === wanted) return;
    wanted = on;
    if (on) start();
    else if (audio) fadeTo(0, () => { audio!.pause(); audio!.removeAttribute('src'); audio!.load(); });
  },
};

async function pollTitle() {
  const s = STATIONS[station];
  if (!s.nowPlaying || !status.playing) { set({ title: '' }); return; }
  try {
    const d = await (await fetch(s.nowPlaying)).json();
    set({ title: [d.title, d.artist?.name].filter(Boolean).join(' — ') });
  } catch { set({ title: '' }); }
}

export function useRadioStatus() {
  const [s, setS] = useState(status);
  useEffect(() => {
    const l = () => setS(status);
    listeners.add(l);
    const id = setInterval(pollTitle, 30e3);
    void pollTitle();
    return () => { listeners.delete(l); clearInterval(id); };
  }, []);
  useEffect(() => { if (s.playing && !s.title) void pollTitle(); }, [s.playing]);
  return s;
}
