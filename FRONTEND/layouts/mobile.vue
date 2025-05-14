<template>
  <v-app>
    

    <!-- Contenuto principale -->
    <v-main class="bg-grey-lighten-4 mb-[100px]">
        <slot />
    </v-main>

    <!-- Navbar in basso -->
    <NavbarMobile />
  </v-app>
</template>

<script setup>
import { ref } from 'vue'
const drawer = ref(false)
</script>
