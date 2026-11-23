<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' | 'lg'; interactive?: boolean; disabled?: boolean; label?: string }>()
defineEmits<{ press: [] }>()
</script>

<template>
  <button v-if="interactive" type="button" class="seal" :class="size ?? 'md'" :disabled="disabled" :aria-label="label" @click="$emit('press')" />
  <span v-else class="seal" :class="size ?? 'md'" aria-hidden="true" />
</template>

<style scoped>
/* dark wax with a glowing crack */
.seal {
  position: absolute; left: 50%; top: 50%; z-index: 3;
  width: 64px; height: 64px; margin: -32px 0 0 -32px; padding: 0; border: 0;
  border-radius: 52% 48% 55% 45% / 48% 54% 46% 52%;
  background: radial-gradient(circle at 38% 32%, #4a2a20, #2a1410 55%, #160a07 100%);
  box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.25), 0 0 26px 6px rgba(255, 91, 31, 0.5);
  color: inherit;
}
.seal::after {
  content: ''; position: absolute; inset: 8px 29px; background: var(--flare-400);
  clip-path: polygon(40% 0, 100% 22%, 20% 48%, 90% 70%, 30% 100%, 0 80%, 70% 52%, 0 30%);
  filter: drop-shadow(0 0 5px var(--ember-500));
}
.seal.lg { width: 104px; height: 104px; margin: -52px 0 0 -52px; }
.seal.lg::after { inset: 12px 47px; }
.seal.sm { width: 34px; height: 34px; margin: -17px 0 0 -17px; box-shadow: 0 0 14px 2px rgba(255, 91, 31, 0.5); }
.seal.sm::after { inset: 5px 15px; }
button.seal:disabled { filter: grayscale(0.6) brightness(0.8); cursor: wait; }
button.seal:not(:disabled) { animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.25), 0 0 44px 14px rgba(255, 91, 31, 0.7); } }
</style>
