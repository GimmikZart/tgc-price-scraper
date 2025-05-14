<template>
  <v-app>
    <v-navigation-drawer
      color="black"
      class="border border-white"
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
      </v-list>
    </v-navigation-drawer>

    <v-main class="bg-black">
      <slot />
    </v-main>
  </v-app>
</template>

<script setup>

</script>
