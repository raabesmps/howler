/** The person's choice to mute, remembered on this device so the next howler does not blast them. Storage may be blocked: then it is per visit. */
const KEY = 'howler.muted'

export function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function storeMuted(muted: boolean): void {
  try {
    localStorage.setItem(KEY, muted ? '1' : '0')
  } catch {
    /* private mode or blocked storage: the choice just lasts until the page closes */
  }
}
