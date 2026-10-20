/*
  Visitor achievements: badges people earn by exploring the room. Saved in the
  visitor's own browser; unlocking one shows a toast and plays a jingle.
*/
import { useSyncExternalStore } from 'react';
import { sfx } from '../lib/sfx';
import { toast } from './ui';

export const ACHIEVEMENTS = [
  { id: 'caught', name: 'Caught Slacking', desc: 'Caught Alankrit gaming instead of editing.' },
  { id: 'curator', name: 'Curator', desc: 'Opened a project from the Quest Log.' },
  { id: 'explorer', name: 'Explorer', desc: 'Opened every object in the room.' },
  { id: 'cat-whisperer', name: 'Cat Whisperer', desc: 'Said hi to all four cats.' },
  { id: 'peekaboo', name: 'Peekaboo', desc: 'Found a cat napping behind the curtains.' },
  { id: 'feeder', name: 'Snack Time', desc: 'Fed the cats.' },
  { id: 'laser', name: 'Red Dot Menace', desc: 'Got Lebu to chase the laser.' },
  { id: 'pianist', name: 'Pianist', desc: 'Played a tune on the piano.' },
  { id: 'night-owl', name: 'Night Owl', desc: 'Visited past midnight, Algarah time.' },
  { id: 'lofi', name: 'Lofi Enjoyer', desc: 'Kept the radio on for 5 minutes.' },
  { id: 'subscriber', name: 'Subscriber', desc: 'Visited the YouTube channel.' },
  { id: 'director', name: 'Director', desc: 'Recorded a clip of the room.' },
  { id: 'gamer', name: 'High Score', desc: 'Set a high score in the arcade.' },
  { id: 'festive', name: 'Festive', desc: 'Visited during a festival.' },
  { id: 'night-shift', name: 'Night Shift', desc: 'Found the secret in the katana.', secret: true },
  { id: 'mailman', name: 'Pen Pal', desc: 'Copied the email address.' },
  { id: 'guest', name: 'Guest of Honour', desc: 'Pinned a note on the guestbook.' },
] as const;

export type AchievementId = (typeof ACHIEVEMENTS)[number]['id'];

const KEY = 'at_achievements';
const listeners = new Set<() => void>();
let unlocked: Set<AchievementId> = (() => {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { return new Set(); }
})();

export function unlock(id: AchievementId) {
  if (unlocked.has(id)) return;
  unlocked = new Set(unlocked).add(id);
  try { localStorage.setItem(KEY, JSON.stringify([...unlocked])); } catch { /* storage blocked */ }
  listeners.forEach((l) => l());
  const a = ACHIEVEMENTS.find((x) => x.id === id)!;
  sfx.fanfare();
  toast(`★ Achievement unlocked: ${a.name}  (${unlocked.size}/${ACHIEVEMENTS.length})`);
}

export const isUnlocked = (id: AchievementId) => unlocked.has(id);

export function useAchievements() {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => unlocked);
}

/* Progress trackers for multi-step achievements */
const seen = (key: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return new Set<string>(); }
};
const remember = (key: string, set: Set<string>) => { try { localStorage.setItem(key, JSON.stringify([...set])); } catch { /* ignore */ } };

export function track(kind: 'panel' | 'cat', id: string, total: number) {
  const key = kind === 'panel' ? 'at_seen_panels' : 'at_seen_cats';
  const s = seen(key);
  if (s.has(id)) return;
  s.add(id);
  remember(key, s);
  if (s.size >= total) unlock(kind === 'panel' ? 'explorer' : 'cat-whisperer');
}
