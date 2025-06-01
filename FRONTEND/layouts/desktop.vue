<script setup>
import { signOutApi } from '@/api/auth';

async function signOut(){
    await signOutApi()
}
</script>
<template>
  <v-app>
    <v-navigation-drawer
      color="black"
      class="border border-white relative"
      permanent
      app
      width="260"
    >
      <v-list-item title="Deckspedia" subtitle="Beta"></v-list-item>
      <v-divider></v-divider>
      <v-list nav>
        <v-list-item title="Prodotti" to="/" />
        <v-list-item title="Brands" to="/brands" />
        <v-list-item title="Giochi" to="/games" />
        <v-list-item title="Negozi" to="/stores" />
        <v-spacer></v-spacer>
      </v-list>
      <div class="absolute bottom-0 w-full p-3">
        <v-btn block @click="signOut">Logout</v-btn>
      </div>
    </v-navigation-drawer>

    <v-main class="bg-black">
      <slot />
      <SnackbarList />
    </v-main>
  </v-app>
</template>
