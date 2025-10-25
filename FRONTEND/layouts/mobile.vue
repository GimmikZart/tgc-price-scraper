<script setup>
import { usePageLoader } from "@/stores/usePageLoader";
const pageLoader = usePageLoader();
const isPageLoading = computed(() => pageLoader.isLoading);
</script>
<template>
  <v-app>
    <v-main class="bg-black" style="padding-bottom: 60px">
      <LoadingSpinner v-if="isPageLoading"/>
      <slot />
    </v-main>
    <NavbarMobile />
  </v-app>
</template>

