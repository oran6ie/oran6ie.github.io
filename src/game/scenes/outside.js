// The view from Alankrit's terrace in Algarah, Kalimpong, drawn from his photos ("window ref"):
// layered blue ridges (Kanchenjunga on clear days), a big forested hill with cloud resting on it,
// a hillside town of tin roofs (the blue one with two dormers right in front, a red one behind),
// marigolds and begonias on the terrace. It's alive: birds, a kite circling, bats at dusk, the odd
// dragon, kitchen smoke, mist, a jeep on the road and the town's lights after dark. No prayer flags.
//
// One file shared by Som (orange/app/src/renderer/outside.js) and the portfolio
// (Portfolio/src/game/scenes/outside.js). Keep the two copies identical.
//
// SCENE is the whole view in scene pixels. A window shows a slice of it (createOutside(view));
// clicking the window zooms out to the whole thing with the forecast on top (openView).

export const SCENE = { w: 320, h: 180 }
export const HOME = { name: "Algarah", lat: 27.118, lon: 88.584, tz: "Asia/Kolkata" }
const W = SCENE.w, H = SCENE.h, HORIZON = 100

// ---------- colour helpers ----------
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t))
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647
const px = (g, x, y, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), 1, 1) }
const box = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }

// st = { sunAlt, sunAz, moonAlt, moonAz (degrees, azimuth clockwise from north), moonFraction,
//        moonWaxing, weather: clear|cloudy|fog|drizzle|rain|snow|storm, cloud 0..1, hour 0..24 }
function lighting(st) {
  const overcast = st.weather === "clear" ? st.cloud * 0.3 : st.weather === "cloudy" ? 0.3 + st.cloud * 0.25 : 0.65
  return {
    overcast,
    day: clamp01((st.sunAlt + 6) / 14),
    golden: clamp01(1 - Math.abs(st.sunAlt - 1) / 7) * (1 - overcast),
    night: clamp01((-st.sunAlt - 2) / 8),
  }
}

const KEYS = [                          // sky (top, horizon) by sun altitude
  [-18, hex("#05041a"), hex("#120e33")],
  [-10, hex("#0b0a2c"), hex("#33205c")],
  [-4, hex("#1c1a52"), hex("#c25c7a")],
  [2, hex("#384a98"), hex("#ffad66")],
  [10, hex("#3f7fd6"), hex("#a8d8f2")],
  [40, hex("#3486e6"), hex("#c4e8ff")],
]
function skyPair(st, L) {
  const a = st.sunAlt
  let top = KEYS[KEYS.length - 1][1], bot = KEYS[KEYS.length - 1][2]
  if (a <= KEYS[0][0]) { top = KEYS[0][1]; bot = KEYS[0][2] }
  else for (let i = 1; i < KEYS.length; i++) if (a <= KEYS[i][0]) {
    const [a0, t0, h0] = KEYS[i - 1], [a1, t1, h1] = KEYS[i], k = (a - a0) / (a1 - a0)
    top = mix(t0, t1, k); bot = mix(h0, h1, k); break
  }
  // grey cloud cover; at night the town lights the cloud base a little (like the 12 am photo)
  const grey = a > 0 ? hex("#8f97a8") : hex("#34323f")
  top = mix(top, grey, L.overcast * 0.85); bot = mix(bot, a > 0 ? hex("#b3b8c4") : hex("#4a4552"), L.overcast * 0.8)
  if (st.weather === "storm") { top = mix(top, hex("#141420"), 0.5); bot = mix(bot, hex("#252534"), 0.5) }
  return [top, bot]
}

// Land colours by the light: grey under cloud, warm at golden hour, moonlit indigo at night,
// and hazed toward the horizon colour with distance.
function toner(L, horizon) {
  const memo = new Map()
  return (h, haze = 0) => {
    const key = h + haze
    let out = memo.get(key)
    if (out) return out
    let c = hex(h)
    const g = (c[0] + c[1] + c[2]) / 3
    c = mix(c, [g * 0.97, g, g * 1.06], L.overcast * 0.45)
    c = mix(c, [Math.min(255, c[0] * 1.2 + 24), Math.min(255, c[1] * 1.02 + 6), c[2] * 0.78], L.golden * 0.45)
    c = mix([c[0] * 0.2 + 14, c[1] * 0.2 + 15, c[2] * 0.3 + 34], c, L.day)
    if (haze) c = mix(c, horizon, haze)
    out = css(c.map(Math.round))
    memo.set(key, out)
    return out
  }
}

// ---------- the land: layout (fixed) ----------
const ridgeA = (x) => 90 + 3 * Math.sin(x / 23) + 2 * Math.sin(x / 9 + 1) - 5 * Math.exp(-(((x - 40) / 40) ** 2))
const ridgeA2 = (x) => 96 + 2.5 * Math.sin(x / 17 + 4) + 2 * Math.sin(x / 7)
const ridgeB = (x) => 102 + 3 * Math.sin(x / 31 + 2) + 1.5 * Math.sin(x / 11)
const hillL = (x) => x > 130 ? H : 112 - 8 * Math.exp(-(((x - 26) / 46) ** 2)) + 0.8 * Math.sin(x * 1.3)
const hillR = (x) => x < 120 ? H : 124 - 30 * Math.exp(-(((x - 252) / 66) ** 2)) + Math.round(Math.sin(x * 1.7) * 0.8)
const ground = (x) => Math.min(ridgeB(x), hillL(x), hillR(x))
const PEAKS = [[52, 79], [86, 74], [112, 80], [146, 84]]          // the Kanchenjunga range

const WALLS = [
  ["#f3ead8", "#e6d8bd", "#c2ad92"], ["#f1dcd4", "#e0c1b6", "#b99288"], ["#f2f2ea", "#dcdcd2", "#b3b4b4"],
  ["#d9e8dc", "#bdd3c3", "#93ab9f"], ["#f2e2b0", "#e2c98a", "#b89b66"],
]
const ROOFS = [
  ["#e07a5c", "#b9483a", "#86302e"], ["#d98a5a", "#a85a3a", "#7b3c2c"], ["#7fa2d6", "#4f74b2", "#38508a"],
  ["#79b8b0", "#4a8f8a", "#356764"], ["#b4bac2", "#8a929c", "#626a77"], ["#8fbf7a", "#5e8f4f", "#41673c"],
]
const RED = ["#d9664f", "#b6473a", "#8a3230"], BLUE = ["#7d9fd2", "#5274ad", "#3b5487"], TERRA = ["#e08a62", "#c4654a", "#954635"]
const LEAF = ["#9cc85a", "#5f9a3e", "#3c6e34", "#24452a"], BEGONIA = ["#c4d873", "#8fb04e", "#5f8040", "#3b5530"]

// Little houses on the far slopes and the town in between, from a fixed seed.
const rb = seeded(11)
const pick = (a) => a[Math.floor(rb() * a.length)]
const BACK = []
for (let i = 0; i < 56; i++) {
  const x = Math.round(rb() * 318), w = 5 + Math.round(rb() * 7), wallH = 3 + Math.round(rb() * 2)
  const base = Math.round(Math.max(ground(x) + 5 + rb() * 16, 112 + rb() * 4))
  if (base < 136) BACK.push({ x, w, wallH, base, wall: pick(WALLS), roof: pick(ROOFS) })
}
BACK.sort((a, b) => a.base - b.base)
const MID = []
for (let i = 0; i < 22; i++) {
  const x = Math.round(rb() * 300) - 6, w = 12 + Math.round(rb() * 12), wallH = 6 + Math.round(rb() * 4)
  MID.push({ x, w, wallH, base: 130 + Math.round(rb() * 18), wall: pick(WALLS), roof: pick(ROOFS), tank: rb() < 0.18, flat: rb() < 0.25 })
}
MID.sort((a, b) => a.base - b.base)

// Lights that come on after dark: windows (each at its own time), far hillside lights, the dormers.
const FAR_LIGHTS = []
const rl = seeded(5)
for (let i = 0; i < 90; i++) {
  const x = Math.round(rl() * W), y = Math.round(ground(x) + 2 + rl() * 18)
  if (y < 136) FAR_LIGHTS.push({ x, y, th: rl() * 0.8, c: rl() < 0.7 ? "#ffd27a" : "#f4f1e0", tw: rl() < 0.2 })
}

// Terrace plants: leaves are painted once; flowers sway, so they're drawn every frame.
const MARIGOLDS = [[66, 152], [74, 149], [83, 151], [92, 148], [100, 152], [79, 157], [108, 156], [58, 158], [88, 158]]
const PINKS = [[216, 164], [226, 160], [240, 163], [251, 159], [262, 165]]

// ---------- the land: painting (cached, repainted when the light changes) ----------
let cache = { key: "", far: null, near: null, fore: null }
const mk = () => { const c = document.createElement("canvas"); c.width = W; c.height = H; return c }

function roof(g, T, x0, x1, top, bot, inset, ramp, haze = 0, ribs = 2) {
  const [lt, base, dk] = ramp
  for (let y = top; y <= bot; y++) {
    const k = bot === top ? 1 : (y - top) / (bot - top)
    const l = Math.round(x0 + inset * (1 - k)), r = Math.round(x1 - inset * (1 - k))
    for (let x = l; x <= r; x++) {
      const band = y - top < (bot - top) * 0.35 + ((x >> 2) & 1)      // the upper roof catches the sky
      let c = x % ribs === 0 ? (band ? base : dk) : (band ? lt : base)
      if (y === top || x === l) c = lt
      if (x === r) c = dk
      px(g, x, y, T(c, haze))
    }
  }
}
function wall(g, T, x, y, w, h, ramp, haze = 0) {
  box(g, x, y, w, h, T(ramp[1], haze))
  box(g, x, y, w, 1, T(ramp[2], haze))                 // shadow under the eave
  box(g, x + w - 1, y, 1, h, T(ramp[2], haze))         // light comes from the left
}
function pane(g, T, x, y, w, h, frame, haze = 0) {
  box(g, x - 1, y - 1, w + 2, h + 2, T(frame, haze))
  box(g, x, y, w, h, T("#2c3140", haze))
  if (w > 2 && h > 2) px(g, x, y, T("#6f84a8", haze))
}
function leaf(g, T, cx, cy, r, ramp) {
  for (let y = -r; y <= r; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = (x * x) / ((r + 1) * (r + 1)) + (y * y) / (r * r)
    if (d > 1) continue
    let c = ramp[1]
    if (x + y < -r * 0.5) c = ramp[0]
    else if (x + y > r * 0.6) c = ramp[2]
    if (d > 0.75 && y > 0) c = ramp[3]
    px(g, cx + x, cy + y, T(c))
  }
  if (r >= 4) for (let i = 1; i < r; i++) px(g, cx - r + i + 1, cy + Math.round(i / 3) - 1, T(ramp[2]))   // midrib
}

function paintFar(g, T, L) {
  g.clearRect(0, 0, W, H)
  const snowA = clamp01(1 - L.overcast * 2.4)                   // Kanchenjunga, only when it's clear
  if (snowA > 0.05) {
    g.globalAlpha = snowA
    for (let x = 0; x < 190; x++) {
      let top = 999, pk = PEAKS[0]
      for (const p of PEAKS) { const y = p[1] + Math.abs(x - p[0]) * 0.62; if (y < top) { top = y; pk = p } }
      top = Math.round(top)
      const lit = x <= pk[0], snowLine = top + 4 + ((x * 7) % 3)
      for (let y = top; y < ridgeA(x) + 1; y++)
        px(g, x, y, T(y < snowLine ? (lit ? "#f4f6fd" : "#b4bcdc") : (lit ? "#9aa3c6" : "#7f87ab"), 0.45))
    }
    g.globalAlpha = 1
  }
  const band = (f, col, edge, haze, x0 = 0, x1 = W) => {
    for (let x = x0; x < x1; x++) {
      const y = Math.round(f(x))
      if (y >= H) continue
      box(g, x, y, 1, H - y, T(col, haze))
      if (edge) px(g, x, y, T(edge, haze))
    }
  }
  band(ridgeA, "#7b8db2", "#93a3c4", 0.5)
  band(ridgeA2, "#687ea3", "#7d91b3", 0.4)
  band(ridgeB, "#56708f", null, 0.3)
  const r = seeded(3)
  for (let i = 0; i < 70; i++) {                                // forest on the nearer blue ridge
    const x = Math.round(r() * W), y = Math.round(ridgeB(x) + 2 + r() * 8)
    box(g, x, y, 2, 1, T("#4a6380", 0.3))
  }
  band(hillL, "#4b6b5b", "#5b7d66", 0.22, 0, 131)
  for (let i = 0; i < 50; i++) {
    const x = Math.round(r() * 128), y = Math.round(hillL(x) + 2 + r() * 10)
    box(g, x, y, 2, 1, T("#3f5d4e", 0.22)); px(g, x, y - 1, T("#5b7d66", 0.22))
  }
  // the big forested hill: tree crowns along its top, clumps of trees all over it
  for (let x = 120; x < W; x++) {
    const y = Math.round(hillR(x))
    box(g, x, y, 1, H - y, T("#3a6140", 0.12))
    if (x % 4 === 0) box(g, x, y - 1, 3, 1, T("#3a6140", 0.12))
  }
  for (let i = 0; i < 260; i++) {
    const x = Math.round(120 + r() * 200), y = Math.round(hillR(x) + 2 + r() * 30)
    px(g, x, y, T("#5a8650", 0.12)); px(g, x + 1, y, T("#4d7a49", 0.12))
    box(g, x, y + 1, 2, 1, T("#2c4c33", 0.12))
  }
  for (const b of BACK) {                                       // the far little houses
    const top = b.base - b.wallH
    box(g, b.x, top, b.w, b.wallH, T(b.wall[1], 0.18))
    box(g, b.x + b.w - 1, top, 1, b.wallH, T(b.wall[2], 0.18))
    box(g, b.x - 1, top - 2, b.w + 2, 1, T(b.roof[0], 0.18))
    box(g, b.x - 1, top - 1, b.w + 2, 1, T(b.roof[1], 0.18))
    for (let wx = b.x + 1; wx < b.x + b.w - 2; wx += 3) px(g, wx, top + 1, T("#3a3640", 0.18))
  }
}

function paintNear(g, T) {
  g.clearRect(0, 0, W, H)
  const lamps = []
  for (const m of MID) {                                        // the town in between
    const top = m.base - m.wallH
    wall(g, T, m.x, top, m.w, m.wallH + 8, m.wall, 0.08)
    if (m.flat) {
      box(g, m.x - 1, top - 1, m.w + 2, 1, T(m.wall[2], 0.08))
      if (m.tank) {                                             // a green water tank on the roof
        box(g, m.x + 3, top - 7, 5, 6, T("#3f8f4a", 0.08)); box(g, m.x + 3, top - 7, 1, 6, T("#6cb86a", 0.08))
        box(g, m.x + 7, top - 7, 1, 6, T("#2b6436", 0.08)); box(g, m.x + 3, top - 8, 5, 1, T("#2b6436", 0.08))
      }
    } else roof(g, T, m.x - 2, m.x + m.w + 1, top - 5, top, 4, m.roof, 0.08)
    for (let wx = m.x + 2; wx < m.x + m.w - 3; wx += 5) {
      pane(g, T, wx, top + 3, 2, 2, "#efe7d6", 0.08)
      lamps.push({ x: wx, y: top + 3, w: 2, h: 2, th: rb() * 0.9, late: rb() < 0.6 })
    }
  }
  // the road in front of the red house, with its stone retaining wall
  box(g, 150, 151, 114, 1, T("#8e8c88")); box(g, 150, 152, 114, 3, T("#5d5c60")); box(g, 150, 155, 114, 1, T("#46454a"))
  box(g, 150, 156, 114, 8, T("#7b766e"))
  for (let x = 152; x < 264; x += 5) for (let y = 157; y < 164; y += 3) box(g, x + ((y >> 1) & 2), y, 3, 1, T("#655f58"))
  box(g, 140, 164, 160, 1, T("#46454a"))                        // roofs of the houses below the road
  roof(g, T, 140, 192, 165, 180, 0, ROOFS[1]); roof(g, T, 190, 236, 166, 180, 0, ROOFS[4]); roof(g, T, 234, 300, 165, 180, 0, ROOFS[2])

  // the red-roofed house behind the blue one
  wall(g, T, 108, 125, 90, 26, WALLS[0])
  for (const wx of [128, 146, 166, 184]) { pane(g, T, wx, 129, 5, 5, "#6b4a3a"); lamps.push({ x: wx, y: 129, w: 5, h: 5, th: rb() * 0.7, late: rb() < 0.5 }) }
  box(g, 140, 138, 58, 1, T("#5b3b2e")); box(g, 140, 145, 58, 1, T("#5b3b2e"))     // balcony
  for (let x = 140; x < 198; x += 3) box(g, x, 138, 1, 8, T("#6b4a3a"))
  box(g, 140, 146, 58, 5, T("#3a3034"))
  roof(g, T, 104, 200, 112, 125, 16, RED)
  box(g, 104, 125, 97, 1, T("#efe9dc"))                         // white eave trim
  for (let x = 105; x < 200; x += 2) px(g, x, 126, T("#efe9dc"))
  box(g, 178, 106, 1, 6, T("#4a4a52")); box(g, 175, 104, 5, 3, T("#d8dade")); px(g, 175, 104, T("#ffffff"))   // satellite dish

  // the tall house on the right, with the scalloped red roof edge and a wooden balcony
  wall(g, T, 266, 106, 54, 74, ["#efdccb", "#d9c3ae", "#b39985"])
  box(g, 260, 100, 60, 4, T(RED[1])); box(g, 260, 100, 60, 1, T(RED[0])); box(g, 260, 104, 60, 1, T(RED[2]))
  for (let x = 261; x < 320; x += 3) { px(g, x, 105, T("#efe9dc")); px(g, x + 1, 105, T("#efe9dc")); px(g, x + 1, 106, T("#efe9dc")) }
  roof(g, T, 252, 300, 114, 118, 2, RED)
  for (let x = 253; x < 300; x += 3) px(g, x, 119, T("#efe9dc"))
  for (const [wx, wy] of [[274, 108], [288, 108], [306, 108], [282, 141], [300, 141], [282, 158], [300, 158]]) {
    pane(g, T, wx, wy, 5, 4, "#f4efe6"); lamps.push({ x: wx, y: wy, w: 5, h: 4, th: rb() * 0.8, late: rb() < 0.5, tv: wx === 300 && wy === 141 })
  }
  box(g, 268, 126, 52, 1, T("#5b3b2e")); box(g, 268, 135, 52, 2, T("#5b3b2e"))
  for (let x = 268; x < 320; x += 2) box(g, x, 127, 1, 8, T("#7a5644"))
  box(g, 312, 106, 1, 74, T("#9aa0a8")); px(g, 312, 106, T("#c9ced6"))     // drainpipe

  // the electricity pole and its sagging wires (with a street light on top)
  box(g, 206, 110, 2, 46, T("#3a3638")); box(g, 202, 112, 10, 1, T("#3a3638")); px(g, 206, 110, T("#6a6468"))
  box(g, 209, 113, 3, 1, T("#55515a"))
  const wire = (x0, y0, x1, y1, sag) => {
    const n = Math.abs(x1 - x0)
    for (let i = 0; i <= n; i++) {
      const k = i / n, x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k + sag * 4 * k * (1 - k)
      px(g, x, y, "rgba(30,26,30,0.85)")
    }
  }
  wire(202, 112, 0, 126, 9); wire(203, 112, 140, 128, 5); wire(211, 112, 266, 112, 3); wire(211, 112, 320, 104, 6)

  // the blue roof with two dormers, right in front (from the middle-view photo)
  box(g, 8, 151, 144, 22, T("#2b2730"))                         // its verandah, in shade
  for (let x = 10; x < 150; x += 7) box(g, x, 152, 1, 20, T("#d9d2c3"))
  box(g, 8, 158, 144, 1, T("#d9d2c3")); box(g, 8, 166, 144, 1, T("#efe9dc")); box(g, 8, 170, 144, 2, T("#b8433a"))
  roof(g, T, 6, 152, 124, 151, 28, BLUE)
  box(g, 34, 123, 91, 1, T("#9ab6e0"))                          // ridge cap
  for (let x = 6; x <= 152; x++) {                              // lace trim along the eave
    px(g, x, 151, T("#efe9dc"))
    if (x % 2 === 0) px(g, x, 152, T("#efe9dc"))
    if (x % 4 === 1) px(g, x, 153, T("#e2dccf"))
  }
  for (const cx of [56, 98]) {                                  // dormers
    for (let y = 0; y <= 13; y++) {
      const half = Math.min(8, Math.round(y * 0.75))
      for (let x = -half; x <= half; x++) px(g, cx + x, 113 + y, T(Math.abs(x) >= half - 1 ? (x < 0 ? BLUE[0] : BLUE[2]) : "#e6dfd0"))
    }
    box(g, cx - 3, 119, 7, 6, T("#efe9dc"))
    box(g, cx - 2, 120, 5, 5, T("#2a3344")); px(g, cx - 2, 120, T("#7d93b8"))
    px(g, cx, 119, T("#efe9dc")); box(g, cx, 120, 1, 5, T("#efe9dc"))
    box(g, cx - 7, 127, 15, 1, T(BLUE[2]))                      // its shadow on the main roof
    lamps.push({ x: cx - 2, y: 120, w: 5, h: 5, th: 0.05, dormer: true })
  }
  box(g, 132, 114, 2, 12, T("#4a4a52")); px(g, 132, 114, T("#77777f")); box(g, 131, 113, 4, 1, T("#33333a"))   // stove pipe
  // keep only the windows nothing was painted over (the glass is still glass in their corner)
  const img = g.getImageData(0, 0, W, H).data, glass = [T("#2c3140"), T("#2c3140", 0.08)]
  cache.lamps = lamps.filter((l) => {
    const i = ((l.y + l.h - 1) * W + l.x + l.w - 1) * 4
    return glass.includes(`rgba(${img[i]},${img[i + 1]},${img[i + 2]},1)`)
  })
}

function paintFore(g, T) {
  g.clearRect(0, 0, W, H)
  for (let y = 156; y < H; y++) {                               // terracotta tin roof, bottom right
    const x0 = Math.round(296 - (y - 156) * 0.9)
    for (let x = x0; x < W; x++) px(g, x, y, T((x + y) % 3 === 0 ? TERRA[2] : y === 156 || x === x0 ? TERRA[0] : TERRA[1]))
  }
  const r = seeded(9)
  const bush = (x0, x1, topF, ramp, rMin, rMax, count) => {
    for (let x = x0; x < x1; x++) { const y = Math.round(topF(x) + 3); box(g, x, y, 1, H - y, T(ramp[3])) }
    const ls = []
    for (let i = 0; i < count; i++) { const x = x0 + r() * (x1 - x0), y = topF(x) + r() * (H - topF(x)); ls.push([x, y, rMin + Math.round(r() * (rMax - rMin))]) }
    ls.sort((a, b) => a[1] - b[1]).forEach(([x, y, rr]) => leaf(g, T, Math.round(x), Math.round(y), rr, ramp))
  }
  bush(-4, 140, (x) => 159 + 3 * Math.sin(x / 9) - 7 * Math.exp(-(((x - 84) / 28) ** 2)), LEAF, 3, 5, 120)
  bush(196, 292, (x) => 163 + 2 * Math.sin(x / 7), BEGONIA, 4, 6, 46)
  for (let y = 118; y < 160; y++) px(g, 3 + Math.round(Math.sin(y / 9)), y, T("#3c6e34"))   // a branch framing the left edge
  for (const [x, y, rr] of [[6, 121, 4], [2, 129, 5], [9, 136, 4], [3, 145, 5], [10, 152, 4]]) leaf(g, T, x, y, rr, LEAF)
}

function ensureLayers(st, L, horizon) {
  const key = `${Math.round(Math.max(-8, Math.min(10, st.sunAlt)))}|${Math.round(L.overcast * 10)}`
  if (cache.key === key) return
  if (!cache.far) { cache.far = mk(); cache.near = mk(); cache.fore = mk() }
  const T = toner(L, horizon)
  paintFar(cache.far.getContext("2d"), T, L)
  paintNear(cache.near.getContext("2d"), T)
  paintFore(cache.fore.getContext("2d"), T)
  cache.key = key
}

// ---------- flyers ----------
const BIRD = [[[0, 0], [2, 0], [1, 1]], [[0, 0], [1, 0], [2, 0]], [[1, 0], [0, 1], [2, 1]], [[0, 0], [1, 0], [2, 0]]]
const KITE = [["##...##", "..###.."], ["#.....#", ".#####."]]
const BAT = [["#.#", ".#."], [".#.", "#.#"]]
const DRAGONS = [
  { dark: "#2c5e4f", body: "#3f9a73", belly: "#f0c55a", fin: "#e8673a", eye: "#fff4a8", horn: "#f3e2b0" },   // jade
  { dark: "#7a2630", body: "#c8443a", belly: "#f6cf6e", fin: "#ffd166", eye: "#fff4a8", horn: "#f3e2b0" },   // crimson
]
const HEAD = ["..h....", ".fdd...", "dbbbbd.", "bbbebbb", "BBBBBk."]
const HEAD_S = ["h....", "dbbd.", "bbebb", "BBBk."]
const rand = (a, b) => a + Math.random() * (b - a)
// The family's black Suzuki Jimny, side on, nose to the right: flat roof with a glint, rear quarter
// and door windows split by the B-pillar, upright windscreen, door handle, flared black arches over
// chunky tyres with silver hubs, the spare wheel on the tailgate, headlight, amber indicator, tail light.
const JIMNY_HOME = 155
const JIMNY = [
  "....hHHHHHHHHHHH....",
  "...KKKKKKKKKKKKKK...",
  "...KgGGGwKKgGGGGwK..",
  "..SKgGGGGKKgGGGGGgK.",
  ".SSKHHHHHHHHHHHHHHHH",
  ".SsKKKKKKKcKKcKKKKKL",
  ".SSRKKKKKKcKKKKKKKKY",
  "..AAAAAADDDDDDAAAAAA",
  "..AOOOOADDDDDDAOOOOA",
  "...OMmO........OMmO.",
  "....OO.........OO...",
]
const JIMNY_COL = { h: "#9a9fac", H: "#555a67", K: "#2b2c34", D: "#191a20", G: "#7d93b8", g: "#556a8e", w: "#cbd8ee",
  S: "#34353e", s: "#7a7e88", A: "#111114", O: "#0b0b0e", M: "#c3c7cf", m: "#6a6e78", c: "#14151a",
  L: "#e6e2cc", Y: "#e8a13a", R: "#b8333a" }

function makeLife(eager) {
  const s = {
    flyers: [], smoke: [], jeep: null,
    tBird: eager ? 1.5 : rand(5, 20), tKite: eager ? 5 : rand(20, 60), tBat: rand(2, 10),
    tDragon: eager ? rand(8, 16) : rand(90, 240), tJeep: eager ? 3 : rand(10, 40),
    clouds: [], mist: [], drops: new Map(), flash: 0, nextFlash: 4, bolt: null, honk: false,
    jimny: { x: JIMNY_HOME, mode: "parked", timer: rand(60, 200), dir: 1, blink: 0 },   // the family's black Suzuki Jimny
  }
  const r = seeded(42)
  for (let i = 0; i < 12; i++) s.clouds.push({ x: r() * (W + 60) - 30, y: 6 + r() * 76, w: 14 + r() * 26, h: 4 + r() * 5, v: 0.6 + r() * 1.6, b: r() })
  for (let i = 0; i < 5; i++) s.mist.push({ x: r() * W, y: 94 + r() * 22, w: 30 + r() * 50, v: 0.4 + r() * 0.8 })
  return s
}
// Rain is drawn in the window's own pixels, so each size of view keeps its own drops.
function dropsFor(s, v) {
  const key = v.w + "x" + v.h
  let d = s.drops.get(key)
  if (!d) {
    const r = seeded(17), n = Math.max(12, Math.min(220, Math.round((v.w * v.h) / 90)))
    d = Array.from({ length: n }, () => ({ x: r() * v.w, y: r() * v.h, v: 0.6 + r() * 0.6 }))
    s.drops.set(key, d)
  }
  return d
}

function spawn(s, st, L) {
  const wet = st.weather === "rain" || st.weather === "storm"
  const dir = Math.random() < 0.5 ? 1 : -1, x0 = dir > 0 ? -12 : W + 12
  if (s.tBird <= 0) {
    s.tBird = rand(14, 40) * (wet ? 2 : 1)
    if (st.sunAlt > -4) {
      const n = 3 + Math.floor(Math.random() * 5), y = rand(50, 98), v = rand(18, 27) * dir
      for (let i = 0; i < n; i++) s.flyers.push({ type: "bird", x: x0 - dir * (i * 5 + rand(0, 3)), y: y + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 2, vx: v, ph: Math.random() * 4 })
    }
  }
  if (s.tKite <= 0) {
    s.tKite = rand(40, 90)
    if (st.sunAlt > 4 && !wet) s.flyers.push({ type: "kite", cx: rand(40, W - 40), cy: rand(36, 70), r: rand(14, 26), a: Math.random() * 6, va: rand(0.2, 0.35) * dir, vx: rand(-2, 2), life: rand(25, 45) })
  }
  if (s.tBat <= 0) {
    s.tBat = rand(20, 50)
    if (st.sunAlt < -2 && st.sunAlt > -14 && !wet) {
      const y = rand(64, 100), n = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < n; i++) s.flyers.push({ type: "bat", x: x0 - dir * i * rand(4, 9), y: y + rand(-6, 6), vx: rand(20, 30) * dir, ph: Math.random() * 6 })
    }
  }
  if (s.tDragon <= 0) {
    s.tDragon = rand(150, 330)
    const big = Math.random() < 0.6
    s.flyers.push({
      type: "dragon", x: dir > 0 ? -10 : W + 10, y0: big ? rand(56, 88) : rand(44, 76), dir, v: big ? rand(26, 34) : rand(16, 22),
      n: big ? 34 : 18, th: big ? 3 : 2, amp: big ? 2.2 : 1.4, big, c: DRAGONS[Math.random() < 0.65 ? 0 : 1], fire: 0, breathe: rand(2, 6),
    })
  }
  if (s.tJeep <= 0 && !s.jeep) { s.tJeep = rand(30, 80); s.jeep = { x: dir > 0 ? 140 : 274, dir } }
}

function update(s, st, L, t, dt) {
  for (const k of ["tBird", "tKite", "tBat", "tDragon", "tJeep"]) s[k] -= dt
  spawn(s, st, L)
  for (const f of s.flyers) {
    if (f.type === "kite") { f.a += f.va * dt; f.cx += f.vx * dt; f.life -= dt }
    else if (f.type === "dragon") {
      f.x += f.v * f.dir * dt
      f.breathe -= dt
      if (f.breathe <= 0) { f.fire = 0.7; f.breathe = rand(4, 9) }
      f.fire = Math.max(0, f.fire - dt)
    } else f.x += f.vx * dt
  }
  s.flyers = s.flyers.filter((f) => f.type === "kite" ? f.life > 0 : f.type === "dragon" ? f.x > -60 && f.x < W + 60 : f.x > -40 && f.x < W + 40)
  // kitchen smoke from the stove pipe and a house down the hill, thicker at meal times
  const h = st.hour ?? 12, meal = (h > 5 && h < 9) || (h > 17 && h < 21)
  for (const [sx, sy] of [[133, 112], [232, 128]]) if (Math.random() < dt * (meal ? 3 : 0.6)) s.smoke.push({ x: sx, y: sy, age: 0 })
  for (const p of s.smoke) { p.age += dt; p.y -= 4 * dt; p.x += (2 + p.age * 0.6) * dt }
  s.smoke = s.smoke.filter((p) => p.age < 6)
  if (s.jeep) { s.jeep.x += 9 * s.jeep.dir * dt; if (s.jeep.x < 130 || s.jeep.x > 280) s.jeep = null }
  // parked outside; now and then it starts up (lights, indicator, a toot), heads out and comes back
  const jm = s.jimny
  jm.timer -= dt
  jm.blink = Math.max(0, jm.blink - dt)
  if (jm.mode === "parked" && jm.timer <= 0) { jm.mode = "starting"; jm.timer = 2.2; jm.blink = 2.2; jm.dir = Math.random() < 0.5 ? 1 : -1; s.honk = true }
  if (jm.mode === "starting" && jm.timer <= 0) jm.mode = "leaving"
  if (jm.mode === "leaving" || jm.mode === "returning") jm.x += 10 * jm.dir * dt
  if (jm.mode === "leaving" && (jm.x > 280 || jm.x < 130)) { jm.mode = "away"; jm.timer = rand(40, 120) }
  if (jm.mode === "away" && jm.timer <= 0) { jm.mode = "returning"; jm.dir = jm.x > JIMNY_HOME ? -1 : 1 }
  if (jm.mode === "returning" && Math.abs(jm.x - JIMNY_HOME) < 14 && !jm.blink) jm.blink = 1.6
  if (jm.mode === "returning" && (jm.x - JIMNY_HOME) * jm.dir >= 0) { jm.x = JIMNY_HOME; jm.mode = "parked"; jm.timer = rand(90, 240) }
  if (s.flash > 0) s.flash -= dt
  if (st.weather === "storm") {
    s.nextFlash -= dt
    if (s.nextFlash <= 0) {
      s.flash = 0.25; s.nextFlash = 5 + Math.random() * 9; s.thunder = true
      const bolt = [[rand(20, W - 20), 0]]
      while (bolt[bolt.length - 1][1] < 92) { const [bx, by] = bolt[bolt.length - 1]; bolt.push([bx + rand(-4, 4), by + rand(4, 9)]) }
      s.bolt = bolt
    }
  }
  for (const c of s.clouds) { c.x += c.v * dt; if (c.x > W + 40) c.x = -c.w - 30 }
  for (const m of s.mist) { m.x += m.v * dt; if (m.x > W + 10) m.x = -m.w - 10 }
}

function drawFlyers(g, s, st, L, t, o) {
  const dusk = L.day < 0.5
  const ink = dusk ? "#221c2a" : "#3b3646"
  for (const f of s.flyers) {
    if (f.type === "bird") {
      const fr = BIRD[Math.floor(t * 8 + f.ph) % 4], y = f.y + Math.sin(t * 2 + f.ph) * 1.5
      for (const [x, yy] of fr) px(g, f.x + (f.vx < 0 ? 2 - x : x) - o.x, y + yy - o.y, ink)
    } else if (f.type === "kite") {
      const fr = KITE[Math.sin(t * 0.9 + f.a) > 0.85 ? 1 : 0], x = f.cx + Math.cos(f.a) * f.r, y = f.cy + Math.sin(f.a) * f.r * 0.4
      fr.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") px(g, x + i - 3 - o.x, y + j - o.y, ink) })
    } else if (f.type === "bat") {
      const fr = BAT[Math.floor(t * 12 + f.ph) % 2], y = f.y + Math.sin(t * 6 + f.ph) * 3 + Math.sin(t * 13 + f.ph) * 1
      fr.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === "#") px(g, f.x + i - o.x, y + j - o.y, "#1a1520") })
    } else drawDragon(g, f, t, o, L)
  }
}

// An eastern dragon: a long body rippling like a ribbon, spines along its back, little legs,
// whiskers, and now and then a puff of fire. Night turns it into a silhouette with glowing eyes.
function drawDragon(g, d, t, o, L) {
  const shade = (h) => css(mix(hex(h), [24, 22, 44], (1 - L.day) * 0.75))
  const c = { d: shade(d.c.dark), b: shade(d.c.body), B: shade(d.c.belly), f: shade(d.c.fin), h: shade(d.c.horn), e: d.c.eye, k: "#2a1418" }
  const yAt = (i) => d.y0 + Math.sin((d.x - d.dir * i) / 38) * 6 + Math.sin(t * 3.2 - i * 0.42) * d.amp
  for (let i = d.n - 1; i >= 1; i--) {
    const x = Math.round(d.x - d.dir * i) - o.x, y = Math.round(yAt(i)) - o.y
    const th = Math.max(1, Math.round(d.th * (1 - (i / d.n) * 0.7)))
    const top = y - Math.floor(th / 2)
    for (let k = 0; k < th; k++) px(g, x, top + k, k === 0 && th > 1 ? c.d : k === th - 1 && th > 2 ? c.B : c.b)
    if (i % 3 === 1 && i < d.n - 3) px(g, x, top - 1, c.f)
    if (i === Math.round(d.n * 0.2) || i === Math.round(d.n * 0.6)) {
      const step = Math.sin(t * 6 + i) > 0 ? 1 : 0
      px(g, x, top + th, c.d); px(g, x - d.dir * step, top + th + 1, c.d)
    }
    if (i === d.n - 1) { px(g, x - d.dir, top - 1, c.f); px(g, x - d.dir, top, c.f); px(g, x - d.dir * 2, top - 1, c.f) }
  }
  const head = d.big ? HEAD : HEAD_S, hx = Math.round(d.x) - o.x, hy = Math.round(yAt(0)) - o.y, eyeRow = d.big ? 3 : 2
  head.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i]
      if (ch === ".") continue
      const col = ch === "h" ? c.h : ch === "f" ? c.f : ch === "d" ? c.d : ch === "b" ? c.b : ch === "B" ? c.B : ch === "e" ? c.e : c.k
      px(g, hx + d.dir * (i - 1), hy + j - eyeRow, col)
    }
  })
  const w = Math.sin(t * 5) > 0 ? 1 : 0                         // whiskers trailing back from the snout
  const snout = hx + d.dir * (head[0].length - 2)
  px(g, snout - d.dir * 2, hy + 2 + w, c.h); px(g, snout - d.dir * 4, hy + 3, c.h)
  if (d.fire > 0) {
    const n = d.big ? 7 : 4
    for (let i = 1; i <= n; i++) for (let j = -Math.floor(i / 3); j <= Math.floor(i / 3); j++) {
      if (Math.random() < 0.25) continue
      px(g, snout + d.dir * (i + 1), hy + 1 + j, i < n / 2 ? "#fff1a8" : Math.random() < 0.5 ? "#ffb347" : "#f0643a")
    }
  }
}

// ---------- one window onto the scene ----------
// draw(g, st, t, dt, animate, at): `at` draws another part of the scene (the zoomed close-up) from the
// same living outside without moving it on, so the room's window and the close-up show the same
// birds, the same Jimny. t may be left out there (it reuses the room's last time).
export function createOutside(view = { x: 0, y: 0, w: W, h: H }, opts = {}) {
  const s = makeLife(!!opts.eager)
  const r = seeded(7)
  const stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 92, p: r() * 6, b: r() }))
  let lastT = 0

  return function draw(g, st, t, dt, animate = true, at = null) {
    const v = at || view
    if (t == null) t = lastT
    const L = lighting(st), [top, bot] = skyPair(st, L)
    ensureLayers(st, L, bot)
    if (animate && !at) { update(s, st, L, t, Math.min(0.1, dt)); lastT = t }
    const o = { x: v.x, y: v.y }
    g.save()
    g.beginPath(); g.rect(0, 0, v.w, v.h); g.clip()

    // sky: banded by scene height so every window onto it agrees, dithered seams
    const bands = 10, bh = HORIZON / bands
    for (let i = 0; i <= bands; i++) {
      const y0 = Math.round(i * bh) - o.y, y1 = i === bands ? v.h : Math.round((i + 1) * bh) - o.y
      if (y1 < 0 || y0 > v.h) continue
      const col = css(mix(top, bot, i / bands))
      box(g, 0, y0, v.w, y1 - y0, col)
      if (i < bands) { g.fillStyle = css(mix(top, bot, (i + 1) / bands)); for (let x = (i + o.x) % 2; x < v.w; x += 2) g.fillRect(x, y1 - 1, 1, 1) }
    }
    const starA = clamp01((-st.sunAlt - 6) / 10) * (1 - L.overcast)
    if (starA > 0) for (const p of stars) {
      if (animate && Math.sin(t * (1 + p.b) + p.p * 3) < -0.5) continue
      px(g, p.x - o.x, p.y - o.y, `rgba(220,215,255,${(starA * (0.5 + p.b / 2)).toFixed(2)})`)
    }
    // sun and moon by their real azimuth and altitude, placed within this window (the sky is far away)
    const hz = Math.max(v.h * 0.45, HORIZON - o.y), big = v.w > 100
    const place = (az, alt) => ({ x: v.w * ((az - 90) / 180), y: hz - (alt / 70) * hz * 0.9 })
    if (st.sunAlt > -3 && L.overcast < 0.6) {
      const p = place(st.sunAz, st.sunAlt), warm = st.sunAlt < 6, R = big ? 4 : 2.2
      for (let y = -R - 3; y <= R + 3; y++) for (let x = -R - 3; x <= R + 3; x++) {
        const d = Math.hypot(x, y)
        if (d <= R) px(g, p.x + x, p.y + y, warm ? "#ffd27a" : "#fff6c9")
        else if (d <= R + (big ? 3 : 1.3)) px(g, p.x + x, p.y + y, "rgba(255,240,180,0.25)")
      }
    }
    if (st.moonAlt > -2 && L.overcast < 0.6) {
      const p = place(st.moonAz, st.moonAlt), R = big ? 4 : 3, k = 2 * st.moonFraction - 1
      for (let y = -R; y <= R; y++) {
        const hw = Math.sqrt(Math.max(0, R * R - y * y))
        for (let x = -R; x <= R; x++) {
          if (Math.hypot(x, y) > R + 0.2) continue
          const lit = st.moonWaxing ? x >= -k * hw : x <= k * hw
          px(g, p.x + x, p.y + y, lit ? "#fff3c4" : "rgba(40,40,70,0.6)")
        }
      }
    }
    // clouds: lit tops, shaded bellies; a low grey deck when it's overcast (like the photos)
    const day = [hex("#f6f6fb"), hex("#dfe2ee"), hex("#b9bfd2")], gold = [hex("#ffe0b8"), hex("#f2ae9e"), hex("#a97c98")]
    const night = L.overcast > 0.4 ? [hex("#5e5a68"), hex("#4b4858"), hex("#3a3848")] : [hex("#4a4866"), hex("#3a3854"), hex("#2c2a44")]
    const cc = [0, 1, 2].map((i) => css(mix(mix(mix(day[i], hex(["#c9ccd6", "#aeb2be", "#8f94a3"][i]), L.overcast), gold[i], L.golden * 0.8), night[i], 1 - L.day)))
    const n = Math.round(3 + st.cloud * 7 + (st.weather !== "clear" ? 2 : 0))
    for (let i = 0; i < Math.min(n, s.clouds.length); i++) {
      const c = s.clouds[i], x = Math.round(c.x) - o.x, y = Math.round(c.y) - o.y, h = Math.round(c.h), w = Math.round(c.w)
      for (let j = 0; j < h; j++) {
        const k = (h - j) / h, half = Math.round((w / 2) * Math.sqrt(1 - k * k * 0.85)) + ((j + Math.round(c.b * 5)) % 3 === 0 ? 1 : 0)
        box(g, x + w / 2 - half, y + j, half * 2, 1, j === 0 ? cc[0] : j < h * 0.5 ? cc[1] : cc[2])
      }
    }
    if (L.overcast > 0.4) for (let j = 0; j < 4; j++) {
      const yy = 4 + j * 9 - o.y, shift = Math.round(t * (0.8 + j * 0.3)) + j * 37
      g.fillStyle = cc[j % 2 ? 2 : 1]
      for (let x = 0; x < v.w; x++) { const d = Math.round(2 + 2 * Math.sin((x + o.x + shift) / (9 + j * 3)) + Math.sin((x + o.x + shift) / 4)); g.fillRect(x, yy, 1, d) }
    }

    g.drawImage(cache.far, -o.x, -o.y)
    if (L.night > 0) for (const l of FAR_LIGHTS) {               // the hillsides light up after dark
      if (L.night < l.th || (l.tw && animate && Math.sin(t * 3 + l.x) > 0.7)) continue
      px(g, l.x - o.x, l.y - o.y, l.c)
    }
    const h = st.hour ?? 12
    const mistK = st.weather === "fog" ? 1 : st.weather === "cloudy" ? 0.7 : st.weather === "clear" ? (h < 10 ? 0.5 : 0.2) : 0.85
    const mistC = L.day > 0.5 ? "233,236,242" : "90,92,112"
    for (const m of s.mist) {
      const x = Math.round(m.x) - o.x, y = Math.round(m.y) - o.y, w = Math.round(m.w)
      box(g, x, y, w, 1, `rgba(${mistC},${(0.35 * mistK).toFixed(2)})`)
      box(g, x + 4, y + 1, w - 8, 2, `rgba(${mistC},${(0.45 * mistK).toFixed(2)})`)
      box(g, x + 10, y - 1, w - 22, 1, `rgba(${mistC},${(0.25 * mistK).toFixed(2)})`)
    }
    drawFlyers(g, s, st, L, t, o)

    g.drawImage(cache.near, -o.x, -o.y)
    const lateNight = h > 0.5 && h < 5
    for (const l of cache.lamps || []) {
      if (L.night < l.th + 0.05 || (lateNight && l.late)) continue
      if (l.tv) { box(g, l.x - o.x, l.y - o.y, l.w, l.h, Math.sin(t * 9) > 0.3 ? "#9cc0ff" : "#6f8fd8"); continue }
      box(g, l.x - o.x, l.y - o.y, l.w, l.h, l.dormer ? "#ff8a4c" : "#ffcf7a")
      if (l.w > 2) box(g, l.x + 1 - o.x, l.y + 1 - o.y, l.w - 2, l.h - 2, l.dormer ? "#ffb36b" : "#fff0b8")
      box(g, l.x - 1 - o.x, l.y + l.h + 1 - o.y, l.w + 2, 1, "rgba(255,190,110,0.22)")
    }
    if (L.night > 0.2) {                                        // the street light
      px(g, 211 - o.x, 114 - o.y, "#fff4c8")
      box(g, 209 - o.x, 115 - o.y, 5, 3, "rgba(255,236,170,0.18)")
    }
    for (const p of s.smoke) {
      const a = (1 - p.age / 6) * (L.day > 0.3 ? 0.55 : 0.3), sz = p.age > 2 ? 2 : 1
      box(g, p.x - o.x, p.y - o.y, sz, sz, `rgba(${L.day > 0.3 ? "214,214,222" : "120,118,136"},${a.toFixed(2)})`)
    }
    const CLOTHES = ["#d24f4f", "#f2c94c", "#4f86c6", "#f4f1e8", "#7ab36a"]   // washing on the red house's balcony
    box(g, 148 - o.x, 139 - o.y, 30, 1, "rgba(40,30,30,0.6)")
    CLOTHES.forEach((col, i) => {
      const x = 150 + i * 6 - o.x, y = 140 - o.y, sway = animate && Math.sin(t * 2.2 + i * 1.3) > 0.4 ? 1 : 0
      const cl = css(mix(hex(col), [24, 22, 44], (1 - L.day) * 0.7))
      box(g, x, y, 3, 2, cl); box(g, x + sway, y + 2, 3, 2, cl)
    })
    g.save(); g.beginPath(); g.rect(153 - o.x, 0, 109, v.h); g.clip()     // cars on the road
    if (s.jimny.mode !== "away") {
      const jm = s.jimny, x = Math.round(jm.x) - o.x, y = 140 - o.y, f = jm.dir, nk = (1 - L.day) * 0.6
      const dark = L.night > 0.2, on = jm.mode !== "parked", n = JIMNY[0].length
      const col = {}
      for (const k in JIMNY_COL) col[k] = css(mix(hex(JIMNY_COL[k]), [14, 14, 30], nk))
      if (dark) {                                               // glass goes dark; lamps only while it's running
        col.G = "#2a3040"; col.g = "#20263a"; col.w = "#3c4660"; col.h = "#6a6f80"; col.H = "#3e4250"   // the street light catches the roof
        col.L = on ? "#fff4c8" : "#4a4944"; col.R = on ? "#ff4a50" : "#4a1c20"
      }
      if (jm.blink > 0 && Math.floor(t * 3) % 2 === 0) col.Y = "#ffc04a"    // indicator while pulling out / in
      JIMNY.forEach((row, j) => { for (let i = 0; i < n; i++) if (row[i] !== ".") px(g, x + (f > 0 ? i : n - 1 - i), y + j, col[row[i]]) })
      if (on && Math.floor(t * 8) % 2) for (const wx of [4, 16]) px(g, x + (f > 0 ? wx : n - 1 - wx), y + 9, col.m)   // hubs turning
      if (dark && on) {
        box(g, f > 0 ? x + n : x - 7, y + 5, 7, 2, "rgba(255,240,180,0.28)")
        box(g, f > 0 ? x + n + 7 : x - 11, y + 6, 4, 1, "rgba(255,240,180,0.14)")
        px(g, f > 0 ? x - 1 : x + n, y + 6, "rgba(255,70,80,0.4)")
      }
    }
    if (s.jeep) {                                               // a white jeep with luggage on its roof rack
      const x = Math.round(s.jeep.x) - o.x, y = 146 - o.y, f = s.jeep.dir
      const body = css(mix(hex("#e9e6df"), [40, 40, 60], (1 - L.day) * 0.7)), dark = css(mix(hex("#b8b4ac"), [30, 30, 50], (1 - L.day) * 0.7))
      box(g, x, y + 2, 9, 3, body); box(g, x + (f > 0 ? 2 : 1), y, 6, 2, body); box(g, x, y + 4, 9, 1, dark)
      box(g, x + (f > 0 ? 5 : 2), y + 1, 2, 1, "#3a4250"); box(g, x + (f > 0 ? 2 : 5), y + 1, 2, 1, "#3a4250")
      box(g, x + 2, y - 1, 5, 1, dark); box(g, x + 1, y + 5, 2, 1, "#222"); box(g, x + 6, y + 5, 2, 1, "#222")
      if (L.night > 0.2) { px(g, f > 0 ? x + 8 : x, y + 3, "#fff4c8"); box(g, f > 0 ? x + 9 : x - 4, y + 3, 4, 2, "rgba(255,240,180,0.25)") }
    }
    g.restore()

    g.drawImage(cache.fore, -o.x, -o.y)
    const nightK = (1 - L.day) * 0.7
    MARIGOLDS.forEach(([fx, fy], i) => {
      const y = fy + (animate && Math.sin(t * 1.1 + i * 1.7) > 0.6 ? -1 : 0) - o.y, x = fx - o.x
      const [a, b, c] = ["#ffd95a", "#f5b82e", "#d9822a"].map((q) => css(mix(hex(q), [30, 26, 50], nightK)))
      box(g, x + 1, y, 3, 1, b); box(g, x, y + 1, 5, 2, b); box(g, x + 1, y + 3, 3, 1, c)
      px(g, x + 1, y + 1, a); px(g, x + 2, y, a); px(g, x + 4, y + 2, c)
    })
    PINKS.forEach(([fx, fy], i) => {
      const y = fy + (animate && Math.sin(t * 0.9 + i * 2.1) > 0.6 ? -1 : 0) - o.y, x = fx - o.x
      const [a, b] = ["#ffb3c9", "#e8608e"].map((q) => css(mix(hex(q), [30, 26, 50], nightK)))
      box(g, x, y, 3, 2, b); px(g, x, y, a); px(g, x + 1, y + 2, b)
    })

    // weather
    if (st.weather === "fog") { box(g, 0, 0, v.w, v.h, "rgba(196,201,214,0.35)"); box(g, 0, 90 - o.y, v.w, v.h, "rgba(205,210,222,0.3)") }
    const raining = st.weather === "rain" || st.weather === "drizzle" || st.weather === "storm"
    if (raining || st.weather === "snow") {
      const drops = dropsFor(s, v)
      const count = Math.round(drops.length * (st.weather === "drizzle" ? 0.35 : st.weather === "snow" ? 0.5 : 1))
      for (let i = 0; i < count; i++) {
        const d = drops[i]
        if (animate) {
          d.y += (st.weather === "snow" ? 8 : 90) * d.v * dt
          d.x += st.weather === "snow" ? Math.sin(t + i) * dt * 4 : -12 * dt
          if (d.y > v.h) { d.y = -3; d.x = Math.random() * (v.w + 6) }
        }
        if (st.weather === "snow") px(g, d.x, d.y, "#ffffff")
        else box(g, d.x, d.y, 1, 3, "rgba(170,200,255,0.5)")
      }
    }
    if (st.weather === "storm" && animate && s.flash > 0) {
      box(g, 0, 0, v.w, v.h, "rgba(255,255,255,0.45)")
      if (s.bolt) for (let i = 1; i < s.bolt.length; i++) {
        const [x0, y0] = s.bolt[i - 1], [x1, y1] = s.bolt[i]
        for (let k = 0; k <= 8; k++) px(g, x0 + (x1 - x0) * k / 8 - o.x, y0 + (y1 - y0) * k / 8 - o.y, "#ffffff")
      }
    }
    g.restore()
    // one-off events for the sound (the Jimny's toot, thunder), handed to the room's own draw only
    const out = { night: starA > 0.3, flash: s.flash > 0, honk: s.honk, thunder: s.thunder }
    if (!at) s.honk = s.thunder = false
    return out
  }
}

// ---------- the forecast (open-meteo, no key needed) ----------
export function weatherKind(code) {
  if (code >= 95) return "storm"
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow"
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain"
  if (code >= 51 && code <= 57) return "drizzle"
  if (code === 45 || code === 48) return "fog"
  if (code >= 2) return "cloudy"
  return "clear"
}
const WORDS = { 0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Foggy", 48: "Foggy",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain",
  80: "Showers", 81: "Showers", 82: "Downpours", 95: "Thunderstorm", 96: "Thunderstorm", 99: "Thunderstorm" }
export const weatherWords = (code) => WORDS[code] || ({ snow: "Snow", rain: "Rain", drizzle: "Drizzle" })[weatherKind(code)] || "Cloudy"

const FC_KEY = "algarah-forecast"
export async function fetchForecast() {
  try {
    const c = JSON.parse(localStorage.getItem(FC_KEY) || "null")
    if (c && Date.now() - c.at < 15 * 60e3) return c
  } catch { /* storage blocked */ }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${HOME.lat}&longitude=${HOME.lon}`
    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,precipitation,is_day"
    + "&hourly=temperature_2m,weather_code,precipitation_probability,is_day"
    + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max"
    + `&timezone=${encodeURIComponent(HOME.tz)}&forecast_days=7`
  const res = await fetch(url)
  if (!res.ok) throw new Error("weather " + res.status)
  const j = await res.json(), c = j.current, hr = j.hourly, dl = j.daily
  let i0 = hr.time.findIndex((t) => t.slice(0, 13) === c.time.slice(0, 13))
  if (i0 < 0) i0 = 0
  const v = {
    at: Date.now(),
    now: { tempC: c.temperature_2m, feelsC: c.apparent_temperature, humidity: c.relative_humidity_2m, code: c.weather_code,
      cloud: c.cloud_cover, windKmh: c.wind_speed_10m, windDir: c.wind_direction_10m, rainMm: c.precipitation, isDay: !!c.is_day },
    hours: hr.time.slice(i0 + 1, i0 + 13).map((t, k) => ({ time: t, tempC: hr.temperature_2m[i0 + 1 + k], code: hr.weather_code[i0 + 1 + k],
      rainPct: hr.precipitation_probability[i0 + 1 + k], isDay: !!hr.is_day[i0 + 1 + k] })),
    days: dl.time.map((d, k) => ({ date: d, code: dl.weather_code[k], maxC: dl.temperature_2m_max[k], minC: dl.temperature_2m_min[k],
      rainPct: dl.precipitation_probability_max[k], sunrise: dl.sunrise[k], sunset: dl.sunset[k], uv: dl.uv_index_max[k] })),
  }
  try { localStorage.setItem(FC_KEY, JSON.stringify(v)) } catch { /* ignore */ }
  return v
}

// ---------- pixel weather icons (12x12, outlined) ----------
const icons = new Map()
export function iconURL(code, isDay = true) {
  const kind = code <= 1 ? (isDay ? "sun" : "moon") : code === 2 ? (isDay ? "partly" : "partlyNight") : weatherKind(code) === "cloudy" ? "cloud" : weatherKind(code)
  if (icons.has(kind)) return icons.get(kind)
  const N = 12, grid = Array.from({ length: N }, () => Array(N).fill(null))
  const disc = (cx, cy, r, col, flat) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - cx, y - cy) <= r && (flat == null || y <= flat)) grid[y][x] = col }
  const cloud = (dy, col = "#f2f4fa", under = "#b9c0d4") => {
    disc(3.5, 7 + dy, 2.4, col, 9 + dy); disc(6.5, 5.5 + dy, 3, col, 9 + dy); disc(9.3, 7.3 + dy, 2, col, 9 + dy)
    for (let x = 0; x < N; x++) if (grid[9 + dy] && grid[9 + dy][x]) grid[9 + dy][x] = under
  }
  const sun = (cx, cy, r) => { disc(cx, cy, r, "#ffd84a"); grid[Math.round(cy - r + 1)][Math.round(cx - 1)] = "#fff3a6" }
  const moon = (cx, cy, r) => { disc(cx, cy, r, "#fff1b8"); disc(cx + r * 0.55, cy - r * 0.4, r * 0.85, null) }
  const extra = []
  if (kind === "sun") { sun(5.5, 5.5, 3.2); for (const [x, y] of [[5, 0], [5, 11], [0, 5], [11, 5], [1, 1], [10, 1], [1, 10], [10, 10]]) extra.push([x, y, "#f59e2c"]) }
  if (kind === "moon") moon(5.5, 5.5, 4)
  if (kind === "partly") { sun(4, 4, 2.6); extra.push([4, 0, "#f59e2c"], [0, 4, "#f59e2c"], [1, 1, "#f59e2c"]); cloud(1) }
  if (kind === "partlyNight") { moon(4, 4, 3); cloud(1) }
  if (kind === "cloud") cloud(0)
  if (kind === "fog") for (const [y, x0, x1] of [[3, 1, 9], [6, 3, 11], [9, 0, 8]]) for (let x = x0; x <= x1; x++) grid[y][x] = "#c9cfdc"
  if (kind === "drizzle" || kind === "rain" || kind === "snow") {
    cloud(-2)
    const drops = kind === "drizzle" ? [[4, 9], [8, 10]] : [[3, 9], [6, 10], [9, 9]]
    for (const [x, y] of drops) extra.push([x, y, kind === "snow" ? "#ffffff" : "#5aa8ff"], ...(kind === "rain" ? [[x - 1, y + 1, "#5aa8ff"]] : []))
  }
  if (kind === "storm") { cloud(-2, "#9aa2b6", "#6c7388"); extra.push([6, 8, "#ffd84a"], [5, 9, "#ffd84a"], [6, 9, "#ffd84a"], [5, 10, "#ffd84a"], [4, 11, "#ffd84a"]) }
  const cv = document.createElement("canvas"); cv.width = N; cv.height = N
  const g = cv.getContext("2d")
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (grid[y][x]) { g.fillStyle = grid[y][x]; g.fillRect(x, y, 1, 1); continue }
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => grid[y + dy] && grid[y + dy][x + dx])
    if (near) { g.fillStyle = "#2e2433"; g.fillRect(x, y, 1, 1) }
  }
  for (const [x, y, col] of extra) { g.fillStyle = col; g.fillRect(x, y, 1, 1) }
  const url = cv.toDataURL()
  icons.set(kind, url)
  return url
}


// ---------- the window itself: open or shut, birds on the sill, rain blowing in ----------
// Drawn in the host room's own pixels (cfg is in those), so the room and the zoomed close-up, which
// films the room, show the very same pixels.
// cfg: { style: "casement" | "slider", glass: { x, y, w, h },
//        mullion: { x, y }   casement: left column / top row of its 2-px cross
//        rail: { x, w, travel, cols }   slider: the meeting rail, how far its sash slides, its colours
//        sill: { x0, x1, y, front, avoid: [[x0, x1]] }   y: the sill's top row; front: its underside
//        frame: { dark, mid, light }, busy: () => bool (something's already on the sill, like a cat) }
const BIRD_COLS = {
  sparrow: { H: "#8a6248", E: "#1a1210", b: "#3a2c24", W: "#6e4a30", w: "#c9a27a", B: "#dcc8a4", T: "#5a3c28", f: "#c9a080" },
  myna: { H: "#1e1a1c", E: "#f2c230", b: "#f2c230", W: "#5e3e2a", w: "#f4f0e8", B: "#7a5238", T: "#2a2224", f: "#e0b030" },
  bulbul: { H: "#1a1618", E: "#0e0a0c", b: "#0e0a0c", W: "#4a403c", w: "#5a504a", B: "#8a7e74", T: "#2a2424", f: "#3a3030", v: "#d0303a", c: "#1a1618" },
}
const BIRD_POSE = {                     // facing right; the bottom row is the feet
  stand: ["...c..", "...HH.", "..HHEb", "TWwBB.", ".vWBB.", "..f.f."],
  peck: ["......", "......", "TWw...", ".vWBH.", "..BBHE", "..f.fb"],
  up: ["..WW..", ".Ww...", "TBBHEb", "..BB.."],
  down: ["......", "TBBHEb", ".WwB..", "..WW.."],
}
const ease = (k) => k * k * (3 - 2 * k)

export function createWindow(cfg) {
  const G = cfg.glass, S = cfg.sill
  const w = { open: !!cfg.open, k: cfg.open ? 1 : 0, birds: [], drops: [], splashes: [], drips: [], wet: 0, tBird: rand(6, 20), tDrip: 2 }
  const raining = (st) => ["rain", "drizzle", "storm"].includes(st.weather)
  // the part of the opening that's open air right now (rain blows in there)
  const gap = () => cfg.style === "slider" ? [G.x, G.x - 3 + Math.round(ease(w.k) * cfg.rail.travel)] : [G.x, G.x + G.w]
  const freeSpot = () => {
    for (let n = 0; n < 20; n++) {
      const x = Math.round(rand(S.x0 + 1, S.x1 - 6))
      if ((S.avoid || []).some(([a, b]) => x + 5 >= a && x <= b)) continue
      if (w.birds.some((b) => Math.abs(b.tx - x) < 8)) continue
      return x
    }
    return null
  }
  function addBird() {
    const x = freeSpot()
    if (x == null) return
    const sp = ["sparrow", "sparrow", "myna", "bulbul"][Math.floor(Math.random() * 4)]
    const fromX = Math.round(rand(G.x + 2, G.x + G.w - 8))
    w.birds.push({ sp, x: fromX, y: G.y + 4, fx: fromX, fy: G.y + 4, tx: x, ty: S.y - 1, mode: "in", t: 0, dur: 0.9,
      face: x > fromX ? 1 : -1, pose: "stand", act: 0, sitFor: rand(8, 22) })
  }
  function leave(b) {
    if (b.mode === "out") return
    b.mode = "out"; b.t = 0; b.dur = 0.8; b.fx = b.x; b.fy = b.y
    b.tx = Math.round(rand(G.x + 2, G.x + G.w - 8)); b.ty = G.y + 2; b.face = b.tx > b.x ? 1 : -1
    w.onChirp && w.onChirp(true)
  }

  function update(st, dt) {
    const target = w.open ? 1 : 0
    w.k += Math.sign(target - w.k) * Math.min(Math.abs(target - w.k), dt / 0.7)
    // birds come and sit on the open sill by day, when it's dry and nobody's there
    const day = st.sunAlt > 2, wet = raining(st) || st.weather === "snow"
    w.tBird -= dt
    if (w.tBird <= 0) {
      w.tBird = rand(25, 70)
      if (w.k > 0.95 && day && !wet && !(cfg.busy && cfg.busy()) && w.birds.length < 2) {
        addBird()
        if (Math.random() < 0.3) setTimeout(() => w.k > 0.95 && addBird(), rand(1200, 3500))
      }
    }
    for (const b of w.birds) {
      b.t += dt
      if (b.mode === "in" || b.mode === "out") {
        const k = Math.min(1, b.t / b.dur), e = ease(k)
        b.x = b.fx + (b.tx - b.fx) * e
        b.y = b.fy + (b.ty - b.fy) * e - Math.sin(k * Math.PI) * 5
        b.pose = Math.floor(b.t * 12) % 2 ? "up" : "down"
        if (k >= 1 && b.mode === "in") { b.mode = "sit"; b.t = 0; b.pose = "stand"; b.x = b.tx; b.y = b.ty; w.onChirp && w.onChirp(false) }
        if (k >= 1 && b.mode === "out") b.gone = true
        continue
      }
      // sitting: peck, hop, turn round, chirp, then off again
      if ((cfg.busy && cfg.busy()) || !w.open || wet || b.t > b.sitFor) { leave(b); continue }
      b.act -= dt
      if (b.act <= 0) {
        b.pose = "stand"; b.y = b.ty
        const r = Math.random()
        if (r < 0.35) { b.pose = "peck"; b.act = 0.45 }
        else if (r < 0.55) {
          const nx = b.x + (Math.random() < 0.5 ? -2 : 2)
          if (nx > S.x0 && nx < S.x1 - 6 && !(S.avoid || []).some(([a, c]) => nx + 5 >= a && nx <= c)) { b.x = b.tx = nx; b.y = b.ty - 1 }
          b.act = 0.25
        } else if (r < 0.7) { b.face *= -1; b.act = rand(0.6, 1.4) }
        else if (r < 0.85) { w.onChirp && w.onChirp(false); b.act = rand(0.8, 1.6) }
        else b.act = rand(0.8, 2)
      } else if (b.y < b.ty && b.act < 0.15) b.y = b.ty
    }
    w.birds = w.birds.filter((b) => !b.gone)

    // rain blowing in through the open part: drops, splashes on the sill, a wet sheen, the odd drip
    const rate = w.k > 0.6 ? ({ drizzle: 2, rain: 7, storm: 14 })[st.weather] || 0 : 0
    if (Math.random() < rate * dt) {
      const [a, b] = gap()
      if (b - a > 2) w.drops.push({ x: rand(a + 1, b - 1), y: rand(G.y, G.y + G.h * 0.6), vx: -6, vy: rand(60, 80) })
    }
    for (const d of w.drops) {
      d.x += d.vx * dt; d.y += d.vy * dt
      if (d.y >= S.y) { d.gone = true; w.splashes.push({ x: Math.round(d.x), t: 0 }); w.wet = Math.min(1, w.wet + 0.012) }
    }
    w.drops = w.drops.filter((d) => !d.gone)
    for (const s of w.splashes) s.t += dt
    w.splashes = w.splashes.filter((s) => s.t < 0.2)
    if (!rate) w.wet = Math.max(0, w.wet - dt * 0.004)
    w.tDrip -= dt
    if (w.wet > 0.35 && w.tDrip <= 0) {
      w.tDrip = rand(2, 5)
      const [a, b] = gap()
      w.drips.push({ x: Math.round(rand(Math.max(a, S.x0) + 1, Math.min(b, S.x1) - 1)), y: S.front + 1, t: 0 })
    }
    for (const d of w.drips) { d.t += dt; d.y += dt * (d.t < 0.6 ? 2 : 14) }
    w.drips = w.drips.filter((d) => d.t < 1.6)
  }

  // P = canvas pixels per room pixel
  function draw(g, st, t, P = 1) {
    const dot = (x, y, c, ww = 1, hh = 1) => { g.fillStyle = c; g.fillRect(Math.round(x) * P, Math.round(y) * P, ww * P, hh * P) }
    if (cfg.style === "slider") drawSlider(dot, t)
    else if (w.k > 0.001) drawCasement(dot, t)
    // the wet sheen on the sill top, then splashes and drops
    if (w.wet > 0.02) {
      const [a, b] = gap(), x0 = Math.max(a, S.x0), x1 = Math.min(b, S.x1)
      dot(x0, S.y, `rgba(28,36,70,${(0.28 * w.wet).toFixed(2)})`, x1 - x0, 2)
      for (let x = x0 + 2; x < x1; x += 7) dot(x + ((x * 3) % 4), S.y, `rgba(225,238,255,${(0.6 * w.wet).toFixed(2)})`)
    }
    for (const s of w.splashes) {
      const r = s.t < 0.1 ? 1 : 2
      dot(s.x - r, S.y - 1 - (s.t < 0.1 ? 1 : 0), "rgba(220,235,255,0.75)"); dot(s.x + r, S.y - 1 - (s.t < 0.1 ? 1 : 0), "rgba(220,235,255,0.75)")
    }
    for (const d of w.drops) dot(d.x, d.y, "rgba(214,232,255,0.7)", 1, 2)
    for (const d of w.drips) dot(d.x, d.y, `rgba(200,220,250,${(0.7 * (1 - d.t / 1.6)).toFixed(2)})`)
    for (const b of w.birds) {
      const rows = BIRD_POSE[b.pose], col = BIRD_COLS[b.sp], n = rows[0].length
      const top = Math.round(b.y) - rows.length + 1
      rows.forEach((row, j) => {
        for (let i = 0; i < n; i++) {
          const ch = row[i]
          if (ch === ".") continue
          const c = col[ch] || (ch === "v" || ch === "w" ? col.W : null)
          if (c) dot(Math.round(b.x) + (b.face > 0 ? i : n - 1 - i), top + j, c)
        }
      })
    }
  }

  // Casement (Som): two sashes hinged at the jambs swing in toward you. Seen from the front each one
  // narrows as it turns, its free edge grows a little (it's nearer) and its glass catches the light.
  function drawCasement(dot) {
    const M = cfg.mullion, F = cfg.frame
    const th = ease(w.k) * 1.3, c = Math.cos(th), sn = Math.sin(th)
    for (const side of [-1, 1]) {
      const hinge = side < 0 ? G.x : G.x + G.w - 1
      const half = side < 0 ? M.x - G.x + 1 : G.x + G.w - 1 - M.x
      const wp = Math.max(2, Math.round(half * c)), lift = sn * 2
      for (let i = 0; i < wp; i++) {
        const x = hinge - side * i, f = wp > 1 ? i / (wp - 1) : 0
        const top = G.y - Math.round(lift * f), bot = G.y + G.h - 1 + Math.round(lift * f)
        const cross = top + Math.round(((M.y - G.y) * (bot - top)) / (G.h - 1))
        if (i === wp - 1) {                                        // free stile (half the mullion)
          dot(x, top, side < 0 ? F.mid : F.dark, 1, bot - top + 1)
          if (sn > 0.4) dot(x, top, F.light, 1, 1)
          continue
        }
        if (top < G.y) dot(x, top, F.mid, 1, G.y - top)            // rails poking past the frame (it's nearer)
        if (bot > G.y + G.h - 1) dot(x, G.y + G.h, F.dark, 1, bot - G.y - G.h + 1)
        const a = 0.3 * sn
        if (a > 0.02) {
          dot(x, Math.max(top, G.y), `rgba(214,228,255,${a.toFixed(2)})`, 1, Math.min(bot, G.y + G.h - 1) - Math.max(top, G.y) + 1)
          for (let y = Math.max(top, G.y); y <= Math.min(bot, G.y + G.h - 1); y++) {
            if ((y + i * 2) % 19 === 0 || (y + i * 2) % 19 === 1) dot(x, y, `rgba(255,255,255,${(0.5 * sn).toFixed(2)})`)
          }
        }
        dot(x, cross, F.mid); dot(x, cross + 1, F.dark)            // the glazing bar
      }
    }
  }

  // Slider (portfolio): two glazed sashes. The left one slides across behind the right one: its outer
  // stile comes out from the jamb, the gap it leaves is open air (no glass sheen), and where it's behind
  // the right sash the glass doubles up darker and its meeting stile shows through, dimmed.
  function drawSlider(dot) {
    const R = cfg.rail, off = Math.round(ease(w.k) * R.travel)
    const mx = R.x + off, ox = G.x - 3 + off                 // the moving sash's meeting stile and outer stile
    const rx = R.x + R.w, gx1 = G.x + G.w                     // the fixed sash's glass starts right of its stile
    // glass: a faint blue-grey film and diagonal glints that slide with their sash, so the open gap
    // reads as clear air next to it
    const sheen = (x0, x1, shift) => {
      if (x1 <= x0) return
      dot(x0, G.y, "rgba(150,180,215,0.13)", x1 - x0, G.h)
      for (const [f, len, a] of [[0.25, 3, 0.3], [0.62, 1, 0.22]]) {
        for (let y = 0; y < G.h; y++) {
          const x = x0 - shift + Math.round(G.w * 0.5 * f + (G.h - y) * 0.55) + (y % 2)
          for (let j = 0; j < len; j++) if (x + j >= x0 && x + j < x1) dot(x + j, G.y + y, `rgba(240,248,255,${a})`)
        }
      }
    }
    sheen(Math.max(G.x, ox + 4), Math.min(mx, rx), -off)   // the moving sash's glass (left of it: open air)
    sheen(rx, gx1, -18)                                      // the fixed sash's
    if (mx > rx) dot(rx, G.y, "rgba(30,45,90,0.2)", Math.min(mx, gx1) - rx, G.h)   // both panes at once
    // the moving sash's stiles; behind the fixed glass they're dimmer
    const stile = (x, cols) => cols.forEach((c, i) => {
      const xx = x + i
      if (xx < G.x || xx >= gx1) return
      dot(xx, G.y, c, 1, G.h)
      if (xx >= rx) dot(xx, G.y, "rgba(30,45,90,0.4)", 1, G.h)
    })
    if (off > 0) stile(ox, [R.cols[0], R.cols[4], R.cols[1], R.cols[0]])
    stile(mx, R.cols.slice(0, 4))
    if (mx + 4 < gx1) dot(mx - 1, G.y + Math.round(G.h * 0.45), "#8fa0c0", 1, 5)    // the latch
    // the fixed sash's meeting stile, always in front
    R.cols.slice(1).forEach((c, i) => dot(R.x + 1 + i, G.y, c, 1, G.h))
  }

  return {
    get open() { return w.open },
    get k() { return w.k },
    get wet() { return w.wet },
    get birds() { return w.birds.length },
    set onChirp(fn) { w.onChirp = fn },
    setOpen(b) { w.open = !!b; if (!b) w.birds.forEach(leave) },
    update, draw,
    // a click at room point (x, y): shoos a bird off the sill
    hit(x, y) {
      const b = w.birds.find((b) => b.mode === "sit" && x >= b.x - 2 && x <= b.x + 8 && y >= b.y - 7 && y <= b.y + 2)
      if (b) leave(b)
      return !!b
    },
  }
}

// ---------- what you hear outside: birds by day, crickets at night, wind, rain, the town ----------
// Muffled behind shut glass, louder and brighter with the window open, a touch louder still close up.
export function createOutsideSound() {
  let ac = null, lp = null, master = null, near = null, wind = null, rain = null, noise = null
  let tChirp = 2, tCricket = 1, tHorn = rand(40, 100), level = 0
  const want = { open: 0, zoom: 0, curtains: false, muted: false, st: null }
  function ensure() {
    if (ac) return
    ac = new AudioContext()
    master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination)
    lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 800; lp.connect(master)
    near = ac.createGain(); near.gain.value = 1; near.connect(master)          // things right on the sill skip the glass
    noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate)
    const d = noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const bed = (freq, q) => {
      const s = ac.createBufferSource(); s.buffer = noise; s.loop = true
      const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q
      const g = ac.createGain(); g.gain.value = 0
      s.connect(f).connect(g).connect(lp); s.start()
      return g
    }
    wind = bed(380, 0.7); rain = bed(1700, 0.6)
  }
  function voice(type, f0, f1, t, dur, vol, pan = 0, dest = lp) {
    const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner()
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur)
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.015, dur / 3))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    p.pan.value = pan
    o.connect(g).connect(p).connect(dest); o.start(t); o.stop(t + dur + 0.02)
  }
  function phrase(vol, dest, hi = 1) {
    const t0 = ac.currentTime + 0.02, pan = rand(-0.7, 0.7), n = 2 + Math.floor(Math.random() * 4)
    let t = t0, f = rand(2600, 4200) * hi
    for (let i = 0; i < n; i++) {
      const dur = rand(0.05, 0.12)
      voice(Math.random() < 0.5 ? "sine" : "triangle", f, f * rand(0.75, 1.35), t, dur, vol, pan, dest)
      t += dur + rand(0.03, 0.09); f *= rand(0.85, 1.2)
    }
  }
  function cricket() {
    const t = ac.currentTime + 0.02, pan = Math.random() < 0.5 ? -0.5 : 0.4
    for (let i = 0; i < 3; i++) voice("sine", 4700, 4650, t + i * 0.05, 0.025, 0.012, pan)
  }
  function horn(vol) {
    const t = ac.currentTime + 0.02
    voice("square", 420, 418, t, 0.12, vol, 0.3); voice("square", 420, 418, t + 0.2, 0.16, vol, 0.3)
  }
  function thunder() {
    const t = ac.currentTime + rand(0.6, 2.2)
    const s = ac.createBufferSource(); s.buffer = noise; s.loop = true
    const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 150
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.12)
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2)
    s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 3.3)
  }
  function apply() {
    if (!ac || !want.st) return
    const st = want.st, t = ac.currentTime
    const open = want.open * (want.curtains ? 0.5 : 1)
    level = want.muted ? 0 : 0.45 * (0.2 + 0.8 * open) * (want.curtains ? 0.6 : 1) * (1 + 0.4 * want.zoom)
    master.gain.setTargetAtTime(level, t, 0.3)
    lp.frequency.setTargetAtTime(700 + 7300 * open, t, 0.3)
    const r = { drizzle: 0.05, rain: 0.13, storm: 0.2 }[st.weather] || 0
    rain.gain.setTargetAtTime(r, t, 1)
    wind.gain.setTargetAtTime(st.weather === "storm" ? 0.12 : 0.025 + Math.random() * 0.03, t, 1.5)
  }
  return {
    // call from a click or key press (browsers only start sound after one)
    start() { ensure(); if (ac.state !== "running") ac.resume() },
    set(o) { Object.assign(want, o); apply() },
    // dt in seconds; ev: what the outside's draw returned (honk, thunder)
    tick(dt, ev = {}) {
      if (!ac || ac.state !== "running" || !want.st || !level) return
      const st = want.st, wet = ["rain", "storm", "drizzle", "snow"].includes(st.weather)
      tChirp -= dt; tCricket -= dt; tHorn -= dt
      if (tChirp <= 0) { tChirp = rand(1.5, 6) * (wet ? 3 : 1); if (st.sunAlt > -2 && st.weather !== "storm") phrase(0.035, lp) }
      if (tCricket <= 0) { tCricket = rand(0.5, 1.3); if (st.sunAlt < -4 && !wet) cricket() }
      if (tHorn <= 0) { tHorn = rand(50, 140); if (st.hour > 6 && st.hour < 22) horn(0.008) }
      if (ev.honk) horn(0.02)
      if (ev.thunder) thunder()
      if (Math.random() < dt * 0.1) apply()                      // the wind gusts now and then
    },
    // a bird right on the sill: close, bright, not muffled
    chirp(scared) { if (ac && ac.state === "running" && !want.muted) phrase(scared ? 0.05 : 0.04, near, 1.15) },
  }
}

// ---------- the close-up: the camera pushes in on the window, with the forecast beside it ----------
const STYLE = `
.ov{position:absolute;inset:0;z-index:20;overflow:hidden;cursor:default;font-family:var(--ov-font,"Pixelify Sans",monospace);--u:1px}
.ov canvas{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated}
.ov-card{position:absolute;top:4%;width:min(34%,calc(var(--u)*340));min-width:210px;max-height:84%;overflow:auto;box-sizing:border-box;
  padding:calc(var(--u)*10) calc(var(--u)*12);cursor:default;color:var(--ov-ink,#2e1d1a);background:var(--ov-paper,rgba(251,246,232,.94));
  box-shadow:0 0 0 2px var(--ov-edge,#2e1d1a),4px 4px 0 2px rgba(20,12,10,.35);opacity:0;transform:translateY(6px);
  transition:opacity .25s steps(4),transform .25s steps(4)}
.ov-card.left{left:3%}.ov-card.right{right:2%}
.ov-card.on{opacity:1;transform:none}
.ov-card.hide{display:none}
.ov-top{display:flex;align-items:center;gap:calc(var(--u)*10)}
.ov-top img{width:calc(var(--u)*56);height:calc(var(--u)*56);flex:none}
.ov-place{font:calc(var(--u)*9) var(--ov-head,"Press Start 2P",monospace);letter-spacing:1px;color:var(--ov-accent,#b0461e);margin-bottom:calc(var(--u)*6)}
.ov-temp{font-weight:600;font-size:calc(var(--u)*40);line-height:1}
.ov-words{font-size:calc(var(--u)*19);line-height:1.15;margin-top:2px}
.ov-fun{margin:calc(var(--u)*8) 0;padding:calc(var(--u)*6) calc(var(--u)*8);font-size:calc(var(--u)*16);line-height:1.25;
  background:var(--ov-fun-bg,rgba(255,224,102,.45));box-shadow:inset 3px 0 0 var(--ov-accent,#b0461e)}
.ov-tabs{display:flex;gap:4px;margin:calc(var(--u)*6) 0}
.ov-tab{flex:1;font:calc(var(--u)*8) var(--ov-head,"Press Start 2P",monospace);padding:calc(var(--u)*6) 2px;border:0;cursor:pointer;
  color:var(--ov-ink,#2e1d1a);background:transparent;box-shadow:inset 0 0 0 2px var(--ov-edge,#2e1d1a)}
.ov-tab.on{background:var(--ov-accent,#b0461e);color:var(--ov-tab-ink,#fbf6e8)}
.ov-tab:hover,.ov-tab:focus-visible{outline:none;background:var(--ov-hover,#ffe066);color:var(--ov-hover-ink,#2e1d1a)}
.ov-facts{display:grid;grid-template-columns:auto 1fr;gap:calc(var(--u)*3) calc(var(--u)*10);align-items:baseline}
.ov-facts span{font-size:calc(var(--u)*14);opacity:.75}
.ov-facts b{font-size:calc(var(--u)*16);font-weight:600}
.ov-hours{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(var(--u)*8) calc(var(--u)*4);text-align:center}
.ov-hours small{display:block;font-size:calc(var(--u)*14);opacity:.75}
.ov-hours b{display:block;font-size:calc(var(--u)*20);font-weight:600}
.ov-hours img{width:calc(var(--u)*32);height:calc(var(--u)*32);display:block;margin:2px auto}
.ov-days{display:grid;grid-template-columns:auto auto 1fr;gap:calc(var(--u)*4) calc(var(--u)*8);align-items:center}
.ov-days .d{font-size:calc(var(--u)*16)}
.ov-days img{width:calc(var(--u)*24);height:calc(var(--u)*24)}
.ov-range{display:flex;align-items:center;gap:calc(var(--u)*5);font-size:calc(var(--u)*15);font-weight:600}
.ov-bar{position:relative;flex:1;height:calc(var(--u)*6);min-width:24px;background:rgba(0,0,0,.12)}
.ov-bar i{position:absolute;top:0;bottom:0;background:linear-gradient(90deg,#5aa8ff,#ffd84a,#ff7a3d)}
.ov-rain{color:var(--ov-rain,#2f6fb8)}
.ov img{image-rendering:pixelated}
.ov-btns{position:absolute;right:2%;bottom:3%;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:calc(var(--u)*6);cursor:default;max-width:70%}
.ov-btn{font:calc(var(--u)*9) var(--ov-head,"Press Start 2P",monospace);letter-spacing:1px;color:var(--ov-ink,#2e1d1a);background:var(--ov-paper-solid,#fbf6e8);
  border:0;padding:calc(var(--u)*7) calc(var(--u)*9);cursor:pointer;box-shadow:0 0 0 2px var(--ov-edge,#2e1d1a),3px 3px 0 1px rgba(20,12,10,.35)}
.ov-btn.go{background:var(--ov-go,#ff7a3d);color:var(--ov-go-ink,#2e1d1a)}
.ov-btn:hover,.ov-btn:focus-visible{background:var(--ov-hover,#ffe066);color:var(--ov-hover-ink,#2e1d1a);outline:none}
.ov-btns,.ov-tip{opacity:0;transition:opacity .25s steps(4)}
.ov-tip{position:absolute;top:3%;font:calc(var(--u)*8)/1.6 var(--ov-head,"Press Start 2P",monospace);color:#fff;
  text-shadow:1px 1px 0 #000,2px 2px 0 #000;pointer-events:none}
.ov-tip.left{left:3%}.ov-tip.right{right:3%;text-align:right}
.ov.shown .ov-btns,.ov.shown .ov-tip{opacity:1}
`
let styled = false
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }
const hourLabel = (iso) => { const h = Number(iso.slice(11, 13)); return `${h % 12 || 12}${h < 12 ? "am" : "pm"}` }
const clock = (iso) => { const h = Number(iso.slice(11, 13)), m = iso.slice(14, 16); return `${h % 12 || 12}:${m}${h < 12 ? "am" : "pm"}` }
const compass = (deg) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8]
const MOONS = ["New moon", "Waxing crescent", "First quarter", "Waxing gibbous", "Full moon", "Waning gibbous", "Last quarter", "Waning crescent"]

// One cheerful line about the weather, most useful thing first.
function funLine(f, st) {
  const k = weatherKind(f.now.code), t = f.now.feelsC, day = f.now.isDay
  const soon = f.hours.slice(0, 6).find((h) => h.rainPct >= 60)
  if (k === "storm") return "Thunder party outside! Stay in and get cozy."
  if (k === "snow") return "SNOW?! Go look, quick!"
  if (k === "rain") return "Rainy day. Chai, lofi and a blanket."
  if (k === "drizzle") return "Just a drizzle. Hoodie weather."
  if (soon) return `Rain likely around ${hourLabel(soon.time)}. Keep an umbrella handy!`
  if (k === "fog") return "Fog's rolled in. The hills are playing hide and seek."
  if (t <= 6) return "Brrr! Blanket and socks time."
  if (t >= 27) return "Toasty one! Drink some water."
  if (day && f.now.cloud < 30) return "Clear skies! Kanchenjunga might be out. Go look!"
  if (!day && f.now.cloud < 30) return st && st.moonFraction > 0.6 ? "Bright moon tonight. Great for a night walk." : "Clear night. Count the stars!"
  if (day) return "Calm and grey. Good focus weather."
  return "Quiet night over the hills."
}

function fillCard(card, f, st, tab, setTab) {
  card.replaceChildren()
  const time = new Date().toLocaleTimeString("en-IN", { timeZone: HOME.tz, hour: "numeric", minute: "2-digit", hour12: true })
  card.append(el("div", "ov-place", `${HOME.name.toUpperCase()} · ${time.toUpperCase()}`))
  const top = el("div", "ov-top"), img = el("img"); img.src = iconURL(f.now.code, f.now.isDay); img.alt = ""
  const tw = el("div"); tw.append(el("div", "ov-temp", `${Math.round(f.now.tempC)}°C`), el("div", "ov-words", weatherWords(f.now.code)))
  top.append(img, tw)
  card.append(top, el("div", "ov-fun", funLine(f, st)))
  const tabs = el("div", "ov-tabs")
  for (const [id, label] of [["now", "NOW"], ["hours", "LATER"], ["week", "WEEK"]]) {
    const b = el("button", "ov-tab" + (tab === id ? " on" : ""), label)
    b.onclick = () => setTab(id)
    tabs.append(b)
  }
  card.append(tabs)
  const today = f.days[0]
  if (tab === "now") {
    const g = el("div", "ov-facts")
    const fact = (k, v, cls) => { const b = el("b", cls, v); g.append(el("span", null, k), b) }
    fact("Feels like", `${Math.round(f.now.feelsC)}°`)
    fact("Rain today", today.rainPct ? `${today.rainPct}% chance` : "nope", today.rainPct ? "ov-rain" : null)
    fact("Wind", `${Math.round(f.now.windKmh)} km/h ${compass(f.now.windDir)}`)
    fact("Humidity", `${f.now.humidity}%`)
    fact("Sun", `${clock(today.sunrise)} – ${clock(today.sunset)}`)
    if (st && st.moonPhase != null) fact("Moon", `${MOONS[Math.round(st.moonPhase * 8) % 8].toLowerCase()} ${Math.round(st.moonFraction * 100)}%`)
    card.append(g)
  } else if (tab === "hours") {
    const g = el("div", "ov-hours")
    for (const h of f.hours.filter((_, i) => i % 2 === 0).slice(0, 6)) {
      const c = el("div"), i = el("img"); i.src = iconURL(h.code, h.isDay); i.alt = weatherWords(h.code); i.title = weatherWords(h.code)
      c.append(el("small", null, hourLabel(h.time)), i, el("b", null, `${Math.round(h.tempC)}°`), el("small", "ov-rain", h.rainPct ? `${h.rainPct}% rain` : "dry"))
      g.append(c)
    }
    card.append(g)
  } else {
    const g = el("div", "ov-days")
    const lo = Math.min(...f.days.map((d) => d.minC)), hi = Math.max(...f.days.map((d) => d.maxC)), span = Math.max(1, hi - lo)
    f.days.forEach((d, k) => {
      const name = k === 0 ? "Today" : new Date(d.date + "T12:00").toLocaleDateString("en", { weekday: "short" })
      const i = el("img"); i.src = iconURL(d.code, true); i.alt = weatherWords(d.code); i.title = weatherWords(d.code) + (d.rainPct ? ` · ${d.rainPct}% rain` : "")
      const r = el("div", "ov-range"), bar = el("div", "ov-bar"), fill = el("i")
      fill.style.left = `${((d.minC - lo) / span) * 100}%`; fill.style.right = `${((hi - d.maxC) / span) * 100}%`
      bar.append(fill)
      r.append(el("span", null, `${Math.round(d.minC)}°`), bar, el("span", null, `${Math.round(d.maxC)}°`))
      g.append(el("span", "d", name), i, r)
    })
    card.append(g)
  }
}

// host: a positioned element exactly over the room canvas. o:
//   room: the room <canvas> (live; the camera films it), roomSize: { w, h } in room pixels,
//   glass: the window glass, block: what should fill the screen (window, frame, sill, curtains),
//   crop: the slice of SCENE the glass shows in the room, look: { x, y } the scene point to face up close,
//   outside: the room's createOutside() draw (same life), mask(): canvas the size of the glass (room px),
//   opaque where the outside shows right now, win: createWindow(), front(g)?: more things to draw over
//   the window in room px (a cat on the sill), dark()?: the room's darkness canvas (room px) or null,
//   state(), buttons: [{ label, title, onClick }], onClose(), onZoom(k)?, reducedMotion, cardSide.
export function openView(host, o) {
  if (!styled) { const s = el("style"); s.textContent = STYLE; document.head.append(s); styled = true }
  const box_ = el("div", "ov"), cv = el("canvas"), card = el("div", "ov-card " + (o.cardSide || "left")), btns = el("div", "ov-btns")
  const tip = el("div", "ov-tip " + (o.cardSide === "right" ? "left" : "right"), "click the glass to open or shut it\nclick the wall or Esc to go back")
  tip.style.whiteSpace = "pre"
  box_.append(cv, card, btns, tip)
  host.append(box_)
  for (const ev of ["click", "pointerdown", "pointermove", "pointerup", "wheel"]) box_.addEventListener(ev, (e) => e.stopPropagation())
  for (const ev of ["click", "pointerdown"]) { card.addEventListener(ev, (e) => e.stopPropagation()); btns.addEventListener(ev, (e) => e.stopPropagation()) }

  const win = o.win
  const winBtn = el("button", "ov-btn go")
  const label = () => { winBtn.textContent = win.open ? "SHUT WINDOW" : "OPEN WINDOW" }
  winBtn.onclick = () => { win.setOpen(!win.open); label(); o.onWindow && o.onWindow(win.open) }
  label()
  const hideBtn = el("button", "ov-btn", "HIDE CARD")
  hideBtn.onclick = () => { card.classList.toggle("hide"); hideBtn.textContent = card.classList.contains("hide") ? "SHOW CARD" : "HIDE CARD" }
  btns.append(winBtn)
  for (const b of o.buttons || []) { const e = el("button", "ov-btn", b.label); if (b.title) e.title = b.title; e.onclick = () => b.onClick(e); btns.append(e) }
  const closeBtn = el("button", "ov-btn", "BACK ✕")
  btns.append(hideBtn, closeBtn)

  let tab = "now"
  try { tab = localStorage.getItem("ov-tab") || "now" } catch { /* storage blocked */ }
  let forecast = null
  const render = () => forecast && fillCard(card, forecast, o.state(), tab, (id) => { tab = id; try { localStorage.setItem("ov-tab", id) } catch { /* ignore */ } render() })
  card.textContent = "checking the weather…"
  fetchForecast().then((f) => { forecast = f; if (box_.isConnected) render() })
    .catch(() => { card.textContent = "No weather right now (offline?). The view's still live though!" })

  // ---- the camera ----
  const RW = o.roomSize.w, RH = o.roomSize.h, Gl = o.glass, B = o.block
  const right = o.cardSide === "right"
  const buf = el("canvas"); buf.width = W; buf.height = H
  const bg = buf.getContext("2d"), g = cv.getContext("2d")
  const gl = el("canvas"), glx = gl.getContext("2d")
  const fc = el("canvas"); fc.width = RW; fc.height = RH
  const fx = fc.getContext("2d")
  const dur = o.reducedMotion ? 1 : 1800, durOut = o.reducedMotion ? 1 : 1100
  let z = 0, dir = 1, last = performance.now(), raf = 0, closing = false, shown = false
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const lerp = (a, b, k) => a + (b - a) * k
  const inOut = (k) => k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2

  function layout(base) {
    // how close we get: the block fills the height, snapped so room pixels land on whole screen pixels
    let sEnd = Math.min((RH * 0.94) / B.h, (RW * 0.9) / B.w)
    sEnd = Math.max(1.5, Math.round(sEnd * base) / base)
    const bc = [B.x + B.w / 2, B.y + B.h / 2], target = [RW * (right ? 0.37 : 0.63), RH * 0.5]
    const Z = [0, 1].map((i) => Math.max(0, Math.min([RW, RH][i], (bc[i] * sEnd - target[i]) / (sEnd - 1))))
    // the view through the glass widens as we get near (far things barely grow); whole pixels at the end
    const gh = Gl.h * sEnd, gw = Gl.w * sEnd
    let oEnd = Math.max(gh / 170, gw / 240)
    oEnd = Math.max(1, Math.round(oEnd * base)) / base
    return { sEnd, Z, oEnd }
  }

  function frame(now) {
    raf = requestAnimationFrame(frame)
    const ms = Math.max(0, now - last), dt = Math.min(0.1, ms / 1000)
    last = now
    z = clamp01(z + (dir * ms) / (dir > 0 ? dur : durOut))
    const e = inOut(z)
    const hw = host.clientWidth, hh = host.clientHeight, dpr = window.devicePixelRatio || 1
    if (cv.width !== Math.round(hw * dpr) || cv.height !== Math.round(hh * dpr)) { cv.width = Math.round(hw * dpr); cv.height = Math.round(hh * dpr) }
    box_.style.setProperty("--u", `${Math.max(0.85, Math.min(1.35, hh / 405)).toFixed(3)}px`)
    const base = cv.width / RW, { sEnd, Z, oEnd } = layout(base)
    const s = sEnd ** e, offX = Z[0] - Z[0] * s, offY = Z[1] - Z[1] * s
    const scr = (x, y) => [Math.round((x * s + offX) * base), Math.round((y * s + offY) * base)]
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3)

    // the room, filmed
    g.imageSmoothingEnabled = false
    g.clearRect(0, 0, cv.width, cv.height)
    const [rx, ry] = scr(0, 0), [rx1, ry1] = scr(RW, RH)
    g.drawImage(o.room, 0, 0, o.room.width, o.room.height, rx, ry, rx1 - rx, ry1 - ry)

    // the outside through the glass, sharper as we get close; moving the mouse leans you to look around
    const st = o.state()
    o.outside(bg, st, undefined, dt, true, { x: 0, y: 0, w: W, h: H })
    const os = oEnd ** e
    const [gx, gy] = scr(Gl.x, Gl.y), [gx1, gy1] = scr(Gl.x + Gl.w, Gl.y + Gl.h)
    const rw = (Gl.w * s) / os, rh = (Gl.h * s) / os
    const c0 = [o.crop.x + o.crop.w / 2, o.crop.y + o.crop.h / 2]
    const look = [(o.look ? o.look.x : c0[0]) - mouse.x * 18, (o.look ? o.look.y : c0[1]) - mouse.y * 8]
    let cx = lerp(c0[0], look[0], e), cy = lerp(c0[1], look[1], e)
    cx = rw >= W ? W / 2 : Math.max(rw / 2, Math.min(W - rw / 2, cx))
    cy = rh >= H ? H / 2 : Math.max(rh / 2, Math.min(H - rh / 2, cy))
    if (gx1 > gx && gy1 > gy) {
      if (gl.width !== gx1 - gx || gl.height !== gy1 - gy) { gl.width = gx1 - gx; gl.height = gy1 - gy }
      glx.globalCompositeOperation = "source-over"
      glx.imageSmoothingEnabled = false
      glx.clearRect(0, 0, gl.width, gl.height)
      glx.drawImage(buf, cx - rw / 2, cy - rh / 2, rw, rh, 0, 0, gl.width, gl.height)
      glx.globalCompositeOperation = "destination-in"
      glx.drawImage(o.mask(), 0, 0, gl.width, gl.height)
      g.drawImage(gl, gx, gy)
    }

    // the window's own pixels over that (sashes, birds, rain blowing in), dimmed like the room
    fx.clearRect(0, 0, RW, RH)
    fx.globalCompositeOperation = "source-over"
    win.draw(fx, st, performance.now() / 1000, 1)
    if (o.front) o.front(fx)
    const dk = o.dark && o.dark()
    if (dk) { fx.globalCompositeOperation = "source-atop"; fx.imageSmoothingEnabled = false; fx.drawImage(dk, 0, 0, RW, RH) }
    g.drawImage(fc, 0, 0, RW, RH, rx, ry, rx1 - rx, ry1 - ry)

    o.onZoom && o.onZoom(e)
    const on = z >= 1
    if (on !== shown) {
      shown = on
      box_.classList.toggle("shown", on)
      card.classList.toggle("on", on)
      if (on) { label(); render() }
    }
    if (closing && z <= 0) finish()
  }
  raf = requestAnimationFrame(frame)

  // room point under a click (for birds and the glass)
  function roomAt(e) {
    const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1
    const base = cv.width / RW, { sEnd, Z } = layout(base), s = sEnd
    const X = ((e.clientX - r.left) * dpr) / base, Y = ((e.clientY - r.top) * dpr) / base
    return [(X - (Z[0] - Z[0] * s)) / s, (Y - (Z[1] - Z[1] * s)) / s]
  }
  box_.addEventListener("pointermove", (e) => {
    const r = box_.getBoundingClientRect()
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.ty = ((e.clientY - r.top) / r.height) * 2 - 1
    if (!shown) return
    const [x, y] = roomAt(e), overGlass = x >= Gl.x && x < Gl.x + Gl.w && y >= Gl.y && y < Gl.y + Gl.h
    box_.style.cursor = overGlass ? "pointer" : "zoom-out"
  })
  box_.addEventListener("click", (e) => {
    if (!shown) return
    const [x, y] = roomAt(e)
    if (win.hit(x, y)) return
    if (x >= Gl.x && x < Gl.x + Gl.w && y >= Gl.y && y < Gl.y + Gl.h) { winBtn.onclick(); return }
    close()
  })

  function finish() {
    cancelAnimationFrame(raf)
    box_.remove()
    removeEventListener("keydown", onKey, true)
    o.onZoom && o.onZoom(0)
    o.onClose && o.onClose()
  }
  function close() { if (closing) return; closing = true; dir = -1; shown = false; box_.classList.remove("shown"); card.classList.remove("on") }
  function onKey(e) { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close() } }
  addEventListener("keydown", onKey, true)
  closeBtn.onclick = close
  return close
}
