/*
 * Audio engine: the howler's voice treatment, its playback and the sound effects. Web Audio only, no audio assets.
 *
 * The voice comes from the server already screaming (see backend/app/Services/VoiceGenerator.php). Here it is cleaned and made loud, never given
 * an echo: noise gate, a little compression, the harsh highs tamed, and a measured volume. It is the "V2" treatment
 * chosen by ear (ADR-002). The effects are the rumble before the envelope opens and the paper tear.
 */
import { noiseGate, normalizeTo } from './dsp'

let ctx: AudioContext | null = null
let outNode: GainNode | null = null
let muted = false

export function audioContext(): AudioContext {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
  }
  return ctx
}

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

/* ---------- the voice ---------- */

/** Cleans the raw voice and brings it to a loud but comfortable level (about -14 dB average, peaks under -1 dBFS). */
export async function treatVoice(raw: AudioBuffer): Promise<AudioBuffer> {
  const rate = raw.sampleRate
  const gated = noiseGate(raw.getChannelData(0), rate)
  const input = new AudioBuffer({ length: gated.length, sampleRate: rate, numberOfChannels: 1 })
  input.copyToChannel(gated, 0)

  const c = new OfflineAudioContext(1, gated.length, rate)
  const src = c.createBufferSource(); src.buffer = input
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 80
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -24; comp.ratio.value = 5; comp.attack.value = 0.006; comp.release.value = 0.22; comp.knee.value = 10
  const harsh = c.createBiquadFilter(); harsh.type = 'peaking'; harsh.frequency.value = 3600; harsh.Q.value = 1; harsh.gain.value = -2.5
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(9500, rate / 2 - 500); lp.Q.value = 0.5
  src.connect(hp); hp.connect(comp); comp.connect(harsh); harsh.connect(lp); lp.connect(c.destination)
  src.start()
  const rendered = await c.startRendering()

  const loud = normalizeTo(rendered.getChannelData(0), -14, -1)
  const out = new AudioBuffer({ length: loud.length, sampleRate: rate, numberOfChannels: 1 })
  out.copyToChannel(loud, 0)
  return out
}

export interface VoicePlayback {
  /** Length of the speech in seconds. */
  duration: number
  /** Seconds since the speech started (negative before it). */
  time(): number
  /** Current loudness 0..1, smoothed: drives the shaking of the envelope. */
  level(): number
  stop(): void
}

export function playVoice(buffer: AudioBuffer): VoicePlayback {
  const c = audioContext()
  const start = c.currentTime + 0.08
  const src = c.createBufferSource()
  src.buffer = buffer
  const analyser = c.createAnalyser(); analyser.fftSize = 512
  src.connect(analyser); analyser.connect(output())
  src.start(start)

  const data = new Uint8Array(analyser.fftSize)
  let smooth = 0
  return {
    duration: buffer.duration,
    time: () => c.currentTime - start,
    level: () => {
      analyser.getByteTimeDomainData(data)
      let peak = 0
      for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]! - 128) / 128)
      const target = Math.min(1, peak * 1.6)
      smooth += (target - smooth) * (target > smooth ? 0.6 : 0.18) // fast attack, slower release
      return smooth
    },
    stop: () => { try { src.stop() } catch { /* already stopped */ } },
  }
}

/* ---------- sound effects ---------- */

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
