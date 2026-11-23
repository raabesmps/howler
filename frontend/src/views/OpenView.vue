<script setup lang="ts">
/*
 * The recipient's journey: closed envelope -> tap the seal -> it rumbles and shakes -> flap tears open, the letter rises,
 * the envelope screams the message (shaking with the loudness of the voice) -> it closes -> it burns from the centre
 * -> "this howler has already been delivered".
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api/mock'
import { GoneError } from '../api/types'
import { activeWord, splitWords, wordTimings, type Lang } from '../lib/text'
import { prefersReducedMotion, shake, sleep } from '../lib/shake'
import { isMuted, playHowl, playTear, setMuted, startRumble, unlockAudio, type HowlPlayback } from '../audio/engine'
import { prepareVoice, synthesize } from '../audio/voice'
import Envelope from '../components/Envelope.vue'
import Seal from '../components/Seal.vue'
import FanNotice from '../components/FanNotice.vue'
import TalkingEnvelope from '../components/TalkingEnvelope.vue'
import BurnStage from '../components/BurnStage.vue'
import EndState from '../components/EndState.vue'

type Phase = 'loading' | 'closed' | 'opening' | 'screaming' | 'burning' | 'end'
const props = defineProps<{ token: string }>()

const phase = ref<Phase>('loading')
const endKind = ref<'burned' | 'expired' | 'notfound'>('notfound')
const recipient = ref('')
const lang = ref<Lang>('en')
const ready = ref(false)
const pct = ref(0)
const voiceFallback = ref(false)
const words = ref<string[]>([])
const active = ref(-1)
const closing = ref(false)
const muted = ref(isMuted())
const calm = prefersReducedMotion()

const envRef = ref<{ $el: HTMLElement } | null>(null)
const talker = ref<InstanceType<typeof TalkingEnvelope> | null>(null)
let playback: HowlPlayback | null = null
let stopShake: (() => void) | null = null
let stopRumble: (() => void) | null = null
let alive = true

const prep = computed(() => (ready.value ? '' : pct.value > 0 ? `Warming up the voice... ${pct.value}%` : 'Warming up the voice...'))

onMounted(async () => {
  const status = await api.status(props.token)
  if (status !== 'sealed') { endKind.value = status; phase.value = 'end'; return }
  const preview = await api.preview(props.token)
  recipient.value = preview.recipient
  lang.value = preview.voiceLang
  phase.value = 'closed'
  try {
    await prepareVoice(lang.value, (p) => { pct.value = p.total ? Math.floor((p.loaded / p.total) * 100) : 0 })
  } catch {
    voiceFallback.value = true // offline or blocked: the howler still works with the plain browser voice
  }
  ready.value = true
})

onBeforeUnmount(() => {
  alive = false
  playback?.stop()
  stopShake?.()
  stopRumble?.()
})

function toggleMute(): void { muted.value = !muted.value; setMuted(muted.value) }

function finishWith(e: unknown): void {
  endKind.value = e instanceof GoneError ? e.reason : 'notfound'
  phase.value = 'end'
}

/** Plain browser voice: the fallback when the voice model cannot be used. Returns the speech duration estimate. */
function speakFallback(message: string): number {
  const est = Math.max(1.6, words.value.length * 0.42)
  try {
    const u = new SpeechSynthesisUtterance(message)
    u.lang = lang.value === 'pt' ? 'pt-BR' : 'en-GB'; u.pitch = 0.6; u.rate = 0.95; u.volume = 1
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* no voice at all: the words still light up */ }
  return est
}

async function scream(message: string, pieces: AudioBuffer[] | null): Promise<void> {
  let duration: number
  let clock: () => number
  let level: () => number
  if (pieces) {
    playback = playHowl(pieces)
    duration = playback.duration
    clock = () => playback!.time()
    level = () => playback!.level()
  } else {
    duration = speakFallback(message)
    const t0 = performance.now()
    clock = () => (performance.now() - t0) / 1000 - 0.1
    level = () => 0.35 + Math.random() * 0.5
  }
  const starts = wordTimings(words.value, duration)
  await new Promise<void>((resolve) => {
    const frame = (): void => {
      if (!alive) { resolve(); return }
      const t = clock()
      active.value = activeWord(starts, t)
      talker.value?.drive(t < 0 || t > duration ? 0 : level())
      if (t >= duration) { resolve(); return }
      requestAnimationFrame(frame)
    }
    frame()
  })
  active.value = words.value.length
  talker.value?.rest()
}

async function openIt(): Promise<void> {
  if (phase.value !== 'closed' || !ready.value) return
  unlockAudio()
  phase.value = 'opening'
  const t0 = performance.now()
  try { stopRumble = startRumble() } catch { /* sound is optional */ }
  if (!calm) stopShake = shake(envRef.value?.$el ?? null, -3, () => Math.min(1, (performance.now() - t0) / 1400))

  let message: string
  try {
    message = (await api.open(props.token)).message
  } catch (e) {
    stopShake?.(); stopRumble?.()
    finishWith(e)
    return
  }
  words.value = splitWords(message)

  let pieces: AudioBuffer[] | null = null
  if (!voiceFallback.value) {
    try { pieces = await synthesize(message, lang.value) } catch { pieces = null }
  }
  await sleep(Math.max(0, 1500 - (performance.now() - t0))) // let the rumble build, even when the voice is quick
  stopShake?.(); stopRumble?.()
  if (!alive) return

  phase.value = 'screaming'
  await nextTick()
  try { playTear() } catch { /* sound is optional */ }
  await sleep(450) // the letter rises first
  await scream(message, pieces)
  if (!alive) return
  await sleep(500)
  closing.value = true
  await sleep(700)
  if (calm) { await sleep(600); endKind.value = 'burned'; phase.value = 'end'; return }
  phase.value = 'burning'
}

function burned(): void { endKind.value = 'burned'; phase.value = 'end' }
</script>

<template>
  <div class="open">
    <EndState v-if="phase === 'end'" :kind="endKind" />

    <p v-else-if="phase === 'loading'" class="loading center" role="status">Opening...</p>

    <main v-else-if="phase === 'closed' || phase === 'opening'" class="closed" :aria-busy="phase === 'opening'">
      <p class="top-line">Someone sent you something</p>
      <div class="wisp a" /><div class="wisp b" /><div class="glow" />
      <Envelope ref="envRef" variant="full">
        <Seal size="lg" interactive :disabled="!ready || phase === 'opening'" label="Open the howler. It can only be opened once." @press="openIt" />
      </Envelope>
      <div class="bottom">
        <p class="big display"><template v-if="recipient">For {{ recipient }}.<br /></template><em>Tap the seal.</em></p>
        <p v-if="prep" class="prep" role="status">{{ prep }}</p>
        <p v-else class="foot">Loud sound. Turn the volume down first.<br />It can only be opened once.</p>
        <button class="link report" type="button">Report this</button>
        <FanNotice />
      </div>
    </main>

    <main v-else-if="phase === 'screaming'" class="scream">
      <button class="mute" type="button" :aria-label="muted ? 'Unmute' : 'Mute'" :aria-pressed="muted" @click="toggleMute">{{ muted ? 'Muted' : 'Mute' }}</button>
      <TalkingEnvelope ref="talker" :words="words" :active="active" :closing="closing" :calm="calm" />
      <p class="sr-only" role="status">{{ words.join(' ') }}</p>
    </main>

    <main v-else-if="phase === 'burning'" class="burning">
      <BurnStage @done="burned" />
    </main>
  </div>
</template>

<style scoped>
.open { position: relative; min-height: 100dvh; }
.loading { padding-top: 40dvh; color: var(--ash-400); }

.closed, .scream, .burning { position: absolute; inset: 0; min-height: 100dvh; overflow: hidden; }
.closed { background: radial-gradient(90% 50% at 50% 55%, #2a1410 0%, var(--char-950) 72%); }
.top-line { position: absolute; top: var(--space-5); left: 0; right: 0; z-index: 5; text-align: center; color: var(--ash-400); font: 600 13px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; }
.glow { position: absolute; left: 50%; top: 56%; width: 340px; height: 340px; margin: -170px 0 0 -170px; background: radial-gradient(circle, rgba(255, 91, 31, 0.34), transparent 62%); z-index: 1; }
.wisp { position: absolute; bottom: 62%; width: 90px; height: 160px; background: radial-gradient(closest-side, rgba(140, 131, 120, 0.28), transparent); filter: blur(6px); z-index: 1; }
.wisp.a { left: 30%; } .wisp.b { left: 56%; height: 200px; }
.bottom { position: absolute; left: var(--gutter); right: var(--gutter); bottom: calc(var(--space-4) + env(safe-area-inset-bottom)); z-index: 5; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-1); }
.big { font: 700 34px/1.05 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.big em { color: var(--ember-500); }
.prep { color: var(--flare-400); font-size: 14px; min-height: 34px; }
.report { margin-top: 0; }

.scream { background: radial-gradient(80% 50% at 50% 72%, #3a1308 0%, #0e0907 75%); }
.mute { position: absolute; top: var(--space-4); right: var(--space-4); z-index: 6; min-width: 48px; height: 48px; padding: 0 12px; border-radius: var(--radius-s); border: 1px solid rgba(243, 234, 216, 0.25); background: rgba(16, 14, 12, 0.6); font: 600 13px/1 var(--font-ui); }
.burning { background: #0c0807; }
</style>
