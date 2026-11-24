/*
 * The burning envelope: fire starts at the seal, a ragged burn front spreads outward, charred bits of paper break off,
 * fall and crumble into fine powder that piles up into a small mound. Canvas 2D, no dependencies.
 * Ported from the approved design reference (docs/design/burn-ref.js).
 */

import { FrameGovernor, startLevel } from './budget'

const EW = 300
const EH = 210
const N = EW * EH
/** Wall-clock safety: if a very slow device has not finished after this many times the intended length, end it anyway. */
const DEADLINE_FACTOR = 2
const BURN_LEN = 3.6
const SETTLE = 2.3

interface Frag { x: number; y: number; vx: number; vy: number; rot: number; w: number; size: number; pts: [number, number][]; age: number; life: number; ph: number }
interface Grain { x: number; y: number; vx: number; vy: number; s: number }
interface Flame { x: number; y: number; vx: number; vy: number; age: number; life: number; size: number; ph: number }
interface Spark { x: number; y: number; vx: number; vy: number; age: number; life: number }

const rr = (a: number, b: number): number => a + Math.random() * (b - a)
const rnd = (ix: number, iy: number, s: number): number => { const v = Math.sin(ix * 127.1 + iy * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v) }
function vnoise(x: number, y: number, s: number): number {
  const ix = Math.floor(x), iy = Math.floor(y)
  let fx = x - ix, fy = y - iy
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  const a = rnd(ix, iy, s), b = rnd(ix + 1, iy, s), c = rnd(ix, iy + 1, s), d = rnd(ix + 1, iy + 1, s)
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy
}
const fbm = (x: number, y: number, s: number): number => vnoise(x / 38, y / 38, s) * 0.55 + vnoise(x / 17, y / 17, s + 1) * 0.3 + vnoise(x / 8, y / 8, s + 2) * 0.15
const hash2 = (x: number, y: number): number => { const v = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return v - Math.floor(v) }

/* Everything that does not depend on the canvas size is computed once. */
let shared: { envPix: Uint8ClampedArray; dmap: Float32Array; n2: Float32Array; tEnd: number } | null = null
function sharedData() {
  if (shared) return shared
  const art = document.createElement('canvas')
  art.width = EW; art.height = EH
  const a = art.getContext('2d')!
  a.fillStyle = '#b5391a'; a.fillRect(0, 0, EW, EH)
  a.fillStyle = '#8a2a12'; a.beginPath(); a.moveTo(0, 0); a.lineTo(150, 122); a.lineTo(300, 0); a.closePath(); a.fill()
  a.fillStyle = 'rgba(0,0,0,.2)'; a.beginPath(); a.moveTo(0, 210); a.lineTo(150, 88); a.lineTo(150, 92); a.lineTo(6, 210); a.closePath(); a.fill()
  a.save()
  a.shadowColor = 'rgba(255,91,31,.65)'; a.shadowBlur = 22
  const sg = a.createRadialGradient(140, 94, 2, 150, 105, 32)
  sg.addColorStop(0, '#4a2a20'); sg.addColorStop(0.55, '#2a1410'); sg.addColorStop(1, '#160a07')
  a.fillStyle = sg; a.beginPath(); a.arc(150, 105, 32, 0, Math.PI * 2); a.fill()
  a.restore()
  a.fillStyle = '#ffc247'; a.beginPath()
  ;([[40, 0], [100, 22], [20, 48], [90, 70], [30, 100], [0, 80], [70, 52], [0, 30]] as const).forEach(([x, y], i) => {
    const px = 147 + x * 0.06, py = 81 + y * 0.48
    if (i === 0) a.moveTo(px, py); else a.lineTo(px, py)
  })
  a.closePath(); a.fill()

  const envPix = a.getImageData(0, 0, EW, EH).data
  for (let i = 0; i < N; i++) {
    const gv = (rnd(i % EW, (i / EW) | 0, 5) - 0.5) * 16
    const p = i * 4
    envPix[p]! += gv; envPix[p + 1]! += gv * 0.5; envPix[p + 2]! += gv * 0.4
  }
  const dmap = new Float32Array(N)
  const n2 = new Float32Array(N)
  let maxd = 0
  for (let y = 0; y < EH; y++) {
    for (let x = 0; x < EW; x++) {
      const dx = (x - 150) / 150, dy = (y - 105) / 105, i = y * EW + x
      const d = Math.sqrt(dx * dx + dy * dy) + (fbm(x, y, 3) - 0.5) * 0.5
      dmap[i] = d; if (d > maxd) maxd = d
      n2[i] = fbm(x * 1.7, y * 1.7, 9)
    }
  }
  shared = { envPix, dmap, n2, tEnd: maxd + 0.23 }
  return shared
}

function sprite(stops: [number, string][]): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 32; c.height = 56
  const g = c.getContext('2d')!; g.translate(16, 34); g.scale(1, 1.45)
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 15)
  stops.forEach(([o, col]) => gr.addColorStop(o, col))
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, 15, 0, Math.PI * 2); g.fill()
  return c
}

export class BurnEffect {
  private ctx: CanvasRenderingContext2D
  private W = 0
  private H = 0
  private CX = 0
  private EX = 0
  private EY = 0
  private FLOOR = 0
  private HL = 0
  private readonly HW = 330
  private readonly HH = 64
  private heights = new Int16Array(330)
  private frags: Frag[] = []
  private grains: Grain[] = []
  private flames: Flame[] = []
  private sparks: Spark[] = []
  private edge: number[] = []
  private fragAcc = 0
  private flameAcc = 0
  private sparkAcc = 0
  private time = 0
  private frame = 0
  private burnT = 0
  private raf = 0
  private running = false
  private out = document.createElement('canvas')
  private octx: CanvasRenderingContext2D
  private img: ImageData
  private heapCv = document.createElement('canvas')
  private heapCtx: CanvasRenderingContext2D
  private heapImg: ImageData
  private sprites = [
    sprite([[0, 'rgba(255,215,110,.9)'], [0.3, 'rgba(255,170,60,.75)'], [0.7, 'rgba(255,110,28,.28)'], [1, 'rgba(255,90,20,0)']]),
    sprite([[0, 'rgba(255,170,60,.95)'], [0.4, 'rgba(255,100,30,.6)'], [0.8, 'rgba(200,50,15,.2)'], [1, 'rgba(180,40,10,0)']]),
    sprite([[0, 'rgba(225,75,28,.75)'], [0.5, 'rgba(150,35,12,.32)'], [1, 'rgba(100,20,8,0)']]),
  ]
  private resolveDone: (() => void) | null = null
  private governor = new FrameGovernor(startLevel(navigator.hardwareConcurrency, (navigator as Navigator & { deviceMemory?: number }).deviceMemory))
  private lastDpr = 0

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!
    this.out.width = EW; this.out.height = EH
    this.octx = this.out.getContext('2d')!
    this.img = this.octx.createImageData(EW, EH)
    this.heapCv.width = this.HW; this.heapCv.height = this.HH
    this.heapCtx = this.heapCv.getContext('2d')!
    this.heapImg = this.heapCtx.createImageData(this.HW, this.HH)
    this.measure()
  }

  measure(): void {
    const r = this.canvas.getBoundingClientRect()
    this.W = Math.round(r.width) || 390
    this.H = Math.round(r.height) || 760
    const dpr = Math.min(window.devicePixelRatio || 1, this.governor.budget.dprCap)
    this.lastDpr = dpr
    this.canvas.width = this.W * dpr
    this.canvas.height = this.H * dpr
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.CX = this.W / 2
    this.EX = Math.round(this.CX - EW / 2)
    this.EY = Math.max(60, Math.round(this.H * 0.2))
    this.FLOOR = Math.min(this.H - 90, this.EY + EH + 190)
    this.HL = Math.round(this.CX - this.HW / 2)
  }

  /** Runs the whole burn once. Resolves when the powder has settled. */
  start(): Promise<void> {
    this.time = 0; this.frame = 0
    this.frags = []; this.grains = []; this.flames = []; this.sparks = []; this.heights = new Int16Array(this.HW)
    this.fragAcc = this.flameAcc = this.sparkAcc = 0
    this.running = true
    let last = performance.now()
    const startedAt = last
    const tick = (now: number): void => {
      if (!this.running) return
      const frameMs = now - last
      // a slow device must not stretch the burn: allow bigger steps than 60 fps would need, and give up after a deadline
      const dt = Math.min(frameMs / 1000, 0.1)
      last = now
      if (this.governor.sample(frameMs) && this.lastDpr !== Math.min(window.devicePixelRatio || 1, this.governor.budget.dprCap)) this.measure()
      this.time += dt
      this.update(dt)
      this.render()
      const overdue = now - startedAt > (BURN_LEN + SETTLE) * 1000 * DEADLINE_FACTOR
      if (this.time >= BURN_LEN + SETTLE || overdue) { this.running = false; this.resolveDone?.(); return }
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
    return new Promise((res) => { this.resolveDone = res })
  }

  stop(): void { this.running = false; cancelAnimationFrame(this.raf) }

  private heapAt(x: number): number {
    const c = Math.min(this.HW - 1, Math.max(0, Math.floor(x - this.HL)))
    return this.heights[c]!
  }

  private land(x: number): void {
    const h = this.heights
    let c = Math.min(this.HW - 2, Math.max(1, Math.floor(x - this.HL)))
    for (let s = 0; s < 14; s++) {
      const here = h[c]!
      if (here - h[c - 1]! >= 2 && (Math.random() < 0.5 || here - h[c + 1]! < 2)) c--
      else if (here - h[c + 1]! >= 2) c++
      else if (here - h[c - 1]! >= 1 && Math.random() < 0.35) c--
      else if (here - h[c + 1]! >= 1 && Math.random() < 0.35) c++
      else break
      if (c < 1) { c = 1; break }
      if (c > this.HW - 2) { c = this.HW - 2; break }
    }
    if (h[c]! < this.HH - 1) h[c]!++
  }

  private pickEdge(): [number, number] | null {
    if (this.edge.length < 2) return null
    const k = ((Math.random() * (this.edge.length / 2)) | 0) * 2
    return [this.edge[k]!, this.edge[k + 1]!]
  }

  private burnPass(t: number): void {
    const { envPix, dmap, n2 } = sharedData()
    const data = this.img.data
    let ec = 0
    this.edge.length = 0
    for (let y = 0; y < EH; y++) {
      for (let x = 0; x < EW; x++) {
        const i = y * EW + x
        const p = i << 2
        const d = dmap[i]! - t
        if (d < 0) { data[p + 3] = 0; continue }
        let r = envPix[p]!, g = envPix[p + 1]!, b = envPix[p + 2]!, al = 255
        if (d < 0.2) {
          if (d < 0.022) {
            const f = d / 0.022
            const fl = n2[(i + this.frame * 53) % N]!
            r = 255; g = (225 - 120 * f) * (0.8 + 0.3 * fl); b = 100 - 70 * f
            if (d < 0.005) al = 255 * (d / 0.005)
            if ((i & 3) === 0 && ec < 600) { this.edge[ec++] = x; this.edge[ec++] = y }
          } else if (d < 0.055) {
            const f2 = (d - 0.022) / 0.033
            r = 255 - 215 * f2; g = 91 - 77 * f2; b = 31 - 23 * f2
          } else {
            const f3 = (d - 0.055) / 0.145
            const s = Math.min(1, f3 * f3 * (3 - 2 * f3) * (0.75 + 0.5 * n2[i]!))
            r = 28 + (r - 28) * s; g = 14 + (g - 14) * s; b = 9 + (b - 9) * s
          }
        }
        data[p] = r; data[p + 1] = g; data[p + 2] = b; data[p + 3] = al
      }
    }
    this.octx.putImageData(this.img, 0, 0)
  }

  private update(dt: number): void {
    const { tEnd } = sharedData()
    this.frame++
    const u = Math.min(1, this.time / BURN_LEN)
    const t0 = -0.28
    this.burnT = t0 + (tEnd - t0) * Math.pow(u, 1.12)
    // the burn front moves slowly: on a slow device it is recomputed every 2nd to 4th frame (see budget.ts)
    if ((this.frame - 1) % this.governor.budget.burnEvery === 0) this.burnPass(this.burnT)
    const burning = u < 0.96 && this.edge.length > 0

    if (burning) {
      this.fragAcc += dt * 36 * this.governor.budget.spawn
      while (this.fragAcc >= 1) {
        this.fragAcc -= 1
        const e = this.pickEdge(); if (!e) break
        const size = rr(3.5, 11)
        const n = 5 + ((Math.random() * 2) | 0)
        const pts: [number, number][] = []
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + rr(-0.3, 0.3)
          pts.push([Math.cos(ang) * size * rr(0.55, 1), Math.sin(ang) * size * rr(0.45, 1)])
        }
        const x = this.EX + e[0] + rr(-3, 3)
        this.frags.push({ x, y: this.EY + e[1] + rr(-2, 3), vx: (this.CX - x) * 0.3 + rr(-14, 14), vy: rr(-30, 6), rot: rr(0, 6.28), w: rr(-5, 5), size, pts, age: 0, life: rr(0.55, 1.35), ph: rr(0, 6.28) })
      }
      this.flameAcc += dt * 560 * this.governor.budget.spawn
      while (this.flameAcc >= 1) {
        this.flameAcc -= 1
        const e = this.pickEdge(); if (!e) break
        this.flames.push({ x: this.EX + e[0] + rr(-2, 2), y: this.EY + e[1] + rr(-1, 2), vx: rr(-12, 12), vy: -rr(55, 135), age: 0, life: rr(0.45, 0.95), size: rr(0.8, 1.5), ph: rr(0, 6.28) })
      }
      this.sparkAcc += dt * 26 * this.governor.budget.spawn
      while (this.sparkAcc >= 1) {
        this.sparkAcc -= 1
        const e = this.pickEdge(); if (!e) break
        this.sparks.push({ x: this.EX + e[0], y: this.EY + e[1], vx: rr(-30, 30), vy: -rr(80, 170), age: 0, life: rr(0.9, 2) })
      }
    }

    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i]!; f.age += dt
      if (f.age >= f.life) { this.flames.splice(i, 1); continue }
      f.x += (f.vx + Math.sin(f.age * 9 + f.ph) * 14) * dt; f.y += f.vy * dt
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i]!; s.age += dt
      if (s.age >= s.life) { this.sparks.splice(i, 1); continue }
      s.vy += 40 * dt; s.x += s.vx * dt; s.y += s.vy * dt
    }
    for (let i = this.frags.length - 1; i >= 0; i--) {
      const f = this.frags[i]!; f.age += dt
      f.vy += 300 * dt; f.vx *= 1 - 0.8 * dt; f.vx += (this.CX - f.x) * 1.4 * dt
      f.x += (f.vx + Math.sin(f.age * 6 + f.ph) * 16) * dt; f.y += f.vy * dt; f.rot += f.w * dt
      f.size *= 1 - 0.3 * dt
      if (Math.random() < dt * 22) this.grains.push({ x: f.x + rr(-2, 2), y: f.y + rr(-1, 2), vx: rr(-10, 10) + (this.CX - f.x) * 0.15, vy: rr(0, 25), s: (Math.random() * 3) | 0 })
      if (f.age > f.life || f.size < 1.6 || f.y >= this.FLOOR - this.heapAt(f.x) - 3) {
        const n = Math.ceil(f.size * f.size * 0.5)
        for (let k = 0; k < n; k++) this.grains.push({ x: f.x + rr(-f.size, f.size) * 0.6, y: f.y + rr(-f.size, f.size) * 0.5, vx: rr(-30, 30) + (this.CX - f.x) * 0.25, vy: rr(-50, -2), s: (Math.random() * 3) | 0 })
        this.frags.splice(i, 1)
      }
    }
    for (let i = this.grains.length - 1; i >= 0; i--) {
      const g = this.grains[i]!
      g.vy += 420 * dt; g.vx *= 1 - 1.6 * dt; g.vx += (this.CX - g.x) * 1.5 * dt
      g.x += g.vx * dt; g.y += g.vy * dt
      if (g.y >= this.FLOOR - this.heapAt(g.x)) { this.land(g.x); this.grains.splice(i, 1) }
    }
  }

  private render(): void {
    const { tEnd } = sharedData()
    const ctx = this.ctx
    const burnFrac = Math.max(0, Math.min(1, (this.burnT + 0.28) / (tEnd + 0.28)))
    ctx.clearRect(0, 0, this.W, this.H)
    ctx.globalAlpha = Math.min(1, this.time / 0.3)

    const glowA = Math.sin(Math.min(1, burnFrac * 1.05) * Math.PI) * 0.5 + (burnFrac > 0 ? 0.08 : 0)
    if (glowA > 0.01) {
      const cy = this.EY + EH / 2
      const gr = ctx.createRadialGradient(this.CX, cy, 10, this.CX, cy, Math.min(300, this.W / 2))
      gr.addColorStop(0, `rgba(255,100,30,${glowA})`); gr.addColorStop(1, 'rgba(255,100,30,0)')
      ctx.globalCompositeOperation = 'lighter'
      ctx.fillStyle = gr; ctx.fillRect(0, 0, this.W, this.H)
      ctx.globalCompositeOperation = 'source-over'
    }

    ctx.drawImage(this.out, this.EX, this.EY)

    const hd = this.heapImg.data
    hd.fill(0)
    for (let c = 0; c < this.HW; c++) {
      const h = this.heights[c]!
      for (let k = 0; k < h; k++) {
        const p = ((this.HH - 1 - k) * this.HW + c) * 4
        const v = 52 + hash2(c, k) * 62 + (k >= h - 3 ? 24 : 0)
        hd[p] = v + 8; hd[p + 1] = v + 3; hd[p + 2] = v - 3; hd[p + 3] = 255
      }
    }
    this.heapCtx.putImageData(this.heapImg, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.heapCv, this.HL, this.FLOOR - this.HH)
    ctx.imageSmoothingEnabled = true

    const shades = ['rgb(104,96,88)', 'rgb(78,72,66)', 'rgb(126,117,107)']
    for (let s = 0; s < 3; s++) {
      ctx.fillStyle = shades[s]!
      for (const g of this.grains) if (g.s === s) ctx.fillRect(g.x, g.y, 1.6, 1.6)
    }

    for (const f of this.frags) {
      const hot = Math.max(0, 1 - f.age / 0.9)
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot)
      ctx.beginPath()
      f.pts.forEach(([px, py], q) => { if (q === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py) })
      ctx.closePath()
      ctx.fillStyle = `rgb(${(38 + hot * 70) | 0},${(24 + hot * 20) | 0},16)`
      ctx.fill()
      if (hot > 0.05) { ctx.strokeStyle = `rgba(255,150,50,${hot * 0.95})`; ctx.lineWidth = 1.2; ctx.stroke() }
      ctx.restore()
    }

    ctx.globalCompositeOperation = 'lighter'
    const base = ctx.globalAlpha
    for (const f of this.flames) {
      const u = f.age / f.life
      const spr = this.sprites[u < 0.28 ? 0 : u < 0.62 ? 1 : 2]!
      const sc = f.size * (u < 0.2 ? 0.6 + u * 2 : 1 - (u - 0.2) * 0.9)
      const sw = 26 * sc, sh = 44 * sc
      ctx.globalAlpha = base * (1 - u) * 0.55
      ctx.drawImage(spr, f.x - sw / 2, f.y - sh * 0.62, sw, sh)
    }
    ctx.fillStyle = '#ffc247'
    for (const s of this.sparks) { ctx.globalAlpha = base * (1 - s.age / s.life); ctx.fillRect(s.x, s.y, 2, 2) }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
}
