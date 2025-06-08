<script setup>
definePageMeta({
  middleware: "admin",
});
</script>
<template>
  <section>
    <Toolbar label="Admin"> </Toolbar>
    <v-container class="flex flex-wrap gap-3 justify-start items-end">
      <DialogsHandleScrapingOPCards class="h-[100px]" />
      <v-btn height="100px" to="/stores">Vai a Negozi</v-btn>
      <v-btn height="100px" to="/games">Vai a Giochi</v-btn>
      <v-btn height="100px" to="/brands">Vai a Brands</v-btn>
      <AdminActionsUpdateCardsListOnDb height="100px" />
    </v-container>
  </section>
</template>
