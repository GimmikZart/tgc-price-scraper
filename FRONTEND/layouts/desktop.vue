<script setup>

</script>
<template>
  <v-app>
    <NavbarDesktop/>

    <v-main class="bg-black">
      <slot />
      <TimedSnackbarList />
    </v-main>
  </v-app>
</template>
