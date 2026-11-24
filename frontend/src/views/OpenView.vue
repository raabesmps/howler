<script setup lang="ts">
/*
 * The recipient's journey: closed envelope -> tap the seal -> it rumbles and shakes -> flap tears open, the letter rises,
 * the envelope screams the message (shaking with the loudness of the voice) -> it closes -> it burns from the centre
 * -> "this howler has already been delivered".
 */
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { api } from '../api'
import { GoneError } from '../api/types'
import { describeError } from '../lib/errors'
import { t } from '../i18n'
import { activeWord, splitWords, wordTimings } from '../lib/text'
import { prefersReducedMotion, shake, sleep } from '../lib/shake'
import { isMuted, playTear, playVoice, startRumble, unlockAudio, type VoicePlayback } from '../audio/engine'
import { prepareVoice } from '../audio/voice'
import Envelope from '../components/Envelope.vue'
import Seal from '../components/Seal.vue'
import FanNotice from '../components/FanNotice.vue'
import TalkingEnvelope from '../components/TalkingEnvelope.vue'
import BurnStage from '../components/BurnStage.vue'
import EndState from '../components/EndState.vue'
import ReportButton from '../components/ReportButton.vue'
import SoundToggle from '../components/SoundToggle.vue'

type Phase = 'loading' | 'error' | 'closed' | 'opening' | 'screaming' | 'burning' | 'end'
const props = defineProps<{ token: string }>()

const phase = ref<Phase>('loading')
const endKind = ref<'burned' | 'expired' | 'notfound'>('notfound')
const recipient = ref('')
const problem = ref('')
const words = ref<string[]>([])
const active = ref(-1)
const calm = prefersReducedMotion()

const envRef = ref<{ $el: HTMLElement } | null>(null)
const talker = ref<InstanceType<typeof TalkingEnvelope> | null>(null)
let playback: VoicePlayback | null = null
let stopShake: (() => void) | null = null
let stopRumble: (() => void) | null = null
let alive = true

async function load(): Promise<void> {
  phase.value = 'loading'
  try {
    const status = await api.status(props.token)
    if (status !== 'sealed') { endKind.value = status; phase.value = 'end'; return }
    recipient.value = (await api.preview(props.token)).recipient
    problem.value = ''
    phase.value = 'closed'
  } catch (e) {
    problem.value = describeError(e)
    phase.value = 'error'
  }
}

onMounted(load)

onBeforeUnmount(() => {
  alive = false
  playback?.stop()
  stopShake?.()
  stopRumble?.()
})

/** The browser's own voice is not routed through our mute switch, so muting has to silence it directly. */
function onSoundChange(muted: boolean): void {
  if (muted) { try { speechSynthesis.cancel() } catch { /* no speech support */ } }
}

function finishWith(e: unknown): void {
  endKind.value = e instanceof GoneError ? e.reason : 'notfound'
  phase.value = 'end'
}

/** Plain browser voice: the fallback when the voice model cannot be used. Returns the speech duration estimate. */
function speakFallback(message: string): number {
  const est = Math.max(1.6, words.value.length * 0.42)
  try {
    const u = new SpeechSynthesisUtterance(message)
    u.pitch = 0.6; u.rate = 0.95; u.volume = isMuted() ? 0 : 1
    speechSynthesis.cancel(); speechSynthesis.speak(u)
  } catch { /* no voice at all: the words still light up */ }
  return est
}

async function scream(message: string, voice: AudioBuffer | null): Promise<void> {
  let duration: number
  let clock: () => number
  let level: () => number
  if (voice) {
    playback = playVoice(voice)
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
  if (phase.value !== 'closed') return
  unlockAudio()
  phase.value = 'opening'
  const t0 = performance.now()
  try { stopRumble = startRumble() } catch { /* sound is optional */ }
  if (!calm) stopShake = shake(envRef.value?.$el ?? null, -3, () => Math.min(1, (performance.now() - t0) / 1400))

  let message: string
  let voiceBytes: ArrayBuffer | null
  try {
    const content = await api.open(props.token)
    message = content.message
    voiceBytes = content.audio
  } catch (e) {
    stopShake?.(); stopRumble?.()
    if (e instanceof GoneError) { finishWith(e); return }
    // Nothing was delivered: stay on the closed envelope so they can try again. If the server did burn it before the
    // connection dropped, the next try says "already delivered".
    problem.value = describeError(e)
    phase.value = 'closed'
    return
  }
  problem.value = ''
  words.value = splitWords(message)

  // the server made the voice when the howler was created; without it the plain browser voice still delivers the message
  const voice = await prepareVoice(voiceBytes)
  await sleep(Math.max(0, 1500 - (performance.now() - t0))) // let the rumble build, even when the voice is quick
  stopShake?.(); stopRumble?.()
  if (!alive) return

  phase.value = 'screaming'
  await nextTick()
  try { playTear() } catch { /* sound is optional */ }
  await sleep(450) // the letter rises first
  await scream(message, voice)
  if (!alive) return
  await sleep(500)
  await sleep(700) // the letter stays where it is until the burn starts
  if (calm) { await sleep(600); endKind.value = 'burned'; phase.value = 'end'; return }
  phase.value = 'burning'
}

function burned(): void { endKind.value = 'burned'; phase.value = 'end' }
</script>

<template>
  <div class="open">
    <EndState v-if="phase === 'end'" :kind="endKind" :token="token" />

    <main v-else-if="phase === 'error'" class="problem-screen">
      <p class="big display">{{ t('couldNotCheck') }}</p>
      <p class="sub center" role="alert">{{ problem }}</p>
      <button class="btn" type="button" @click="load">{{ t('tryAgain') }}</button>
    </main>

    <p v-else-if="phase === 'loading'" class="loading center" role="status">{{ t('opening') }}</p>

    <main v-else-if="phase === 'closed' || phase === 'opening'" class="closed" :aria-busy="phase === 'opening'">
      <p class="top-line">{{ t('someoneSent') }}</p>
      <div class="wisp a" /><div class="wisp b" /><div class="glow" />
      <Envelope ref="envRef" variant="full">
        <Seal size="lg" interactive :disabled="phase === 'opening'" :label="t('openLabel')" @press="openIt" />
      </Envelope>
      <div class="bottom">
        <p class="big display"><template v-if="recipient">{{ t('forName', { name: recipient }) }}<br /></template><em>{{ t('tapTheSeal') }}</em></p>
        <p class="warn" role="note"><strong>{{ t('loudSound') }}</strong> {{ t('turnDown') }}</p>
        <SoundToggle />
        <p class="foot">{{ t('onlyOnce') }}</p>
        <p v-if="problem" class="problem" role="alert">{{ problem }}</p>
        <ReportButton :token="token" />
        <FanNotice />
      </div>
    </main>

    <main v-else-if="phase === 'screaming'" class="scream">
      <SoundToggle class="mute" @change="onSoundChange" />
      <TalkingEnvelope ref="talker" :words="words" :active="active" :calm="calm" />
      <p class="sr-only" role="status">{{ words.join(' ') }}</p>
    </main>

    <main v-else-if="phase === 'burning'" class="burning">
      <BurnStage @done="burned" />
    </main>
  </div>
</template>

<style scoped>
.open { position: relative; min-height: 100dvh; }
.loading { padding-top: 40dvh; color: var(--muted); }

.closed { position: absolute; inset: 0; min-height: 100dvh; overflow: hidden; }
/* the theatre: the scream and the burn are always dark, in either theme, and cover the whole window, so no edge of a column shows */
.scream, .burning { position: fixed; inset: 0; z-index: 30; overflow: hidden; background: #0e0907; }
/* every stage glow fades to nothing at its own edges, so no screen shows a hard seam against the page behind the column */
.closed { background: radial-gradient(52% 46% at 50% 55%, var(--glow) 0%, transparent 100%); }
.top-line { position: absolute; top: 64px; left: 0; right: 0; z-index: 5; text-align: center; color: var(--muted); font: 600 13px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; }
.glow { position: absolute; left: 50%; top: 56%; width: 340px; height: 340px; margin: -170px 0 0 -170px; background: radial-gradient(circle, rgba(255, 91, 31, 0.34), transparent 62%); z-index: 1; }
.wisp { position: absolute; bottom: 62%; width: 90px; height: 160px; background: radial-gradient(closest-side, rgba(140, 131, 120, 0.28), transparent); filter: blur(6px); z-index: 1; }
.wisp.a { left: 30%; } .wisp.b { left: 56%; height: 200px; }
.bottom { position: absolute; left: var(--gutter); right: var(--gutter); bottom: calc(var(--space-4) + env(safe-area-inset-bottom)); z-index: 5; text-align: center; display: flex; flex-direction: column; align-items: center; gap: var(--space-1); }
.big { font: 700 34px/1.05 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.big em { color: var(--accent); }
.problem { color: var(--warn); font-size: 14px; }
.problem-screen { min-height: 100dvh; padding: var(--space-5) var(--gutter); display: flex; flex-direction: column; justify-content: center; gap: var(--space-3); text-align: center; }
.problem-screen .sub { color: var(--muted); }

.scream { background: radial-gradient(340px 380px at 50% 72%, #3a1308 0%, transparent 100%), #0e0907; }
.mute { position: absolute; top: var(--space-4); right: max(var(--space-4), calc((100vw - 520px) / 2 + var(--space-4))); z-index: 6; }
.warn { color: var(--warn); font-size: 15px; }
.warn strong { color: var(--text); }
.burning { background: radial-gradient(340px 300px at 50% 45%, #1a0d08 0%, transparent 100%), #0c0807; }
</style>
