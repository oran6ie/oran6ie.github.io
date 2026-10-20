/*
  Client for the room's Worker: who's here right now, how many times the cats
  have been petted by everyone, and the guestbook. Everything fails quietly.
*/
import { useEffect, useSyncExternalStore } from 'react';
import { API_URL } from '../content/backend';

export const online = !!API_URL || (typeof location !== 'undefined' && new URLSearchParams(location.search).has('api'));
const base = () => new URLSearchParams(location.search).get('api') || API_URL;

async function call<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(base() + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
  return data as T;
}

/* ── live stats ── */
let stats = { here: 0, pets: 0 };
const listeners = new Set<() => void>();
const set = (s: Partial<typeof stats>) => { stats = { ...stats, ...s }; listeners.forEach((l) => l()); };

const visitorId = (() => {
  try {
    let id = sessionStorage.getItem('at_vid');
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('at_vid', id); }
    return id;
  } catch { return Math.random().toString(36).slice(2, 14); }
})();

let started = false;
function start() {
  if (started || !online) return;
  started = true;
  const hello = () => { if (!document.hidden) call<{ here: number; pets: number }>('/hello', { id: visitorId }).then(set).catch(() => {}); };
  hello();
  setInterval(hello, 45e3);
  document.addEventListener('visibilitychange', hello);
}

export function useOnlineStats() {
  useEffect(start, []);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => stats);
}

/* pets are counted locally and sent in small batches */
let pending = 0, flushTimer = 0;
export function addPet() {
  if (!online) return;
  pending++;
  set({ pets: stats.pets + 1 });
  clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => {
    const n = Math.min(50, pending);
    pending -= n;
    call<{ pets: number }>('/pet', { n }).then(set).catch(() => {});
  }, 4000);
}

/* ── guestbook ── */
export type Note = { id: number; name: string; msg: string; color: number; at: number };
export const getNotes = () => call<{ notes: Note[] }>('/notes').then((r) => r.notes);
export const postNote = (n: { name: string; msg: string; color: number; website: string }) => call<{ ok: true }>('/notes', n);
