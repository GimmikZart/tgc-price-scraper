<script setup>
import { Icon } from "@iconify/vue";

const mobileFloatMenu = useMobileFloatMenu();
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Decks">
      <template #actions>
        <!-- QUESTO BOTTONE DEVE GIA' CREARE IL DECK NELLO STORE  -->
        
      </template>
    </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
    </v-container>
    <MobileFloatMenu :menu-open="mobileFloatMenu.open">
      <template #buttons>
        <DialogsHandleDeck />
      </template>
    </MobileFloatMenu>
  </section>
</template>
