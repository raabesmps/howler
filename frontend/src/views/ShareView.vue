<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Envelope from '../components/Envelope.vue'
import Seal from '../components/Seal.vue'
import FanNotice from '../components/FanNotice.vue'
import { t } from '../i18n'

const props = defineProps<{ token: string }>()
const route = useRoute()
const router = useRouter()

const recipient = computed(() => (typeof route.query.to === 'string' ? route.query.to : ''))
const link = computed(() => new URL(router.resolve({ name: 'open', params: { token: props.token } }).href, location.href).toString())
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const copied = ref(false)

async function share(): Promise<void> {
  try {
    await navigator.share({ title: 'Howler', text: t('shareText'), url: link.value })
  } catch (e) {
    // closing the share sheet is not an error; anything else (blocked, unsupported target) falls back to copying
    if (!(e instanceof DOMException && e.name === 'AbortError')) await copy()
  }
}
async function copy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(link.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    const el = document.getElementById('link') as HTMLInputElement | null
    el?.select()
  }
}
</script>

<template>
  <main class="share">
    <span class="wordmark">howler</span>

    <div class="stage">
      <Envelope>
        <Seal />
        <div v-if="recipient" class="addr"><span>{{ t('for') }}</span>{{ recipient }}</div>
      </Envelope>
      <div class="tag">
        <small>{{ t('yourLink') }}</small>
        <input id="link" readonly :value="link" :aria-label="t('yourLink')" @focus="($event.target as HTMLInputElement).select()" />
      </div>
    </div>

    <h1 class="title display">{{ t('sealed') }}</h1>
    <p class="hint">{{ t('sealedHint') }}</p>

    <div class="actions">
      <button v-if="canShare" class="act primary" type="button" @click="share">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>
        {{ t('share') }}
      </button>
      <button class="act" :class="{ primary: !canShare, done: copied }" type="button" @click="copy">
        <svg v-if="!copied" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></svg>
        <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        {{ copied ? t('copied') : t('copyLink') }}
      </button>
    </div>
    <button class="link" type="button" @click="router.push({ name: 'compose' })">{{ t('writeAnother') }}</button>
    <div class="spacer" />
    <FanNotice />
  </main>
</template>

<style scoped>
.share { min-height: 100dvh; padding: var(--space-5) var(--gutter) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.stage { margin-top: var(--space-5); }
.addr { position: absolute; left: 22px; bottom: 58px; z-index: 2; font: italic 700 20px/1.1 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--paper-100); }
.addr span { display: block; margin-bottom: 4px; font: 600 11px/1 var(--font-ui); font-style: normal; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }
.tag { position: relative; z-index: 4; width: 78%; margin: -18px auto 0; padding: 14px 16px 12px; background: var(--paper-100); color: var(--ink-900); border-radius: 3px; transform: rotate(1.6deg); box-shadow: 0 10px 0 -4px var(--shade); }
.tag::before { content: ''; position: absolute; left: 50%; top: -9px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: var(--char-950); box-shadow: inset 0 0 0 3px #8c8378; }
.tag small { display: block; margin-bottom: 6px; font: 600 11px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; color: #5a5148; }
.tag input { width: 100%; padding: 0; border: 0; background: transparent; font: 600 14px/1.3 ui-monospace, 'SFMono-Regular', Consolas, monospace; color: var(--ink-900); text-overflow: ellipsis; }
.title { margin-top: var(--space-5); text-align: center; font: 600 22px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.hint { text-align: center; color: var(--muted); font-size: 15px; }
.spacer { flex: 1; min-height: var(--space-4); }
.actions { display: flex; justify-content: center; gap: var(--space-3); margin-top: var(--space-4); }
.act {
  display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 var(--space-5);
  border-radius: 999px; border: 1.5px solid var(--line); background: transparent; color: var(--text);
  font: 600 15px/1 var(--font-ui); transition: background var(--dur-fast), color var(--dur-fast), border-color var(--dur-fast), transform var(--dur-fast);
}
.act:hover { border-color: var(--muted); }
.act:active { transform: scale(0.97); }
.act.primary { background: var(--ember-500); border-color: var(--ember-500); color: var(--ink-900); box-shadow: 0 6px 18px -6px rgba(255, 91, 31, 0.6); }
.act.primary:hover { background: #ff6d36; }
.act.done { border-color: #7bd389; color: #7bd389; background: rgba(123, 211, 137, 0.1); box-shadow: none; }
.link { align-self: center; margin-top: var(--space-2); }
</style>
