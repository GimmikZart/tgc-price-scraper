<script setup>
import { Icon } from "@iconify/vue";
</script>
<template>
  <section class="relative h-full">
    <Toolbar label="Decks">
      <template #actions>
        <v-btn variant="flat" class="text-white" to="/decks/create">
          <Icon icon="mdi:plus" class="text-black" />
        </v-btn>
      </template>
    </Toolbar>
    <v-container class="flex flex-col justify-start grow relative gap-5">
    </v-container>
  </section>
</template>
