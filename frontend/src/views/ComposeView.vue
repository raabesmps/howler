<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { MAX_MESSAGE, MAX_NAME } from '../api/types'
import { describeError } from '../lib/errors'
import FanNotice from '../components/FanNotice.vue'
import { t } from '../i18n'

const router = useRouter()
const message = ref('')
const recipient = ref('')
const busy = ref(false)
const error = ref('')

const count = computed(() => message.value.length)
// the longer the message, the smaller the handwriting, so it always fits on the paper
const size = computed(() => (count.value <= 40 ? 30 : count.value <= 80 ? 27 : count.value <= 110 ? 24 : 22))
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
    </header>

    <div class="stage">
      <p class="tagline">{{ t('tagline') }}</p>
      <div class="paper">
        <div class="tape" />
        <label class="to"><span>{{ t('to') }}</span><input v-model="recipient" :maxlength="MAX_NAME" :placeholder="t('toPlaceholder')" :aria-label="t('toLabel')" autocomplete="off" data-clarity-mask="true" data-hj-suppress /></label>
        <textarea v-model="message" :maxlength="MAX_MESSAGE" :style="{ fontSize: size + 'px' }" :placeholder="t('messagePlaceholder')" :aria-label="t('messageLabel')" autofocus data-clarity-mask="true" data-hj-suppress />
        <div class="meta"><span>{{ t('writtenToBeScreamed') }}</span><span :class="{ near: count >= 120 }">{{ count }} / {{ MAX_MESSAGE }}</span></div>
      </div>

      <div class="actions">
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button class="btn" type="button" :disabled="!canSeal" @click="seal">{{ busy ? t('sealing') : t('seal') }}</button>
        <p v-if="busy" class="wait" role="status">{{ t('sealingWait') }}</p>
      </div>
    </div>

    <FanNotice class="notice" />
  </main>
</template>

<style scoped>
.compose { min-height: 100dvh; display: flex; flex-direction: column; }
.top { display: flex; align-items: baseline; padding: var(--space-5) var(--gutter) var(--space-3); }
.tagline { color: var(--muted); font-size: 13px; text-align: center; margin-bottom: var(--space-2); }

/* the note and its button sit together in the middle of the screen: a note you hold, not a page to fill */
.stage { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: var(--space-5); padding: 0 var(--space-5); }

.paper {
  position: relative; display: flex; flex-direction: column; height: clamp(320px, 50dvh, 400px);
  padding: var(--space-5) var(--space-5) var(--space-4);
  background: var(--paper-100); color: var(--ink-900); border-radius: 2px;
  transform: rotate(-0.8deg); box-shadow: 0 18px 0 -8px var(--shade);
}
.tape { position: absolute; top: -12px; left: 50%; width: 90px; height: 26px; margin-left: -45px; background: rgba(200, 164, 106, 0.55); transform: rotate(-3deg); z-index: 3; }
.to { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 8px; border-bottom: 1.5px solid rgba(27, 22, 18, 0.35); padding-bottom: 6px; font: 600 15px/1 var(--font-ui); color: rgba(27, 22, 18, 0.65); }
.to input { flex: 1; min-width: 0; border: 0; background: transparent; font: italic 600 22px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--ink-900); padding: 4px 0; }
.to input::placeholder { color: rgba(27, 22, 18, 0.35); }
textarea {
  position: relative; z-index: 1; flex: 1; width: 100%; margin-top: var(--space-3); padding: 0; border: 0; background: transparent; resize: none;
  font: 700 30px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--ink-900);
  transition: font-size var(--dur-base) var(--ease-out);
}
textarea::placeholder { color: rgba(27, 22, 18, 0.32); }
textarea:focus-visible, .to input:focus-visible { outline: none; }
.meta { position: relative; z-index: 2; display: flex; justify-content: space-between; padding-top: var(--space-3); font: 600 13px/1 var(--font-ui); color: var(--paper-100); }
.meta span { padding: 4px 8px; border-radius: var(--radius-s); background: rgba(18, 13, 10, 0.86); } /* a real backdrop, so the text keeps its contrast on the paper at any length */
.meta .near { color: var(--flare-400); }

.actions { display: flex; flex-direction: column; gap: var(--space-2); }
.notice { padding: var(--space-3) var(--space-4) calc(var(--space-4) + env(safe-area-inset-bottom)); }
.wait { color: var(--muted); font-size: 13px; text-align: center; }
.err { color: var(--warn); font-size: 14px; text-align: center; }
</style>
