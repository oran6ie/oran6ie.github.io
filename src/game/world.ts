/*
  Live "world state" for the window and title screen: the real sun, moon and
  weather over Algarah (Kalimpong, West Bengal), the hometown the window looks out on.
*/
import { useEffect, useSyncExternalStore } from 'react';
import { getMoonIllumination, getMoonPosition, getPosition, getTimes } from 'suncalc';

export const HOME = { name: 'Algarah', lat: 27.118, lon: 88.584, tz: 'Asia/Kolkata' };

export type Weather = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm';

export type World = {
  sunAlt: number;      // degrees above the horizon
  sunAz: number;       // degrees clockwise from north
  moonAlt: number;
  moonAz: number;
  moonFraction: number; // lit fraction 0..1
  moonWaxing: boolean;
  weather: Weather;
  cloud: number;       // 0..1 cover
  tempC: number | null;
  sunrise: Date | null;
  sunset: Date | null;
  live: boolean;       // false until real weather has loaded
};

/* WMO weather codes → what we draw */
function weatherFromCode(code: number): Weather {
  if (code >= 95) return 'storm';
  if (code >= 71 && code <= 77) return 'snow';
  if (code === 85 || code === 86) return 'snow';
  if (code >= 61 && code <= 67) return 'rain';
  if (code >= 80 && code <= 82) return 'rain';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 2) return 'cloudy';
  return 'clear';
}

export const MOON_PHASES = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'];
export function moonPhaseName(phase: number) {
  return MOON_PHASES[Math.round(phase * 8) % 8];
}

export function timeOfDay(sunAlt: number) {
  if (sunAlt > 8) return 'Day';
  if (sunAlt > -2) return 'Golden hour';
  if (sunAlt > -10) return 'Twilight';
  return 'Night';
}

let state: World = astro(new Date(), { weather: 'clear', cloud: 0.1, tempC: null, live: false });
let moonPhase = getMoonIllumination(new Date()).phase;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function astro(now: Date, w: Pick<World, 'weather' | 'cloud' | 'tempC' | 'live'>): World {
  const sun = getPosition(now, HOME.lat, HOME.lon);
  const moon = getMoonPosition(now, HOME.lat, HOME.lon);
  const ill = getMoonIllumination(now);
  const times = getTimes(now, HOME.lat, HOME.lon);
  return {
    sunAlt: sun.altitude, sunAz: sun.azimuth,
    moonAlt: moon.altitude, moonAz: moon.azimuth,
    moonFraction: ill.fraction, moonWaxing: ill.waxing,
    sunrise: times.sunrise ?? null, sunset: times.sunset ?? null,
    ...w,
  };
}

const CACHE = 'at_weather';
async function fetchWeather() {
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE) ?? 'null');
    if (cached && Date.now() - cached.at < 15 * 60e3) return cached.v;
  } catch { /* storage blocked */ }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOME.lat}&longitude=${HOME.lon}`
    + `&current=temperature_2m,weather_code,cloud_cover&timezone=${encodeURIComponent(HOME.tz)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`weather ${r.status}`);
  const c = (await r.json()).current;
  const v = { weather: weatherFromCode(c.weather_code), cloud: (c.cloud_cover ?? 0) / 100, tempC: c.temperature_2m ?? null };
  try { sessionStorage.setItem(CACHE, JSON.stringify({ at: Date.now(), v })); } catch { /* ignore */ }
  return v;
}

/* Preview overrides for testing: ?hour=18.5 (Algarah time) and ?weather=rain */
function overrides() {
  const q = new URLSearchParams(location.search);
  const hour = q.get('hour');
  const weather = q.get('weather') as Weather | null;
  return {
    now: () => {
      if (hour === null) return new Date();
      const d = new Date();
      // Algarah is UTC+5:30
      d.setUTCHours(0, 0, 0, 0);
      return new Date(d.getTime() + (Number(hour) - 5.5) * 3600e3);
    },
    weather,
  };
}

let started = false;
function start() {
  if (started) return;
  started = true;
  const o = overrides();
  const tick = () => {
    const now = o.now();
    moonPhase = getMoonIllumination(now).phase;
    // only carry the weather over; sun/moon are recomputed
    state = astro(now, { weather: state.weather, cloud: state.cloud, tempC: state.tempC, live: state.live });
    emit();
  };
  const refresh = () => fetchWeather()
    .then((v) => {
      state = { ...state, ...v, live: true };
      if (o.weather) state = { ...state, weather: o.weather, cloud: o.weather === 'clear' ? 0.05 : 0.85 };
      emit();
    })
    .catch(() => { /* keep the clear-sky fallback */ });
  tick();
  if (o.weather) state = { ...state, weather: o.weather, cloud: o.weather === 'clear' ? 0.05 : 0.85 };
  refresh();
  setInterval(tick, 60e3);
  setInterval(refresh, 15 * 60e3);
}

/* For canvas code: read the latest state without React. */
export function getWorld() {
  start();
  return state;
}
export const getMoonPhase = () => moonPhase;

export function useWorld() {
  useEffect(start, []);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state);
}

/* Hour of the day in Algarah (0–23.99), honouring ?hour= */
export function homeHour() {
  const [h, m] = overrides().now().toLocaleTimeString('en-GB', { timeZone: HOME.tz, hour: '2-digit', minute: '2-digit', hour12: false }).split(':').map(Number);
  return (h % 24) + m / 60;
}

/* Local time in Algarah, e.g. "9:41 PM" */
export function homeTime(d = new Date()) {
  return d.toLocaleTimeString('en-IN', { timeZone: HOME.tz, hour: 'numeric', minute: '2-digit', hour12: true });
}
