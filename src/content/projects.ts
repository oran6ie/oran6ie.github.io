/*
  Selected Work grid — cards appear in this order.

  To add a project, copy one block and change it:
    preview     looping clip (.mp4) or image (.jpg/.webp/.gif) shown on the card.
                Put files in public/media/work/ and write the path without "public/",
                or paste a full https:// link (Cloudinary etc.).
    poster      still frame shown while the clip loads (optional).
    url         where "View on Behance" goes.
    videoEmbed  optional YouTube/Vimeo link — plays in the popup instead of the preview.
    accent      colour of the card's glow bar.
    category    filter tab it appears under in the Quest Log.
    reward      optional highlight shown like a game reward (views, results…).
*/

export type WorkProject = {
  title: string;
  type: string;
  url: string;
  accent: string;
  preview: string;
  poster?: string;
  videoEmbed?: string;
  category: 'Narrative' | 'Apparel' | 'Product' | 'Motion' | 'VFX' | 'Music Video';
  reward?: string;
};

export const projects: WorkProject[] = [
  {
    title: 'Digital Overload',
    category: 'Narrative',
    type: 'Narrative Shortfilm',
    url: 'https://www.behance.net/gallery/246016001/Digital-Overload-Narrative-Short-Film',
    accent: '#e05c3a',
    preview: 'media/work/digital-overload.mp4',
    poster: 'media/work/digital-overload.jpg',
  },
  {
    title: 'Deployed Aero Cap Launch',
    category: 'Product',
    type: 'High-End Video & Motion Design',
    url: 'https://www.behance.net/gallery/245976175/Aero-Cap-High-End-Video-Motion-Design-Launch',
    accent: '#a0d060',
    preview: 'media/work/deployed-aero-cap-launch.mp4',
    poster: 'media/work/deployed-aero-cap-launch.jpg',
  },
  {
    title: 'Deployed Para Trooper',
    category: 'Apparel',
    type: 'Cinematic Apparel Campaign',
    url: 'https://www.behance.net/gallery/246012311/Deployed-Airtrooper-Cinematic-Apparel-Campaign',
    accent: '#e0a93a',
    preview: 'media/work/deployed-para-trooper.mp4',
    poster: 'media/work/deployed-para-trooper.jpg',
  },
  {
    title: 'UI Motion System',
    category: 'Motion',
    type: 'Automated Marketing Platform MG',
    url: 'https://www.behance.net/gallery/245991737/UI-Motion-System-Automated-Marketing-Platform',
    accent: '#6a8fff',
    preview: 'media/work/ui-motion-system.mp4',
    poster: 'media/work/ui-motion-system.jpg',
  },
  {
    title: 'FOOH Advertising',
    category: 'VFX',
    type: '3D Apparel VFX Breakdown',
    url: 'https://www.behance.net/gallery/246014623/FOOH-Advertising-3D-Apparel-VFX-Breakdown',
    accent: '#4ec9a0',
    preview: 'media/work/fooh-advertising.mp4',
    poster: 'media/work/fooh-advertising.jpg',
  },
  {
    title: 'Radio — Bershy',
    category: 'Music Video',
    type: 'Lyric Video & Motion Design',
    reward: '3.7M+ views on YouTube',
    url: 'https://www.behance.net/gallery/245979613/Radio-Bershy-Lyric-Video-Motion-Design',
    accent: '#e05c8a',
    preview: 'media/work/radio-bershy.mp4',
    poster: 'media/work/radio-bershy.jpg',
  },
];
