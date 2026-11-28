<script setup lang="ts">
import AppControls from './components/AppControls.vue'
import CookieBanner from './components/CookieBanner.vue'
</script>

<template>
  <AppControls />
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
  <CookieBanner />
</template>
