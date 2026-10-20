/*
  AI Works page (/ai/) — each project walks through the 4-stage pipeline.

  Media paths work like projects.ts: files in public/media/ai/... written without
  "public/", or full https:// links. A clip is { src: '...mp4', poster: '...jpg' };
  an image is just its path. Leave a stage's list empty to show "add image" slots.
  Tags can be coloured: { label: 'Higgsfield AI', color: 'amber' } (amber or cyan).
*/

export type Media = string | { src: string; poster?: string };
export type Tag = string | { label: string; color: 'amber' | 'cyan' };

export type AiProject = {
  title: string;
  titleItalic: string;
  desc: string;
  tags: Tag[];
  refImages: Media[];    // stage 01, up to 4
  refNote?: string;
  genImages: Media[];    // stage 02, up to 3
  genNote?: string;
  motionClips: Media[];  // stage 03, up to 2
  motionNote?: string;
  finalVideo?: string;   // stage 04 — YouTube / Vimeo link, iframe code, or .mp4
  finalNote?: string;
};

export const aiBio =
  'End-to-end AI-assisted production — from reference image to final video. Every project documents the full pipeline: source material, generative output, motion pass, and finished edit.';

export const aiTicker = [
  'Reference Images', 'AI Generation', 'Motion Pass', 'Final Edit', 'Higgsfield AI', 'Runway ML', 'Midjourney',
  'Premiere Pro', 'After Effects', 'Product Campaigns', 'Apparel', 'Brand Identity',
];

const adv = 'media/ai/adventure-themed-apparel-campaign';
const trv = 'media/ai/travel-themed-apparel-campaign';

export const aiProjects: AiProject[] = [
  {
    title: 'Adventure Themed',
    titleItalic: 'Apparel Campaign',
    desc: 'Raw product references fed through generative tools to create studio-grade visuals, animated with AI motion, cut into a conversion-optimised campaign video.',
    tags: ['E-Commerce', 'Product Shoot', { label: 'AI Generated', color: 'cyan' }, { label: 'Higgsfield AI', color: 'amber' }],
    refImages: [`${adv}/ref-1.webp`, `${adv}/ref-2.webp`],
    refNote: 'Original product images used as input references — apparel, required elements for accuracy eg. Planes, Bikes',
    genImages: [`${adv}/gen-1.webp`, `${adv}/gen-2.webp`],
    genNote: 'AI-generated product visuals from reference inputs. Realistic ligthing, styled backgrounds, and compositional variations.',
    motionClips: [
      { src: `${adv}/motion-1.mp4`, poster: `${adv}/motion-1.jpg` },
      { src: `${adv}/motion-2.mp4`, poster: `${adv}/motion-2.jpg` },
    ],
    motionNote: 'Generated stills animated using Higgsfield AI. Camera motion, dynamic action, and product reveals.',
    finalVideo: 'https://vimeo.com/1177806200',
    finalNote: 'Final campaign video — AI-generated assets assembled, colour-graded, and cut in Premiere Pro.',
  },
  {
    title: 'Travel Themed',
    titleItalic: 'Apparel Campaign',
    desc: 'Raw product references fed through generative tools to create studio-grade visuals, animated with AI motion, cut into a conversion-optimised campaign video.',
    tags: ['Travel', 'Apparel', 'Mountains', 'Higgsfield', 'Story Campaign', 'Nano Banana Pro', 'Kling 3.0'],
    refImages: [`${trv}/ref-1.webp`, `${trv}/ref-2.webp`],
    refNote: 'Ghost Mockups for Graphic Apparel and Adventure Jacket.',
    genImages: [`${trv}/gen-1.webp`, `${trv}/gen-2.webp`],
    genNote: 'Realistic Model Images generated using Nano Banana Pro, no plastic AI look or fake cinematic lighting.',
    motionClips: [
      { src: `${trv}/motion-1.mp4`, poster: `${trv}/motion-1.jpg` },
      { src: `${trv}/motion-2.mp4`, poster: `${trv}/motion-2.jpg` },
    ],
    motionNote: 'Animated motion using Kling 3.0 on Higgsfield to give natural cmaera movement and lighting',
    finalVideo: 'https://vimeo.com/1177805674',
    finalNote: 'Final Cut edited using Adobe Premiere Pro.',
  },
];
