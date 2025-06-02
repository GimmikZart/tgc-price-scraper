<script setup>
import { signOutApi } from '@/api/auth';

async function signOut(){
    await signOutApi()
}
</script>
<template>
  <v-app>
    <NavbarDesktop/>

    <v-main class="bg-black">
      <slot />
      <SnackbarList />
    </v-main>
  </v-app>
</template>
