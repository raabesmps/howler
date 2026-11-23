<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Envelope from '../components/Envelope.vue'
import Seal from '../components/Seal.vue'
import FanNotice from '../components/FanNotice.vue'

const props = defineProps<{ token: string }>()
const route = useRoute()
const router = useRouter()

const recipient = computed(() => (typeof route.query.to === 'string' ? route.query.to : ''))
const link = computed(() => new URL(router.resolve({ name: 'open', params: { token: props.token } }).href, location.href).toString())
const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
const copied = ref(false)

async function share(): Promise<void> {
  try { await navigator.share({ title: 'Howler', text: 'Someone sent you something.', url: link.value }) } catch { /* cancelled */ }
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
        <div v-if="recipient" class="addr"><span>For</span>{{ recipient }}</div>
      </Envelope>
      <div class="tag">
        <small>Your one-time link</small>
        <input id="link" readonly :value="link" aria-label="Your one-time link" @focus="($event.target as HTMLInputElement).select()" />
      </div>
    </div>

    <h1 class="title display">Sealed. It works once.</h1>
    <p class="hint">Opening it yourself will burn it.</p>

    <div class="spacer" />
    <button v-if="canShare" class="btn" type="button" @click="share">Share</button>
    <button class="btn" :class="{ ghost: canShare }" type="button" @click="copy">{{ copied ? 'Copied' : 'Copy link' }}</button>
    <button class="link" type="button" @click="router.push({ name: 'compose' })">Write another</button>
    <FanNotice />
  </main>
</template>

<style scoped>
.share { min-height: 100dvh; padding: var(--space-5) var(--gutter) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.stage { margin-top: var(--space-5); }
.addr { position: absolute; left: 22px; bottom: 58px; z-index: 2; font: italic 700 20px/1.1 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; color: var(--paper-100); }
.addr span { display: block; margin-bottom: 4px; font: 600 11px/1 var(--font-ui); font-style: normal; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.75; }
.tag { position: relative; z-index: 4; width: 78%; margin: -18px auto 0; padding: 14px 16px 12px; background: var(--paper-100); color: var(--ink-900); border-radius: 3px; transform: rotate(1.6deg); box-shadow: 0 10px 0 -4px rgba(0, 0, 0, 0.5); }
.tag::before { content: ''; position: absolute; left: 50%; top: -9px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; background: var(--char-950); box-shadow: inset 0 0 0 3px #8c8378; }
.tag small { display: block; margin-bottom: 6px; font: 600 11px/1 var(--font-ui); letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.6; }
.tag input { width: 100%; padding: 0; border: 0; background: transparent; font: 600 14px/1.3 ui-monospace, 'SFMono-Regular', Consolas, monospace; color: var(--ink-900); text-overflow: ellipsis; }
.title { margin-top: var(--space-5); text-align: center; font: 600 22px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.hint { text-align: center; color: var(--ash-400); font-size: 15px; }
.spacer { flex: 1; min-height: var(--space-4); }
.link { align-self: center; }
</style>
