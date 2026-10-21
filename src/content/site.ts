/*
  Main portfolio text. Edit anything here and push — the site rebuilds itself.
*/

export const SITE_VERSION = 'v2.0.0';

export const EMAIL = 'alan55krit@gmail.com';

export const LINKS = {
  behance: 'https://www.behance.net/oran6ie',
  linkedin: 'https://www.linkedin.com/in/alankritthapa/',
  youtube: 'https://youtube.com/@oran6ie',
};

export const hero = {
  name: 'Alankrit Thapa',
  meta: ['Kalimpong, W.B.', 'REF · AT-2026', 'Status · WHACK Sports'],
  // Cycled by the typewriter under the name
  roles: ['Senior Video Editor', 'Motion Designer', 'Graphic Designer', 'Visual Storyteller'],
  bio: 'Senior Video Editor and Motion Designer with a BFA — specializing in high-energy promotional content, cinematic apparel campaigns, and digital narratives that hold attention. Clean cuts, dynamic motion, conversion-optimised assets from raw footage to final delivery.',
  stats: [
    { value: '5+', label: 'Years Active' },
    { value: "'21", label: 'Active Since' },
  ],
  ticker: [
    'Senior Video Editor', 'WHACK Sports', 'Motion Designer', 'Graphic Designer', 'Kolkata, India',
    'BFA Applied Arts', 'Premiere Pro', 'After Effects', '5+ Years', 'Narrative Edit', 'VFX', 'UI Motion',
  ],
};

export const intro = {
  sup: 'Creative Operations · Motion & Visual',
  first: 'Alankrit',
  last: 'Thapa',
  role: 'Senior Video Editor · WHACK Sports',
};

export const about = {
  text: 'Specialising in high-energy promotional content, cinematic apparel campaigns, and digital narratives. Every frame is intentional — clean cuts, dynamic motion, and conversion-optimised assets from raw footage to final delivery.',
  tags: ['Narrative Edit', 'Cinematic', 'Brand Campaign', 'Music Video', 'UI Motion', 'E-Commerce', 'VFX'],
};

// `icon` picks one of the badges in src/components/main/ArsenalIcon.tsx
export const arsenal = [
  { name: 'Adobe Premiere Pro', pct: 96, icon: 'Pr' },
  { name: 'Adobe After Effects', pct: 98, icon: 'Ae' },
  { name: 'Adobe Photoshop', pct: 90, icon: 'Ps' },
  { name: 'Adobe Illustrator', pct: 88, icon: 'Ai' },
  { name: 'Motion Graphics', pct: 93, icon: 'play' },
  { name: 'Higgsfield AI', pct: 80, icon: 'higgsfield' },
  { name: 'Claude AI', pct: 75, icon: 'claude' },
] as const;

export const languages = [
  { name: 'English', level: 'Fluent' },
  { name: 'Hindi', level: 'Native' },
  { name: 'Nepali', level: 'Native' },
  { name: 'Bengali', level: 'Conv.' },
];

export const experience = [
  {
    from: 'Jul 2026',
    to: 'Present',
    current: true,
    company: 'WHACK Sports',
    role: 'Senior Video Editor',
    location: 'Melbourne, Australia · Remote from India',
    desc: 'Editing sports content as Senior Video Editor at WHACK Sports.',
  },
  {
    from: 'Apr 2025',
    to: 'Apr 2026',
    company: 'Deployed · India',
    role: 'Lead Video Editor & Senior Graphic Designer',
    location: 'India · Remote / On-site',
    desc: 'Spearheading post-production for promotional campaigns and e-commerce assets. Blending high-fidelity video editing with motion graphics to produce conversion-optimised content across Amazon, YouTube, and digital storefronts. Managing the full visual pipeline from raw footage to final delivery.',
  },
  {
    from: 'Aug 2024',
    to: 'Apr 2025',
    company: 'Deployed · Kolkata',
    role: 'Senior Video Editor & Graphic Designer',
    location: 'Kolkata, India',
    desc: 'Elevated brand visual identity through high-retention content, cinematic apparel campaigns, and platform-optimised assets across digital channels.',
  },
  {
    from: 'Aug 2022',
    to: 'Aug 2024',
    company: 'Deployed · Kolkata',
    role: 'Video Editor & Graphic Designer',
    location: 'Kolkata, India',
    desc: 'Produced video and graphic assets for e-commerce and social platforms. Developed motion design systems that streamlined production workflows.',
  },
  {
    from: 'Aug 2021',
    to: 'Jun 2022',
    company: 'Mayand InfoTech · Kolkata',
    role: 'Junior Graphic Designer',
    location: 'Kolkata, India',
    desc: 'Designed digital assets and visual communications. Built foundational expertise in brand-aligned graphic production.',
  },
];

export const education = {
  degree: 'Bachelor of Fine Arts',
  field: '(Applied Arts)',
  school: 'Amity University',
  location: 'Kolkata, India',
  from: 'Jun 2019',
  to: 'Aug 2023',
  years: ['2019', '2023'],
};

export const contact = {
  pre: 'Get in touch',
  sub: 'Open to full-time roles & collaborations · Kolkata · Remote',
};
