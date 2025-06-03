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
const route = useRoute()
</script>
