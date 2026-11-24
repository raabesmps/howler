<script setup lang="ts">
/* Language and theme, side by side in the top right corner of every screen. */
import { lang, setLang, t } from '../i18n'
import { theme, toggleTheme } from '../theme'
</script>

<template>
  <div class="controls">
    <button class="ctl" type="button" :aria-label="t('switchLanguage')" :title="t('switchLanguage')" :lang="lang === 'pt' ? 'en' : 'pt'" @click="setLang(lang === 'pt' ? 'en' : 'pt')">
      {{ t('languageShort') }}
    </button>
    <button class="ctl" type="button" :aria-label="theme === 'dark' ? t('useLightTheme') : t('useDarkTheme')" :title="theme === 'dark' ? t('useLightTheme') : t('useDarkTheme')" @click="toggleTheme">
      <svg v-if="theme === 'dark'" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
      <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.controls { position: absolute; top: var(--space-3); right: var(--space-3); z-index: 20; display: flex; gap: var(--space-2); }
.ctl {
  display: inline-flex; align-items: center; justify-content: center; min-width: 44px; height: 44px; padding: 0 12px;
  border-radius: 999px; border: 1.5px solid var(--line); background: var(--bg); color: var(--text);
  font: 700 13px/1 var(--font-ui); letter-spacing: 0.04em; transition: border-color var(--dur-fast), transform var(--dur-fast);
}
.ctl:hover { border-color: var(--muted); }
.ctl:active { transform: scale(0.94); }
</style>
