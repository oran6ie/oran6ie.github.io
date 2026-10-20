# Pixel art prompts

Everything in the hub world is currently placeholder art drawn in code
(`src/game/art/sprites.ts`, `src/game/scenes/*.ts`). Generate the pieces below,
drop the files into an `art-inbox/` folder in this repo, and ask Claude to wire
them in. It will snap them to a clean pixel grid, cut out the green backgrounds,
key the screens so your clips keep playing on them, and re-map the clickable
areas to wherever the objects ended up.

## How to generate

- **Model:** Nano Banana Pro is the best fit. It follows layout instructions and
  reference images closely, and its edit mode keeps a series consistent.
- **Always attach references:**
  - your style screenshots (the cozy gamer room is the closest match), and
  - the layout guide for scenes: `docs/art-refs/room-layout.png` or
    `docs/art-refs/title-layout.png`. These are screenshots of the current
    placeholder art, so the generated scene lines up with the clickable objects.
- **Generate the room first**, then attach the finished room as a style
  reference for every other asset so palette and lighting stay consistent.
- **Backgrounds:** scenes are full images. Sprites and icons go on a flat
  **pure green `#00FF00`** background so they can be cut out. Items that are
  green themselves (the lens, plants) use **pure magenta `#FF00FF`** instead.
- **Size:** generate scenes at 16:9 (2K if offered), sprites and icons at 1:1.
  Exact pixel counts don't matter; they get rescaled to the grid.

### Style block — paste at the start of every prompt

> 16-bit pixel art, SNES-era game art, crisp hard-edged square pixels, no
> anti-aliasing, no blur, no gradients except dithering. Dark but colourful
> night palette: deep indigo and navy shadows (#0b0a1a, #1d1b45, #2a2860), neon
> pink #ff4fd8, cyan #3be8ff, warm lamp orange #ff7a3d, gold #ffe066, leaf green
> #4ee38a. Cozy, warm-lit night mood like Stardew Valley, Kingdom and Eastward.
> No text, no letters, no watermark, no UI.

---

## A. Title screen

### A1 `title-keyart.png` — one full image (simplest)
16:9. Attach `title-layout.png`.
> [style block] Wide title-screen background for a retro game. Night over the
> Himalayan foothills of Kalimpong, India. A deep indigo sky with stars and a
> large pale-gold full moon in the upper right. A range of snow-capped peaks
> like Kanchenjunga across the middle, lit by moonlight in lavender and purple,
> with a warm magenta glow along the horizon. Rolling dark foothills below,
> dotted with a small hill town of tiny houses with glowing yellow and orange
> windows. Tall pine-tree silhouettes along the bottom edge. Gentle falling snow.
> Leave the centre third uncluttered (dark sky and soft mountains) so a title
> logo and menu can sit on top. Match the composition of the reference.

### A2–A5 parallax layers (optional, for the mouse-parallax effect)
Same prompt as A1, but one layer per image, each on pure green `#00FF00`
except the sky:
- `title-sky.png` — sky, stars and moon only (no green background)
- `title-mountains.png` — just the snowy range
- `title-hills.png` — just the foothills and the lit town
- `title-trees.png` — just the pine silhouettes along the bottom

Add to each: *"Only this layer; everything else is flat pure #00FF00 green."*

---

## B. The hub room

### B1 `room.png`
16:9. Attach `room-layout.png` and your cozy-room screenshot.
> [style block] Front-on side view of a cozy creator's bedroom at night, like a
> room interior in a 2D pixel game. Keep every object in the same position and
> size as the layout reference: a wooden door with a mail slot and a small
> blank wooden plaque above it on the far left; a window with pink curtains showing a snowy
> mountain night and a crescent moon; under it a wooden cabinet with an old CRT
> TV with rabbit-ear antennas and a retro game console; a parchment world map
> pinned to the wall; a glowing pink neon sign on the wall in the top centre
> spelling the letters "AT"; colourful string fairy lights along the ceiling;
> a wooden desk in the centre with a desk lamp, a large computer monitor, a
> keyboard and a red coffee mug; an empty purple gaming chair in front of the
> desk, facing the monitor; a wooden wall shelf on the right holding small
> trophies on the top shelf and fantasy RPG items (sword, staff, brush, orb,
> book) on the lower shelf; a red snack vending machine glowing in the bottom
> right with a glowing sign panel spelling "SHOP"; a potted plant; a purple patterned rug on the wooden floor. Warm
> orange lamp light, cyan monitor glow, pink neon glow, otherwise dark and cozy.
> The monitor screen and the TV screen are flat pure #00FF00 green. The only
> text in the image is "AT" on the neon sign and "SHOP" on the vending
> machine. No people, no animals.

---

## C. Characters

### C1 `player-back.png` — you at the desk, from behind
Square canvas, two frames side by side. Pure green background.
> [style block] Pixel-art sprite sheet with 2 frames side by side, same size,
> on a flat pure #00FF00 background. A young man seen from behind, sitting in a
> purple gaming chair: dark messy hair, cyan over-ear headphones, an orange
> hoodie. Only his head, headphones and shoulders show above the chair back.
> Frame 1 head upright, frame 2 head nodded down by one pixel, as if he's
> nodding to music. Match the room reference's palette.

### C2 `player-portrait.png` — dialogue portrait
Square. Attach a photo of yourself for likeness.
> [style block] Pixel-art RPG dialogue portrait, head and shoulders, front
> facing, friendly confident smile. Based on the attached photo (keep the face
> shape, hairstyle, skin tone and any facial hair). Cyan headphones around the
> neck, orange hoodie. Flat pure #00FF00 background. Chunky readable pixels,
> like a 64×64 character portrait from a 16-bit RPG.

### C3 `cat-sleeping.png` — the room cat
Two frames side by side. Pure magenta background (the cat is orange).
> [style block] Pixel-art sprite sheet, 2 frames side by side on a flat pure
> #FF00FF background. A small orange tabby cat curled up asleep, side view.
> Frame 1 tail down, frame 2 tail flicked up. Tiny, readable at about 16×8
> pixels.

### C4 `shopkeeper-portrait.png` — "Pixel", the shop cat
Square. Pure magenta background.
> [style block] Pixel-art RPG shopkeeper dialogue portrait, front facing. An
> orange tabby cat merchant with big friendly green eyes, a small green vest
> with a gold button and a tiny merchant's cap, cheeky smile. Flat pure #FF00FF
> background. Same style and size as a 64×64 16-bit RPG portrait.

---

## D. Inventory items — one per tool
1:1 each (or one sheet of 7 in a row). Attach the room as style reference.
Base prompt:
> [style block] A single fantasy RPG inventory item icon, centred, chunky dark
> outline, readable at 32×32 pixels, flat pure #00FF00 background: **[item]**

| File | Tool | [item] |
| --- | --- | --- |
| `item-razor.png` | Premiere Pro | a short sword whose blade looks like a strip of film, purple hilt with a gold guard |
| `item-staff.png` | After Effects | a wooden magic staff topped with a glowing cyan diamond keyframe crystal |
| `item-brush.png` | Photoshop | a paintbrush with a glowing cyan tip trailing tiny pixels |
| `item-quill.png` | Illustrator | an orange-and-gold feather quill with a sharp vector-pen nib |
| `item-orb.png` | Motion Graphics | a swirling pink-and-violet magic orb with motion trails |
| `item-lens.png` | Higgsfield AI | a magical green-rimmed camera lens with a sparkle in the glass (**use #FF00FF background**) |
| `item-tome.png` | Claude AI | a warm tan spellbook with a glowing gold spark on the cover |

## E. Achievement badges
1:1 each. Base prompt:
> [style block] A single round 16-bit achievement medal badge, gold rim, chunky
> outline, readable at 32×32 pixels, flat pure #00FF00 background, showing:
> **[symbol]**

| File | Achievement | [symbol] |
| --- | --- | --- |
| `badge-eye.png` | Viral Hit | a glowing eye with a play button pupil |
| `badge-clock.png` | Veteran | a cyan clock |
| `badge-up.png` | Level Up ×3 | a green upward arrow with three chevrons |
| `badge-scroll.png` | Scholar | a rolled diploma scroll with a red seal |
| `badge-spark.png` | AI Alchemist | a four-point cyan-and-pink sparkle |
| `badge-chat.png` | Polyglot | a violet speech bubble |
| `badge-lock.png` | ??? Your Project | a gold padlock (greyed out, locked) |

---

## F. Optional extras
- `favicon.png` (1:1): the player portrait cropped to the face, readable at 32×32.
- `logo.png` (wide): a chunky pixel-art game-logo wordmark. The title is
  currently live text in the *Press Start 2P* font, which stays sharp and easy
  to edit, so only replace it if the generated logo is clearly better. Ask for
  "ALANKRIT THAPA" spelled exactly, in gold with pink and violet 3D layers.
