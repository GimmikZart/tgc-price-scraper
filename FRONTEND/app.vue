<script setup>
import { useDeviceLayout } from '~/composables/useDeviceLayout'

const { layout } = useDeviceLayout()
const { connect, disconnect } = useScraperStream()
const globalDataStore = useGlobalDataStore()

onMounted(async () => {
  connect()
  await globalDataStore.loadInitialData()
})
onUnmounted(() => disconnect())
</script>
<template>
  <NuxtLayout :name="layout">
    <NuxtPage />
    <SnackbarList />
  </NuxtLayout>
</template>



