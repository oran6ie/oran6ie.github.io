/*
  Real-calendar events that decorate the room. Dashain and Tihar follow the
  lunar calendar, so their dates are listed per year (update when new years are
  announced). Preview any event with ?festival=dashain|tihar|kukur|christmas|birthday
*/
import { HOME } from './world';

export type Festival = 'dashain' | 'tihar' | 'kukur' | 'christmas' | 'birthday';

export const BIRTHDAY = { month: 2, day: 10, year: 2001 }; // 10 February 2001

// [first day, last day] inclusive, YYYY-MM-DD in Nepal/India time
const LUNAR: Record<'dashain' | 'tihar' | 'kukur', [string, string][]> = {
  dashain: [['2026-10-12', '2026-10-26'], ['2027-10-01', '2027-10-15']], // Vijaya Dashami: 21 Oct 2026, ~9 Oct 2027
  tihar: [['2026-11-07', '2026-11-11'], ['2027-10-27', '2027-10-31']],
  kukur: [['2026-11-08', '2026-11-08'], ['2027-10-28', '2027-10-28']], // Kukur Tihar: the day for dogs (and, here, cats)
};

/* The big greeting banner when the room opens: a headline and one small line under it */
export const FESTIVAL_INFO: Record<Festival, { name: string; title: string; line: string }> = {
  dashain: { name: 'Dashain', title: 'HAPPY DASHAIN!', line: 'Tika, jamara and an 8-bit Dashain tune on the radio' },
  tihar: { name: 'Tihar', title: 'HAPPY TIHAR!', line: 'Diyas on the windowsill and marigolds everywhere' },
  kukur: { name: 'Kukur Tihar', title: 'HAPPY KUKUR TIHAR!', line: 'The cats got their tika and garlands today' },
  christmas: { name: 'Christmas', title: 'MERRY CHRISTMAS!', line: 'Snow, a tiny tree and cats in Santa hats' },
  birthday: { name: 'Birthday', title: "IT'S MY BIRTHDAY!", line: "There's cake on the desk" },
};

function homeDate(d = new Date()) {
  // YYYY-MM-DD in Algarah's time zone
  return d.toLocaleDateString('en-CA', { timeZone: HOME.tz });
}

/* All festivals happening today (Kukur Tihar is also Tihar) */
export function festivalsToday(d = new Date()): Festival[] {
  const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('festival') : null;
  if (forced) return (forced === 'kukur' ? ['tihar', 'kukur'] : [forced]) as Festival[];
  const today = homeDate(d);
  const out: Festival[] = [];
  for (const [f, ranges] of Object.entries(LUNAR) as [keyof typeof LUNAR, [string, string][]][]) {
    if (ranges.some(([a, b]) => today >= a && today <= b)) out.push(f);
  }
  const [, m, day] = today.split('-').map(Number);
  if (m === 12 && day >= 20 && day <= 26) out.push('christmas');
  if (m === BIRTHDAY.month && day === BIRTHDAY.day) out.push('birthday');
  return out;
}

export const birthdayAge = (d = new Date()) => Number(homeDate(d).slice(0, 4)) - BIRTHDAY.year;
