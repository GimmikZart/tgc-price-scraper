<script setup>
const route = useRoute()
</script>
<template>
  <v-app>
    <NavbarDesktop/>

    <v-main class="bg-black">
      <slot />
      <TimedSnackbarList v-if="!route.meta.hideFloatSnackbar"/>
    </v-main>
  </v-app>
</template>
