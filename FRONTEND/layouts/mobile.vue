<template>
  <v-app>
    <v-main class="bg-black" style="padding-bottom: 100px">
      <slot />
    </v-main>
    <NavbarMobile />
  </v-app>
</template>

<script setup>
const route = useRoute()
</script>
