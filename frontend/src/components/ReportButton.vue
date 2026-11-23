<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../api'
import { describeError } from '../lib/errors'

const props = defineProps<{ token: string }>()

type State = 'idle' | 'sending' | 'done' | 'failed'
const state = ref<State>('idle')
const problem = ref('')

async function report(): Promise<void> {
  if (state.value === 'sending' || state.value === 'done') return
  state.value = 'sending'
  try {
    await api.report(props.token, 'abuse')
    state.value = 'done'
  } catch (e) {
    problem.value = describeError(e)
    state.value = 'failed'
  }
}
</script>

<template>
  <div class="report-wrap">
    <button class="link report" type="button" :disabled="state === 'sending' || state === 'done'" @click="report">
      {{ state === 'done' ? 'Reported. Thank you.' : state === 'sending' ? 'Reporting...' : 'Report this' }}
    </button>
    <p v-if="state === 'failed'" class="problem" role="alert">{{ problem }}</p>
  </div>
</template>

<style scoped>
.report-wrap { display: flex; flex-direction: column; align-items: center; }
.problem { margin-top: var(--space-1); color: var(--flare-400); font-size: 13px; text-align: center; }
</style>
