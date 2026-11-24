<script setup lang="ts">
import AppControls from './components/AppControls.vue'
</script>

<template>
  <AppControls />
  <RouterView v-slot="{ Component, route }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </Transition>
  </RouterView>
</template>
