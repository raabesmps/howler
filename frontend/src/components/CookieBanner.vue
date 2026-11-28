<script setup lang="ts">
/*
 * The cookie notice (LGPD). It only exists when the build has analytics, and only shows where analytics could run:
 * on the write screen, until a choice is made, or anywhere when reopened from the footer link.
 * Accept and refuse are the same size, side by side; the details say who, what, for how long and how to change it.
 */
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { analyticsEnabled } from '../analytics'
import { choose, consent, reopened } from '../consent'
import { t } from '../i18n'

const route = useRoute()
const details = ref(false)
const root = ref<HTMLElement | null>(null)

const visible = computed(() => analyticsEnabled && (reopened.value || (consent.value === null && route.name === 'compose')))

// reopened from the footer: bring the keyboard focus to the notice so it can be answered right away
watch(reopened, async (open) => {
  if (!open) return
  await nextTick()
  root.value?.querySelector<HTMLElement>('button')?.focus()
})
</script>

<template>
  <Transition name="rise">
    <section v-if="visible" ref="root" class="cookies" role="region" :aria-label="t('cookieTitle')">
      <h2 class="title">{{ t('cookieTitle') }}</h2>
      <p class="text">{{ t('cookieText') }}</p>

      <button class="more" type="button" :aria-expanded="details" aria-controls="cookie-details" @click="details = !details">
        {{ details ? t('cookieLess') : t('cookieMore') }}
      </button>
      <dl v-show="details" id="cookie-details" class="details">
        <div><dt>{{ t('cookieWhoLabel') }}</dt><dd>{{ t('cookieWho') }}</dd></div>
        <div><dt>{{ t('cookieWhatLabel') }}</dt><dd>{{ t('cookieWhat') }}</dd></div>
        <div><dt>{{ t('cookieThirdLabel') }}</dt><dd>{{ t('cookieThird') }}</dd></div>
        <div><dt>{{ t('cookieKeptLabel') }}</dt><dd>{{ t('cookieKept') }}</dd></div>
        <div><dt>{{ t('cookieLocalLabel') }}</dt><dd>{{ t('cookieLocal') }}</dd></div>
        <div><dt>{{ t('cookieBasisLabel') }}</dt><dd>{{ t('cookieBasis') }}</dd></div>
      </dl>

      <div class="actions">
        <button class="choice refuse" type="button" @click="choose('denied')">{{ t('cookieRefuse') }}</button>
        <button class="choice accept" type="button" @click="choose('granted')">{{ t('cookieAccept') }}</button>
      </div>
    </section>
  </Transition>
</template>

<style scoped>
.cookies {
  position: fixed; left: 50%; bottom: calc(var(--space-3) + env(safe-area-inset-bottom)); z-index: 40;
  width: min(100% - 2 * var(--space-3), 488px); transform: translateX(-50%);
  max-height: calc(100dvh - 2 * var(--space-3)); overflow-y: auto;
  padding: var(--space-4) var(--space-4) var(--space-3);
  background: var(--bg); color: var(--text); border: 1.5px solid var(--line); border-radius: var(--radius-m);
  box-shadow: 0 18px 40px -12px var(--shade);
}
.title { font: 700 18px/1.2 var(--font-display); font-variation-settings: 'SOFT' 100, 'WONK' 1; }
.text { margin-top: var(--space-2); font-size: 14px; line-height: 1.45; }
.more { margin-top: var(--space-1); padding: var(--space-2) 0; min-height: 36px; background: none; border: 0; color: var(--muted); font-size: 14px; text-decoration: underline; }
.details { display: grid; gap: var(--space-2); margin: var(--space-1) 0 var(--space-2); font-size: 13px; line-height: 1.4; }
.details dt { font-weight: 600; }
.details dd { margin: 0; color: var(--muted); }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2); margin-top: var(--space-2); }
/* the same size and weight: refusing is as easy as accepting */
.choice { min-height: 44px; padding: 0 var(--space-3); border-radius: var(--radius-s); font: 600 15px/1 var(--font-ui); border: 2px solid; }
.refuse { background: var(--text); color: var(--bg); border-color: var(--text); }
.accept { background: var(--ember-500); color: var(--ink-900); border-color: var(--ember-500); }

.rise-enter-active, .rise-leave-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.rise-enter-from, .rise-leave-to { opacity: 0; transform: translate(-50%, 16px); }
</style>
