/* The colour theme: dark (the brand's own) or light. Remembered on this device; the default is dark. */
import { ref } from 'vue'

export type Theme = 'dark' | 'light'
const STORAGE = 'howler.theme'

function initial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE)
    if (saved === 'dark' || saved === 'light') return saved
  } catch { /* private mode */ }
  return 'dark'
}

export const theme = ref<Theme>(initial())

/** Puts the theme on the page: the data attribute the CSS reads, and the colour of the phone's browser bar. */
export function applyTheme(): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = theme.value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.value === 'light' ? '#f3ecdf' : '#100e0c')
}

export function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  applyTheme()
  try { localStorage.setItem(STORAGE, theme.value) } catch { /* not remembered: fine */ }
}
