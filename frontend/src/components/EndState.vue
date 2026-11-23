<script setup lang="ts">
import { useRouter } from 'vue-router'
import FanNotice from './FanNotice.vue'
import ReportButton from './ReportButton.vue'

defineProps<{ kind: 'burned' | 'expired' | 'notfound'; token?: string }>()
const router = useRouter()

const COPY = {
  burned: { title: 'This howler has already been delivered.', sub: "Nobody can read it again. That's the point." },
  expired: { title: 'This howler expired before anyone opened it.', sub: "Nobody can read it. That's the point." },
  notfound: { title: 'Nothing here. Maybe it never existed.', sub: '' },
} as const
</script>

<template>
  <main class="end">
    <div v-if="kind === 'burned'" class="ash" aria-hidden="true"><i /><i /><i /><b /><b /></div>
    <div v-else class="env" :class="kind" aria-hidden="true" />
    <h1 class="title display" :class="kind">{{ COPY[kind].title }}</h1>
    <p v-if="COPY[kind].sub" class="sub center">{{ COPY[kind].sub }}</p>
    <div class="spacer" />
    <button class="btn" type="button" @click="router.push({ name: 'compose' })">Send your own</button>
    <FanNotice class="notice" />
    <ReportButton v-if="kind === 'burned' && token" :token="token" class="report" />
  </main>
</template>

<style scoped>
.end { min-height: 100dvh; padding: var(--space-5) var(--gutter) var(--space-4); display: flex; flex-direction: column; }
.title { font: 600 22px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; text-align: center; }
.title.burned { color: var(--ember-500); }
.title.expired, .title.notfound { color: var(--ash-400); }
.sub { color: var(--ash-400); font-size: 15px; margin-top: var(--space-3); }
.spacer { flex: 1; min-height: var(--space-5); }
.notice { margin-top: var(--space-4); }
.report { align-self: center; margin-top: var(--space-2); }

.env { position: relative; width: 220px; height: 150px; margin: var(--space-7) auto var(--space-5); background: #6c665e; border-radius: 2px; box-shadow: 0 24px 0 -12px rgba(0, 0, 0, 0.45); }
.env::before { content: ''; position: absolute; inset: 0; background: #565049; clip-path: polygon(0 0, 50% 58%, 100% 0); }
.env::after { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, transparent 49.4%, rgba(0, 0, 0, 0.18) 50%) left/50% 100% no-repeat, linear-gradient(225deg, transparent 49.4%, rgba(0, 0, 0, 0.18) 50%) right/50% 100% no-repeat; clip-path: polygon(0 100%, 50% 38%, 100% 100%); }
.env.notfound::before { clip-path: polygon(0 0, 50% -30%, 100% 0); transform: translateY(-4px); }
.env.notfound::after { display: none; }

.ash { width: 200px; height: 90px; margin: var(--space-7) auto var(--space-5); position: relative; }
.ash i { position: absolute; bottom: 0; background: #2a2622; border-radius: 40% 60% 20% 30%; }
.ash i:nth-child(1) { left: 10px; width: 120px; height: 36px; }
.ash i:nth-child(2) { left: 80px; width: 100px; height: 52px; background: #332d28; }
.ash i:nth-child(3) { left: 150px; width: 40px; height: 22px; }
.ash b { position: absolute; width: 5px; height: 5px; background: var(--ember-500); border-radius: 50%; box-shadow: 0 0 8px var(--ember-500); }
.ash b:nth-of-type(1) { left: 90px; bottom: 54px; }
.ash b:nth-of-type(2) { left: 130px; bottom: 40px; background: var(--flare-400); }
</style>
