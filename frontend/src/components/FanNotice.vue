<script setup lang="ts">
/* The footer of every screen: who made it (with a link to her LinkedIn) and the fan-project notice. */
import { t } from '../i18n'
import { analyticsEnabled } from '../analytics'
import { reopenConsent } from '../consent'

const AUTHOR = 'Raabe'
const LINKEDIN = 'https://www.linkedin.com/in/ssampaior/'
</script>

<template>
  <footer class="credits">
    <p class="by">
      {{ t('madeBy') }}
      <a :href="LINKEDIN" target="_blank" rel="noopener noreferrer" :aria-label="t('authorOnLinkedIn', { name: AUTHOR })">
        {{ AUTHOR }}
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
        </svg>
      </a>
    </p>
    <p class="foot">{{ t('fanNotice') }}</p>
    <button v-if="analyticsEnabled" class="cookie-link" type="button" @click="reopenConsent">{{ t('cookies') }}</button>
  </footer>
</template>

<style scoped>
.credits { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.by { color: var(--muted); font-size: 13px; line-height: 1.4; text-align: center; }
.by a {
  display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 6px; /* a 44px touch target, like every control */
  color: var(--text); font-weight: 600; text-decoration: none; border-radius: var(--radius-s);
}
.by a:hover { color: var(--accent); }
.cookie-link { min-height: 44px; padding: 0 var(--space-2); background: none; border: 0; color: var(--muted); font-size: 12px; text-decoration: underline; }
.by a svg { color: #0a66c2; } /* LinkedIn blue on both themes */
:root[data-theme='dark'] .by a svg { color: #70b5f9; } /* a lighter LinkedIn blue keeps its contrast on the dark page */
</style>
