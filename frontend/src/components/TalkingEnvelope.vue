<script setup lang="ts">
/*
 * The open envelope that screams. It does not shake at random: drive(level) is called every frame with the real loudness
 * of the voice, so it hits on every stressed word and goes still in the pauses. The envelope is a mouth: the flap is the
 * upper lip and the front pocket is the lower jaw, which drops open with the loudness (fast to open, slower to close, like
 * a real jaw), so a dark mouth with a tongue shows between them.
 * The letter rises out of the envelope, and the words light up in time with the voice.
 */
import { computed, onMounted, ref } from 'vue'
import { t } from '../i18n'

const props = defineProps<{ words: string[]; active: number; calm: boolean }>()

const root = ref<HTMLElement | null>(null)
const flap = ref<HTMLElement | null>(null)
const jaw = ref<HTMLElement | null>(null)
const tongue = ref<HTMLElement | null>(null)
let mouth = 0
const risen = ref(false)

onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { risen.value = true })))

const size = computed(() => {
  const chars = props.words.join(' ').length
  return chars <= 36 ? 31 : chars <= 70 ? 27 : chars <= 110 ? 24 : 21
})

let tPrev = 0
let phase = Math.random() * 6.28

function drive(level: number): void {
  if (!root.value || !flap.value || !jaw.value || !tongue.value || props.calm) return
  const now = performance.now()
  const dt = tPrev ? Math.min(0.05, (now - tPrev) / 1000) : 0.016
  tPrev = now
  // A voice is loud for a whole word, but a mouth still opens and closes inside it, about five times a second, wider
  // when the voice is louder. In a pause (no voice) it shuts. It opens faster than it closes, like a real jaw.
  phase += dt * 2 * Math.PI * (4.6 + level * 2.4)
  const voiced = Math.min(1, level * 1.5)
  const target = voiced < 0.08 ? 0 : voiced * (0.22 + 0.78 * (0.5 + 0.5 * Math.sin(phase)))
  mouth += (target - mouth) * (1 - Math.exp(-dt * (target > mouth ? 40 : 22)))
  const jx = (Math.random() - 0.5) * 2 * level * 6
  const jy = -level * 6 + (Math.random() - 0.5) * level * 3
  const rot = (Math.random() - 0.5) * 2 * level * 2.4
  root.value.style.transform = `translate(${jx.toFixed(1)}px, ${jy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg)`
  // the flap is hinged along the top edge and swings back like a lid (a real fold, in perspective), as the jaw drops
  flap.value.style.transform = `rotateX(${(-4 - mouth * 84).toFixed(1)}deg)`
  flap.value.style.filter = `brightness(${(1 - mouth * 0.18).toFixed(3)})`
  jaw.value.style.transform = `translateY(${(mouth * 84).toFixed(1)}px) rotate(${(mouth * 1.8).toFixed(2)}deg)`
  tongue.value.style.transform = `translateY(${((1 - mouth) * 40).toFixed(1)}px) scale(${(0.85 + mouth * 0.4).toFixed(3)}, ${(0.6 + mouth * 0.8).toFixed(3)})`
}

function rest(): void {
  mouth = 0
  tPrev = 0
  if (root.value) root.value.style.transform = ''
  if (flap.value) { flap.value.style.transform = ''; flap.value.style.filter = '' }
  if (jaw.value) jaw.value.style.transform = ''
  if (tongue.value) tongue.value.style.transform = ''
}

defineExpose({ drive, rest })
</script>

<template>
  <div ref="root" class="talker" role="img" :aria-label="t('messageIs', { text: words.join(' ') })">
    <div class="back" />
    <div ref="tongue" class="tongue" />
    <div ref="flap" class="flap" />
    <div class="letter" :class="{ up: risen }" aria-hidden="true">
      <p :style="{ fontSize: size + 'px' }">
        <span v-for="(w, i) in words" :key="i" class="w" :class="{ now: i === active, said: i < active, wait: i > active }">{{ w }}</span>
      </p>
    </div>
    <div ref="jaw" class="front" />
  </div>
</template>

<style scoped>
.talker { perspective: 520px; perspective-origin: 50% 0; position: absolute; left: 50%; bottom: 9%; width: 300px; height: 190px; margin-left: -150px; transform-origin: 50% 100%; will-change: transform; }
.back { position: absolute; inset: 0; background: radial-gradient(70% 90% at 50% 40%, #3a0b05 0%, #170302 100%); border-radius: 2px; } /* the inside of the mouth */
.tongue {
  position: absolute; left: 50%; bottom: 40px; width: 150px; height: 72px; margin-left: -75px; transform-origin: 50% 100%;
  border-radius: 50% 50% 20% 20% / 90% 90% 20% 20%;
  background: radial-gradient(60% 70% at 50% 25%, #e8665a 0%, #b8322a 70%, #7d1a14 100%);
}
.tongue::after { content: ''; position: absolute; left: 50%; top: 14%; width: 2px; height: 46%; margin-left: -1px; border-radius: 2px; background: rgba(60, 8, 5, 0.45); }
.flap {
  position: absolute; left: 0; right: 0; top: 0; height: 118px; z-index: 3;
  background: linear-gradient(to bottom, #a73516, #c2431f 70%, #d4502a);
  clip-path: polygon(0 0, 100% 0, 50% 100%); transform-origin: 50% 0; transform: rotateX(-8deg); backface-visibility: hidden;
}
.letter {
  position: absolute; left: 34px; right: 34px; bottom: 170px; min-height: 160px; padding: 26px 16px 40px; /* it rises out of the mouth and stands above the envelope; its foot is tucked behind the flap */
  background: var(--paper-100); color: var(--ink-900); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  transform: translateY(300px) rotate(-1.4deg); transition: transform 700ms var(--ease-out);
}
.letter.up { transform: translateY(0) rotate(-1.4deg); }
.letter p { font-family: var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; font-weight: 800; line-height: 1.04; letter-spacing: -0.02em; text-transform: uppercase; overflow-wrap: anywhere; }
.w { display: inline-block; margin-right: 0.28em; transition: opacity 120ms linear; }
.w.wait { opacity: 0.66; } /* still readable: 4.5:1 on the paper (WCAG AA); the highlight does the karaoke */
.w.said { opacity: 0.8; }
.w.now { opacity: 1; background: var(--ember-500); color: var(--ink-900); padding: 0 5px; margin-left: -5px; margin-right: calc(0.28em - 5px + 5px); }
.front {
  position: absolute; inset: 0; z-index: 2;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.28), transparent 46%), var(--env-500);
  clip-path: polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%); transform-origin: 50% 0; border-radius: 0 0 16px 16px;
}
</style>
