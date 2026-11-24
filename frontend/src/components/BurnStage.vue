<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { BurnEffect } from '../burn/burn'

const emit = defineEmits<{ done: [] }>()
const canvas = ref<HTMLCanvasElement | null>(null)
let effect: BurnEffect | null = null

onMounted(() => {
  if (!canvas.value) return
  effect = new BurnEffect(canvas.value)
  void effect.start().then(() => emit('done'))
})
onBeforeUnmount(() => { effect?.stop() })
</script>

<template>
  <canvas ref="canvas" class="burn" aria-hidden="true" />
</template>

<style scoped>
.burn { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
