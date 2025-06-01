<script setup>
import { useDeviceLayout } from '~/composables/useDeviceLayout'

const route = useRoute()
const { layout: deviceLayout } = useDeviceLayout()
const { connect, disconnect } = useScraperStream()
const globalDataStore = useGlobalDataStore()

const layoutName = computed(() => {
  return route.meta.layout|| deviceLayout.value
})

onMounted(async () => {
  connect()
  await globalDataStore.loadInitialData()
})
onUnmounted(() => disconnect())
</script>
<template>
  <NuxtLayout :name="layoutName">
    <NuxtPage />
  </NuxtLayout>
</template>



