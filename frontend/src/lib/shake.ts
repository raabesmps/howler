/** Shakes an element by writing its transform every frame. Returns a function that stops and restores it. */
export function shake(el: HTMLElement | null, baseRotateDeg: number, intensity: () => number): () => void {
  if (!el) return () => undefined
  let raf = 0
  let on = true
  const loop = (): void => {
    if (!on) return
    const k = intensity()
    const x = (Math.random() - 0.5) * 2 * k * 7
    const y = (Math.random() - 0.5) * 2 * k * 7
    const r = baseRotateDeg + (Math.random() - 0.5) * 2 * k * 1.8
    el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`
    raf = requestAnimationFrame(loop)
  }
  loop()
  return () => { on = false; cancelAnimationFrame(raf); el.style.transform = '' }
}

export const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
