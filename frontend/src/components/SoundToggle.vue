<script setup lang="ts">
import { ref } from 'vue'
import { isMuted, setMuted } from '../audio/engine'

const emit = defineEmits<{ change: [muted: boolean] }>()
const muted = ref(isMuted())

function toggle(): void {
  muted.value = !muted.value
  setMuted(muted.value)
  emit('change', muted.value)
}
</script>

<template>
  <!-- One fixed name with aria-pressed: screen readers say "Mute sound, toggle button, pressed". -->
  <button class="sound" type="button" aria-label="Mute sound" :aria-pressed="muted" @click="toggle">
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      <path v-if="!muted" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <path v-else d="M16 9l5 6m0-6l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
    <span>{{ muted ? 'Sound off' : 'Sound on' }}</span>
  </button>
</template>

<style scoped>
.sound { display: inline-flex; align-items: center; gap: 8px; min-width: 48px; min-height: 48px; padding: 0 14px; border-radius: var(--radius-s); border: 1px solid rgba(243, 234, 216, 0.3); background: rgba(16, 14, 12, 0.6); color: var(--paper-100); font: 600 14px/1 var(--font-ui); }
.sound[aria-pressed='true'] { border-color: var(--flare-400); color: var(--flare-400); }
</style>
