// Refreshes src/content/youtube.json from YouTube's public channel page and RSS feed.
// Runs before every build; if YouTube can't be reached it keeps the last saved data.
import fs from 'node:fs';

const FILE = new URL('../src/content/youtube.json', import.meta.url);
const CHANNEL = { handle: '@oran6ie', id: 'UCRQIZBfZ-y_DImm8qfc6RHA' };
const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : null;

async function get(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.text();
}
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

try {
  const page = await get(`https://www.youtube.com/${CHANNEL.handle}`);
  const subscribers = page.match(/([\d.,]+[KM]?) subscribers/)?.[1] ?? old?.subscribers;
  const videoCount = Number(page.match(/([\d,]+) videos/)?.[1]?.replace(/,/g, '')) || old?.videoCount;

  const feed = await get(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL.id}`);
  const videos = feed.split('<entry>').slice(1).map((e) => ({
    id: e.match(/<yt:videoId>([^<]+)/)[1],
    title: decode(e.match(/<title>([^<]+)/)[1]),
    published: e.match(/<published>([^<]+)/)[1].slice(0, 10),
    views: Number(e.match(/views="(\d+)"/)?.[1] ?? 0),
  })).filter((v) => !/LIVE|stream/i.test(v.title));

  const data = { ...CHANNEL, url: `https://www.youtube.com/${CHANNEL.handle}`, subscribers, videoCount, monetized: true, updated: new Date().toISOString().slice(0, 10), videos };
  fs.writeFileSync(FILE, JSON.stringify(data, null, 1) + '\n');
  console.log(`youtube: ${subscribers} subscribers, ${videoCount} videos, ${videos.length} recent uploads`);
} catch (e) {
  if (!old) throw e;
  console.log(`youtube: offline (${e.message}); keeping data from ${old.updated}`);
}
