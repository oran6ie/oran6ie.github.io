/*
  Game-flavoured wording for the hub world. Facts (jobs, dates, tools) live in
  site.ts; this file only dresses them up. Edit freely.
*/
import type { BadgeKey } from '../game/art/sprites';
import type { ToolIcon } from '../game/art/toolIcons';

export const CAREER_START = new Date(2021, 7, 1); // Aug 2021, first design job

export const player = {
  name: 'ALANKRIT',
  surname: 'THAPA',
  className: 'Video Editor · Motion Designer',
  title: 'Lead Video Editor & Senior Graphic Designer',
  home: 'Kalimpong, W.B.',
  base: 'Kolkata, India',
  status: 'Available — accepting new quests',
  greeting: "Hey, I'm Alankrit! I cut videos, animate things and build fun stuff like this room. Click around — every object opens a part of my portfolio.",
};

/* Start screen */
export const title = {
  tagline: 'Video Editor · Motion Designer',
  menu: ['Start Game', 'Quick View', 'Options', 'Credits'] as const,
  credits: [
    ['Design & code', 'Alankrit Thapa'],
    ['Built with', 'React + Vite'],
    ['Pixel art', 'Hand-coded placeholders'],
    ['Fonts', 'Press Start 2P · Pixelify Sans'],
    ['Inspired by', 'Cozy 16-bit games'],
  ] as const,
};

/* Inventory: each tool from site.ts `arsenal`, keyed by its name */
export const inventory: Record<string, { icon: ToolIcon; role: string; desc: string }> = {
  'Adobe Premiere Pro': { icon: 'pr', role: 'Main editor', desc: 'Turns hours of raw footage into tight, high-retention edits.' },
  'Adobe After Effects': { icon: 'ae', role: 'Motion & VFX', desc: 'Titles, VFX, compositing and UI animation.' },
  'Adobe Photoshop': { icon: 'ps', role: 'Image editing', desc: 'Retouching, thumbnails, key art and matte painting.' },
  'Adobe Illustrator': { icon: 'ai', role: 'Vector design', desc: 'Logos, icons and brand graphics that scale forever.' },
  'Motion Graphics': { icon: 'motion', role: 'Craft', desc: 'Kinetic type, transitions and animated systems.' },
  'Higgsfield AI': { icon: 'higgsfield', role: 'AI generation', desc: 'Generative stills and motion for AI-assisted campaigns.' },
  'Claude AI': { icon: 'claude', role: 'AI assistant', desc: 'Scripting, ideation and building sites like this one.' },
};

export function rarity(pct: number) {
  if (pct >= 95) return { label: 'Legendary', cls: 'legendary' };
  if (pct >= 90) return { label: 'Epic', cls: 'epic' };
  if (pct >= 85) return { label: 'Rare', cls: 'rare' };
  return { label: 'Uncommon', cls: 'uncommon' };
}

export const achievements: { badge: BadgeKey; name: string; desc: string; locked?: boolean }[] = [
  { badge: 'eye', name: 'Viral Hit', desc: 'My Radio by Bershy lyric videos passed 2.3M and 1M views on YouTube.' },
  { badge: 'play', name: 'Partner', desc: 'Monetized YouTube channel with 10K+ subscribers.' },
  { badge: 'clock', name: 'Veteran', desc: 'Years in the game since the first design job in Aug 2021.' },
  { badge: 'up', name: 'Level Up ×3', desc: 'Promoted from Video Editor to Senior to Lead at Deployed.' },
  { badge: 'scroll', name: 'Scholar', desc: 'Bachelor of Fine Arts (Applied Arts), Amity University.' },
  { badge: 'spark', name: 'AI Alchemist', desc: 'Shipped full AI pipelines: reference → generate → motion → final cut.' },
  { badge: 'chat', name: 'Polyglot', desc: 'Speaks English, Hindi, Nepali and Bengali.' },
  { badge: 'lock', name: '??? Your Project', desc: 'Locked — unlock it by sending me a quest.', locked: true },
];

/* The Shop: building portfolio sites for other people */
export const shop = {
  keeper: 'Pixel',
  greeting: 'Welcome, traveller! Like this room? Alankrit builds portfolio sites like this one for creatives. Take a look at the wares.',
  wares: [
    { name: 'Pixel Quest Site', tag: 'Custom', desc: 'A fully custom, game-style portfolio like this one: your own world, characters and interactions.' },
    { name: 'Clean Folio', tag: 'Fast', desc: 'A sharp, minimal portfolio site that loads fast and shows your work first.' },
    { name: 'Level Up', tag: 'Refresh', desc: 'Already have a site? Redesign, speed it up and add motion.' },
  ],
  price: 'Prices vary by quest — ask for a quote.',
  cta: 'Ask the shopkeeper',
};

/* Labels for the clickable objects in the room */
export const locations = {
  player: { label: 'Player Card', hint: 'About me' },
  work: { label: 'Quest Log', hint: 'My work' },
  ai: { label: 'AI Lab', hint: 'AI projects' },
  journey: { label: 'World Map', hint: 'Experience' },
  achievements: { label: 'Trophies', hint: 'Highlights' },
  inventory: { label: 'Inventory', hint: 'Tools & skills' },
  shop: { label: 'Shop', hint: 'Get a site like this' },
  contact: { label: 'Mailbox', hint: 'Contact' },
  party: { label: 'Party', hint: 'Meet the cats' },
  memorial: { label: 'In Memory', hint: 'Cats we miss' },
  painting: { label: 'Painting', hint: 'Painted by me' },
  window: { label: 'Window', hint: 'Algarah, right now' },
  piano: { label: 'Piano', hint: 'Play it!' },
  channel: { label: 'YouTube', hint: 'My channel' },
  bulb: { label: 'Smart Bulb', hint: 'Change the lights' },
  arcade: { label: 'Arcade', hint: 'Mini-games' },
  guestbook: { label: 'Guestbook', hint: 'Pin a note' },
} as const;
export type LocationKey = keyof typeof locations;
