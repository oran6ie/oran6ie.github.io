/* The smart bulb hanging from the ceiling: colour presets that tint the room's light. */
export type BulbMode = 'off' | 'warm' | 'sunset' | 'pink' | 'cyan' | 'purple' | 'green' | 'party';

export const BULB_PRESETS: { id: BulbMode; label: string; color: string }[] = [
  { id: 'off', label: 'Off', color: '#2a2860' },
  { id: 'warm', label: 'Warm white', color: '#ffd9a0' },
  { id: 'sunset', label: 'Sunset', color: '#ff7a3d' },
  { id: 'pink', label: 'Neon pink', color: '#ff4fd8' },
  { id: 'cyan', label: 'Cyan', color: '#3be8ff' },
  { id: 'purple', label: 'Purple haze', color: '#9b6bff' },
  { id: 'green', label: 'Forest', color: '#4ee38a' },
  { id: 'party', label: 'RGB party', color: 'party' },
];

const PARTY = ['#ff4fd8', '#9b6bff', '#3be8ff', '#4ee38a', '#ffe066', '#ff7a3d'];

/* Current RGB for a mode at time t (party mode cycles smoothly) */
export function bulbColor(mode: BulbMode, t: number): [number, number, number] | null {
  if (mode === 'off') return null;
  const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  if (mode === 'party') {
    const k = (t * 0.6) % PARTY.length, i = Math.floor(k), f = k - i;
    const a = hex(PARTY[i]), b = hex(PARTY[(i + 1) % PARTY.length]);
    return a.map((v, j) => Math.round(v + (b[j] - v) * f)) as [number, number, number];
  }
  return hex(BULB_PRESETS.find((p) => p.id === mode)!.color);
}
