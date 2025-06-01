<template>
  <v-app>
    <!-- Contenuto principale -->
    <v-main class="bg-black" style="padding-bottom: 100px">
        <slot />
        <SnackbarList />
    </v-main>

    <!-- Navbar in basso -->
    <NavbarMobile />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
