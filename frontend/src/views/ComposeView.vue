<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { MAX_MESSAGE, MAX_NAME } from '../api/types'
import { describeError } from '../lib/errors'
import FanNotice from '../components/FanNotice.vue'

const router = useRouter()
const message = ref('')
const recipient = ref('')
const busy = ref(false)
const error = ref('')

const count = computed(() => message.value.length)
// the more you write, the more the bottom of the paper scorches
const burn = computed(() => 0.12 + (count.value / MAX_MESSAGE) * 0.42)
const canSeal = computed(() => message.value.trim().length > 0 && !busy.value)

async function seal(): Promise<void> {
  if (!canSeal.value) return
  busy.value = true
  error.value = ''
  try {
    const { token } = await api.create({ message: message.value, recipient: recipient.value })
    await router.push({ name: 'sent', params: { token }, query: recipient.value.trim() ? { to: recipient.value.trim() } : {} })
  } catch (e) {
    error.value = describeError(e)
    busy.value = false
  }
}
</script>

<template>
  <main class="compose">
    <header class="top">
      <span class="wordmark">howler</span>
      <small>Link works once. Expires in 7 days.</small>
    </header>

    <div class="paper" :style="{ '--burn': burn }">
      <div class="tape" />
      <div class="scorch" />
      <label class="to"><span>To</span><input v-model="recipient" :maxlength="MAX_NAME" placeholder="anyone (optional)" aria-label="Recipient name, optional" autocomplete="off" /></label>
      <textarea v-model="message" :maxlength="MAX_MESSAGE" placeholder="Say it loud." aria-label="Your message, up to 140 characters" autofocus />
      <div class="meta"><span>Written to be screamed</span><span :class="{ near: count >= 120 }">{{ count }} / {{ MAX_MESSAGE }}</span></div>
    </div>

    <div class="bottom">
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button class="btn" type="button" :disabled="!canSeal" @click="seal">{{ busy ? 'Sealing...' : 'Seal it' }}</button>
      <p v-if="busy" class="wait" role="status">Making the scream. This takes a few seconds.</p>
      <FanNotice class="notice" />
    </div>
  </main>
</template>

<style scoped>
.compose { min-height: 100dvh; display: flex; flex-direction: column; background: radial-gradient(120% 60% at 50% 0, #1d1915, var(--char-950)); }
.top { display: flex; justify-content: space-between; align-items: baseline; padding: var(--space-5) var(--gutter) var(--space-3); }
.top small { color: var(--ash-400); font-size: 13px; }

.paper {
  --burn: 0.12;
  position: relative; flex: 1; display: flex; flex-direction: column; margin: var(--space-3) var(--space-4) 0;
  padding: var(--space-6) var(--space-5) var(--space-5);
  background: var(--paper-100); color: var(--ink-900); border-radius: 2px;
  transform: rotate(-0.8deg); box-shadow: 0 18px 0 -8px rgba(0, 0, 0, 0.55);
}
.tape { position: absolute; top: -12px; left: 50%; width: 90px; height: 26px; margin-left: -45px; background: rgba(200, 164, 106, 0.55); transform: rotate(-3deg); z-index: 3; }
.scorch { position: absolute; inset: 0; overflow: hidden; border-radius: 2px; pointer-events: none; }
.scorch::after {
  content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--burn) * 100%);
  background: linear-gradient(to top, #120d0a 0%, #3a1608 38%, var(--ember-500) 88%, rgba(255, 194, 71, 0) 100%);
  transition: height var(--dur-base) var(--ease-out);
}
.to { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 8px; border-bottom: 1.5px solid rgba(27, 22, 18, 0.35); padding-bottom: 6px; font: 600 15px/1 var(--font-ui); color: rgba(27, 22, 18, 0.65); }
.to input { flex: 1; min-width: 0; border: 0; background: transparent; font: italic 600 22px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--ink-900); padding: 4px 0; }
.to input::placeholder { color: rgba(27, 22, 18, 0.35); }
textarea {
  position: relative; z-index: 1; flex: 1; width: 100%; margin-top: var(--space-4); padding: 0; border: 0; background: transparent; resize: none;
  font: 700 30px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--ink-900);
}
textarea::placeholder { color: rgba(27, 22, 18, 0.32); }
textarea:focus-visible, .to input:focus-visible { outline: none; }
.meta { position: relative; z-index: 2; display: flex; justify-content: space-between; padding-top: var(--space-3); font: 600 13px/1 var(--font-ui); color: var(--paper-100); }
.meta .near { color: var(--flare-400); }

.bottom { padding: var(--space-4) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom)); }
.notice { margin-top: var(--space-3); }
.wait { color: var(--ash-400); font-size: 13px; text-align: center; margin-top: var(--space-2); }
.err { color: var(--flare-400); font-size: 14px; margin-bottom: var(--space-2); text-align: center; }
</style>
