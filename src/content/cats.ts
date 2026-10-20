/*
  The cats of the room — the living party members, and the ones remembered on
  the wall. Sprites are in public/media/game/cats/ (named <id>-<pose>.png).
*/

export type CatId = 'miko' | 'lebu' | 'bibi' | 'topi';

export type Cat = {
  id: CatId;
  name: string;
  gender: 'Female' | 'Male';
  age: string;
  title: string;          // RPG-style class
  traits: string[];
  bio: string;
  echo?: string;          // the cat they remind us of
  // behaviour weights for the room AI (0–1)
  sleepy: number;
  active: number;
  climbsDesk: number;
  hungry: number;
};

export const cats: Cat[] = [
  {
    id: 'miko',
    name: 'Miko',
    gender: 'Female',
    age: '~1.5 years',
    title: 'The Matriarch',
    traits: ['Sleepy', 'Mother of three', 'Green collar'],
    bio: 'Found us in Kolkata while she was pregnant and followed us home, where she gave birth to Topi, Bibi and Lebu. Spends most of the day asleep.',
    echo: 'So much like Sanbi.',
    sleepy: 0.9, active: 0.15, climbsDesk: 0.05, hungry: 0.2,
  },
  {
    id: 'lebu',
    name: 'Lebu',
    gender: 'Male',
    age: '7 months',
    title: 'The Mischief',
    traits: ['Fearless', 'Vocal', 'Stares into your soul'],
    bio: 'Skinny but strong, not a big eater, very smart. He will just stare at you. Not afraid of anything — not even the vacuum. Loves sleeping on the keyboard mid-edit.',
    echo: 'Exactly like Jahangir.',
    sleepy: 0.35, active: 0.8, climbsDesk: 0.75, hungry: 0.2,
  },
  {
    id: 'bibi',
    name: 'Bibi',
    gender: 'Male',
    age: '7 months',
    title: 'The Big Boy',
    traits: ['Always hungry', 'Scaredy-cat', 'Affectionate'],
    bio: 'Also called Bittu. The biggest and the hungriest of the three. Doesn’t talk much — he only meows when he wants food — but he is very affectionate, and scared of everything.',
    echo: 'The same as Mote.',
    sleepy: 0.55, active: 0.35, climbsDesk: 0.1, hungry: 0.9,
  },
  {
    id: 'topi',
    name: 'Topi',
    gender: 'Female',
    age: '7 months',
    title: 'The Chatterbox',
    traits: ['Affectionate', 'Vocal', 'Nose biter'],
    bio: 'Affectionate and chatty. Bites noses, loves legs, and will rub against anyone sitting still for too long.',
    echo: 'So similar to Jhusule.',
    sleepy: 0.4, active: 0.65, climbsDesk: 0.25, hungry: 0.4,
  },
];

/* ── In loving memory (the three frames on the wall) ── */

export type Remembered = { name: string; note: string };

export const memorial: { frame: 'shadow' | 'sanbi' | 'kittens'; title: string; image: string; text: string; cats: Remembered[] }[] = [
  {
    frame: 'shadow',
    title: 'Shadow',
    image: 'media/game/memorial-shadow.png',
    text: 'Our first. She passed away after a miscarriage when I was in class 10. Not long after, we found Sanbi as a kitten.',
    cats: [],
  },
  {
    frame: 'sanbi',
    title: 'Sanbi',
    image: 'media/game/memorial-sanbi.png',
    text: 'Came to us as a kitten after Shadow. She gave birth twice and passed away last year. Miko is so much like her.',
    cats: [],
  },
  {
    frame: 'kittens',
    title: 'Sanbi’s kittens',
    image: 'media/game/memorial-kittens.png',
    text: 'Back in Algarah, good vet care was hard to find, and we couldn’t save them. All five are remembered here.',
    cats: [
      { name: 'Phuche', note: 'The smallest, the runt of the litter. Always weak — the first to go.' },
      { name: 'Bruce', note: 'The calico who once nearly chewed through a mouse cable. Lost to an illness.' },
      { name: 'Jhusule', note: 'Brown and fluffy, and the most clingy — she even sat on the dining table watching me eat. One day she disappeared; I searched but never found her. Topi is so much like her.' },
      { name: 'Mote', note: 'Fluffy and white, and loved sitting on top of the fridge. He slipped out of the house one day and was hit by a car. Bibi is the same as him.' },
      { name: 'Jahangir', note: 'The thin one, who loved the outdoors. The last of them to go, while I was away in Kolkata. Lebu is exactly like him.' },
    ],
  },
];
