<script setup lang="ts">
/*
 * The open envelope that screams. It does not shake at random: drive(level) is called every frame with the real loudness
 * of the voice, so it hits on every stressed word and goes still in the pauses. The flap works like a jaw.
 * The letter rises out of the envelope, and the words light up in time with the voice.
 */
import { computed, onMounted, ref } from 'vue'

const props = defineProps<{ words: string[]; active: number; closing: boolean; calm: boolean }>()

const root = ref<HTMLElement | null>(null)
const flap = ref<HTMLElement | null>(null)
const risen = ref(false)

onMounted(() => requestAnimationFrame(() => requestAnimationFrame(() => { risen.value = true })))

const size = computed(() => {
  const chars = props.words.join(' ').length
  return chars <= 36 ? 36 : chars <= 70 ? 30 : chars <= 110 ? 26 : 22
})

function drive(level: number): void {
  if (!root.value || !flap.value || props.calm) return
  const jx = (Math.random() - 0.5) * 2 * level * 9
  const jy = -level * 9 + (Math.random() - 0.5) * level * 5
  const rot = (Math.random() - 0.5) * 2 * level * 3.2
  root.value.style.transform = `translate(${jx.toFixed(1)}px, ${jy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${(1 + level * 0.05).toFixed(3)}, ${(1 - level * 0.04).toFixed(3)})`
  flap.value.style.transform = `scaleY(${(0.3 + level * 0.8).toFixed(3)})`
}

function rest(): void {
  if (root.value) root.value.style.transform = ''
  if (flap.value) flap.value.style.transform = ''
}

defineExpose({ drive, rest })
</script>

<template>
  <div ref="root" class="talker" role="img" :aria-label="`The message: ${words.join(' ')}`">
    <div class="back" />
    <div ref="flap" class="flap" />
    <div class="letter" :class="{ up: risen && !closing }" aria-hidden="true">
      <p :style="{ fontSize: size + 'px' }">
        <span v-for="(w, i) in words" :key="i" class="w" :class="{ now: i === active, said: i < active, wait: i > active }">{{ w }}</span>
      </p>
    </div>
    <div class="front" />
  </div>
</template>

<style scoped>
.talker { position: absolute; left: 50%; bottom: 9%; width: 300px; height: 190px; margin-left: -150px; transform-origin: 50% 100%; will-change: transform; }
.back { position: absolute; inset: 0; background: #5a1a0a; border-radius: 2px; }
.flap {
  position: absolute; left: 0; right: 0; bottom: 100%; height: 170px; background: #9a3014;
  clip-path: polygon(0 100%, 50% 0, 100% 100%); transform-origin: 50% 100%; transform: scaleY(0.3);
  transition: transform 90ms linear;
}
.letter {
  position: absolute; left: 44px; right: 44px; bottom: 120px; height: 400px; padding: 28px 18px 0;
  background: var(--paper-100); color: var(--ink-900); box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  transform: translateY(280px) rotate(-1.4deg); transition: transform 700ms var(--ease-out);
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
  clip-path: polygon(0 0, 50% 46%, 100% 0, 100% 100%, 0 100%);
}
</style>
