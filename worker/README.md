# Room backend (Cloudflare Worker + D1)

Powers the guestbook on the corkboard, the global "cats petted" counter and the
"visitors here now" count. The free tier is plenty.

## One-time setup

```sh
cd worker
npx wrangler login                       # opens the browser
npx wrangler d1 create oran6ie-room      # copy the database_id into wrangler.toml
npx wrangler d1 execute oran6ie-room --remote --file=schema.sql
npx wrangler secret put ADMIN_TOKEN      # any long random string; used on /admin
npx wrangler deploy                      # prints https://oran6ie-room.<you>.workers.dev
```

Then put that URL in `src/content/backend.ts` (`API_URL`) and push.
Without it the site still works; the online bits simply stay hidden.

## Moderating notes

Open `https://oran6ie-room.<you>.workers.dev/admin`, paste the admin token,
then approve or delete. New notes stay hidden until approved.
