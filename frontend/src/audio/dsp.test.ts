import { describe, expect, it } from 'vitest'
import { noiseGate, normalizeTo, peakDb, rmsDb } from './dsp'

const RATE = 24000
/** half a second of a loud tone, then a second of faint hiss */
function toneThenHiss(): { x: Float32Array; split: number } {
  const n = RATE * 1.5
  const x = new Float32Array(n)
  const split = RATE / 2
  for (let i = 0; i < split; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * 220 * i) / RATE)
  for (let i = split; i < n; i++) x[i] = (Math.random() * 2 - 1) * 0.004
  return { x, split }
}

describe('noiseGate', () => {
  it('turns the hiss between words down but leaves the voice alone', () => {
    const { x, split } = toneThenHiss()
    const y = noiseGate(x, RATE)
    // the gate keeps listening for a few hundred ms so it never chops the end of a word: measure after it has closed
    const hissBefore = rmsDb(x.slice(split + 14400).map((v) => v * 40)) // scaled up only to get past the 0.01 floor of rmsDb
    const hissAfter = rmsDb(y.slice(split + 14400).map((v) => v * 40))
    expect(hissAfter).toBeLessThan(hissBefore - 12)
    const toneBefore = rmsDb(x.slice(2000, split - 2000))
    const toneAfter = rmsDb(y.slice(2000, split - 2000))
    expect(Math.abs(toneAfter - toneBefore)).toBeLessThan(0.5)
  })
  it('never produces NaN and keeps the length', () => {
    const { x } = toneThenHiss()
    const y = noiseGate(x, RATE)
    expect(y.length).toBe(x.length)
    expect(y.every((v) => Number.isFinite(v))).toBe(true)
  })
})

describe('normalizeTo', () => {
  it('reaches the target average level', () => {
    const x = new Float32Array(RATE).map((_, i) => 0.05 * Math.sin((2 * Math.PI * 300 * i) / RATE))
    const y = normalizeTo(x, -14, -1)
    expect(rmsDb(y)).toBeCloseTo(-14, 0)
  })
  it('never exceeds the peak ceiling', () => {
    // a spiky signal: reaching -14 dB average would push the peak far past the ceiling
    const x = new Float32Array(RATE).map((_, i) => (i % 2400 === 0 ? 0.9 : 0.02))
    const y = normalizeTo(x, -6, -1)
    expect(peakDb(y)).toBeLessThanOrEqual(-0.99)
  })
})
