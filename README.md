# oran6ie.github.io

Portfolio of Alankrit Thapa, built with React + Vite and published to GitHub Pages.

- `/` main portfolio
- `/ai/` AI Works
- `/cv/` printable CV

## Updating content

Everything you'd normally change lives in `src/content/`:

| File | What's in it |
| --- | --- |
| `site.ts` | Hero text, bio, about, tools, languages, experience, education, contact |
| `projects.ts` | Selected Work cards (order, titles, links, preview clips) |
| `aiProjects.ts` | AI Works projects and their 4 pipeline stages |
| `cv.ts` | Wording specific to the CV page |

Images and clips go in `public/media/` and are referenced without the `public/`
prefix, e.g. `media/work/radio-bershy.mp4`. Full `https://` links (Cloudinary
etc.) work too.

**Prefer MP4 over GIF** for animated previews; it's usually 10–30× smaller.
On Cloudinary you can get an MP4 of any GIF by changing the link's `.gif` to `.mp4`.

You can edit these files directly on github.com. Every push to `main`
rebuilds the site automatically (see the Actions tab), live about a minute later.

## Running locally

```sh
npm install
npm run dev      # http://localhost:5173 with live reload
npm run build    # production build into dist/
```
