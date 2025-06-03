<template>
  <v-app>
    <v-main class="bg-black" style="padding-bottom: 100px">
        <slot />
        <TimedSnackbarList v-if="!route.meta.hideFloatSnackbar"/>
    </v-main>

    <NavbarMobile />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
const route = useRoute()
</script>
