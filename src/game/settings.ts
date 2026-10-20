import { useEffect, useSyncExternalStore } from 'react';
import { radio } from '../lib/radio';
import { sfx } from '../lib/sfx';
import type { BulbMode } from './bulb';

/* Options-menu settings, remembered between visits. */
export type Settings = { sound: boolean; radio: boolean; crt: boolean; motion: boolean; curtains: boolean; bulb: BulbMode; radioVolume: number };

const KEY = 'at_settings';
const listeners = new Set<() => void>();

function load(): Settings {
  const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const defaults: Settings = { sound: true, radio: true, crt: true, motion: !reduced, curtains: false, bulb: 'off', radioVolume: 0.5 };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

let current = load();

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  current = { ...current, [key]: value };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
}

export function getSettings() {
  return current;
}

export function useSettings() {
  const s = useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
  );
  // Reflect settings onto the page: CRT overlay, animation, sound
  useEffect(() => {
    document.body.classList.toggle('crt-off', !s.crt);
    document.body.classList.toggle('reduce-motion', !s.motion);
    sfx.setMuted(!s.sound);
    radio.setVolume(s.radioVolume);
    radio.setOn(s.radio);
  }, [s]);
  return s;
}
