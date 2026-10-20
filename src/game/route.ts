import { useEffect, useState } from 'react';
import { locations, type LocationKey } from '../content/game';

/*
  The game's "screens" live in the URL hash so links are shareable and the
  browser Back button closes panels:  ''  title · #hub · #quick · #work, #shop …
*/
export type Route =
  | { screen: 'title' }
  | { screen: 'quick' }
  | { screen: 'hub'; panel: LocationKey | null };

// Old section links (e.g. from the AI page) map onto the new panels
const LEGACY: Record<string, LocationKey> = { about: 'player', experience: 'journey', education: 'journey' };

export function parseRoute(hash: string, skipTitle: boolean): Route {
  const h = hash.replace(/^#/, '');
  if (h === 'quick') return { screen: 'quick' };
  if (h === 'hub') return { screen: 'hub', panel: null };
  if (h in locations) return { screen: 'hub', panel: h as LocationKey };
  if (h in LEGACY) return { screen: 'hub', panel: LEGACY[h] };
  return skipTitle ? { screen: 'hub', panel: null } : { screen: 'title' };
}

const EVENT = 'routechange';

export function go(hash: string) {
  const url = hash ? `#${hash}` : location.pathname + location.search;
  if (url === location.hash || (!hash && !location.hash)) return;
  history.pushState(null, '', url);
  window.dispatchEvent(new Event(EVENT));
}

export function useRoute(skipTitle: boolean) {
  const [route, setRoute] = useState(() => parseRoute(location.hash, skipTitle));
  useEffect(() => {
    const sync = () => setRoute(parseRoute(location.hash, false));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);
  return route;
}
