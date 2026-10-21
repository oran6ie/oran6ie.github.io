/*
  The room's tiny backend.
  GET  /stats              → { pets, here }
  POST /pet   { n }        → adds up to 50 pets at once (the page batches them)
  POST /hello { id }       → "I'm here": keeps a visitor counted for 90 seconds
  GET  /notes              → approved guestbook notes, newest first
  POST /notes { name, msg, color } → a new note, hidden until approved; returns its id
  GET  /admin              → moderation page (needs the ADMIN_TOKEN secret)
*/
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...headers } });

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

async function ipHash(req) {
  const ip = req.headers.get('cf-connecting-ip') ?? 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`oran6ie:${ip}`));
  return [...new Uint8Array(buf)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cors(req, env) {
  const origin = req.headers.get('origin') ?? '';
  const ok = env.ALLOWED_ORIGINS.split(',').includes(origin);
  return ok ? { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
}

const here = async (env) => {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM presence WHERE seen > ?').bind(Date.now() - 90e3).first();
  return r?.n ?? 0;
};
const pets = async (env) => (await env.DB.prepare("SELECT value FROM counters WHERE key = 'pets'").first())?.value ?? 0;

const authorised = (req, env) => env.ADMIN_TOKEN && req.headers.get('authorization') === `Bearer ${env.ADMIN_TOKEN}`;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};

    try {
      if (url.pathname === '/stats' && req.method === 'GET') return json({ pets: await pets(env), here: await here(env) }, 200, h);

      if (url.pathname === '/pet' && req.method === 'POST') {
        const n = Math.max(0, Math.min(50, Math.floor(Number(body.n) || 0)));
        if (n) await env.DB.prepare("UPDATE counters SET value = value + ? WHERE key = 'pets'").bind(n).run();
        return json({ pets: await pets(env) }, 200, h);
      }

      if (url.pathname === '/hello' && req.method === 'POST') {
        const id = clean(body.id, 40);
        if (!/^[a-z0-9-]{8,40}$/i.test(id)) return json({ error: 'bad id' }, 400, h);
        const now = Date.now();
        await env.DB.batch([
          env.DB.prepare('INSERT INTO presence (id, seen) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET seen = excluded.seen').bind(id, now),
          env.DB.prepare('DELETE FROM presence WHERE seen < ?').bind(now - 10 * 60e3),
        ]);
        return json({ here: await here(env), pets: await pets(env) }, 200, h);
      }

      if (url.pathname === '/notes' && req.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT id, name, msg, color, at FROM notes WHERE approved = 1 ORDER BY at DESC LIMIT 40').all();
        return json({ notes: results }, 200, { ...h, 'cache-control': 'public, max-age=30' });
      }

      if (url.pathname === '/notes' && req.method === 'POST') {
        const name = clean(body.name, 24), msg = clean(body.msg, 140), color = Math.max(0, Math.min(4, Math.floor(Number(body.color) || 0)));
        if (body.website) return json({ ok: true }, 200, h); // honeypot field: only bots fill it in
        if (!name || msg.length < 2) return json({ error: 'Write a name and a message.' }, 400, h);
        const ip = await ipHash(req);
        const recent = await env.DB.prepare('SELECT COUNT(*) AS n FROM notes WHERE ip = ? AND at > ?').bind(ip, Date.now() - 10 * 60e3).first();
        if ((recent?.n ?? 0) >= 2) return json({ error: 'You just pinned a note. Try again in a few minutes.' }, 429, h);
        const r = await env.DB.prepare('INSERT INTO notes (name, msg, color, ip, at) VALUES (?, ?, ?, ?, ?)').bind(name, msg, color, ip, Date.now()).run();
        return json({ ok: true, id: r.meta?.last_row_id }, 200, h);
      }

      // ── moderation ──
      if (url.pathname === '/admin' && req.method === 'GET') return new Response(ADMIN_PAGE, { headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (url.pathname.startsWith('/admin/')) {
        if (!authorised(req, env)) return json({ error: 'unauthorised' }, 401);
        if (url.pathname === '/admin/pending') {
          const { results } = await env.DB.prepare('SELECT id, name, msg, color, approved, at FROM notes ORDER BY approved ASC, at DESC LIMIT 100').all();
          return json({ notes: results });
        }
        const id = Math.floor(Number(body.id));
        if (url.pathname === '/admin/approve') await env.DB.prepare('UPDATE notes SET approved = 1 WHERE id = ?').bind(id).run();
        else if (url.pathname === '/admin/delete') await env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
        else return json({ error: 'not found' }, 404);
        return json({ ok: true });
      }

      return json({ error: 'not found' }, 404, h);
    } catch {
      return json({ error: 'server error' }, 500, h);
    }
  },
};

const ADMIN_PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Guestbook moderation</title>
<style>body{font:16px system-ui;background:#0b0a1a;color:#ece9ff;max-width:720px;margin:0 auto;padding:16px}
.n{border:2px solid #2c2a63;padding:10px;margin:10px 0}.n.ok{opacity:.6}b{color:#ffe066}button{font:inherit;margin-right:8px}
input{font:inherit;width:100%;padding:6px;box-sizing:border-box}</style>
<h1>Guestbook moderation</h1>
<p><input id="t" type="password" placeholder="Admin token"></p><button onclick="load()">Load notes</button>
<div id="list"></div>
<script>
const t = document.getElementById('t'); t.value = localStorage.getItem('tok') || '';
const call = (p, b) => fetch(p, { method: b ? 'POST' : 'GET', headers: { authorization: 'Bearer ' + t.value, 'content-type': 'application/json' }, body: b && JSON.stringify(b) }).then((r) => r.json());
async function load() {
  localStorage.setItem('tok', t.value);
  const { notes, error } = await call('/admin/pending');
  const list = document.getElementById('list'); list.textContent = error || '';
  for (const n of notes || []) {
    const d = document.createElement('div'); d.className = 'n' + (n.approved ? ' ok' : '');
    const head = document.createElement('div');
    const who = document.createElement('b'); who.textContent = n.name;
    head.append(who, ' · ' + new Date(n.at).toLocaleString() + (n.approved ? ' · live' : ' · pending'));
    const p = document.createElement('p'); p.textContent = n.msg;
    d.append(head, p);
    if (!n.approved) { const a = document.createElement('button'); a.textContent = 'Approve'; a.onclick = () => call('/admin/approve', { id: n.id }).then(load); d.append(a); }
    const x = document.createElement('button'); x.textContent = 'Delete'; x.onclick = () => call('/admin/delete', { id: n.id }).then(load); d.append(x);
    list.append(d);
  }
}
</script>`;
