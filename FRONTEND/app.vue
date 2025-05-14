<script setup>
import { useDeviceLayout } from '~/composables/useDeviceLayout'

const { layout } = useDeviceLayout()
const { connect, disconnect } = useScraperStream()
const globalDataStore = useGlobalDataStore()
const { data: storesList } = await useAsyncData('stores', useGetStores);

onMounted(async () => {
  connect()
  await globalDataStore.loadInitialData()
})
onUnmounted(() => disconnect())
</script>
<template>
  <!-- <div class="min-h-screen bg-gray-100 text-gray-900 p-2 lg:p-5 pb-10">
    <Navbar></Navbar>
    <NuxtPage />
    <SnackbarList />
  </div> -->
   <NuxtLayout :name="layout">
    <NuxtPage />
    <SnackbarList />
  </NuxtLayout>
</template>



