/*
 * Audio engine: the howler's voice treatment and the sound effects. Web Audio only, no assets.
 *
 * The voice recipe ("furious mother"): the message is spoken in a few pieces, each one louder, faster and higher than
 * the one before (the fury builds), then everything is pushed through saturation, a heavy compressor and a huge hall,
 * as if the whole house were shouting. The recipe is fixed by the product, not chosen by the person.
 */

let ctx: AudioContext | null = null
let outNode: GainNode | null = null
let muted = false

/** Everything is routed through one node so a single mute button silences it all. */
function output(): GainNode {
  const c = audioContext()
  if (!outNode) { outNode = c.createGain(); outNode.gain.value = muted ? 0 : 1; outNode.connect(c.destination) }
  return outNode
}

export function setMuted(m: boolean): void {
  muted = m
  if (outNode) outNode.gain.setTargetAtTime(m ? 0 : 1, audioContext().currentTime, 0.02)
}
export const isMuted = (): boolean => muted

export function audioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

/** Must be called from a tap or click: iOS and Android keep audio locked until then. */
export function unlockAudio(): AudioContext {
  const c = audioContext()
  if (c.state !== 'running') void c.resume().catch(() => undefined)
  // a silent sample inside the gesture is the classic iOS unlock
  const s = c.createBufferSource()
  s.buffer = c.createBuffer(1, 1, 22050)
  s.connect(c.destination)
  s.start(0)
  return c
}

/** Decode on an offline context: it does not wait for the output context to be resumed. */
export async function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const OAC = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext
  return new OAC(1, 1, 44100).decodeAudioData(data)
}

/* ---------- building blocks ---------- */

/** Odd length so that input 0 maps to output 0 (an even length leaves a DC offset). */
export function driveCurve(amount: number): Float32Array<ArrayBuffer> {
  const n = 2049
  const k = amount * 2.2
  const deg = Math.PI / 180
  const c = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    c[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x))
  }
  return c
}

export function hallImpulse(c: BaseAudioContext, seconds: number, decay: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * seconds))
  const ir = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay)
  }
  return ir
}

function noiseBuffer(c: BaseAudioContext, seconds: number, brown = false): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds)
  const b = c.createBuffer(1, len, c.sampleRate)
  const d = b.getChannelData(0)
  let last = 0
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1
    if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5 } else d[i] = w
  }
  return b
}

/* ---------- the voice ---------- */

export interface HowlPlayback {
  /** Total length of the speech in seconds, including the gaps between pieces. */
  duration: number
  /** Seconds since the speech started (negative before it). */
  time(): number
  /** Current loudness 0..1, smoothed: drives the shaking of the envelope. */
  level(): number
  stop(): void
  ended: Promise<void>
}

/** Per-piece treatment: a crescendo of fury. */
export function pieceTreatment(i: number, n: number): { gain: number; rate: number; detune: number } {
  const t = n <= 1 ? 1 : i / (n - 1)
  return { gain: 0.72 + 0.4 * t, rate: 1.04 + 0.1 * t, detune: 30 + 110 * t }
}

export function playHowl(pieces: AudioBuffer[]): HowlPlayback {
  const c = audioContext()
  const start = c.currentTime + 0.08
  const n = pieces.length

  const bus = c.createGain()
  const shaper = c.createWaveShaper()
  shaper.oversample = '4x'
  shaper.curve = driveCurve(48)
  const presence = c.createBiquadFilter()
  presence.type = 'highshelf'; presence.frequency.value = 2800; presence.gain.value = 4
  const body = c.createBiquadFilter()
  body.type = 'lowshelf'; body.frequency.value = 190; body.gain.value = 6
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -28; comp.ratio.value = 14; comp.attack.value = 0.003; comp.release.value = 0.16; comp.knee.value = 6
  const makeup = c.createGain(); makeup.gain.value = 1.7

  const dry = c.createGain(); dry.gain.value = 0.72
  const wet = c.createGain(); wet.gain.value = 0.55
  const hall = c.createConvolver(); hall.buffer = hallImpulse(c, 2.6, 2.4)
  const master = c.createGain(); master.gain.value = 0.9
  const limiter = c.createDynamicsCompressor()
  limiter.threshold.value = -3; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.1; limiter.knee.value = 0
  const analyser = c.createAnalyser(); analyser.fftSize = 512

  bus.connect(shaper); shaper.connect(presence); presence.connect(body); body.connect(comp); comp.connect(makeup)
  makeup.connect(dry); makeup.connect(hall); hall.connect(wet)
  dry.connect(master); wet.connect(master); master.connect(limiter); limiter.connect(analyser); analyser.connect(output())

  const sources: AudioBufferSourceNode[] = []
  let at = start
  for (let i = 0; i < n; i++) {
    const buf = pieces[i]!
    const { gain, rate, detune } = pieceTreatment(i, n)
    const src = c.createBufferSource()
    src.buffer = buf
    src.playbackRate.value = rate
    src.detune.value = detune
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.linearRampToValueAtTime(gain, at + 0.03)
    src.connect(g); g.connect(bus)
    src.start(at)
    sources.push(src)
    at += buf.duration / (rate * Math.pow(2, detune / 1200)) + (i < n - 1 ? 0.14 : 0)
  }
  const duration = at - start
  const tail = 1.2
  const data = new Uint8Array(analyser.fftSize)
  let smooth = 0
  let stopped = false

  const ended = new Promise<void>((resolve) => {
    const last = sources[sources.length - 1]
    if (last) last.onended = () => resolve()
    else resolve()
  })

  return {
    duration,
    time: () => c.currentTime - start,
    level: () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]! - 128) / 128)
      const target = Math.min(1, peak * 1.6)
      smooth += (target - smooth) * (target > smooth ? 0.6 : 0.18) // fast attack, slower release
      return smooth
    },
    stop: () => {
      if (stopped) return
      stopped = true
      sources.forEach((s) => { try { s.stop() } catch { /* already stopped */ } })
      master.gain.setTargetAtTime(0, c.currentTime, 0.05)
    },
    ended: ended.then(() => new Promise<void>((r) => setTimeout(r, tail * 1000))),
  }
}

/* ---------- sound effects ---------- */

/** Low rumble that grows, while the envelope shakes before it opens. Returns a function that fades it out. */
export function startRumble(): () => void {
  const c = audioContext()
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c, 3, true); src.loop = true
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140
  const sub = c.createOscillator(); sub.type = 'sine'; sub.frequency.value = 46
  const lfo = c.createOscillator(); lfo.frequency.value = 9
  const lfoGain = c.createGain(); lfoGain.gain.value = 0.25
  const g = c.createGain(); g.gain.value = 0.0001
  lfo.connect(lfoGain); lfoGain.connect(g.gain)
  src.connect(lp); lp.connect(g); sub.connect(g); g.connect(output())
  const now = c.currentTime
  g.gain.exponentialRampToValueAtTime(0.9, now + 1.6)
  src.start(now); sub.start(now); lfo.start(now)
  return () => {
    const t = c.currentTime
    g.gain.cancelScheduledValues(t)
    g.gain.setTargetAtTime(0.0001, t, 0.12)
    setTimeout(() => { try { src.stop(); sub.stop(); lfo.stop() } catch { /* ignore */ } }, 600)
  }
}

/** The flap tearing open: a short burst of noise sweeping down. */
export function playTear(): void {
  const c = audioContext()
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, 0.5)
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.9
  bp.frequency.setValueAtTime(5200, c.currentTime); bp.frequency.exponentialRampToValueAtTime(700, c.currentTime + 0.32)
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime)
  g.gain.linearRampToValueAtTime(0.7, c.currentTime + 0.02); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
  src.connect(bp); bp.connect(g); g.connect(output()); src.start()
}
