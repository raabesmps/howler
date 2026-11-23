/** Small pure audio helpers (no Web Audio), so they can be unit tested. */

const db = (lin: number): number => 20 * Math.log10(lin || 1e-9)
const lin = (d: number): number => Math.pow(10, d / 20)

/**
 * Noise gate (a downward expander): when the signal stays under the threshold the gain eases down to `floorGain`,
 * so the hiss and the tail between words disappear. The gain moves smoothly: no clicks.
 */
export function noiseGate(x: Float32Array, rate: number, thresholdDb = -46, floorGain = 0.1): Float32Array<ArrayBuffer> {
  const out = new Float32Array(x.length)
  const thr = lin(thresholdDb)
  const attack = Math.exp(-1 / (0.004 * rate))
  const release = Math.exp(-1 / (0.09 * rate))
  const smooth = Math.exp(-1 / (0.012 * rate))
  let env = 0
  let gain = 1
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]!)
    env = a > env ? attack * env + (1 - attack) * a : release * env + (1 - release) * a
    gain = smooth * gain + (1 - smooth) * (env < thr ? floorGain : 1)
    out[i] = x[i]! * gain
  }
  return out
}

/** Average level (RMS, dBFS) of the parts that are not silence. */
export function rmsDb(x: Float32Array): number {
  let sum = 0
  let n = 0
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]!)
    if (a > 0.01) { sum += a * a; n++ }
  }
  return 10 * Math.log10(n ? sum / n : 1e-12)
}

export function peakDb(x: Float32Array): number {
  let peak = 0
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]!))
  return db(peak)
}

/**
 * Scales to the target average level, but never lets a peak go past the ceiling. There is no limiter, so there is no
 * distortion: if the ceiling is reached first, the voice is a little quieter than the target.
 */
export function normalizeTo(x: Float32Array, targetRmsDb = -14, ceilingDb = -1): Float32Array<ArrayBuffer> {
  const current = rmsDb(x)
  let gain = lin(targetRmsDb - current)
  const peak = lin(peakDb(x)) * gain
  const ceiling = lin(ceilingDb)
  if (peak > ceiling) gain *= ceiling / peak
  const out = new Float32Array(x.length)
  for (let i = 0; i < x.length; i++) out[i] = x[i]! * gain
  return out
}
