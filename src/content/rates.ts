/*
  The rate card (#shop): opens below the room when you click the vending machine (game/RateCard.tsx).
  Prices are starting prices, in USD and INR. `unit` shows under the price ("per hour" etc.).
*/
import type { CatId } from './cats';

export type Service = { name: string; desc: string; eta?: string; usd: number; inr: number; unit?: string; rate?: boolean };
export type RateSection = {
  title: string;
  note: string;
  color: 'cyan' | 'pink' | 'orange' | 'green' | 'violet' | 'yellow';
  // a cat napping on top of the section; pose is a sprite in public/media/game/cats/
  perch?: { cat: CatId; pose: string; line: string };
  items: Service[];
};

export const rateCard = {
  label: 'Rate card · freelance · 2026',
  tagline: 'Video editor and motion designer in Kolkata, working remotely with brands worldwide. High-energy promos, cinematic apparel campaigns, motion graphics and AI-assisted ads, from raw footage to final delivery.',
  stats: [
    ['Senior', 'Video Editor at WHACK Sports, Melbourne'],
    ['2.3M', 'Views on my Radio by Bershy lyric video'],
    ['BFA', 'Applied Arts, Amity University'],
  ] as [string, string][],
  languages: 'English · Hindi · Nepali · Bengali · Kolkata, India (IST) · Remote worldwide',
  inrNote: 'INR prices are for clients in India.',
};

// INR prices are local prices for clients in India: ₹50 for every $1
export const hourlyRate = { usd: 40, inr: 2000 };

export const extras = {
  rush: { label: 'Rush, under 48 hours', pct: 40 },
  files: { label: 'Project files handed over', pct: 25 },
};

export const rateSections: RateSection[] = [
  {
    title: 'Short-form & social', note: 'Reels, TikTok, YouTube Shorts · 9:16', color: 'cyan',
    items: [
      { name: 'Standard reel edit', desc: 'Up to 60s from your footage. Tight cuts, captions, music, colour and loudness levelled.', eta: '2 days', usd: 60, inr: 3000 },
      { name: 'Premium reel', desc: 'Kinetic type, sound effects, punch-in zooms, motion graphics and a strong hook built for retention.', eta: '3 days', usd: 150, inr: 7500 },
      { name: 'Talking head with captions', desc: 'Up to 90s. Dead air cut, styled captions, zooms on key words, b-roll and on-screen callouts.', eta: '2 days', usd: 90, inr: 4500 },
      { name: 'Reel pack, 5 from one shoot', desc: 'Five standard reels cut from one batch of footage, one consistent look.', eta: '5 days', usd: 250, inr: 12500 },
    ],
  },
  {
    title: 'Ads & brand films', note: 'E-commerce, Amazon, Meta, storefronts', color: 'pink',
    perch: { cat: 'miko', pose: 'sprawl', line: 'Miko is guarding the ad section. Zzz.' },
    items: [
      { name: 'Product promo ad', desc: '15–30s product ad with motion graphics, offer text, SFX and a clear call to action.', eta: '4–5 days', usd: 300, inr: 15000 },
      { name: 'Extra ad version', desc: 'Resize to 9:16, 1:1 or 16:9, or a new hook, offer or end card on an approved ad.', eta: '1 day', usd: 40, inr: 2000, unit: 'per version' },
      { name: 'Cinematic apparel / brand film', desc: '60–90s campaign film. Edit, grade, sound design, titles and cut-downs for social.', eta: '7–10 days', usd: 1000, inr: 50000 },
      { name: 'Short film edit', desc: 'Narrative short up to 10 minutes. Story edit, pacing, colour, sound and titles.', eta: '2–3 weeks', usd: 1500, inr: 75000 },
    ],
  },
  {
    title: 'Motion & AI', note: 'After Effects, Higgsfield, generative tools', color: 'orange',
    perch: { cat: 'bibi', pose: 'loaf', line: 'Bibi is loafing on the motion work. Very affectionate.' },
    items: [
      { name: 'Motion graphics / explainer', desc: 'Animated titles, kinetic type, icons and transitions. Priced per 30 seconds of animation.', eta: '5 days', usd: 350, inr: 17500, unit: 'per 30s' },
      { name: 'UI / app motion', desc: 'Screen animations and a reusable motion system for a product or platform.', eta: '1 week', usd: 500, inr: 25000 },
      { name: 'AI campaign video', desc: 'Reference, AI stills, AI motion, final edit. 15–30s ad or promo. Generation credits billed at cost.', eta: '5–7 days', usd: 500, inr: 25000 },
    ],
  },
  {
    title: 'YouTube & music', note: 'Long-form, lyric videos, edits', color: 'green',
    perch: { cat: 'topi', pose: 'curl', line: 'Topi curled up on the YouTube section. Purr.' },
    items: [
      { name: 'YouTube video edit', desc: 'Up to 15 minutes. Cuts, b-roll, captions or callouts, music, SFX and a retention-first pace.', eta: '4–5 days', usd: 200, inr: 10000 },
      { name: 'Lyric video / music edit', desc: 'Up to 4 minutes. Animated lyrics synced to the beat, styled to the song and artist.', eta: '1 week', usd: 300, inr: 15000 },
      { name: 'Thumbnail', desc: 'Custom YouTube thumbnail with cut-out, retouching and bold title. One extra variant included.', eta: '1 day', usd: 25, inr: 1250 },
    ],
  },
  {
    title: 'Portfolio websites', note: 'Sites like this one', color: 'cyan',
    perch: { cat: 'lebu', pose: 'curl', line: 'Lebu fell asleep on the keyboard mid-website.' },
    items: [
      { name: 'Clean Folio', desc: 'A sharp, minimal portfolio site that loads fast and shows your work first.', eta: '1 week', usd: 500, inr: 25000 },
      { name: 'Level Up', desc: 'Already have a site? Redesign it, speed it up and add motion.', eta: '1 week', usd: 350, inr: 17500 },
      { name: 'Pixel Quest Site', desc: 'A fully custom game-style portfolio: your own world, characters and interactions.', eta: '3–4 weeks', usd: 3000, inr: 150000 },
    ],
  },
  {
    title: 'Time & monthly plans', note: 'For ongoing or open-ended work', color: 'yellow',
    items: [
      { name: 'Hourly', desc: 'Small fixes, changes to existing projects, or work that is hard to scope.', usd: hourlyRate.usd, inr: hourlyRate.inr, unit: 'per hour', rate: true },
      { name: 'Day rate', desc: '8 hours of dedicated editing or design for your project.', usd: 300, inr: 15000, unit: 'per day', rate: true },
      { name: 'Content plan · 12 reels', desc: '12 standard reels a month, one look across your feed, priority turnaround.', usd: 650, inr: 32500, unit: 'per month' },
      { name: 'Content plan · 20 reels', desc: '20 standard reels a month, one look across your feed, priority turnaround and a monthly planning call.', usd: 1050, inr: 52500, unit: 'per month' },
    ],
  },
];

// {hourly} is replaced with the hourly rate
export const rateTerms = [
  '2 rounds of changes included. Extra rounds are billed at my hourly rate, {hourly} an hour.',
  'Rush delivery in under 48 hours adds 40%.',
  '50% to start, 50% on delivery. Monthly plans are paid at the start of each month.',
  'Stock footage, music licences, fonts and AI generation credits are billed at cost.',
  'Project files (Premiere Pro, After Effects, PSD) can be handed over for 25% extra.',
  'Delivered as MP4 in 1080p or 4K, in any aspect ratio you need. Previews are full quality, so an approved preview is the final file.',
  'Turnaround starts once I have your footage, assets and brief.',
  'Every project gets a fixed quote before work begins. These are starting prices.',
];
