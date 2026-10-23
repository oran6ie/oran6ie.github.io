// ---------- curtains on a rod, drawn in code so they really move ----------
// Grommet panels: the fabric runs in folds between rings on the rod. Pulled open the rings bunch up and
// the folds go deep; pulled shut they spread and the folds relax into soft waves. The hand pulls the
// leading ring and the others only follow once the cloth between them goes taut (closing) or bunches
// up (opening), so the movement ripples back along the rod. The hem lags behind and swings when the
// pull stops, and flutters when a breeze comes in at the open window.
// Shared by the portfolio room and Som's room; everything is in the host's own pixels.
//
// cfg: {
//   top, bottom              y of the heading's top row and of the hem
//   rod: { x0, x1, y, h, show? }   the rod's body (rows y .. y+h-1), finials past each end;
//                            show: false when something hides it (a valance)
//   panels: [{ outer, open, shut }]   x of the panel's fixed outer edge, and of its leading edge when
//                            open and when shut (the leading edge is the side by the window's middle)
//   folds                    folds per panel
//   speed?                   how fast the hand pulls (px/s), default 70
//   pal: { cloth: [6 dark→light], print: [6 dark→light], rim: [mid, edge], line, shadow,
//          rod: [top, bottom, glint], finial: [outline, dark, mid, light] }
//   print?(u, v)             true where the fabric's pattern is printed (u, v: flat fabric px)
//   finial?: "ball" | "none"
// }
const hash = (a, b) => { const r = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return r - Math.floor(r) }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

// A fern frond, the print on the portfolio's curtains: leaflets in chevrons up a stem, widest in the middle
const FERN = (() => {
  const W = 9, H = 21, c = 4, m = []
  for (let y = 0; y < H; y++) {
    const row = []
    for (let x = 0; x < W; x++) {
      const k = Math.abs(x - c), j = y + Math.floor(k / 2), w = Math.round(4.2 * Math.sin((Math.PI * (j + 1)) / (H + 2)))
      row.push(k === 0 ? y > 0 : k <= w && j % 2 === 0 && j < H)
    }
    m.push(row)
  }
  return { W, H, m }
})()
export function fernPrint(u, v) {
  const col = Math.floor(u / 13), lx = Math.floor(u - col * 13) - 2
  const vv = v - (col % 2 ? 14 : 2), ly = vv - Math.floor(vv / 28) * 28
  return lx >= 0 && lx < FERN.W && ly < FERN.H && FERN.m[ly][lx]
}

export function createCurtains(cfg) {
  const n = cfg.folds, top = cfg.top, bot = cfg.bottom, H = bot - top + 1
  const speed = cfg.speed || 70
  const panels = cfg.panels.map((p) => {
    const dir = Math.sign(p.shut - p.outer)                 // +1: the panel closes toward +x
    const dmin = Math.abs(p.open - p.outer) / n, dmax = Math.abs(p.shut - p.outer) / n
    return {
      ...p, dir, dmin, dmax, lf: dmax * 1.25,                // flat cloth per fold: a little more than the gap shut
      a: Array.from({ length: n + 1 }, (_, i) => i * dmin),  // each ring's distance from the outer edge
      v: new Array(n + 1).fill(0),                           // ring speeds (for the hem's swing)
      s: new Array(n + 1).fill(0), sv: new Array(n + 1).fill(0), // the hem's swing under each ring
      lead: n * dmin, lv: 0,
    }
  })
  let k = 0, target = 0, breeze = 0, t = 0
  const set = (shut, instant) => {
    target = shut ? 1 : 0
    if (instant) for (const p of panels) { p.lead = n * (target ? p.dmax : p.dmin); p.lv = 0; for (let i = 0; i <= n; i++) p.a[i] = (i * p.lead) / n }
  }

  // grommet chain: the leading ring is pulled, the rest keep their gaps between dmin and dmax
  function chain(p) {
    const a = p.a
    a[0] = 0; a[n] = p.lead
    for (let i = n - 1; i > 0; i--) a[i] = clamp(a[i], a[i + 1] - p.dmax, a[i + 1] - p.dmin)
    for (let i = 1; i < n; i++) a[i] = clamp(a[i], a[i - 1] + p.dmin, a[i - 1] + p.dmax)
  }

  function update(dt) {
    t += dt
    if (dt <= 0) return
    for (const p of panels) {
      // the hand: speeds up, cruises, eases off into the end
      const goal = n * (target ? p.dmax : p.dmin), d = goal - p.lead, dist = Math.abs(d)
      if (dist < 0.01) { p.lead = goal; p.lv = 0 }
      else {
        p.lv = Math.min(p.lv + speed * 5 * dt, speed, Math.sqrt(2 * speed * 4 * dist) + 2)
        p.lead += Math.sign(d) * Math.min(dist, p.lv * dt)
      }
      const before = p.a.slice()
      chain(p)
      // the hem swings like a pendulum, pushed by each ring's change of speed
      const w = 2 * Math.PI * 0.85, z = 0.22
      for (let i = 0; i <= n; i++) {
        const v = (p.a[i] - before[i]) / dt, acc = (v - p.v[i]) / dt
        p.v[i] = v
        p.sv[i] += (-w * w * p.s[i] - 2 * z * w * p.sv[i] - clamp(acc, -900, 900) * 0.16) * dt
        p.s[i] = clamp(p.s[i] + p.sv[i] * dt, -5, 5)
      }
    }
    k = panels.reduce((m, p) => m + (p.lead - n * p.dmin) / (n * (p.dmax - p.dmin) || 1), 0) / panels.length
  }

  // ---- drawing: per pixel into a buffer covering everything the curtains could ever reach ----
  const xs = cfg.panels.flatMap((p) => [p.outer, p.open, p.shut])
  const bx = Math.min(...xs, cfg.rod.x0) - 10, bw = Math.max(...xs, cfg.rod.x1) + 10 - bx + 1
  const by = top - 1, bh = H + 6
  let buf = null, img = null, key = ""
  const hex = (c) => { const v = parseInt(c.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255] }
  const P = cfg.pal
  const cloth = P.cloth.map(hex), ink = P.print.map(hex), rim = P.rim.map(hex), line = hex(P.line)
  const rodC = P.rod.map(hex), fin = P.finial.map(hex)
  const print = cfg.print || fernPrint

  function put(x, y, c, a = 255) {
    x -= bx; y -= by
    if (x < 0 || y < 0 || x >= bw || y >= bh) return
    const i = (y * bw + x) * 4, d = img.data
    if (a >= 255) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; return }
    const f = a / 255, g = d[i + 3] / 255, o = f + g * (1 - f)
    for (let j = 0; j < 3; j++) d[i + j] = Math.round((c[j] * f + d[i + j] * g * (1 - f)) / (o || 1))
    d[i + 3] = Math.round(o * 255)
  }

  function rod(x0, x1) {
    const R = cfg.rod
    for (let x = x0; x <= x1; x++) {
      put(x, R.y - 1, line); put(x, R.y + R.h, line)
      for (let j = 0; j < R.h; j++) put(x, R.y + j, j === 0 ? ((x * 7) % 23 === 0 ? rodC[2] : rodC[0]) : rodC[1])
    }
  }
  function finials() {
    if (cfg.finial === "none") return
    const R = cfg.rod, cy = R.y + (R.h - 1) / 2
    for (const [x, s] of [[R.x0 - 1, -1], [R.x1 + 1, 1]]) {
      put(x, Math.round(cy), fin[1])
      const c = x + s * 4
      for (let yy = -4; yy <= 4; yy++) for (let xx = -4; xx <= 4; xx++) {
        const r = Math.hypot(xx, yy * 1.05)
        if (r > 3.9) continue
        const px = c + xx, py = Math.round(cy) + yy
        if (r > 3) { put(px, py, fin[0]); continue }
        const lit = -xx * 0.5 - yy * 0.8
        put(px, py, lit > 1.3 ? fin[3] : lit > -0.6 ? fin[2] : fin[1])
      }
    }
  }

  function panel(p, breezeAmt) {
    const rows = []
    // per row: where each ring's column of cloth hangs (the heading is stiff; the hem swings most)
    for (let y = top; y <= bot; y++) {
      const v = (y - top) / (H - 1), sw = v ** 1.6
      const X = p.a.map((a, i) => {
        const flut = breezeAmt * sw * (Math.sin(t * 1.9 + i * 0.9) + 0.6 * Math.sin(t * 3.3 + i * 2.1)) * (0.4 + (0.6 * i) / n)
        return p.outer + p.dir * a + (p.s[i] + flut) * sw * (i === 0 ? 0.4 : 1)
      })
      for (let i = 1; i <= n; i++) if ((X[i] - X[i - 1]) * p.dir < 1) X[i] = X[i - 1] + p.dir
      rows.push(X)
    }
    const lx = [0.6 * p.dir, 1], ln = Math.hypot(...lx)
    for (let y = top; y <= bot; y++) {
      const X = rows[y - top], v = y - top
      let first = Infinity, last = -Infinity
      for (let i = 0; i < n; i++) {
        const xa = X[i], xb = X[i + 1], d = Math.abs(xb - xa), sign = i % 2 ? -1 : 1
        const A = 0.5 * Math.sqrt(Math.max(0, p.lf * p.lf - d * d)), Amax = 0.5 * p.lf
        // columns this fold covers, walking from the outer ring to the inner one
        const c0 = Math.round(Math.min(xa, xb)), c1 = Math.round(Math.max(xa, xb)) - 1
        if (c1 < c0) continue
        const cols = []
        let arc = 0
        for (let c = c0; c <= c1; c++) {
          const s = clamp(((c + 0.5 - xa) * p.dir) / d, 0, 1)
          const m = (sign * A * Math.PI * Math.cos(Math.PI * s)) / d   // slope along the panel
          arc += Math.sqrt(1 + m * m)
          cols.push({ c, s, m, arc })
        }
        // a deep fold hides the cloth that turns away, so only about 1.5x its width of print shows
        const vis = Math.min(p.lf, d * 1.5)
        for (const col of cols) {
          const u = i * p.lf + (p.lf - vis) / 2 + ((col.arc - 0.5 * Math.sqrt(1 + col.m * col.m)) / arc) * vis
          const ms = col.m * p.dir                                     // slope in screen x
          const nl = (-ms * lx[0] + lx[1]) / (Math.hypot(ms, 1) * ln)
          const zf = (sign * A * Math.sin(Math.PI * col.s)) / Amax
          let b = 0.15 + 0.85 * Math.max(0, nl) ** 1.2 * (1 - 0.32 * Math.max(0, -zf))
          if (hash(Math.floor(u / 2), 7) > 0.84) b -= 0.1                // painted streaks down the cloth
          const lvl = clamp(Math.round(b * 5), 0, 5)
          let c = print(u, v) ? ink[lvl] : cloth[lvl]
          const hem = bot - (zf < -0.2 ? 1 : 0)
          if (y > hem) continue
          if (y === hem || y === top) c = cloth[Math.max(0, lvl - 2)]
          put(col.c, y, c)
          if (y === hem) put(col.c, y + 1, line)
          first = Math.min(first, col.c); last = Math.max(last, col.c)
        }
      }
      if (first > last) continue
      // the leading edge catches the window's light; both edges get the outline
      const lead = p.dir > 0 ? last : first, outer = p.dir > 0 ? first : last
      put(lead - p.dir, y, rim[0]); put(lead, y, rim[1])
      put(outer, y, line); put(lead + p.dir, y, line)
      if (y === top) for (let x = first; x <= last; x++) put(x, y - 1, line)
    }
    // the wall behind takes a soft shadow under the hem
    for (let x = Math.round(Math.min(...rows[H - 1])); x <= Math.round(Math.max(...rows[H - 1])); x++) {
      put(x, bot + 2, hex("#000000"), Math.round(255 * 0.18)); put(x, bot + 3, hex("#000000"), Math.round(255 * 0.08))
    }
    return rows[0]
  }

  // P: canvas pixels per host pixel
  function draw(g, ox = 0, oy = 0, P = 1) {
    const kk = panels.map((p) => [p.lead, ...p.a, ...p.s].map((v) => v.toFixed(2)).join(",")).join("|") + (breeze > 0.01 ? t.toFixed(2) : "")
    if (key !== kk || !buf) {
      key = kk
      if (!buf) { buf = document.createElement("canvas"); buf.width = bw; buf.height = bh }
      const bg = buf.getContext("2d")
      img = bg.createImageData(bw, bh)
      if (cfg.rod.show !== false) { rod(cfg.rod.x0, cfg.rod.x1); finials() }
      for (const p of panels) {
        const X = panel(p, breeze)
        if (cfg.rod.show === false) continue
        // the rod passes in front of the cloth wherever the cloth folds back behind it, and every ring shows
        for (let i = 0; i < n; i++) if (i % 2) rod(Math.round(Math.min(X[i], X[i + 1])), Math.round(Math.max(X[i], X[i + 1])) - 1)
        for (const x of X) {
          const r = Math.round(x), R = cfg.rod
          put(r, R.y - 2, fin[0]); put(r, R.y + R.h + 1, fin[0])
          put(r, R.y - 1, fin[2]); put(r, R.y + R.h, fin[1])
        }
      }
      bg.putImageData(img, 0, 0)
    }
    const smooth = g.imageSmoothingEnabled
    g.imageSmoothingEnabled = false
    g.drawImage(buf, (bx + ox) * P, (by + oy) * P, bw * P, bh * P)
    g.imageSmoothingEnabled = smooth
  }

  return {
    set, update, draw,
    get k() { return k },
    set breeze(v) { breeze = v },
    // where the cloth is at the heading: [[x0, x1], ...] per panel (for masks and clicks)
    spans() {
      return panels.map((p) => {
        const a = p.outer, b = p.outer + p.dir * p.lead
        return [Math.min(a, b), Math.max(a, b)]
      })
    },
  }
}
