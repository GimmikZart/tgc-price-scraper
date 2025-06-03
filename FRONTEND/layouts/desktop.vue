<script setup>
const route = useRoute()
</script>
<template>
  <v-app>
    <NavbarDesktop/>

    <v-main class="bg-black relative">
      <slot />
    </v-main>
  </v-app>
</template>
