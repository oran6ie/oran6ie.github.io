import { useEffect, useState } from 'react';
import { CrtOverlay } from '../components/shared/CrtOverlay';
import { cursorArrow, cursorHand } from '../game/art/sprites';
import { Hub } from '../game/Hub';
import { QuickView } from '../game/QuickView';
import { go, useRoute } from '../game/route';
import { useSettings } from '../game/settings';
import { StartScreen } from '../game/StartScreen';
import { Toaster } from '../game/ui';
import { spriteURL } from '../lib/pixel';
import { SKIP_INTRO_KEY } from '../lib/media';

/* Coming back from /ai/ or /cv/ goes straight to the room, not the title screen. */
function consumeSkipIntro() {
  try {
    const skip = sessionStorage.getItem(SKIP_INTRO_KEY) === '1';
    sessionStorage.removeItem(SKIP_INTRO_KEY);
    return skip;
  } catch {
    return false;
  }
}

export function GamePage() {
  const [skip] = useState(consumeSkipIntro);
  const route = useRoute(skip);
  useSettings();

  // Pixel-art cursors, generated from sprites
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--cursor', `url(${spriteURL(cursorArrow, 2)}) 0 0, auto`);
    root.setProperty('--cursor-hand', `url(${spriteURL(cursorHand, 2)}) 8 0, pointer`);
  }, []);

  // Each screen change replays the pixel "iris" transition
  const screenKey = route.screen;

  return (
    <>
      <CrtOverlay />
      <Toaster />
      <main key={screenKey} className={`screen screen-${screenKey}`}>
        {route.screen === 'title' && <StartScreen onStart={() => go('hub')} onQuick={() => go('quick')} />}
        {route.screen === 'hub' && <Hub panel={route.panel} />}
        {route.screen === 'quick' && <QuickView />}
      </main>
    </>
  );
}
