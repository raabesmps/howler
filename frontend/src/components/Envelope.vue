<script setup lang="ts">
/** The closed brick-red envelope. The seal and the address go in the slot. `full` bleeds off the screen edges. */
defineProps<{ variant?: 'card' | 'full' }>()
</script>

<template>
  <div class="env" :class="variant ?? 'card'">
    <slot />
  </div>
</template>

<style scoped>
.env { position: relative; background: var(--env-500); }
.env::before { content: ''; position: absolute; inset: 0; background: var(--env-700); clip-path: polygon(0 0, 50% 58%, 100% 0); }
.env::after { content: ''; position: absolute; inset: 0; background: rgba(0, 0, 0, 0.2); clip-path: polygon(0 100%, 50% 42%, 50% 44%, 2% 100%); }

.env.card { width: 300px; max-width: 100%; height: 205px; margin: 0 auto; border-radius: 2px; transform: rotate(-2deg); box-shadow: 0 26px 0 -12px var(--shade); }
.env.full { position: absolute; left: -14%; right: -14%; top: 15%; height: 380px; transform: rotate(-3deg); box-shadow: 0 40px 0 -20px var(--shade); z-index: 2; }
.env.full::before { clip-path: polygon(0 0, 50% 60%, 100% 0); }
.env.full::after { background: rgba(0, 0, 0, 0.18); clip-path: polygon(0 100%, 50% 44%, 50% 46%, 1% 100%); }
</style>
